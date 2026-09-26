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
    OR is_active = true
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

-- ─── 4. KODLA KATILMA İŞLEMİNİ GÜVENLE YAPAN RPC FONKSİYONU ───────────
CREATE OR REPLACE FUNCTION public.join_cohort_by_code(p_join_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_cohort record;
  v_already_member boolean;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Oturum açmanız gerekiyor.');
  END IF;

  p_join_code := UPPER(TRIM(p_join_code));

  -- Aktif programı bul
  SELECT id, title, description, is_active, teacher_id
  INTO v_cohort
  FROM public.cohorts
  WHERE UPPER(TRIM(join_code)) = p_join_code;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Bu koda ait bir program bulunamadı. Lütfen kodu kontrol edin.');
  END IF;

  IF NOT v_cohort.is_active THEN
    RETURN json_build_object('success', false, 'message', 'Bu program şu anda aktif değil veya duraklatılmış.');
  END IF;

  -- Daha önce katılmış mı kontrol et
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_members
    WHERE cohort_id = v_cohort.id AND student_id = v_student_id
  ) INTO v_already_member;

  IF v_already_member THEN
    RETURN json_build_object('success', false, 'message', 'Zaten bu programa kayıtlısınız!', 'cohort', row_to_json(v_cohort));
  END IF;

  -- Öğrenciyi programa kaydet
  INSERT INTO public.cohort_members (cohort_id, student_id)
  VALUES (v_cohort.id, v_student_id);

  RETURN json_build_object('success', true, 'message', 'Programa başarıyla katıldınız!', 'cohort', row_to_json(v_cohort));
END;
$$;

