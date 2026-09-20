-- ==============================================================================
-- 🛠️ CYBEREDU LMS: SIFIRLAMA, RLS VE AKTİVİTE TİPİ ONARIM SQL'İ
-- Dosya: supabase/fix_reset_progress.sql
-- Bu script'i Supabase Dashboard > SQL Editor alanında çalıştırın.
-- ==============================================================================

-- ─── BÖLÜM 1: ACTIVITIES.TYPE KISITININ GÜNCELLENMESİ ──────────────────────────
-- Yeni interaktif blok türleri (ordering, memory_card, scenario, hotspot, youtube vb.)
-- için kısıt güncellenir.
ALTER TABLE public.activities 
  DROP CONSTRAINT IF EXISTS activities_type_check;

ALTER TABLE public.activities 
  ADD CONSTRAINT activities_type_check 
  CHECK (type IN (
    'heading',
    'text',
    'multiple_choice',
    'true_false',
    'fill_blank',
    'matching',
    'ordering',
    'memory_card',
    'scenario',
    'hotspot',
    'youtube'
  ));

-- ─── BÖLÜM 2: ADMIN RLS (SİLME/YÖNETİM) POLİTİKALARI ───────────────────────────
-- Admin rolünün enrollments, lesson_progress ve activity_attempts tablolarında
-- doğrudan silme/düzenleme yapabilmesi için izinler tanımlanır.

-- 1. Enrollments
DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_admin_all" ON public.enrollments
  FOR ALL USING (
    public.get_my_role() = 'admin'
  );

-- 2. Lesson Progress
DROP POLICY IF EXISTS "lesson_progress_admin_all" ON public.lesson_progress;
CREATE POLICY "lesson_progress_admin_all" ON public.lesson_progress
  FOR ALL USING (
    public.get_my_role() = 'admin'
  );

-- 3. Activity Attempts
DROP POLICY IF EXISTS "activity_attempts_admin_all" ON public.activity_attempts;
CREATE POLICY "activity_attempts_admin_all" ON public.activity_attempts
  FOR ALL USING (
    public.get_my_role() = 'admin'
  );

-- ─── BÖLÜM 3: GELİŞMİŞ VE GÜVENLİ admin_reset_student FONKSİYONU ───────────────
-- Hem silinen satır sayılarını döndürür hem de çağıran kişinin admin olduğunu doğrular.
-- Oturumsuz / yetkisiz çağrılarda hata verir.
CREATE OR REPLACE FUNCTION public.admin_reset_student(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_role TEXT;
  v_attempts_deleted INT := 0;
  v_progress_deleted INT := 0;
  v_enrollments_deleted INT := 0;
  v_result JSONB;
BEGIN
  -- 1. Yetki Kontrolü: Çağıran kullanıcının rolü admin mi?
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Bu işlem için oturum açılması gerekmektedir.';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Yalnızca yöneticiler (admin) öğrenci ilerlemesini sıfırlayabilir.';
  END IF;

  -- 2. İlgili tablolardan verileri temizle ve silinen satırları say
  WITH del_attempts AS (
    DELETE FROM public.activity_attempts WHERE user_id = target_user_id RETURNING 1
  ) SELECT COUNT(*) INTO v_attempts_deleted FROM del_attempts;

  WITH del_progress AS (
    DELETE FROM public.lesson_progress WHERE user_id = target_user_id RETURNING 1
  ) SELECT COUNT(*) INTO v_progress_deleted FROM del_progress;

  WITH del_enrollments AS (
    DELETE FROM public.enrollments WHERE user_id = target_user_id RETURNING 1
  ) SELECT COUNT(*) INTO v_enrollments_deleted FROM del_enrollments;

  -- 3. Öğrenci Profilini Sıfırla (XP, Level, Onboarding)
  UPDATE public.profiles
  SET
    learning_area = NULL,
    skill_level = NULL,
    onboarding_completed = FALSE,
    xp = 0,
    level = 1,
    updated_at = NOW()
  WHERE id = target_user_id;

  -- 4. Bilgilendirici JSON yanıtı döndür
  v_result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'deleted_attempts', v_attempts_deleted,
    'deleted_progress', v_progress_deleted,
    'deleted_enrollments', v_enrollments_deleted
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── BÖLÜM 4: TANI VE DENETİM SORGUSU (DIAGNOSTIC QUERY) ───────────────────────
-- Sıfırlama sonrası bir kullanıcının artık kaydı kalıp kalmadığını denetlemek için:
-- SELECT 
--   p.id AS user_id,
--   p.full_name,
--   p.xp,
--   (SELECT COUNT(*) FROM public.lesson_progress lp WHERE lp.user_id = p.id) AS remaining_progress,
--   (SELECT COUNT(*) FROM public.activity_attempts aa WHERE aa.user_id = p.id) AS remaining_attempts,
--   (SELECT COUNT(*) FROM public.enrollments en WHERE en.user_id = p.id) AS remaining_enrollments
-- FROM public.profiles p
-- WHERE p.id = 'HEDEF_OGRENCI_UUID';
