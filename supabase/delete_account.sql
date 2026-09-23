-- ============================================================
-- CyberEdu LMS: Hesap Silme (Delete Own User Account) Migration
-- Kullanıcı 'Hesabımı Sil' dediğinde tüm kişisel verilerini, yorumlarını,
-- beğenilerini, takiplerini, başarılarını ve profilini güvenle temizler.
-- ============================================================

-- 1. DELETE POLICIES (Kullanıcının kendi verilerini silebilmesi için RLS izinleri)
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_badges_delete_own" ON public.user_badges;
CREATE POLICY "user_badges_delete_own" ON public.user_badges
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "activity_attempts_delete_own" ON public.activity_attempts;
CREATE POLICY "activity_attempts_delete_own" ON public.activity_attempts
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_progress_delete_own" ON public.lesson_progress;
CREATE POLICY "lesson_progress_delete_own" ON public.lesson_progress
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "enrollments_delete_own" ON public.enrollments;
CREATE POLICY "enrollments_delete_own" ON public.enrollments
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_actor" ON public.notifications;
CREATE POLICY "notifications_delete_actor" ON public.notifications
  FOR DELETE USING (auth.uid() = actor_id);

DROP POLICY IF EXISTS "user_follows_delete_following" ON public.user_follows;
CREATE POLICY "user_follows_delete_following" ON public.user_follows
  FOR DELETE USING (auth.uid() = following_id);

-- 2. SECURITY DEFINER RPC Fonksiyonu
-- Tüm RLS kısıtlamalarını aşarak tek bir işlemde (atomic transaction) kullanıcının tüm verilerini temizler.
CREATE OR REPLACE FUNCTION public.delete_own_user_account()
RETURNS JSONB AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Yetkilendirilmemiş kullanıcı!';
  END IF;

  -- 1. Kurs yorumları ve değerlendirmeleri (like/dislike)
  DELETE FROM public.course_feedbacks WHERE user_id = current_user_id;

  -- 2. Bildirimler (hem kullanıcıya gelen hem kullanıcının tetiklediği bildirimler)
  DELETE FROM public.notifications WHERE user_id = current_user_id OR actor_id = current_user_id;

  -- 3. Takip ilişkileri (kullanıcının takip ettikleri ve kullanıcıyı takip edenler)
  DELETE FROM public.user_follows WHERE follower_id = current_user_id OR following_id = current_user_id;

  -- 4. Ders ilerlemeleri, sınav girişimleri ve kurs kayıtları
  DELETE FROM public.activity_attempts WHERE user_id = current_user_id;
  DELETE FROM public.lesson_progress WHERE user_id = current_user_id;
  DELETE FROM public.enrollments WHERE user_id = current_user_id;

  -- 5. Kullanıcının kazandığı başarılar ve rozetler
  DELETE FROM public.user_badges WHERE user_id = current_user_id;

  -- 6. Eğer eğitmen ise oluşturduğu kursların sahipliğini NULL yap (kurslar sistemde kalsın ama yazarı boşa düşsün)
  UPDATE public.courses SET created_by = NULL WHERE created_by = current_user_id;

  -- 7. Profil tablosundaki ana kayıt
  DELETE FROM public.profiles WHERE id = current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Kullanıcının yorumları, beğenileri, takipleri, başarıları ve profili başarıyla silindi.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
