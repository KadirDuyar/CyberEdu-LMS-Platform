import re

with open('src/pages/teacher/TeacherStats.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Check if analyzeCohortProgressWithAI is imported
if 'analyzeCohortProgressWithAI' not in content:
    content = content.replace(
        "import StudentProfileModal",
        "import { analyzeCohortProgressWithAI } from '../../services/aiService';\nimport StudentProfileModal"
    )
    content = content.replace(
        "import SafeMarkdown",
        "import SafeMarkdown from '../../components/ui/SafeMarkdown';"
    )
    if 'import SafeMarkdown' not in content:
        content = content.replace(
            "import LoadingSpinner",
            "import SafeMarkdown from '../../components/ui/SafeMarkdown';\nimport LoadingSpinner"
        )
    if 'import { Sparkles' not in content:
        content = content.replace(
            "CheckCircle2, TrendingUp,",
            "Sparkles, X, CheckCircle2, TrendingUp,"
        )

state_injection = '''
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');

  const handleGenerateAIAnalysis = async () => {
    if (!students || students.length === 0) return;
    setAiAnalysisModalOpen(true);
    if (aiAnalysisResult) return;

    setAiAnalysisLoading(true);
    try {
      const safeData = students.map(s => ({
        id: s.id,
        name: s.full_name || 'Öğrenci',
        xp: s.xp || 0,
        completedLessons: s.completedLessonsCount || 0
      }));
      
      const result = await analyzeCohortProgressWithAI(safeData, 'Genel Tüm Öğrenciler');
      setAiAnalysisResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAiAnalysisLoading(false);
    }
  };
'''

if 'handleGenerateAIAnalysis' not in content:
    content = content.replace(
        "const [sortBy, setSortBy] = useState('recent');",
        "const [sortBy, setSortBy] = useState('recent');\n" + state_injection
    )

ai_button = '''
          <button
            onClick={handleGenerateAIAnalysis}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 shadow-lg shadow-fuchsia-500/20 transition-all hover:-translate-y-0.5"
          >
            <Sparkles size={16}/> YZ Sınıf Analizi Al
          </button>
'''
if 'YZ Sınıf Analizi Al' not in content:
    content = content.replace(
        '<div className="flex items-center gap-4">',
        '<div className="flex items-center gap-4">\n' + ai_button
    )
    if 'YZ Sınıf Analizi Al' not in content:
        # try another place
        content = content.replace(
            '<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">',
            '<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">\n<div className="flex items-center gap-3 w-full sm:w-auto">' + ai_button + '</div>'
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
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Genel YZ Sınıf Analizi</h3>
                </div>
              </div>
              <button onClick={() => setAiAnalysisModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={20}/>
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 prose prose-sm dark:prose-invert prose-violet max-w-none">
              {aiAnalysisLoading ? (
                <p className="text-center text-slate-500 animate-pulse">YZ Verileri inceliyor...</p>
              ) : (
                <SafeMarkdown content={aiAnalysisResult} />
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
              <button onClick={() => setAiAnalysisModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-xl font-bold">Kapat</button>
            </div>
          </div>
        </div>
      )}
'''
if 'aiAnalysisModalOpen' not in content:
    content = content.replace(
        '</DashboardLayout>',
        ai_modal + '\n</DashboardLayout>'
    )

with open('src/pages/teacher/TeacherStats.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
