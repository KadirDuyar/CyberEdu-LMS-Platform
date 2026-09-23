-- ============================================================
-- CyberEdu LMS — Supabase Database Migration
-- Supabase SQL Editor'a kopyalayıp çalıştır
-- ============================================================

-- ─── 1. PROFILES ─────────────────────────────────────────────────────────────
-- Supabase auth.users tablosuna bağlı kullanıcı profil bilgileri
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name            TEXT NOT NULL DEFAULT '',
  role                 TEXT NOT NULL DEFAULT 'student'
                       CHECK (role IN ('student', 'teacher', 'admin')),
  avatar_emoji         TEXT NOT NULL DEFAULT '🚀',
  xp                   INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level                INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  learning_area        TEXT CHECK (learning_area IN ('awareness', 'technical', 'both')),
  skill_level          TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. COURSES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN ('awareness', 'technical')),
  level           TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  thumbnail_emoji TEXT NOT NULL DEFAULT '🔐',
  is_mandatory    BOOLEAN NOT NULL DEFAULT TRUE,
  course_type     TEXT NOT NULL DEFAULT 'mandatory' CHECK (course_type IN ('mandatory', 'elective')),
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. LESSONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lessons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT,        -- Markdown formatında ders içeriği
  order_index  INTEGER NOT NULL DEFAULT 0,
  xp_reward    INTEGER NOT NULL DEFAULT 100 CHECK (xp_reward >= 0),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. ACTIVITIES ───────────────────────────────────────────────────────────
-- Ders içindeki interaktif etkinlikler
CREATE TABLE IF NOT EXISTS public.activities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id      UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('multiple_choice', 'true_false', 'fill_blank', 'matching')),
  question       TEXT NOT NULL,
  options        JSONB,          -- Çoktan seçmeli ve eşleştirme için seçenekler
  correct_answer JSONB NOT NULL, -- Doğru cevap(lar)
  explanation    TEXT,           -- Cevap sonrası açıklama
  points         INTEGER NOT NULL DEFAULT 10 CHECK (points >= 0),
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 5. ENROLLMENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

-- ─── 6. LESSON_PROGRESS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id    UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
               CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- ─── 7. ACTIVITY_ATTEMPTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_id   UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_answer   JSONB NOT NULL,
  is_correct    BOOLEAN NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0 CHECK (points_earned >= 0),
  attempted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. BADGES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,  -- 'first_lesson', 'phishing_awareness' vb.
  name        TEXT NOT NULL,
  description TEXT,
  emoji       TEXT NOT NULL DEFAULT '🏆',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 9. USER_BADGES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id  UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Yeni kullanıcı kaydında otomatik profil oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, avatar_emoji)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Kullanıcı'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE
      WHEN NEW.raw_user_meta_data->>'role' = 'teacher' THEN '🎓'
      WHEN NEW.raw_user_meta_data->>'role' = 'admin'   THEN '⚙️'
      ELSE '🚀'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları ekle
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_courses_updated_at ON public.courses;
CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lessons_updated_at ON public.lessons;
CREATE TRIGGER set_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_lesson_progress_updated_at ON public.lesson_progress;
CREATE TRIGGER set_lesson_progress_updated_at
  BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges     ENABLE ROW LEVEL SECURITY;

-- ─── GET ROLE HELPER ───────────────────────────────────────────────────────────
-- RLS politikalarında infinite recursion oluşmasını engellemek için
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
  my_role TEXT;
BEGIN
  SELECT role INTO my_role FROM public.profiles WHERE id = auth.uid();
  RETURN my_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── PROFILES RLS ────────────────────────────────────────────────────────────
-- Herkes kendi profilini görebilir
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Herkes kendi profilini güncelleyebilir
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin tüm profilleri görebilir
CREATE POLICY "profiles_admin_select" ON public.profiles
  FOR SELECT USING (public.get_my_role() = 'admin');

-- Admin rolleri güncelleyebilir
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- Teacher öğrenci profillerini okuyabilir
CREATE POLICY "profiles_teacher_select" ON public.profiles
  FOR SELECT USING (public.get_my_role() IN ('teacher', 'admin'));

-- ─── COURSES RLS ─────────────────────────────────────────────────────────────
-- Herkes yayınlanmış kursları görebilir
CREATE POLICY "courses_select_published" ON public.courses
  FOR SELECT USING (is_published = TRUE);

-- Teacher kendi kurslarını görebilir (yayınlanmamış dahil)
CREATE POLICY "courses_teacher_own" ON public.courses
  FOR SELECT USING (
    created_by = auth.uid() OR public.get_my_role() = 'admin'
  );

-- Teacher kendi kursunu oluşturabilir
CREATE POLICY "courses_teacher_insert" ON public.courses
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND public.get_my_role() IN ('teacher', 'admin')
  );

-- Teacher kendi kursunu güncelleyebilir
CREATE POLICY "courses_teacher_update" ON public.courses
  FOR UPDATE USING (
    created_by = auth.uid() AND public.get_my_role() IN ('teacher', 'admin')
  );

-- Admin tüm kursları yönetebilir
CREATE POLICY "courses_admin_all" ON public.courses
  FOR ALL USING (
    public.get_my_role() = 'admin'
  );

-- ─── LESSONS RLS ─────────────────────────────────────────────────────────────
-- Herkes yayınlanmış dersleri görebilir
CREATE POLICY "lessons_select_published" ON public.lessons
  FOR SELECT USING (is_published = TRUE);

-- Teacher kendi kursunun derslerini yönetebilir
CREATE POLICY "lessons_teacher_manage" ON public.lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.created_by = auth.uid()
    ) AND public.get_my_role() IN ('teacher', 'admin')
  );

