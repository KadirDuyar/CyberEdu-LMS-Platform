with open('src/pages/teacher/TeacherStats.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clean the if (loading) block
import re
clean_loading = """  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage message="Öğrenci istatistikleri ve analizler yükleniyor..." />
      </DashboardLayout>
    );
  }"""

pattern_loading = r'if \(loading\) \{.*?return \(\s*<DashboardLayout>\s*<LoadingSpinner fullPage message="Öğrenci istatistikleri ve analizler yükleniyor\.\.\." />.*?</DashboardLayout>\s*\);\s*\}'
content = re.sub(pattern_loading, clean_loading, content, flags=re.DOTALL)

# 2. Add AI button next to active participation
old_active_block = """            <div className="flex items-center gap-3">
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center shrink-0 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Aktif Katılım</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0}%
                </p>
              </div>
            </div>"""

new_active_block = """            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleGenerateAIAnalysis}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 shadow-lg shadow-fuchsia-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Tüm sınıf verilerini yapay zekaya analiz ettir"
              >
                <Sparkles size={16} />
                <span>YZ Sınıf Analizi Al</span>
              </button>

              <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center shrink-0 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Aktif Katılım</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0}%
                </p>
              </div>
            </div>"""

content = content.replace(old_active_block, new_active_block)

# 3. Add modal at the end before </DashboardLayout>
ai_modal = """
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tüm öğrencilerin seviye ve tamamlama verilerine göre hazırlanmıştır.</p>
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
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">Yapay zeka tüm sınıf verilerini analiz ediyor...</p>
                </div>
              ) : (
                <FormattedAiMessage text={aiAnalysisResult} />
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
"""

if '{aiAnalysisModalOpen && (' not in content:
    content = content.replace(
        '      {selectedStudent && (',
        ai_modal + '\n      {selectedStudent && ('
    )

with open('src/pages/teacher/TeacherStats.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("TeacherStats fixed successfully")
