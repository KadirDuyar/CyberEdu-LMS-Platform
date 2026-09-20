// ─── CyberEdu LMS: Başarılar, Karakterler ve Rozetler Konfigürasyonu ──────────────

export const CHARACTERS = [
  {
    id: 'char_default_1',
    emoji: '👨‍💻',
    name: 'Siber Çırak',
    title: 'Acemi Savunucu',
    description: 'Siber güvenlik dünyasına ilk adımını atan cesur öğrenci.',
    isDefault: true,
    condition: 'Aramıza katıldığında hediye',
  },
  {
    id: 'char_default_2',
    emoji: '👩‍💻',
    name: 'Kod Stratejisti',
    title: 'Sistem Analisti',
    description: 'Karmaşık kod yapılarını analiz eden ve zafiyetleri erken fark eden araştırmacı.',
    isDefault: true,
    condition: 'Aramıza katıldığında hediye',
  },
  {
    id: 'char_default_3',
    emoji: '🚀',
    name: 'Dijital Kaşif',
    title: 'Yol Haritası Öncüsü',
    description: 'Yeni teknolojileri keşfetmeye ve siber güvenliğe adanmış meraklı kaşif.',
    isDefault: true,
    condition: 'Aramıza katıldığında hediye',
  },
  {
    id: 'char_shield_guardian',
    emoji: '🛡️',
    name: 'Kalkan Muhafızı',
    title: 'Siber Muhafız',
    description: 'Temel savunma prensiplerini kavrayarak dijital dünyada aşılmaz kalkan kuran koruyucu.',
    courseMatch: ['siber güvenliğe giriş', 'temel siber güvenlik', 'farkındalık'],
    condition: '"Siber Güvenliğe Giriş" kursunu tamamla',
    xpReward: 150,
  },
  {
    id: 'char_phishing_detective',
    emoji: '🕵️‍♂️',
    name: 'Siber Dedektif',
    title: 'Oltalama Avcısı',
    description: 'Sahte linkleri, manipülatif e-postaları ve sosyal mühendislik tuzaklarını anında tespit eden keskin dedektif.',
    courseMatch: ['phishing', 'oltalama', 'sosyal mühendislik'],
    condition: '"Phishing Nedir?" veya "Sosyal Mühendislik" kursunu tamamla',
    xpReward: 200,
  },
  {
    id: 'char_cipher_master',
    emoji: '🔑',
    name: 'Kripto Hakimi',
    title: 'Kırılmaz Parola Ustası',
    description: 'Kırılması imkansız parolalar üreten ve şifreleme standartlarını uygulayan güvenlik uzmanı.',
    courseMatch: ['parola', 'güçlü parola'],
    condition: '"Güçlü Parola Kullanımı" kursunu tamamla',
    xpReward: 150,
  },
  {
    id: 'char_dual_sentinel',
    emoji: '⚡',
    name: 'İki Aşamalı Bekçi',
    title: 'Aşılmaz Bariyer',
    description: 'MFA ve 2FA katmanlarıyla kimlik hırsızlarına geçit vermeyen çift katmanlı nöbetçi.',
    courseMatch: ['mfa', '2fa', 'iki faktörlü'],
    condition: '"MFA & 2FA Nedir?" kursunu tamamla',
    xpReward: 180,
  },
  {
    id: 'char_web_architect',
    emoji: '🌐',
    name: 'Protokol Mimarı',
    title: 'TLS / SSL Komutanı',
    description: 'HTTP ve HTTPS paketlerini koklayan, şifreli tünellerin efendisi olan web uzmanı.',
    courseMatch: ['http', 'https'],
    condition: '"HTTP & HTTPS Temelleri" kursunu tamamla',
    xpReward: 200,
  },
  {
    id: 'char_sql_ninja',
    emoji: '🥷',
    name: 'Veritabanı Ninjası',
    title: 'Enjeksiyon Avcısı',
    description: 'Zararlı SQL sorgularını gölgelerde yakalayıp veritabanlarını güvende tutan usta savaşçı.',
    courseMatch: ['sql', 'injection'],
    condition: '"SQL Injection Temelleri" kursunu tamamla',
    xpReward: 250,
  },
  {
    id: 'char_script_mage',
    emoji: '🧙‍♂️',
    name: 'Kod Büyücüsü',
    title: 'DOM Koruyucusu',
    description: 'Cross-Site Scripting (XSS) saldırılarını sterilize ederek tarayıcıları temizleyen büyücü.',
    courseMatch: ['xss', 'cross-site'],
    condition: '"XSS Temelleri" kursunu tamamla',
    xpReward: 250,
  },
  {
    id: 'char_cyber_gladiator',
    emoji: '🦾',
    name: 'Siber Gladyatör',
    title: 'Kaba Kuvvet Kırıcı',
    description: 'Brute force ataklarına karşı kilit mekanizmalarını demir gibi sağlam tutan zırhlı savunucu.',
    courseMatch: ['brute force', 'kaba kuvvet'],
    condition: '"Brute Force & Parola Güvenliği" kursunu tamamla',
    xpReward: 220,
  },
  {
    id: 'char_network_hawk',
    emoji: '🦅',
    name: 'Ağ Şahini',
    title: 'Port Gözetmeni',
    description: 'Ağdaki açık portları ve paket anomalilerini anında fark eden gök gözcüsü.',
    courseMatch: ['network', 'port', 'ağ kullanımı'],
    condition: '"Network & Port Güvenliği" veya "Ağ Kullanımı" kursunu tamamla',
    xpReward: 220,
  },
  {
    id: 'char_cyber_overlord',
    emoji: '👑',
    name: 'Siber Lord',
    title: 'Siber Güvenlik Eliti',
    description: '3 veya daha fazla kursu başarıyla tamamlamış efsanevi siber güvenlik lideri.',
    minCoursesCount: 3,
    condition: 'En az 3 kurs tamamla',
    xpReward: 500,
  },
];

