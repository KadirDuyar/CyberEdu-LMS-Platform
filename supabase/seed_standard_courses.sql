-- ============================================================
-- CyberEdu LMS: Standart Kurslar & Başlangıç Müfredatı
-- 5 Farkındalık Kursu + 5 Teknik Güvenlik Kursu
-- ============================================================

DO $$
DECLARE
  v_teacher_id UUID;
  v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID; v_c5 UUID;
  v_t1 UUID; v_t2 UUID; v_t3 UUID; v_t4 UUID; v_t5 UUID;
BEGIN
  -- Öğretmen veya admin kullanıcısını bul (yoksa ilk kullanıcıyı al)
  SELECT id INTO v_teacher_id FROM public.profiles WHERE role IN ('teacher', 'admin') LIMIT 1;
  IF v_teacher_id IS NULL THEN
    SELECT id INTO v_teacher_id FROM auth.users LIMIT 1;
  END IF;

  -- ─── 1. FARKINDALIK KURSLARI (Normal Öğrenci) ────────────────────────────────

  -- Kurs 1: Siber Güvenliğe Giriş (İlk Zorunlu Kurs)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'Siber Güvenliğe Giriş',
    'Dijital dünyada güvenliğin temel prensipleri, CIA üçlüsü ve temel güvenlik farkındalığı.',
    'awareness', 'beginner', '🔐', TRUE, v_teacher_id
  ) RETURNING id INTO v_c1;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_c1, 'Temel Siber Güvenlik Prensipleri', 100, 0, TRUE),
    (v_c1, 'Dijital Tehditleri Tanıma', 100, 1, TRUE);

  -- Kurs 2: Phishing ve Sosyal Mühendislik
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'Phishing ve Sosyal Mühendislik',
    'Oltalama saldırıları, sahte e-postalar ve insan faktörünü hedef alan manipülasyon teknikleri.',
    'awareness', 'beginner', '🎣', TRUE, v_teacher_id
  ) RETURNING id INTO v_c2;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_c2, 'Oltalama (Phishing) Tespiti', 120, 0, TRUE),
    (v_c2, 'Sosyal Mühendislik Taktikleri ve Savunma', 120, 1, TRUE);

  -- Kurs 3: Güçlü Parola ve MFA
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'Güçlü Parola ve MFA',
    'Parola güvenliği standartları, parola yöneticileri ve çok faktörlü kimlik doğrulama (MFA).',
    'awareness', 'beginner', '🔑', TRUE, v_teacher_id
  ) RETURNING id INTO v_c3;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_c3, 'Güçlü Parola Oluşturma Stratejileri', 100, 0, TRUE),
    (v_c3, '2FA ve MFA Güvenlik Katmanı', 100, 1, TRUE);

  -- Kurs 4: Güvenli İnternet ve Dijital Ayak İzi
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'Güvenli İnternet ve Dijital Ayak İzi',
    'Açık Wi-Fi ağları, çerezler, tarayıcı gizliliği ve kişisel verilerin korunması.',
    'awareness', 'intermediate', '🌐', TRUE, v_teacher_id
  ) RETURNING id INTO v_c4;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_c4, 'Herkese Açık Ağlarda Güvenlik', 100, 0, TRUE),
    (v_c4, 'Dijital Ayak İzi Yönetimi', 100, 1, TRUE);

  -- Kurs 5: Tehditler ve Zararlı Yazılımlar
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'Tehditler ve Zararlı Yazılımlar',
    'Fidye yazılımları (Ransomware), Truva atları, casus yazılımlar ve sistem güvenliği.',
    'awareness', 'intermediate', '🛡️', TRUE, v_teacher_id
  ) RETURNING id INTO v_c5;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_c5, 'Zararlı Yazılım Türleri ve Bulaşma Yolları', 120, 0, TRUE),
    (v_c5, 'Tehdit Önleme ve Yedekleme', 120, 1, TRUE);

  -- ─── 2. TEKNİK GÜVENLİK KURSLARI (Teknik Öğrenci) ───────────────────────────

  -- Kurs 1: HTTP & HTTPS Temelleri (İlk Zorunlu Kurs)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'HTTP & HTTPS Temelleri',
    'İstemci-sunucu haberleşmesi, HTTP metotları, başlıklar (headers) ve SSL/TLS şifreleme mantığı.',
    'technical', 'beginner', '🌐', TRUE, v_teacher_id
  ) RETURNING id INTO v_t1;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_t1, 'HTTP Protokolü ve İstek Yapısı', 120, 0, TRUE),
    (v_t1, 'TLS/SSL ve Güvenli Veri Aktarımı', 120, 1, TRUE);

  -- Kurs 2: Web Uygulama Mimarisi
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'Web Uygulama Mimarisi',
    'Modern web stack güvenliği, oturum (session/JWT) yönetimi ve yetkilendirme modelleri.',
    'technical', 'beginner', '🏗️', TRUE, v_teacher_id
  ) RETURNING id INTO v_t2;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_t2, 'Session ve Token Tabanlı Kimlik Doğrulama', 120, 0, TRUE),
    (v_t2, 'API Güvenliği Temelleri', 120, 1, TRUE);

  -- Kurs 3: SQL Injection Zafiyetleri
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'SQL Injection Zafiyetleri',
    'Veritabanı manipülasyon saldırıları, Blind SQLi ve Prepared Statement savunma prensipleri.',
    'technical', 'intermediate', '💉', TRUE, v_teacher_id
  ) RETURNING id INTO v_t3;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_t3, 'SQL Injection Mantığı ve Tespiti', 150, 0, TRUE),
    (v_t3, 'Parametrik Sorgular ile SQLi Önleme', 150, 1, TRUE);

  -- Kurs 4: XSS ve Enjeksiyon Saldırıları
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'XSS ve Enjeksiyon Saldırıları',
    'Stored, Reflected ve DOM-based Cross-Site Scripting saldırıları ve CSP savunması.',
    'technical', 'intermediate', '🐛', TRUE, v_teacher_id
  ) RETURNING id INTO v_t4;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_t4, 'Reflected ve Stored XSS Analizi', 150, 0, TRUE),
    (v_t4, 'İçerik Güvenliği Politikası (CSP) ve Sanitization', 150, 1, TRUE);

  -- Kurs 5: Güvenli Kod Yazımı ve OWASP
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
  VALUES (
    'Güvenli Kod Yazımı ve OWASP',
    'OWASP Top 10 standartları, girdi doğrulama, güvenli kütüphane kullanımı ve kod denetimi.',
    'technical', 'advanced', '🛡️', TRUE, v_teacher_id
  ) RETURNING id INTO v_t5;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES 
    (v_t5, 'OWASP Top 10 Genel Bakış', 180, 0, TRUE),
    (v_t5, 'Güvenli Yazılım Geliştirme Yaşam Döngüsü (SSDLC)', 180, 1, TRUE);

  RAISE NOTICE '10 Standart Kurs ve Dersleri başarıyla oluşturuldu.';
END $$;
