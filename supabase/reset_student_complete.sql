-- ============================================================
-- CyberEdu LMS: Güvenli ve Hata Korumalı Öğrenci Sıfırlama Fonksiyonu
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1. Admin Doğrudan Silme İzinleri (RLS Politikaları)
DROP POLICY IF EXISTS "lesson_progress_admin_all" ON public.lesson_progress;
CREATE POLICY "lesson_progress_admin_all" ON public.lesson_progress
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_admin_all" ON public.enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "activity_attempts_admin_all" ON public.activity_attempts;
CREATE POLICY "activity_attempts_admin_all" ON public.activity_attempts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "user_badges_admin_all" ON public.user_badges;
CREATE POLICY "user_badges_admin_all" ON public.user_badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. Öğrenci İlerlemesini Sıfırlayan RPC (SECURITY DEFINER - Tüm kısıtları güvenle aşar)
CREATE OR REPLACE FUNCTION public.admin_reset_student(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Zorunlu tablolar (kesin var olanlar)
  DELETE FROM public.activity_attempts WHERE user_id = target_user_id;
  DELETE FROM public.lesson_progress WHERE user_id = target_user_id;
  DELETE FROM public.enrollments WHERE user_id = target_user_id;

  -- İsteğe bağlı / sonradan eklenmiş tablolar (varsa güvenle silinir, yoksa hata vermez)
  IF to_regclass('public.cohort_progress') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.cohort_progress WHERE student_id = $1' USING target_user_id;
  END IF;

  IF to_regclass('public.cohort_members') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.cohort_members WHERE student_id = $1' USING target_user_id;
  END IF;

  IF to_regclass('public.course_feedbacks') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.course_feedbacks WHERE user_id = $1' USING target_user_id;
  END IF;

  IF to_regclass('public.user_follows') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_follows WHERE follower_id = $1 OR following_id = $1' USING target_user_id;
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.notifications WHERE user_id = $1 OR actor_id = $1' USING target_user_id;
  END IF;

  IF to_regclass('public.user_badges') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_badges WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Profili sıfırla: E-posta, şifre, ad-soyad ve rol korunur.
  -- tour_completed sütunu tabloda varsa sıfırlar, yoksa hata almadan atlar.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tour_completed'
  ) THEN
    EXECUTE 'UPDATE public.profiles SET xp = 0, level = 1, learning_area = NULL, skill_level = NULL, onboarding_completed = FALSE, tour_completed = FALSE, avatar_emoji = ''🚀'', updated_at = NOW() WHERE id = $1' USING target_user_id;
  ELSE
    EXECUTE 'UPDATE public.profiles SET xp = 0, level = 1, learning_area = NULL, skill_level = NULL, onboarding_completed = FALSE, avatar_emoji = ''🚀'', updated_at = NOW() WHERE id = $1' USING target_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Öğrencinin tüm kurs kayıtları, ders ilerlemeleri ve verileri başarıyla sıfırlandı.'
  );
END;
$$;

-- Fonksiyon çalıştırma izni
GRANT EXECUTE ON FUNCTION public.admin_reset_student(UUID) TO authenticated, service_role;
