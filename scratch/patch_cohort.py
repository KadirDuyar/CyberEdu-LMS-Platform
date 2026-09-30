import re

with open('src/pages/teacher/CohortDetails.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'analyzeCohortProgressWithAI' not in content:
    content = content.replace(
        'import {',
        "import { analyzeCohortProgressWithAI } from '../../services/aiService';\nimport {",
        1
    )

state_injection = '''
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');

  const handleGenerateAIAnalysis = async () => {
    if (!progressData?.students || progressData.students.length === 0) {
      showToast('Analiz edilecek yeterli öğrenci verisi yok.', 'error');
      return;
    }
    setAiAnalysisModalOpen(true);
    if (aiAnalysisResult) return; // Zaten varsa tekrar üretme

    setAiAnalysisLoading(true);
    try {
      // Sadece ad ve id verilerini gönder
      const safeData = progressData.students.map(s => ({
        id: s.id,
        name: s.full_name || 'Öğrenci',
        xp: s.earnedXP || 0,
        progressPercent: s.progressPercent || 0,
        weekStatuses: s.weekStatuses ? s.weekStatuses.map(w => ({ title: w.weekTitle, status: w.status })) : []
      }));
      
      const result = await analyzeCohortProgressWithAI(safeData, cohort.title);
      setAiAnalysisResult(result);
    } catch (err) {
      console.error(err);
      showToast('Yapay zeka analizi oluşturulurken hata oluştu.', 'error');
    } finally {
      setAiAnalysisLoading(false);
    }
  };
'''
content = content.replace(
    "const [studentSearchQuery, setStudentSearchQuery] = useState('');",
    state_injection + "\n  const [studentSearchQuery, setStudentSearchQuery] = useState('');"
)

ai_button = '''
                <button
                  onClick={handleGenerateAIAnalysis}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 shadow-lg shadow-fuchsia-500/20 transition-all"
                  title="Sınıfın durumunu yapay zekaya analiz ettir"
                >
                  <Sparkles size={14}/>
                  <span>YZ Analizi Al</span>
                </button>
'''
content = content.replace(
    '<div className="flex items-center gap-1.5 w-full sm:w-auto">',
    '<div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">\n' + ai_button
)

ai_modal = '''
      {aiAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                  <Sparkles className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Yapay Zeka Sınıf Analizi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Öğrenci isimleri ve başarı oranlarına göre hazırlanmıştır.</p>
                </div>
              </div>
              <button
                onClick={() => setAiAnalysisModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 prose prose-sm dark:prose-invert prose-violet max-w-none">
              {aiAnalysisLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 animate-ping"></div>
                    <div className="absolute inset-0 border-4 border-t-violet-500 rounded-full animate-spin"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Yapay zeka verileri inceliyor ve pedagojik raporu hazırlıyor...</p>
                </div>
              ) : (
                <SafeMarkdown content={aiAnalysisResult} />
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
              <button
                onClick={() => setAiAnalysisModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
'''

content = content.replace(
    '</DashboardLayout>',
    ai_modal + '\n    </DashboardLayout>'
)

with open('src/pages/teacher/CohortDetails.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
