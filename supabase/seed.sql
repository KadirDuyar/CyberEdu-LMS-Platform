-- ============================================================
-- CyberEdu LMS — Demo Kullanıcılar (Supabase Dashboard'da Authentication > Users'dan elle ekle)
-- VEYA aşağıdaki SQL'i Auth Hooks veya Supabase CLI ile çalıştır
-- ============================================================

-- NOT: Supabase'de kullanıcıları direkt SQL ile auth.users tablosuna eklemek
-- güvenli değildir. Bunun yerine:
--
-- 1. Supabase Dashboard → Authentication → Users → "Add user" butonuyla elle ekle
-- 2. Aşağıdaki bilgileri kullan:
--
-- Kullanıcı 1 (Öğrenci):
--   Email: ogrenci@demo.com
--   Password: demo123456
--   (Kayıt olduktan sonra profiles tablosunda role'ü 'student' olarak trigger otomatik ayarlar)
--
-- Kullanıcı 2 (Öğretmen):
--   Email: ogretmen@demo.com
--   Password: demo123456
--
-- Kullanıcı 3 (Admin):
--   Email: admin@demo.com
--   Password: demo123456
--
-- Kullanıcıları ekledikten sonra aşağıdaki SQL ile rollerini güncelle:

-- Öğretmen rolünü güncelle
UPDATE public.profiles
SET role = 'teacher', avatar_emoji = '🎓', full_name = 'Demo Öğretmen'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'ogretmen@demo.com'
);

-- Admin rolünü güncelle
UPDATE public.profiles
SET role = 'admin', avatar_emoji = '⚙️', full_name = 'Sistem Yöneticisi'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@demo.com'
);

-- Öğrenci profilini güncelle
UPDATE public.profiles
SET role = 'student', avatar_emoji = '🚀', full_name = 'Demo Öğrenci',
    xp = 250, level = 1
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'ogrenci@demo.com'
);

-- ─── Demo Kurslar ──────────────────────────────────────────────────────────────
-- NOT: created_by için önce ogretmen@demo.com'un UUID'sini al:
-- SELECT id FROM auth.users WHERE email = 'ogretmen@demo.com';
-- Sonra aşağıdaki <TEACHER_UUID> kısmını o UUID ile değiştir.

-- Demo kurs 1: Siber Güvenlik Farkındalığı
INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
SELECT
  'Siber Güvenlik Farkındalığı',
  'Phishing saldırıları, güçlü parola kullanımı, MFA ve sosyal mühendislik gibi temel güvenlik konularını öğren.',
  'awareness',
  'beginner',
  '🛡️',
  TRUE,
  id
FROM auth.users WHERE email = 'ogretmen@demo.com'
ON CONFLICT DO NOTHING;

-- Demo kurs 2: Web Güvenliği Temelleri
INSERT INTO public.courses (title, description, category, level, thumbnail_emoji, is_published, created_by)
SELECT
  'Web Güvenliği Temelleri',
  'HTTP protokolü, SQL Injection ve XSS saldırılarını ve bunlara karşı korunma yöntemlerini öğren.',
  'technical',
  'beginner',
  '⚔️',
  TRUE,
  id
FROM auth.users WHERE email = 'ogretmen@demo.com'
ON CONFLICT DO NOTHING;

-- ─── Demo Dersler (Kurs 1: Farkındalık) ──────────────────────────────────────
-- NOT: Önce kurs ID'lerini al:
-- SELECT id, title FROM public.courses;

-- Lesson 1.1
INSERT INTO public.lessons (course_id, title, content, order_index, xp_reward, is_published)
SELECT
  c.id,
  'Phishing Nedir?',
  '## Phishing Nedir?

**Phishing** (oltalama), saldırganların güvenilir bir kurum veya kişi gibi davranarak kurbanlardan hassas bilgi çalmaya çalıştığı bir sosyal mühendislik saldırısıdır.

### Nasıl Çalışır?

1. Saldırgan gerçekmiş gibi görünen sahte bir e-posta/mesaj gönderir
2. Kurban bağlantıya tıklar ve sahte siteye yönlendirilir
3. Kurban bilgilerini girer — saldırgan bu bilgileri ele geçirir

### Phishing E-postalarını Nasıl Tanırsın?

- 🚨 **Aciliyet hissi** yaratır: "Hesabınız 24 saat içinde silinecek!"
- 🔗 **Şüpheli bağlantılar**: Gerçek gibi görünen ama farklı domain''ler
- ✉️ **Yazım hataları**: Profesyonel kurumlar hata yapmaz
- 📎 **Beklenmedik ekler**: Açma!

> **Altın Kural:** Şüphe duyarsan, tıklama!',
  0,
  150,
  TRUE
FROM public.courses c WHERE c.title = 'Siber Güvenlik Farkındalığı'
LIMIT 1;

-- Lesson 1.2
INSERT INTO public.lessons (course_id, title, content, order_index, xp_reward, is_published)
SELECT
  c.id,
  'Güçlü Parola Nasıl Oluşturulur?',
  '## Güçlü Parola Nasıl Oluşturulur?

Zayıf parolalar, siber saldırıların en yaygın giriş noktalarından biridir.

### Güçlü Parola Kriterleri

- **Uzunluk:** En az 12 karakter
- **Karmaşıklık:** Büyük/küçük harf + rakam + özel karakter
- **Benzersizlik:** Her hesap için farklı parola
- **Tahmin edilemezlik:** Doğum tarihi, isim kullanma!

### Parola Yöneticisi Kullan

