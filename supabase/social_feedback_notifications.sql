-- ============================================================
-- CyberEdu LMS: Sosyal Etkileşim, Geri Bildirim ve Bildirim Tabloları
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- ─── 1. KURS GERİ BİLDİRİMLERİ (Like/Dislike & Yorumlar) ─────
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

-- RLS: course_feedbacks
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

-- ─── 2. ÖĞRENCİLER ARASI TAKİP (User Follows) ─────────────────
CREATE TABLE IF NOT EXISTS public.user_follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_follow UNIQUE (follower_id, following_id),
  CONSTRAINT prevent_self_follow CHECK (follower_id <> following_id)
);

-- RLS: user_follows
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follows_select_all" ON public.user_follows
  FOR SELECT USING (TRUE);

CREATE POLICY "follows_insert_own" ON public.user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_own" ON public.user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ─── 3. BİLDİRİMLER (Notifications) ──────────────────────────
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

-- RLS: notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── İNDEKSLEME ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feedbacks_course_id ON public.course_feedbacks(course_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, is_read);
