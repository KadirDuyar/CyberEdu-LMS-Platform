-- ==============================================================================
-- CyberEdu LMS: Zorunlu ve Seçmeli Kurslar + Enrollments Şema Güncellemesi
-- Supabase Dashboard -> SQL Editor alanına yapıştırıp "Run" butonuna basınız.
-- ==============================================================================

-- 1. ENROLLMENTS TABLOSU GÜNCELLEMESİ
-- status ve completed_at sütunlarını güvenle ekleyelim (kod tarafında PGRST204 hatasını önler)
ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.enrollments 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. COURSES TABLOSU GÜNCELLEMESİ
-- is_mandatory ve course_type sütunlarını ekleyelim
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS course_type TEXT NOT NULL DEFAULT 'mandatory'
CHECK (course_type IN ('mandatory', 'elective'));

-- 3. MEVCUT KURS TÜRLERİNİ AYARLAMA

-- A) FARKINDALIK PARKURU (Awareness)
-- Zorunlu Kurslar: Temel Siber Güvenlik Yol Haritası (Öğrenme Yolculuğum'da görünür)
UPDATE public.courses
SET is_mandatory = TRUE, course_type = 'mandatory'
WHERE category = 'awareness' 
  AND (
    title ILIKE '%Siber Güvenliğe Giriş%'
    OR title ILIKE '%Phishing Nedir%'
    OR title ILIKE '%Güçlü Parola%'
  );

-- Seçmeli Kurslar: İsteğe bağlı ek beceri ve XP kursları (Kurslar menüsünde görünür)
UPDATE public.courses
SET is_mandatory = FALSE, course_type = 'elective'
WHERE category = 'awareness' 
  AND (
    title ILIKE '%MFA%'
    OR title ILIKE '%2FA%'
    OR title ILIKE '%Ağ Kullanımı%'
    OR title ILIKE '%Sosyal Mühendislik%'
  );

-- B) TEKNİK GÜVENLİK PARKURU (Technical)
-- Zorunlu Kurslar: Temel Web Güvenliği Müfredatı (Öğrenme Yolculuğum'da görünür)
UPDATE public.courses
SET is_mandatory = TRUE, course_type = 'mandatory'
WHERE category = 'technical' 
  AND (
    title ILIKE '%HTTP%'
    OR title ILIKE '%SQL Injection%'
    OR title ILIKE '%XSS%'
  );

-- Seçmeli Kurslar: İleri düzey teknik konular (Kurslar menüsünde görünür)
UPDATE public.courses
SET is_mandatory = FALSE, course_type = 'elective'
WHERE category = 'technical' 
  AND (
    title ILIKE '%Brute Force%'
    OR title ILIKE '%Port Güvenliği%'
    OR title ILIKE '%Network%'
  );

-- 4. KONTROL SORGUSU (Eklenen sütunları ve kurs durumlarını kontrol etmek için)
SELECT id, title, category, is_mandatory, course_type, is_published 
FROM public.courses 
ORDER BY category, is_mandatory DESC, created_at ASC;
