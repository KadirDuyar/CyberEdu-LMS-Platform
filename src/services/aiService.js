// ─── CyberEdu LMS: Gelişmiş Gemini Yapay Zeka Servisi ────────────────────────
// Desteklenen modeller sırasıyla denenir (fallback).
// .env.local üzerinden VITE_GEMINI_MODEL ile varsayılan model ezilebilir.

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const configuredModel = import.meta.env.VITE_GEMINI_MODEL;

// Model fallback zinciri (gemini-3.8-flash, 3.7, 3.6, 3.5, 2.5, 1.5)
const FALLBACK_MODELS = [
  ...(configuredModel ? [configuredModel] : []),
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

// Tekrar eden modelleri temizle
const MODELS_TO_TRY = [...new Set(FALLBACK_MODELS)];

/**
 * Gemini REST API çağrısı. Kapalı/bulunamayan modelleri otomatik atlayıp fallback zincirini izler.
 * Not: Temmuz 2026 sonrası temperature, top_p, top_k kaldırıldığı için gönderilmez.
 */
export async function fetchGemini(prompt, systemInstruction = '', history = []) {
  if (!apiKey) {
    throw new Error("Gemini API Anahtarı eksik! .env.local dosyasındaki VITE_GEMINI_API_KEY değişkenini kontrol edin.");
  }

  let lastError = null;

  // Format historical contents if any
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content || msg.text || '' }]
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  for (const model of MODELS_TO_TRY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents
      };

      if (systemInstruction) {
        payload.system_instruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`Gemini API çağrısı başarısız (${model}): ${res.status} - ${errorText}`);
        lastError = new Error(`Model ${model} hatası: ${res.status}`);
        continue; // Bir sonraki modele geç
      }

      const data = await res.json();
      const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) {
        return answer;
      }
    } catch (err) {
      console.warn(`Gemini (${model}) bağlantı hatası:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("Yapay Zeka modellerine erişilemedi. Lütfen internet bağlantınızı veya API anahtarınızı kontrol edin.");
}

/**
 * Öğretmen için: Her etkinlik türüne uygun tam teşekküllü JSON soru üretici
 */
export async function generateActivityWithAI(topic, activityType) {
  const schemaInstructions = {
    multiple_choice: `{
  "type": "multiple_choice",
  "question": "Net ve anlaşılır soru metni",
  "options": ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"],
  "correct_answer": "Doğru olan seçeneğin birebir aynı metni",
  "explanation": "Detaylı eğitici çözüm açıklaması",
  "points": 10
}`,
    true_false: `{
  "type": "true_false",
  "question": "Doğru ya da yanlış olduğu değerlendirilecek net bir siber güvenlik ifadesi",
  "options": ["Doğru", "Yanlış"],
  "correct_answer": "Doğru",
  "explanation": "Neden doğru veya yanlış olduğuna dair açıklama",
  "points": 10
}`,
    fill_blank: `{
  "type": "fill_blank",
  "question": "Öğrencinin doldurması gereken [hedef_kelime] köşeli parantez içinde olan paragraf veya soru cümlesi.",
  "options": null,
  "correct_answer": "hedef_kelime",
  "explanation": "Kavramın açıklaması",
  "points": 15
}`,
    matching: `{
  "type": "matching",
  "question": "Kavramları doğru açıklamalarıyla eşleştiriniz.",
  "options": [
    { "left": "Port 443", "right": "HTTPS Şifreli Web Trafiği" },
    { "left": "Port 22", "right": "SSH Güvenli Uzak Bağlantı" },
    { "left": "Port 53", "right": "DNS Alan Adı Çözümleme" }
  ],
  "correct_answer": {
    "Port 443": "HTTPS Şifreli Web Trafiği",
    "Port 22": "SSH Güvenli Uzak Bağlantı",
    "Port 53": "DNS Alan Adı Çözümleme"
  },
  "explanation": "Portların ve servislerin doğru eşleşme açıklaması",
  "points": 20
}`,
    ordering: `{
  "type": "ordering",
  "question": "Aşağıdaki adımları siber güvenlik olay müdahalesi mantığına göre doğru sıraya diziniz.",
  "options": [
    "1. Tehdidi tespit etme ve kaydetme",
    "2. Etkilenen sistemleri izole etme",
    "3. Kötü amaçlı yazılımı temizleme",
    "4. Sistemleri geri yükleme ve ders çıkarma"
  ],
  "correct_answer": [
    "1. Tehdidi tespit etme ve kaydetme",
    "2. Etkilenen sistemleri izole etme",
    "3. Kötü amaçlı yazılımı temizleme",
    "4. Sistemleri geri yükleme ve ders çıkarma"
  ],
  "explanation": "Adımların neden bu sırada uygulanması gerektiğinin analizi",
  "points": 20
}`,
    memory_card: `{
  "type": "memory_card",
  "question": "Kartları çevirerek ilgili siber güvenlik terimlerini ve tanımlarını eşleştirin.",
  "options": [
    { "left": "SQL Injection", "right": "Veritabanı komut manipülasyonu" },
    { "left": "XSS", "right": "İstemci tarafında zararlı JS çalıştırma" },
    { "left": "CSRF", "right": "Kullanıcı adına yetkisiz istek gönderme" }
  ],
  "correct_answer": null,
  "explanation": "Zafiyetlerin tanımlarıyla eşleşmesi",
  "points": 20
}`,
    scenario: `{
  "type": "scenario",
  "question": "Bir şirkette çalışırken yöneticinizden acil hediye kartı alıp kodlarını iletmenizi isteyen bir e-posta aldınız. Ne yapmalısınız?",
  "options": [
    { "text": "Hemen gidip kartları alırım ve kodları e-posta ile iletirim.", "consequence": "Hata! CEO sahteciliği (Whaling) saldırısına maruz kaldınız.", "isCorrect": false },
    { "text": "Yöneticimi resmi şirket telefonundan arayarak durumu teyit ederim.", "consequence": "Harika! Doğrulama adımıyla sahtekarlığı engellediniz.", "isCorrect": true },
    { "text": "E-postayı görmezden gelip silerim.", "consequence": "Eksik eylem: Güvenlik ekibine bildirimde bulunmanız gerekirdi.", "isCorrect": false }
  ],
  "correct_answer": "Yöneticimi resmi şirket telefonundan arayarak durumu teyit ederim.",
  "explanation": "Sosyal mühendislik saldırılarında alternatif iletişim kanalıyla teyit esastır.",
  "points": 20
}`,
    text: `{
  "type": "text",
  "question": "### Konu Başlığı\\n\\nKonu hakkında Markdown formatında hazırlanmış zengin, öğretici ders notu.",
  "options": null,
  "correct_answer": null,
  "explanation": "",
  "points": 0
}`
  };

  const selectedSchema = schemaInstructions[activityType] || schemaInstructions.multiple_choice;

  const systemInstruction = `Sen profesyonel bir Siber Güvenlik Eğitmenisin ve LMS müfredat tasarımcısısın.
Sana verilen konu ve etkinlik türüne göre SADECE GEÇERLİ JSON formatında içerik üret.
JSON dışında hiçbir selamlama, önsöz veya kapanış metni yazma. Sadece JSON döndür.`;

  const prompt = `Konu: "${topic}"
İstenen Etkinlik Türü: "${activityType}"

Lütfen aşağıdaki JSON şemasına ve kurallarına tam uyacak şekilde tek bir etkinlik objesi üret:
${selectedSchema}`;

  const text = await fetchGemini(prompt, systemInstruction);
  const cleanJson = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Öğretmen için: Kurs bilgisi ve taslağı üretici
 */
export async function generateCourseWithAI(topic) {
  const systemInstruction = `Sen profesyonel bir Siber Güvenlik Müfredat Tasarımcısısın.
Kullanıcının belirttiği konuya göre SADECE GEÇERLİ JSON formatında kurs temel bilgilerini üret.
JSON dışında hiçbir selamlama veya açıklama yazma.`;

  const prompt = `Konu: "${topic}"

Aşağıdaki JSON şemasına birebir uyarak kurs detaylarını üret:
{
  "title": "Çarpıcı ve profesyonel kurs başlığı (maksimum 60 karakter)",
  "description": "Öğrencinin bu kursta ne öğreneceğini özetleyen 2-3 cümlelik açıklama",
  "category": "awareness" | "technical" | "advanced",
  "level": "beginner" | "intermediate" | "advanced",
  "thumbnail_emoji": "🛡️, 🌐, 🔐, 💻 veya 🚀 gibi tek bir emoji"
}`;

  const text = await fetchGemini(prompt, systemInstruction);
  const cleanJson = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
  return JSON.parse(cleanJson);
}

/**
 * Öğrenci için: Kademeli, Sokratik, Cevabı Sızdırmayan İpucu Üretici
 * @param {Object} params
 * @param {string} params.question Soru metni
 * @param {string} params.type Etkinlik türü
 * @param {any} params.options Seçenekler (opsiyonel)
 * @param {number} params.level İpucu kademesi (1: Genel yönlendirme, 2: Kavramsal ipucu, 3: Daraltıcı ipucu - asla direkt cevap değil)
 * @param {any} params.rawCorrectAnswer Cevap sızıntısı kontrolü için yerelde tutulan doğru cevap (modele ASLA gönderilmez)
 */
export async function getSocraticHint({ question, type, options = null, level = 1, rawCorrectAnswer = null }) {
  // Gizlilik: Doğru cevap, çözüm açıklaması ve senaryo sonuçları modele ASLA gönderilmez.
  let sanitizedOptions = null;

  if (Array.isArray(options)) {
    if (type === 'scenario') {
      // Senaryolarda sadece seçenek metinlerini gönder, consequence ve isCorrect'i sil
      sanitizedOptions = options.map(o => typeof o === 'object' ? o.text : o);
    } else if (type === 'ordering' || type === 'matching' || type === 'memory_card') {
      // Sıralama ve eşleştirmeleri rastgele karıştırarak modele ver
      sanitizedOptions = [...options].sort(() => Math.random() - 0.5);
    } else {
      sanitizedOptions = options;
    }
  }

  const systemInstruction = `Sen CyberEdu LMS platformunda öğrencilere rehberlik eden Sokratik bir Siber Güvenlik Mentorüsün.
GÖREVİN: Öğrencinin soruyu kendisinin çözmesi için düşünmesini sağlamak.
KESİN KURALLAR:
1. Kesinlikle doğru cevabı doğrudan söyleme veya şık harfini ('A şıkkı', 'Cevap X'dir) verme!
2. Cevabı eleverici doğrudan anahtar kelimeyi söylemek yerine kavramsal ipucu ve mantık yürütme sorusu sor.
3. Kademeler:
   - Kademe 1: Hangi güvenlik prensibi veya kavramının düşünüleceğini hatırlat (Genel ipucu).
   - Kademe 2: Seçenekleri nasıl eleyebileceğine veya hangi detaya dikkat etmesi gerektiğine odaklan (Kavramsal).
   - Kademe 3: İki temel durum arasındaki farkı kıyaslamasını sağla ama son adımı öğrenciye bırak.
4. Maksimum 2-3 cümle, samimi, teşvik edici ve net Türkçe konuş.`;

  const prompt = `Öğrencinin çözmeye çalıştığı soru:
Soru Türü: ${type}
Soru Metni: "${question}"
${sanitizedOptions ? `Mevcut Seçenekler/İçerik: ${JSON.stringify(sanitizedOptions)}` : ''}

Öğrencinin talep ettiği ipucu kademesi: ${level}/3
Lütfen öğrenciye bu kademeye uygun rehberlik sağla:`;

  const hintText = await fetchGemini(prompt, systemInstruction);

  // Yerel Cevap Sızıntısı Taraması (Local Leak Filter)
  if (rawCorrectAnswer) {
    const forbiddenStrings = [];
    if (typeof rawCorrectAnswer === 'string') {
      forbiddenStrings.push(rawCorrectAnswer.trim().toLowerCase());
    } else if (typeof rawCorrectAnswer === 'object') {
      forbiddenStrings.push(...Object.values(rawCorrectAnswer).map(v => String(v).trim().toLowerCase()));
    }

    const lowerHint = hintText.toLowerCase();
    for (const forbidden of forbiddenStrings) {
      if (forbidden.length > 3 && lowerHint.includes(forbidden)) {
        console.warn('AI cevabı doğrudan sızdırmaya çalıştı, yerel filtre devreye girdi.');
        return "Sorudaki kavramların çalışma mantığını ve temel siber güvenlik savunma ilkelerini göz önüne alarak seçenekleri değerlendirmeyi dene.";
      }
    }
  }

  return hintText;
}

/**
 * Sağ alttaki interaktif sohbet ve tam sayfa AI Mentor için genel asistan çağrısı
 */
export async function chatWithMentor({ message, history = [], context = {} }) {
  const systemInstruction = `Sen CyberEdu platformunun akıllı Siber Güvenlik Asistanı ve Mentorüsün.
Kullanıcılara hem bulundukları ders/etkinlik özelinde rehberlik ediyor hem de genel siber güvenlik, yazılım ve platform kullanımı konularında yardımcı oluyorsun.

GÜNCEL BAĞLAM (Context):
- Kullanıcı Rolü: ${context.role || 'Öğrenci'}
- Bulunduğu Sayfa / Konum: ${context.pageName || context.pageTitle || 'Genel Platform'}
${context.details ? `- Sayfa Detayları ve Açık İçerik: ${context.details}` : ''}
${context.courseTitle ? `- Mevcut Kurs: ${context.courseTitle}` : ''}
${context.lessonTitle ? `- Mevcut Ders: ${context.lessonTitle}` : ''}
${context.lessonContent ? `- Ders/Sayfa İçerik Özeti: ${context.lessonContent.slice(0, 600)}...` : ''}

DAVRANIŞ VE YANIT KURALLARI:
1. Bağlamsal Farkındalık: Kullanıcı "bu soru", "buradaki hata", "bu ders" dediğinde, yukarıda verilen sayfa ve ders detaylarını referans alarak nokta atışı yanıt ver.
2. Sokratik Yaklaşım: Eğer bir ders/soru ekranındaysa ve öğrenci doğrudan bir sorunun cevabını istiyorsa ("cevap ne", "hangi şık"), cevabı doğrudan söylemek yerine düşünmeye sevk eden 1-2 cümlelik kavramsal ipucu ver.
3. Genel Amaçlı Destek: Kullanıcı ders dışı genel bir soru sorarsa (örneğin "Phishing nedir?", "Kariyer tavsiyesi", "Platform nasıl çalışır?"), doğrudan, net, kapsamlı ve eğitici şekilde yanıtla.
4. Üslup: Kibar, motive edici, siber güvenlikte uzman ve net Türkçe konuş. Kod ve önemli terimleri Markdown (\`kod\`, **vurgu**) ile biçimlendir.`;

  return await fetchGemini(message, systemInstruction, history);
}