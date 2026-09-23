-- ============================================================
-- CyberEdu LMS: Eğitmen Yorum Yanıtlama (Teacher Reply Migration)
-- Bağımsız, hatasız ve doğrudan çalıştırılabilir tam SQL
-- ============================================================

-- 1. Helper Fonksiyonu Güvenle Oluştur (get_my_role)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role, anon;

-- 2. Yorum Tablosuna Öğretmen Yanıt Sütunlarını Ekle
ALTER TABLE public.course_feedbacks 
ADD COLUMN IF NOT EXISTS teacher_reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE;

-- 3. Öğretmen & Admin Güncelleme İzni (Doğrudan Profiles Tablosunu Kontrol Eder)
DROP POLICY IF EXISTS "feedbacks_teacher_update" ON public.course_feedbacks;
CREATE POLICY "feedbacks_teacher_update" ON public.course_feedbacks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- 4. Eğitmen Yanıt RPC Fonksiyonu (Öğrenciye Otomatik Bildirim Gönderir)
CREATE OR REPLACE FUNCTION public.reply_course_feedback(
  p_feedback_id UUID,
  p_reply TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id UUID;
  v_student_id UUID;
  v_course_title TEXT;
  v_teacher_name TEXT;
  v_user_role TEXT;
BEGIN
  -- Öğretmen veya admin yetki kontrolü
  SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
  IF v_user_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Bu işlem için yetkiniz yok!';
  END IF;

  -- Yorumu güncelle
  UPDATE public.course_feedbacks
  SET teacher_reply = p_reply,
      replied_at = NOW(),
      updated_at = NOW()
  WHERE id = p_feedback_id
  RETURNING course_id, user_id INTO v_course_id, v_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geri bildirim bulunamadı!';
  END IF;

  -- Kurs ve eğitmen bilgilerini al
  SELECT title INTO v_course_title FROM public.courses WHERE id = v_course_id;
  SELECT full_name INTO v_teacher_name FROM public.profiles WHERE id = auth.uid();

  -- Öğrenciye anlık bildirim ekle
  INSERT INTO public.notifications (user_id, actor_id, type, title, message, data)
  VALUES (
    v_student_id,
    auth.uid(),
    'course_feedback',
    'Eğitmen Yorumunuzu Yanıtladı 💬',
    COALESCE(v_teacher_name, 'Eğitmeniniz') || ', "' || COALESCE(v_course_title, 'Kurs') || '" hakkındaki yorumunuza cevap verdi.',
    jsonb_build_object('courseId', v_course_id, 'feedbackId', p_feedback_id)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Yanıt başarıyla kaydedildi.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reply_course_feedback(UUID, TEXT) TO authenticated, service_role;