Tüm parolaları hatırlamak imkansız. **Parola yöneticisi** (Bitwarden, 1Password vb.) kullanmak en güvenli yoldur.

### Multi-Factor Authentication (MFA)

Parola çalınsa bile hesabını korur. Mutlaka aktif et!',
  1,
  100,
  TRUE
FROM public.courses c WHERE c.title = 'Siber Güvenlik Farkındalığı'
LIMIT 1;

-- ─── Demo Dersler (Kurs 2: Teknik) ───────────────────────────────────────────

-- Lesson 2.1
INSERT INTO public.lessons (course_id, title, content, order_index, xp_reward, is_published)
SELECT
  c.id,
  'HTTP Temelleri',
  '## HTTP Temelleri

HTTP (HyperText Transfer Protocol), web''in temel iletişim protokolüdür.

### HTTP vs HTTPS

| Özellik | HTTP | HTTPS |
|---------|------|-------|
| Şifreleme | ❌ Yok | ✅ TLS/SSL |
| Güvenlik | Düşük | Yüksek |
| Port | 80 | 443 |

### HTTP Metodları

- **GET**: Veri almak için
- **POST**: Veri göndermek için
- **PUT/PATCH**: Güncelleme
- **DELETE**: Silme

### Güvenlik Açısından Neden Önemli?

HTTP trafiği şifrelenmediğinden, ağ üzerindeki saldırganlar iletişimi okuyabilir (Man-in-the-Middle).

> Her zaman **HTTPS** kullanan siteleri tercih et!',
  0,
  150,
  TRUE
FROM public.courses c WHERE c.title = 'Web Güvenliği Temelleri'
LIMIT 1;

-- Lesson 2.2
INSERT INTO public.lessons (course_id, title, content, order_index, xp_reward, is_published)
SELECT
  c.id,
  'SQL Injection Nedir?',
  '## SQL Injection Nedir?

**SQL Injection**, saldırganların web uygulamalarına kötü amaçlı SQL kodu enjekte ettiği bir saldırı türüdür.

### Nasıl Çalışır?

Güvensiz kod örneği:
```sql
SELECT * FROM users WHERE username = '''' + userInput + '''';
```

Saldırgan şunu girerse:
```
admin'' OR ''1''=''1
```

Sorgu şu hale gelir:
```sql
SELECT * FROM users WHERE username = ''admin'' OR ''1''=''1'';
-- Bu her zaman TRUE döner — tüm kullanıcılar görünür!
```

### Korunma Yöntemleri

1. **Prepared Statements / Parameterized Queries** kullan
2. **Input validation** yap
3. **Least privilege** — veritabanı kullanıcısına minimum yetki ver
4. **WAF** (Web Application Firewall) kullan

### Güvenli Kod Örneği

```python
# Güvensiz
cursor.execute("SELECT * FROM users WHERE id = " + user_id)

# Güvenli (Parameterized Query)
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```',
  1,
  200,
  TRUE
FROM public.courses c WHERE c.title = 'Web Güvenliği Temelleri'
LIMIT 1;

-- ─── Demo Aktiviteler ─────────────────────────────────────────────────────────
-- Phishing dersi için aktivite
INSERT INTO public.activities (lesson_id, type, question, options, correct_answer, explanation, points, order_index)
SELECT
  l.id,
  'multiple_choice',
  'Aşağıdaki e-posta özelliklerinden hangisi phishing belirtisidir?',
  '["Profesyonel şirket logolu e-posta", "Acil işlem yapmanızı isteyen e-posta", "İsminizle hitap eden e-posta", "Destek departmanından gelen e-posta"]'::jsonb,
  '"Acil işlem yapmanızı isteyen e-posta"'::jsonb,
  'Phishing e-postaları genellikle aciliyet hissi yaratır ve hemen harekete geçmenizi ister. Bu bir manipülasyon taktiğidir.',
  10,
  0
FROM public.lessons l WHERE l.title = 'Phishing Nedir?'
LIMIT 1;

INSERT INTO public.activities (lesson_id, type, question, options, correct_answer, explanation, points, order_index)
SELECT
  l.id,
  'true_false',
  'Bir e-postadaki bağlantıya tıklamadan önce fareyi üzerine getirerek gerçek URL''yi kontrol etmek etkili bir güvenlik önlemidir.',
  '["Doğru", "Yanlış"]'::jsonb,
  '"Doğru"'::jsonb,
  'Doğru! Fareyi bağlantı üzerine getirdiğinde tarayıcının alt çubuğunda gerçek URL görünür. Farklı domain görürsen tıklama!',
  10,
  1
FROM public.lessons l WHERE l.title = 'Phishing Nedir?'
LIMIT 1;

-- SQL Injection dersi için aktivite
INSERT INTO public.activities (lesson_id, type, question, options, correct_answer, explanation, points, order_index)
SELECT
  l.id,
  'multiple_choice',
  'SQL Injection saldırılarına karşı en etkili korunma yöntemi nedir?',
  '["Güçlü parola kullanmak", "Parameterized Queries (Hazırlanmış Sorgular) kullanmak", "HTTPS kullanmak", "Firewall kurmak"]'::jsonb,
  '"Parameterized Queries (Hazırlanmış Sorgular) kullanmak"'::jsonb,
  'Parameterized queries, kullanıcı girdisini SQL koduyla birleştirmez. Girdi her zaman veri olarak işlenir, kod olarak değil.',
  15,
  0
FROM public.lessons l WHERE l.title = 'SQL Injection Nedir?'
LIMIT 1;
