-- ========================================================
-- 1. COHORTS (Öğrenci Grupları / Programlar)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    join_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 6)),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================================
-- 2. COHORT_MEMBERS (Grup Üyeleri)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.cohort_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(cohort_id, student_id)
);

-- ========================================================
-- 3. COHORT_WEEKS (Haftalık Görev Planı)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.cohort_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id UUID NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
    week_number INT NOT NULL,
    title TEXT NOT NULL,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE, -- Opsiyonel spesifik ders
    unlock_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ========================================================
-- 4. COHORT_PROGRESS (Öğrenci Görev İlerlemeleri)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.cohort_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_week_id UUID NOT NULL REFERENCES public.cohort_weeks(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
    earned_xp INT NOT NULL DEFAULT 0 CHECK (earned_xp >= 0),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(cohort_week_id, student_id)
);

-- ========================================================
-- 5. NOTIFICATIONS TABLOSUNA YENİ TİP DESTEĞİ
-- ========================================================
DO $$
BEGIN
  ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type = ANY (ARRAY['course_feedback'::text, 'new_follower'::text, 'friend_completed_course'::text, 'system'::text, 'cohort_assignment'::text]));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- ========================================================
-- 6. YARDIMCI GÜVENLİK FONKSİYONLARI (SECURITY DEFINER)
-- Bu fonksiyonlar RLS değerlendirmesini süper yetkiyle yaparak
-- tablolar arasındaki sonsuz döngüyü (infinite recursion) önler.
-- ========================================================
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

-- ========================================================
-- 7. RLS (ROW LEVEL SECURITY) POLİTİKALARI
-- ========================================================
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_progress ENABLE ROW LEVEL SECURITY;

-- Cohorts Politikaları
DROP POLICY IF EXISTS "cohorts_select" ON public.cohorts;
CREATE POLICY "cohorts_select" ON public.cohorts 
  FOR SELECT TO authenticated 
  USING (
    teacher_id = auth.uid() 
    OR is_active = true
    OR public.check_is_cohort_member(id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "cohorts_teacher_all" ON public.cohorts;
DROP POLICY IF EXISTS "cohorts_insert" ON public.cohorts;
CREATE POLICY "cohorts_insert" ON public.cohorts 
  FOR INSERT TO authenticated 
  WITH CHECK (
    teacher_id = auth.uid() 
    OR public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "cohorts_update" ON public.cohorts;
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

DROP POLICY IF EXISTS "cohorts_delete" ON public.cohorts;
CREATE POLICY "cohorts_delete" ON public.cohorts 
  FOR DELETE TO authenticated 
  USING (
    teacher_id = auth.uid() 
    OR public.check_is_admin(auth.uid())
  );

-- Cohort Members Politikaları
DROP POLICY IF EXISTS "cohort_members_select" ON public.cohort_members;
CREATE POLICY "cohort_members_select" ON public.cohort_members 
  FOR SELECT TO authenticated 
  USING (
    student_id = auth.uid() 
    OR public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "cohort_members_insert" ON public.cohort_members;
CREATE POLICY "cohort_members_insert" ON public.cohort_members 
  FOR INSERT TO authenticated 
  WITH CHECK (
    student_id = auth.uid() 
    OR public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "cohort_members_delete" ON public.cohort_members;
CREATE POLICY "cohort_members_delete" ON public.cohort_members 
  FOR DELETE TO authenticated 
  USING (
    student_id = auth.uid() 
    OR public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

-- Cohort Weeks Politikaları
DROP POLICY IF EXISTS "cohort_weeks_select" ON public.cohort_weeks;
CREATE POLICY "cohort_weeks_select" ON public.cohort_weeks 
  FOR SELECT TO authenticated 
  USING (
    public.check_is_cohort_teacher(cohort_id, auth.uid())
    OR public.check_is_cohort_member(cohort_id, auth.uid())
    OR public.check_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "cohort_weeks_manage" ON public.cohort_weeks;
DROP POLICY IF EXISTS "cohort_weeks_all" ON public.cohort_weeks;
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

-- Cohort Progress Politikaları
DROP POLICY IF EXISTS "cohort_progress_select" ON public.cohort_progress;
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

DROP POLICY IF EXISTS "cohort_progress_manage" ON public.cohort_progress;
DROP POLICY IF EXISTS "cohort_progress_all" ON public.cohort_progress;
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

-- ========================================================
-- 8. KODLA KATILMA İŞLEMİNİ GÜVENLE YAPAN RPC FONKSİYONU
-- ========================================================
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

