-- ============================================================
-- CyberEdu LMS: Öğrenci Sıfırlama Fonksiyonu (E-posta ve Şifre Hariç Her Şeyi Temizler)
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

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

  -- 5. Sınıf / Haftalık Program üyelikleri ve haftalık görev ilerlemeleri
  DELETE FROM public.cohort_progress WHERE student_id = target_user_id;
  DELETE FROM public.cohort_members WHERE student_id = target_user_id;

  -- 6. Takipçi ve takip edilen ilişkileri
  DELETE FROM public.user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;

  -- 7. Bildirimler (kullanıcıya gelen ve oluşturduğu)
  DELETE FROM public.notifications WHERE user_id = target_user_id OR actor_id = target_user_id;

  -- 8. Kazanılan rozetler ve başarılar
  DELETE FROM public.user_badges WHERE user_id = target_user_id;

  -- 9. Profili sıfırla: E-posta ve şifre auth tablosunda korunur; full_name ve role korunur.
  -- Geri kalan tüm alanlar başlangıç durumuna döndürülür.
  UPDATE public.profiles
  SET xp = 0,
      level = 1,
      learning_area = NULL,
      skill_level = NULL,
      onboarding_completed = FALSE,
      tour_completed = FALSE,
      avatar_emoji = '🚀',
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Öğrencinin e-postası ve şifresi hariç tüm kurs kayıtları, program üyelikleri, ders ilerlemeleri, rozetleri ve bildirimleri kalıcı olarak silindi.'
  );
END;
$$;

-- Çalıştırma iznini tanımla
GRANT EXECUTE ON FUNCTION public.admin_reset_student(UUID) TO authenticated, service_role;
