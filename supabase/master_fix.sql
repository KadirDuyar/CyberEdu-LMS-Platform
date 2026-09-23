-- 1. ÖNCE MEVCUT FONKSİYONU DÜŞÜRÜYORUZ (Return type hatasını önlemek için)
DROP FUNCTION IF EXISTS public.admin_reset_student(uuid);

-- 2. GET_MY_ROLE FONKSİYONUNU GÜVENLİ BİR ŞEKİLDE (YENİDEN) OLUŞTURUYORUZ
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  my_role TEXT;
BEGIN
  SELECT role INTO my_role FROM public.profiles WHERE id = auth.uid();
  RETURN my_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==========================================
-- 3. VERİTABANI ŞEMA VE KISITLAMA DÜZELTMELERİ
-- ==========================================

-- 3a. Activities tablosunda question ve correct_answer kolonlarını NULL yapılabilir hale getiriyoruz
ALTER TABLE public.activities ALTER COLUMN question DROP NOT NULL;
ALTER TABLE public.activities ALTER COLUMN correct_answer DROP NOT NULL;

-- 3b. Sadece soru tipleri için question/correct_answer zorunluluğu getiren CHECK kısıtlaması ekliyoruz
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS check_activity_question_req;
ALTER TABLE public.activities ADD CONSTRAINT check_activity_question_req 
  CHECK (
    type IN ('heading', 'text', 'youtube') 
    OR (question IS NOT NULL AND correct_answer IS NOT NULL)
  );

-- 3c. Courses tablosundan gereksiz is_mandatory kolonunu kaldırıyoruz (zaten course_type var)
ALTER TABLE public.courses DROP COLUMN IF EXISTS is_mandatory;

-- 3d. Eksik UNIQUE kısıtlamalarını ekliyoruz (Mükerrer veri basılmasını önler)
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_user_course_unique;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id);

ALTER TABLE public.lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_lesson_unique;
ALTER TABLE public.lesson_progress ADD CONSTRAINT lesson_progress_user_lesson_unique UNIQUE (user_id, lesson_id);

ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_user_badge_unique;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_badge_unique UNIQUE (user_id, badge_id);

ALTER TABLE public.course_feedbacks DROP CONSTRAINT IF EXISTS course_feedbacks_user_course_unique;
ALTER TABLE public.course_feedbacks ADD CONSTRAINT course_feedbacks_user_course_unique UNIQUE (user_id, course_id);

ALTER TABLE public.user_follows DROP CONSTRAINT IF EXISTS user_follows_unique;
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id);

ALTER TABLE public.user_follows DROP CONSTRAINT IF EXISTS user_follows_no_self_follow;
ALTER TABLE public.user_follows ADD CONSTRAINT user_follows_no_self_follow CHECK (follower_id <> following_id);

-- 3e. Enrollments status için CHECK kısıtlaması
ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_status_check CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'dropped'::text]));

-- 3f. ON DELETE CASCADE kısıtlamalarını eklemek için mevcut Foreign Key'leri güncelliyoruz
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_created_by_fkey;
ALTER TABLE public.courses ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey;
ALTER TABLE public.lessons ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_lesson_id_fkey;
ALTER TABLE public.activities ADD CONSTRAINT activities_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- 3g. Foreign Key performans iyileştirmesi (İndeksler)
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON public.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_activities_lesson_id ON public.activities(lesson_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress(user_id, lesson_id);


-- ==========================================
-- 4. RLS POLİTİKALARI (ÖNCE DÜŞÜR, SONRA OLUŞTUR)
-- ==========================================

DROP POLICY IF EXISTS "enrollments_admin_all" ON public.enrollments;
CREATE POLICY "enrollments_admin_all" ON public.enrollments FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "enrollments_delete_own" ON public.enrollments;
CREATE POLICY "enrollments_delete_own" ON public.enrollments FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "lesson_progress_admin_all" ON public.lesson_progress;
CREATE POLICY "lesson_progress_admin_all" ON public.lesson_progress FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "lesson_progress_delete_own" ON public.lesson_progress;
CREATE POLICY "lesson_progress_delete_own" ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "activity_attempts_admin_all" ON public.activity_attempts;
CREATE POLICY "activity_attempts_admin_all" ON public.activity_attempts FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "activity_attempts_delete_own" ON public.activity_attempts;
CREATE POLICY "activity_attempts_delete_own" ON public.activity_attempts FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_badges_admin_all" ON public.user_badges;
CREATE POLICY "user_badges_admin_all" ON public.user_badges FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "user_badges_delete_own" ON public.user_badges;
CREATE POLICY "user_badges_delete_own" ON public.user_badges FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feedbacks_admin_all" ON public.course_feedbacks;
CREATE POLICY "feedbacks_admin_all" ON public.course_feedbacks FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "follows_admin_all" ON public.user_follows;
CREATE POLICY "follows_admin_all" ON public.user_follows FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "user_follows_delete_following" ON public.user_follows;
CREATE POLICY "user_follows_delete_following" ON public.user_follows FOR DELETE USING (auth.uid() = following_id);

DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_admin_all" ON public.notifications FOR ALL USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_actor" ON public.notifications;
CREATE POLICY "notifications_delete_actor" ON public.notifications FOR DELETE USING (auth.uid() = actor_id);


-- ==========================================
-- 5. ADMIN SIFIRLAMA FONKSİYONUNU OLUŞTUR
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_reset_student(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.activity_attempts WHERE user_id = target_user_id;
  DELETE FROM public.lesson_progress WHERE user_id = target_user_id;
  DELETE FROM public.enrollments WHERE user_id = target_user_id;
  DELETE FROM public.course_feedbacks WHERE user_id = target_user_id;
  DELETE FROM public.user_follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id OR actor_id = target_user_id;
  DELETE FROM public.user_badges WHERE user_id = target_user_id;

  UPDATE public.profiles
  SET xp = 0,
      level = 1,
      learning_area = NULL,
      skill_level = NULL,
      onboarding_completed = FALSE,
      avatar_emoji = '🛡️',
      updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Öğrencinin e-postası ve şifresi hariç tüm verileri başarıyla sıfırlandı.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_student(UUID) TO authenticated, service_role;
