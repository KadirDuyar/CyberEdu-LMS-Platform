-- ============================================================
-- CyberEdu LMS: Müfredat Kursları ve Tohum Verileri (Master Seed)
-- 5 Farkındalık Kursu + 5 Teknik Güvenlik Kursu
-- (İlk 3 kurs Zorunlu Müfredat, son 2 kurs Seçmeli Kurslar)
-- ============================================================

DO $$
DECLARE
  v_teacher_id UUID;
  v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID; v_c5 UUID;
  v_t1 UUID; v_t2 UUID; v_t3 UUID; v_t4 UUID; v_t5 UUID;
BEGIN
  -- 1. Kursların atanacağı öğretmen veya yönetici profilini bul
  SELECT id INTO v_teacher_id FROM public.profiles WHERE role IN ('teacher', 'admin') LIMIT 1;
  IF v_teacher_id IS NULL THEN
    SELECT id INTO v_teacher_id FROM auth.users LIMIT 1;
  END IF;

  -- ─── 1. SİBER GÜVENLİK FARKINDALIĞI YOLU (Normal Kullanıcı) ───────────────

  -- Kurs 1: Siber Güvenliğe Giriş [ZORUNLU] (+100 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'Siber Güvenliğe Giriş',
    'Siber güvenlik dünyasına ilk adım: Temel kavramlar, tehditler ve dijital güvenlik.',
    'awareness', 'beginner', '🔐', TRUE, 'mandatory', TRUE, v_teacher_id
  ) RETURNING id INTO v_c1;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_c1, 'Siber Güvenliğe Giriş', 100, 0, TRUE);

  -- Kurs 2: Phishing Nedir? [ZORUNLU] (+150 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'Phishing Nedir?',
    'Oltalama saldırılarını tanıma, sahte e-postaları ve mesajları ayırt etme.',
    'awareness', 'beginner', '🎣', TRUE, 'mandatory', TRUE, v_teacher_id
  ) RETURNING id INTO v_c2;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_c2, 'Phishing Nedir?', 150, 0, TRUE);

  -- Kurs 3: Güçlü Parola Kullanımı [ZORUNLU] (+100 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'Güçlü Parola Kullanımı',
    'Kırılması zor parolalar oluşturma, parola yöneticileri ve güvenli saklama.',
    'awareness', 'beginner', '🔑', TRUE, 'mandatory', TRUE, v_teacher_id
  ) RETURNING id INTO v_c3;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_c3, 'Güçlü Parola Kullanımı', 100, 0, TRUE);

  -- Kurs 4: MFA & 2FA Nedir? [SEÇMELİ] (+120 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'MFA & 2FA Nedir?',
    'İki faktörlü ve çok faktörlü doğrulama yöntemleriyle hesap güvenliğini artırma.',
    'awareness', 'beginner', '📱', FALSE, 'elective', TRUE, v_teacher_id
  ) RETURNING id INTO v_c4;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_c4, 'MFA & 2FA Nedir?', 120, 0, TRUE);

  -- Kurs 5: Sosyal Mühendislik [SEÇMELİ] (+150 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'Sosyal Mühendislik',
    'İnsan zaaflarını hedef alan aldatma teknikleri ve korunma yolları.',
    'awareness', 'beginner', '🎭', FALSE, 'elective', TRUE, v_teacher_id
  ) RETURNING id INTO v_c5;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_c5, 'Sosyal Mühendislik', 150, 0, TRUE);


  -- ─── 2. WEB GÜVENLİĞİ TEKNİK YOLU (Teknik Öğrenci) ─────────────────────────

  -- Kurs 1: HTTP & HTTPS Temelleri [ZORUNLU] (+150 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'HTTP & HTTPS Temelleri',
    'Web protokolleri, istek-cevap yapısı ve SSL/TLS şifreleme mekanizması.',
    'technical', 'beginner', '🌐', TRUE, 'mandatory', TRUE, v_teacher_id
  ) RETURNING id INTO v_t1;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_t1, 'HTTP & HTTPS Temelleri', 150, 0, TRUE);

  -- Kurs 2: Web Uygulama Mimarisi [ZORUNLU] (+120 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'Web Uygulama Mimarisi',
    'İstemci-sunucu mimarisi, API entegrasyonları ve web uygulama katmanları.',
    'technical', 'beginner', '🏗️', TRUE, 'mandatory', TRUE, v_teacher_id
  ) RETURNING id INTO v_t2;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_t2, 'Web Uygulama Mimarisi', 120, 0, TRUE);

  -- Kurs 3: SQL Injection Nedir? [ZORUNLU] (+200 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'SQL Injection Nedir?',
    'Veritabanı enjeksiyon zafiyetleri, saldırı mekanizması ve güvenli sorgular.',
    'technical', 'intermediate', '💉', TRUE, 'mandatory', TRUE, v_teacher_id
  ) RETURNING id INTO v_t3;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_t3, 'SQL Injection Nedir?', 200, 0, TRUE);

  -- Kurs 4: XSS Saldırıları [SEÇMELİ] (+180 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'XSS Saldırıları',
    'Siteler arası betik çalıştırma (Cross-Site Scripting) saldırıları ve korunma prensipleri.',
    'technical', 'intermediate', '🐛', FALSE, 'elective', TRUE, v_teacher_id
  ) RETURNING id INTO v_t4;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_t4, 'XSS Saldırıları', 180, 0, TRUE);

  -- Kurs 5: Güvenli Kod Yazımı [SEÇMELİ] (+200 XP)
  INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_mandatory, course_type, is_published, created_by)
  VALUES (
    'Güvenli Kod Yazımı',
    'Güvenli yazılım geliştirme prensipleri, girdi doğrulama ve en iyi uygulamalar.',
    'technical', 'advanced', '🛡️', FALSE, 'elective', TRUE, v_teacher_id
  ) RETURNING id INTO v_t5;

  INSERT INTO public.lessons (course_id, title, xp_reward, order_index, is_published)
  VALUES (v_t5, 'Güvenli Kod Yazımı', 200, 0, TRUE);

  RAISE NOTICE 'Müfredat kursları (Zorunlu ve Seçmeli) başarıyla oluşturuldu!';
END $$;
