-- ============================================================
-- CyberEdu LMS: Admin İlerleme ve Veri Sıfırlama Düzeltmesi
-- Admin 'İlerlemeyi Sıfırla' dediğinde öğrencinin e-postası ve şifresi hariç
-- tüm verileri (ders ilerlemeleri, sınavlar, kurs kayıtları, yorumlar,
-- bildirimler, takip ilişkileri, rozetler) kalıcı olarak sıfırlanır ve silinir.
-- ============================================================

-- 0. Profiles Tablosuna tour_completed Sütununu Ekle (Tek Seferlik Yönerge Takibi)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN NOT NULL DEFAULT false;

-- 1. Helper: public.get_my_role()
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  my_role TEXT;
BEGIN
  SELECT role INTO my_role FROM public.profiles WHERE id = auth.uid();
  RETURN my_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. ADMIN RLS POLICIES FOR DELETE & MANAGE (Client-side doğrudan silme için garanti izinler)

-- ENROLLMENTS
DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_admin_all" ON public.enrollments
  FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "enrollments_delete_own" ON public.enrollments;
CREATE POLICY "enrollments_delete_own" ON public.enrollments
  FOR DELETE USING (auth.uid() = user_id);

-- LESSON_PROGRESS
DROP POLICY IF EXISTS "lesson_progress_admin_all" ON public.lesson_progress;
CREATE POLICY "lesson_progress_admin_all" ON public.lesson_progress
  FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "lesson_progress_delete_own" ON public.lesson_progress;
CREATE POLICY "lesson_progress_delete_own" ON public.lesson_progress
  FOR DELETE USING (auth.uid() = user_id);

-- ACTIVITY_ATTEMPTS
DROP POLICY IF EXISTS "activity_attempts_admin_all" ON public.activity_attempts;
CREATE POLICY "activity_attempts_admin_all" ON public.activity_attempts
  FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "activity_attempts_delete_own" ON public.activity_attempts;
CREATE POLICY "activity_attempts_delete_own" ON public.activity_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- USER_BADGES
DROP POLICY IF EXISTS "user_badges_admin_all" ON public.user_badges;
CREATE POLICY "user_badges_admin_all" ON public.user_badges
  FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "user_badges_delete_own" ON public.user_badges;
CREATE POLICY "user_badges_delete_own" ON public.user_badges
  FOR DELETE USING (auth.uid() = user_id);

-- COURSE_FEEDBACKS
DROP POLICY IF EXISTS "feedbacks_admin_all" ON public.course_feedbacks;
CREATE POLICY "feedbacks_admin_all" ON public.course_feedbacks
  FOR ALL USING (public.get_my_role() = 'admin');

-- USER_FOLLOWS
DROP POLICY IF EXISTS "follows_admin_all" ON public.user_follows;
CREATE POLICY "follows_admin_all" ON public.user_follows
  FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "user_follows_delete_following" ON public.user_follows;
CREATE POLICY "user_follows_delete_following" ON public.user_follows
  FOR DELETE USING (auth.uid() = following_id);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_admin_all" ON public.notifications
  FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_actor" ON public.notifications;
CREATE POLICY "notifications_delete_actor" ON public.notifications
  FOR DELETE USING (auth.uid() = actor_id);

-- 3. ADMIN RESET RPC FUNCTION (SECURITY DEFINER ile atomik ve RLS baypaslı)
DROP FUNCTION IF EXISTS public.admin_reset_student(UUID);
CREATE OR REPLACE FUNCTION public.admin_reset_student(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Sınav ve aktivite denemeleri
  DELETE FROM public.activity_attempts WHERE user_id = target_user_id;

  -- 2. Ders tamamlama ve ilerleme kayıtları
  DELETE FROM public.lesson_progress WHERE user_id = target_user_id;

  -- 3. Kayıtlı olunan tüm kurslar (enrollments)
  DELETE FROM public.enrollments WHERE user_id = target_user_id;

  -- 4. Yapılan tüm kurs yorumları ve beğenileri
  DELETE FROM public.course_feedbacks WHERE user_id = target_user_id;

  -- 5. Sınıf / Haftalık Program üyelikleri ve haftalık ilerlemeler
  DELETE FROM public.cohort_progress WHERE student_id = target_user_id;
  DELETE FROM public.cohort_members WHERE student_id = target_user_id;

  -- 6. Takipçi ve takip edilen ilişkileri
  DELETE FROM public.user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;

  -- 7. Bildirimler (hem kullanıcıya gelen hem kullanıcının oluşturduğu)
  DELETE FROM public.notifications WHERE user_id = target_user_id OR actor_id = target_user_id;

  -- 8. Kazanılan rozetler ve başarılar
  DELETE FROM public.user_badges WHERE user_id = target_user_id;

  -- 8. Profili sıfırla: E-posta ve şifre auth tablosunda korunur; full_name ve role korunur.
  -- Geri kalan tüm alanlar ve yönerge turu başlangıç durumuna döndürülür.
  UPDATE public.profiles
  SET xp = 0,
      level = 1,
      learning_area = NULL,
      skill_level = NULL,
      onboarding_completed = FALSE,
      tour_completed = FALSE,
      avatar_emoji = '🛡️',
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Öğrencinin e-postası ve şifresi hariç tüm kurs kayıtları, ilerlemeleri, yorumları, takipleri ve rozetleri başarıyla sıfırlandı.'
  );
END;
$$;

-- Fonksiyon çalıştırma iznini ver
GRANT EXECUTE ON FUNCTION public.admin_reset_student(UUID) TO authenticated, service_role;