-- Admin tüm dersleri yönetebilir
CREATE POLICY "lessons_admin_all" ON public.lessons
  FOR ALL USING (
    public.get_my_role() = 'admin'
  );

-- ─── ACTIVITIES RLS ──────────────────────────────────────────────────────────
-- Herkes yayınlanmış derslerin aktivitelerini görebilir
CREATE POLICY "activities_select_published" ON public.activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = activities.lesson_id AND l.is_published = TRUE
    )
  );

-- Teacher kendi kursunun aktivitelerini yönetebilir
CREATE POLICY "activities_teacher_manage" ON public.activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE l.id = activities.lesson_id
        AND c.created_by = auth.uid()
    ) AND public.get_my_role() IN ('teacher', 'admin')
  );

-- Admin tüm aktiviteleri yönetebilir
CREATE POLICY "activities_admin_all" ON public.activities
  FOR ALL USING (
    public.get_my_role() = 'admin'
  );

-- ─── ENROLLMENTS RLS ─────────────────────────────────────────────────────────
-- Student kendi kayıtlarını görebilir
CREATE POLICY "enrollments_select_own" ON public.enrollments
  FOR SELECT USING (user_id = auth.uid());

-- Student kursa kayıt olabilir
CREATE POLICY "enrollments_insert_own" ON public.enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Teacher ve admin kayıt verilerini okuyabilir
CREATE POLICY "enrollments_teacher_select" ON public.enrollments
  FOR SELECT USING (
    public.get_my_role() IN ('teacher', 'admin')
  );

-- ─── LESSON_PROGRESS RLS ─────────────────────────────────────────────────────
-- Student kendi ilerlemesini görebilir ve güncelleyebilir
CREATE POLICY "lesson_progress_own" ON public.lesson_progress
  FOR ALL USING (user_id = auth.uid());

-- Teacher ilerleme verilerini okuyabilir
CREATE POLICY "lesson_progress_teacher_select" ON public.lesson_progress
  FOR SELECT USING (
    public.get_my_role() IN ('teacher', 'admin')
  );

-- ─── ACTIVITY_ATTEMPTS RLS ───────────────────────────────────────────────────
-- Student kendi denemelerini görebilir ve oluşturabilir
CREATE POLICY "activity_attempts_own" ON public.activity_attempts
  FOR ALL USING (user_id = auth.uid());

-- Teacher deneme verilerini okuyabilir
CREATE POLICY "activity_attempts_teacher_select" ON public.activity_attempts
  FOR SELECT USING (
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

-- ─── BADGES RLS ──────────────────────────────────────────────────────────────
-- Herkes badge'leri görebilir
CREATE POLICY "badges_select_all" ON public.badges
  FOR SELECT USING (TRUE);

-- Admin badge ekleyebilir/güncelleyebilir
CREATE POLICY "badges_admin_manage" ON public.badges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ─── USER_BADGES RLS ─────────────────────────────────────────────────────────
-- Student kendi badge'lerini görebilir
CREATE POLICY "user_badges_select_own" ON public.user_badges
  FOR SELECT USING (user_id = auth.uid());

-- Teacher ve admin kullanıcı badge'lerini görebilir
CREATE POLICY "user_badges_teacher_select" ON public.user_badges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('teacher', 'admin')
    )
  );

-- ============================================================
-- 9. KURS GERİ BİLDİRİMLERİ (Course Feedbacks)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_feedbacks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating       TEXT NOT NULL CHECK (rating IN ('like', 'dislike')),
  comment      TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_course_feedback UNIQUE (course_id, user_id)
);

ALTER TABLE public.course_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedbacks_select_all" ON public.course_feedbacks
  FOR SELECT USING (TRUE);

CREATE POLICY "feedbacks_insert_own" ON public.course_feedbacks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feedbacks_update_own" ON public.course_feedbacks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "feedbacks_delete_own" ON public.course_feedbacks
  FOR DELETE USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ============================================================
-- 10. ÖĞRENCİLER ARASI TAKİP (User Follows)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_follow UNIQUE (follower_id, following_id),
  CONSTRAINT prevent_self_follow CHECK (follower_id <> following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON public.user_follows
  FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert_own" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ============================================================
-- 11. BİLDİRİMLER (Notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type       TEXT NOT NULL CHECK (type IN ('course_feedback', 'new_follower', 'friend_completed_course', 'system')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       JSONB DEFAULT '{}'::jsonb,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- İndeksleme
CREATE INDEX IF NOT EXISTS idx_feedbacks_course_id ON public.course_feedbacks(course_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);

-- ============================================================
-- SEED DATA — Demo içerikler
-- ============================================================

-- Demo Badge'ler
INSERT INTO public.badges (key, name, description, emoji) VALUES
  ('first_login',          'İlk Adım',            'Platforma ilk kez giriş yaptın!',                    '🚀'),
  ('first_lesson',         'İlk Ders',             'İlk dersini tamamladın.',                            '📖'),
  ('phishing_awareness',   'Phishing Farkındalığı','Phishing konusunu başarıyla tamamladın.',            '🎣'),
  ('password_master',      'Parola Ustası',         'Güçlü parola kullanımını öğrendin.',                '🔑'),
  ('web_security_beginner','Web Güvenliği Başlangıcı','Web güvenliğine ilk adımını attın.',              '🌐'),
  ('sql_injection_aware',  'SQL Bilinçlendi',       'SQL Injection riskini öğrendin.',                   '💉'),
  ('quiz_master',          'Quiz Ustası',           '5 aktiviteyi doğru tamamladın.',                    '🧠'),
  ('course_complete',      'Kurs Mezunu',           'Bir kursu başarıyla tamamladın.',                   '🎓')
ON CONFLICT (key) DO NOTHING;
