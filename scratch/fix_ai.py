import re

with open('src/services/aiService.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace \Sen with `Sen
content = content.replace(r'\Sen uzman bir siber', '`Sen uzman bir siber')

# Replace gel.\; with gel.`;
content = content.replace(r'Uzatmadan sadede gel.\;', 'Uzatmadan sadede gel.` ;')
content = content.replace(r'Uzatmadan sadede gel.\\;', 'Uzatmadan sadede gel.` ;')

# Fix prompt string if it has the same issue
content = content.replace(r'\Sınıf Adı', '`Sınıf Adı')
content = content.replace(r'\Snf Ad', '`Sınıf Adı')

# Actually, let's just rewrite the function safely
pattern = r'export async function analyzeCohortProgressWithAI.*?\}'
replacement = '''export async function analyzeCohortProgressWithAI(studentsData, cohortTitle) {
  const systemInstruction = `Sen uzman bir siber güvenlik eğitim danışmanı ve asistanısın.
Görev: Bir öğretmene, sınıfındaki (kohort) öğrencilerin LMS üzerindeki ilerleme verilerini analiz ederek sınıfın genel durumu ve öğrencilerin performansı hakkında kısa, pedagojik tavsiyeler içeren bir özet rapor sunmak.
Kişisel iletişim bilgileri gönderilmez. Sadece öğrenci adları ve puan/durum verileri gönderilir.
Sadece Türkçe, okunabilir Markdown formatında yanıt ver. Asla tablo ( | ) kullanma.
Maksimum 3-4 paragraf veya madde imi kullan. Uzatmadan sadede gel.`;

  const prompt = `Sınıf Adı: ${cohortTitle}
Öğrenci İlerleme Verileri:
${JSON.stringify(studentsData, null, 2)}

Lütfen öğretmen için şu başlıklarda kısa bir analiz oluştur:
1. Sınıfın Genel Durumu
2. Dikkat Çeken Öğrenciler (Çok iyi gidenler veya desteğe ihtiyacı olanlar - isimlerini vererek)
3. Öğretmen İçin Tavsiyeler (Bu verilere göre öğretmene kısa tavsiye)`;

  return await fetchGemini(prompt, systemInstruction);
}'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/services/aiService.js', 'w', encoding='utf-8') as f:
    f.write(content)
