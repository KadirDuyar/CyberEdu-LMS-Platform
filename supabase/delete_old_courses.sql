-- ============================================================
-- CyberEdu LMS: Eski / İstenmeyen Kursları Temizleme Scripti
-- "Kurumsal Siber Güvenlik" ve "Uygulama Güvenliği ve Zafiyet Analizi"
-- ============================================================

-- 1. Bu kurslara ait aktivitelerin deneme kayıtlarını sil
DELETE FROM public.activity_attempts
WHERE activity_id IN (
  SELECT a.id FROM public.activities a
  JOIN public.lessons l ON l.id = a.lesson_id
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.title ILIKE '%Kurumsal Siber Güvenlik%' 
     OR c.title ILIKE '%Uygulama Güvenliği%'
);

-- 2. Bu kurslara ait aktiviteleri sil
DELETE FROM public.activities
WHERE lesson_id IN (
  SELECT l.id FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.title ILIKE '%Kurumsal Siber Güvenlik%' 
     OR c.title ILIKE '%Uygulama Güvenliği%'
);

-- 3. Bu kurslara ait öğrenci ders ilerlemelerini sil
DELETE FROM public.lesson_progress
WHERE lesson_id IN (
  SELECT l.id FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE c.title ILIKE '%Kurumsal Siber Güvenlik%' 
     OR c.title ILIKE '%Uygulama Güvenliği%'
);

-- 4. Bu kurslara ait dersleri sil
DELETE FROM public.lessons
WHERE course_id IN (
  SELECT id FROM public.courses
  WHERE title ILIKE '%Kurumsal Siber Güvenlik%' 
     OR title ILIKE '%Uygulama Güvenliği%'
);

-- 5. Bu kurslara ait öğrenci kayıtlarını (enrollments) sil
DELETE FROM public.enrollments
WHERE course_id IN (
  SELECT id FROM public.courses
  WHERE title ILIKE '%Kurumsal Siber Güvenlik%' 
     OR title ILIKE '%Uygulama Güvenliği%'
);

-- 6. Kursların kendilerini sil
DELETE FROM public.courses
WHERE title ILIKE '%Kurumsal Siber Güvenlik%' 
   OR title ILIKE '%Uygulama Güvenliği%';

-- Tamamlandı bildirimi
DO $$
BEGIN
  RAISE NOTICE 'Eski kurslar ("Kurumsal Siber Güvenlik" ve "Uygulama Güvenliği") başarıyla veritabanından temizlendi.';
END $$;
