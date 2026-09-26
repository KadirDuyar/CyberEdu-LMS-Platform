-- ====================================================================
-- RLS DÖNGÜSÜNÜ (INFINITE RECURSION) ÇÖZEN GÜVENLİK GÜNCELLEMESİ
-- ====================================================================

-- 1. YARDIMCI GÜVENLİK FONKSİYONLARI (SECURITY DEFINER)
-- Bu fonksiyonlar doğrudan süper kullanıcı yetkisiyle sorgu atarak
-- RLS politikalarının birbirini sonsuz döngüye sokmasını önler.

CREATE OR REPLACE FUNCTION public.check_is_cohort_member(c_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_members
    WHERE cohort_id = c_id AND student_id = u_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_cohort_teacher(c_id uuid, u_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohorts
    WHERE id = c_id AND teacher_id = u_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_is_admin(u_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = u_id AND role = 'admin'
  );
$$;

-- 2. MEVCUT HATALI POLİTİKALARI TEMİZLE
DROP POLICY IF EXISTS "cohorts_select" ON public.cohorts;
DROP POLICY IF EXISTS "cohorts_teacher_all" ON public.cohorts;
DROP POLICY IF EXISTS "cohorts_insert" ON public.cohorts;
DROP POLICY IF EXISTS "cohorts_update" ON public.cohorts;
DROP POLICY IF EXISTS "cohorts_delete" ON public.cohorts;

DROP POLICY IF EXISTS "cohort_members_select" ON public.cohort_members;
DROP POLICY IF EXISTS "cohort_members_insert" ON public.cohort_members;
DROP POLICY IF EXISTS "cohort_members_delete" ON public.cohort_members;

DROP POLICY IF EXISTS "cohort_weeks_select" ON public.cohort_weeks;
DROP POLICY IF EXISTS "cohort_weeks_manage" ON public.cohort_weeks;
DROP POLICY IF EXISTS "cohort_weeks_insert" ON public.cohort_weeks;
DROP POLICY IF EXISTS "cohort_weeks_update" ON public.cohort_weeks;
DROP POLICY IF EXISTS "cohort_weeks_delete" ON public.cohort_weeks;

DROP POLICY IF EXISTS "cohort_progress_select" ON public.cohort_progress;
DROP POLICY IF EXISTS "cohort_progress_manage" ON public.cohort_progress;

-- 3. YENİ TEMİZ VE DÖNGÜSÜZ POLİTİKALAR

-- ─── COHORTS ──────────────────────────────────────────────────────────
CREATE POLICY "cohorts_select" ON public.cohorts 
  FOR SELECT TO authenticated 
  USING (
    teacher_id = auth.uid() 
    OR public.check_is_cohort_member(id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

CREATE POLICY "cohorts_insert" ON public.cohorts 
  FOR INSERT TO authenticated 
  WITH CHECK (
    teacher_id = auth.uid() 
    OR public.check_is_admin(auth.uid())
  );

CREATE POLICY "cohorts_update" ON public.cohorts 
  FOR UPDATE TO authenticated 
  USING (
    teacher_id = auth.uid() 
    OR public.check_is_admin(auth.uid())
  )
  WITH CHECK (
    teacher_id = auth.uid() 
    OR public.check_is_admin(auth.uid())
  );

CREATE POLICY "cohorts_delete" ON public.cohorts 
  FOR DELETE TO authenticated 
  USING (
    teacher_id = auth.uid() 
    OR public.check_is_admin(auth.uid())
  );

-- ─── COHORT_MEMBERS ───────────────────────────────────────────────────
CREATE POLICY "cohort_members_select" ON public.cohort_members 
  FOR SELECT TO authenticated 
  USING (
    student_id = auth.uid() 
    OR public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

CREATE POLICY "cohort_members_insert" ON public.cohort_members 
  FOR INSERT TO authenticated 
  WITH CHECK (
    student_id = auth.uid() 
    OR public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

CREATE POLICY "cohort_members_delete" ON public.cohort_members 
  FOR DELETE TO authenticated 
  USING (
    student_id = auth.uid() 
    OR public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

-- ─── COHORT_WEEKS ─────────────────────────────────────────────────────
CREATE POLICY "cohort_weeks_select" ON public.cohort_weeks 
  FOR SELECT TO authenticated 
  USING (
    public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_cohort_member(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

CREATE POLICY "cohort_weeks_all" ON public.cohort_weeks 
  FOR ALL TO authenticated 
  USING (
    public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  )
  WITH CHECK (
    public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

-- ─── COHORT_PROGRESS ──────────────────────────────────────────────────
CREATE POLICY "cohort_progress_select" ON public.cohort_progress 
  FOR SELECT TO authenticated 
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cohort_weeks w 
      WHERE w.id = cohort_progress.cohort_week_id 
      AND public.check_is_cohort_teacher(w.cohort_id, auth.uid())
    )
    OR public.check_is_admin(auth.uid())
  );

CREATE POLICY "cohort_progress_all" ON public.cohort_progress 
  FOR ALL TO authenticated 
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cohort_weeks w 
      WHERE w.id = cohort_progress.cohort_week_id 
      AND public.check_is_cohort_teacher(w.cohort_id, auth.uid())
    )
    OR public.check_is_admin(auth.uid())
  )
  WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cohort_weeks w 
      WHERE w.id = cohort_progress.cohort_week_id 
      AND public.check_is_cohort_teacher(w.cohort_id, auth.uid())
    )
    OR public.check_is_admin(auth.uid())
  );
