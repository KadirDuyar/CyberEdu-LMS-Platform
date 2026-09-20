-- 1. Ders Sıralamasını Atomik Güncelleyen RPC Fonksiyonu
CREATE OR REPLACE FUNCTION public.reorder_lessons(p_course_id UUID, p_lesson_ids UUID[])
RETURNS VOID AS $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..array_length(p_lesson_ids, 1) LOOP
    UPDATE public.lessons
    SET order_index = i - 1
    WHERE id = p_lesson_ids[i] AND course_id = p_course_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Yeni Eklenen Dersin Her Zaman En Sona Eklenmesini Garanti Eden Trigger
CREATE OR REPLACE FUNCTION public.set_new_lesson_order_index()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_index IS NULL OR NEW.order_index = 0 THEN
    SELECT COALESCE(MAX(order_index) + 1, 0)
    INTO NEW.order_index
    FROM public.lessons
    WHERE course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_lesson_order ON public.lessons;
CREATE TRIGGER trg_set_lesson_order
  BEFORE INSERT ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_new_lesson_order_index();

-- 3. Eksik activity_attempts RLS Politikasını Onar
DROP POLICY IF EXISTS "activity_attempts_teacher_select" ON public.activity_attempts;
CREATE POLICY "activity_attempts_teacher_select" ON public.activity_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

-- 4. Admin Öğrenci Sıfırlama Fonksiyonu (Tam Yetkili ve Hatasız)
CREATE OR REPLACE FUNCTION public.admin_reset_student(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF public.get_my_role() <> 'admin' THEN
    RAISE EXCEPTION 'Yalnızca sistem yöneticileri bu işlemi yapabilir.';
  END IF;

  DELETE FROM public.activity_attempts WHERE user_id = target_user_id;
  DELETE FROM public.lesson_progress WHERE user_id = target_user_id;
  DELETE FROM public.enrollments WHERE user_id = target_user_id;

  UPDATE public.profiles
  SET
    learning_area = NULL,
    skill_level = NULL,
    onboarding_completed = FALSE,
    xp = 0,
    level = 1
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;