export const BADGES = [
  {
    id: 'badge_first_step',
    emoji: '🌱',
    name: 'İlk Adım',
    description: 'Sisteme katılıp ilk dersini başarıyla tamamladın.',
    condition: 'İlk dersi tamamla',
    check: ({ completedLessonsCount }) => completedLessonsCount >= 1,
  },
  {
    id: 'badge_first_course',
    emoji: '🎓',
    name: 'İlk Mezuniyet',
    description: 'İlk siber güvenlik kursunu tüm dersleriyle bitirdin.',
    condition: 'Herhangi bir kursu tamamla',
    check: ({ completedCoursesCount }) => completedCoursesCount >= 1,
  },
  {
    id: 'badge_phishing_hunter',
    emoji: '🎣',
    name: 'Oltalama Avcısı',
    description: 'Phishing ve sosyal mühendislik eğitimini eksiksiz bitirdin.',
    condition: 'Phishing veya Sosyal Mühendislik kursunu tamamla',
    check: ({ completedCourseTitles }) =>
      completedCourseTitles.some((t) => {
        const lower = (t || '').toLowerCase();
        return lower.includes('phishing') || lower.includes('oltalama') || lower.includes('sosyal');
      }),
  },
  {
    id: 'badge_shield_master',
    emoji: '🛡️',
    name: 'Aşılmaz Kalkan',
    description: 'Siber Güvenliğe Giriş eğitimini başarıyla tamamladın.',
    condition: 'Siber Güvenliğe Giriş kursunu bitir',
    check: ({ completedCourseTitles }) =>
      completedCourseTitles.some((t) => {
        const lower = (t || '').toLowerCase();
        return lower.includes('giriş') || lower.includes('farkındalık');
      }),
  },
  {
    id: 'badge_web_defender',
    emoji: '🌐',
    name: 'Web Muhafızı',
    description: 'HTTP & HTTPS protokollerini ve güvenli iletişimi öğrendin.',
    condition: 'HTTP & HTTPS kursunu tamamla',
    check: ({ completedCourseTitles }) =>
      completedCourseTitles.some((t) => (t || '').toLowerCase().includes('http')),
  },
  {
    id: 'badge_sql_guardian',
    emoji: '💉',
    name: 'Veri Bekçisi',
    description: 'SQL Injection zafiyetlerini ve güvenli sorgu prensiplerini kavradın.',
    condition: 'SQL Injection kursunu tamamla',
    check: ({ completedCourseTitles }) =>
      completedCourseTitles.some((t) => (t || '').toLowerCase().includes('sql')),
  },
  {
    id: 'badge_xp_hunter_500',
    emoji: '⚡',
    name: 'XP Avcısı',
    description: 'Eğitimlerden toplam 500+ XP topladın.',
    condition: '500 XP kazan',
    check: ({ xp }) => (xp || 0) >= 500,
  },
  {
    id: 'badge_xp_master_1000',
    emoji: '🔥',
    name: 'Siber Şampiyon',
    description: '1000+ XP barajını aşarak uzmanlık seviyesine ulaştın.',
    condition: '1000 XP kazan',
    check: ({ xp }) => (xp || 0) >= 1000,
  },
  {
    id: 'badge_trio_master',
    emoji: '🏆',
    name: 'Müfredat Hakimi',
    description: 'En az 3 farklı kursu %100 başarıyla tamamladın.',
    condition: '3 kurs bitir',
    check: ({ completedCoursesCount }) => completedCoursesCount >= 3,
  },
];

/**
 * Kullanıcının mevcut verilerine göre açılmış karakterleri tespit eder
 */
export function getCharacterUnlockStatus(character, { completedCourseTitles = [], completedCoursesCount = 0, xp = 0 }) {
  if (character.isDefault) return { isUnlocked: true };

  if (character.minCoursesCount && completedCoursesCount >= character.minCoursesCount) {
    return { isUnlocked: true };
  }

  if (character.courseMatch && character.courseMatch.length > 0) {
    const matched = completedCourseTitles.some((title) => {
      const lower = (title || '').toLowerCase();
      return character.courseMatch.some((keyword) => lower.includes(keyword.toLowerCase()));
    });
    if (matched) return { isUnlocked: true };
  }

  return { isUnlocked: false };
}

/**
 * Belirli bir kurs tamamlandığında yeni açılan karakteri bulur
 */
export function findNewUnlockedReward(courseTitle, totalFinishedCourses = 1) {
  const lower = (courseTitle || '').toLowerCase();

  const matched = CHARACTERS.find((c) => {
    if (c.isDefault) return false;
    if (c.courseMatch) {
      return c.courseMatch.some((k) => lower.includes(k.toLowerCase()));
    }
    if (c.minCoursesCount && totalFinishedCourses >= c.minCoursesCount) {
      return true;
    }
    return false;
  });

  return matched || null;
}
