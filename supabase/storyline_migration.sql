-- ============================================================
-- FAZ 1: Articulate Storyline Entegrasyonu — Şema Migrasyonu
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1a. lessons tablosuna content_type ve storyline_url kolonları ekle
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'default'
    CHECK (content_type = ANY (ARRAY['default'::text, 'storyline'::text])),
  ADD COLUMN IF NOT EXISTS storyline_url TEXT NULL;

COMMENT ON COLUMN public.lessons.content_type IS
  'Dersin içerik tipi: default (normal aktivite akışı) veya storyline (Articulate Storyline tam ekran modu)';
COMMENT ON COLUMN public.lessons.storyline_url IS
  'Articulate Storyline story.html dosyasının tam URL adresi (GitHub Pages veya Supabase Storage)';

-- 1b. activities.type CHECK kısıtlamasını storyline tipini ekleyerek güncelle
-- Önce mevcut kısıtlamayı kaldır (adı farklı olabilir; tüm olası adlar deneniyor)
DO $$
BEGIN
  -- Kısıtlama adını dinamik olarak bul ve kaldır
  DECLARE
    v_constraint_name text;
  BEGIN
    SELECT constraint_name INTO v_constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'activities'
      AND constraint_type = 'CHECK'
      AND constraint_name ILIKE '%type%'
    LIMIT 1;

    IF v_constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS %I', v_constraint_name);
    END IF;
  END;
END $$;

-- Yeni CHECK kısıtlaması (storyline dahil)
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_type_check;
ALTER TABLE public.activities ADD CONSTRAINT activities_type_check
  CHECK (type = ANY (ARRAY[
    'heading'::text,
    'text'::text,
    'multiple_choice'::text,
    'true_false'::text,
    'fill_blank'::text,
    'matching'::text,
    'ordering'::text,
    'memory_card'::text,
    'scenario'::text,
    'hotspot'::text,
    'youtube'::text,
    'phishing_detector'::text,
    'storyline'::text
  ]));

-- 1c. Storyline paketleri için Supabase Storage bucket'ı oluştur (public)
-- Not: Bu komutu Supabase Dashboard → Storage → New Bucket üzerinden de yapabilirsiniz.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'storyline-packages',
  'storyline-packages',
  true,
  524288000, -- 500 MB limit
  ARRAY['application/zip', 'application/x-zip-compressed', 'text/html', 'application/javascript', 'text/css', 'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- 1d. Storage RLS politikaları
-- Herkes okuyabilir (public bucket)
CREATE POLICY IF NOT EXISTS "storyline_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'storyline-packages');

-- Sadece öğretmenler yükleyebilir
CREATE POLICY IF NOT EXISTS "storyline_teacher_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'storyline-packages'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('teacher', 'admin')
    )
  );

-- Sadece sahibi silebilir
CREATE POLICY IF NOT EXISTS "storyline_teacher_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'storyline-packages'
    AND auth.uid() = owner
  );

-- Tamamlandı
SELECT 'FAZ 1: Storyline migration başarıyla uygulandı!' AS result;
