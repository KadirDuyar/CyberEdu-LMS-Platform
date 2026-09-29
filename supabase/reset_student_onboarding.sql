-- ============================================================
-- CyberEdu LMS: Öğrenci Navigator ve Tanıtım Yönergelerini Sıfırlama
-- Kurs ve ders ilerlemelerine, XP, rozet ve kayıtlara DOKUNMAZ.
-- Yalnızca Navigator seçimini ve site tanıtım turunu (rehberi) baştan başlatır.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_reset_student_onboarding(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET onboarding_completed = FALSE,
      tour_completed = FALSE,
      learning_area = NULL,
      skill_level = NULL,
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Öğrencinin sadece navigator ve site tanıtım yönergeleri sıfırlandı. İlerlemeler ve puanlar korundu.'
  );
END;
$$;

-- Çalıştırma iznini tanımla
GRANT EXECUTE ON FUNCTION public.admin_reset_student_onboarding(UUID) TO authenticated, service_role;
