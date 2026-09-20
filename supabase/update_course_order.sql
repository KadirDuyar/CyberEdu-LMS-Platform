-- ==============================================================================
-- KURS SIRALAMASI GÜNCELLEMESİ (Öğrenme Yolculuğu Sırası)
-- Supabase Dashboard -> SQL Editor alanına yapıştırıp "Run" butonuna basınız.
-- ==============================================================================

-- Bu dosya, teknik ve farkındalık parkurlarındaki kursların Öğrenme Haritası'ndaki 
-- sıralamasını doğru yansıtması için oluşturulma tarihlerini (created_at) günceller.
-- Çünkü sistem, kursları created_at değerlerine göre sıralar.

-- 1. FARKINDALIK PARKURU
UPDATE public.courses SET created_at = '2024-01-01 10:00:00+00' WHERE category = 'awareness' AND title ILIKE '%Siber Güvenliğe Giriş%';
UPDATE public.courses SET created_at = '2024-01-01 10:01:00+00' WHERE category = 'awareness' AND title ILIKE '%Phishing%';
UPDATE public.courses SET created_at = '2024-01-01 10:02:00+00' WHERE category = 'awareness' AND title ILIKE '%Güçlü Parola%';
UPDATE public.courses SET created_at = '2024-01-01 10:03:00+00' WHERE category = 'awareness' AND title ILIKE '%MFA%';
UPDATE public.courses SET created_at = '2024-01-01 10:04:00+00' WHERE category = 'awareness' AND title ILIKE '%Sosyal Mühendislik%';

-- 2. TEKNİK PARKUR
UPDATE public.courses SET created_at = '2024-01-01 10:00:00+00' WHERE category = 'technical' AND title ILIKE '%Web Uygulama Mimarisi%';
UPDATE public.courses SET created_at = '2024-01-01 10:01:00+00' WHERE category = 'technical' AND title ILIKE '%Güvenli Kod%';
UPDATE public.courses SET created_at = '2024-01-01 10:02:00+00' WHERE category = 'technical' AND title ILIKE '%HTTP%';
UPDATE public.courses SET created_at = '2024-01-01 10:03:00+00' WHERE category = 'technical' AND title ILIKE '%SQL Injection%';
UPDATE public.courses SET created_at = '2024-01-01 10:04:00+00' WHERE category = 'technical' AND title ILIKE '%XSS%';
UPDATE public.courses SET created_at = '2024-01-01 10:05:00+00' WHERE category = 'technical' AND title ILIKE '%Brute Force%';
UPDATE public.courses SET created_at = '2024-01-01 10:06:00+00' WHERE category = 'technical' AND title ILIKE '%Network%';
UPDATE public.courses SET created_at = '2024-01-01 10:07:00+00' WHERE category = 'technical' AND title ILIKE '%Port%';
