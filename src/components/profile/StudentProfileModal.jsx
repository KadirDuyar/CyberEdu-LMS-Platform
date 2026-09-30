import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Trophy, BookOpen, Star, Sparkles, Shield, Code2 } from 'lucide-react';
import { analyzeCohortProgressWithAI } from '../../services/aiService';
import LoadingSpinner from '../ui/LoadingSpinner';
import FormattedAiMessage from '../ui/FormattedAiMessage';

export default function StudentProfileModal({ student, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function loadStudentData() {
      if (!student?.id) return;
      try {
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('id, lesson_id, status, completed_at, lessons(title, course_id, courses(title))')
          .eq('user_id', student.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        setDetails({ progress: progress || [] });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [student]);

  const handleAiAnalysis = async () => {
    if (aiResult) return;
    setAiLoading(true);
    try {
      const studentData = [{
        id: student.id,
        name: student.full_name || 'Öğrenci',
        xp: student.xp,
        level: student.level,
        completedLessons: details?.progress?.length || 0,
        recentLessons: details?.progress?.slice(0, 5).map(p => p.lessons?.title) || []
      }];
      
      const result = await analyzeCohortProgressWithAI(studentData, `Öğrenci Özel Analizi: ${student.full_name}`);
      setAiResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-2xl shadow-md">
              {student.avatar_emoji || '👤'}
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">{student.full_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <Star size={12}/> Seviye {student.level || 1}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 flex items-center gap-1">
                  <Trophy size={12}/> {student.xp || 0} XP
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
          
          {/* AI Analysis Button/Result */}
          <div className="bg-gradient-to-br from-fuchsia-50 to-violet-50 dark:from-fuchsia-950/20 dark:to-violet-950/20 border border-fuchsia-100 dark:border-fuchsia-500/20 rounded-2xl p-5">
            {!aiResult && !aiLoading ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-300 flex items-center gap-1.5">
                    <Sparkles size={16}/> Yapay Zeka Öğrenci Analizi
                  </h4>
                  <p className="text-xs text-fuchsia-700 dark:text-fuchsia-400/70 mt-1">
                    Bu öğrencinin ilerlemesi ve performansına özel yapay zeka tavsiyesi alın.
                  </p>
                </div>
                <button
                  onClick={handleAiAnalysis}
                  className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 shadow-md shadow-fuchsia-500/20 transition-all hover:scale-105 active:scale-95"
                >
                  Analiz Et
                </button>
              </div>
            ) : aiLoading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 animate-ping"></div>
                <p className="text-xs font-medium text-fuchsia-700 dark:text-fuchsia-400 animate-pulse">Öğrenci verileri inceleniyor...</p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert prose-violet max-w-none">
                <FormattedAiMessage text={aiResult} />
              </div>
            )}
          </div>

          {/* Stats & History */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
              <BookOpen size={16} className="text-cyan-500" /> Tamamlanan Son Dersler
            </h4>
            {loading ? (
              <div className="flex justify-center py-4"><LoadingSpinner size="sm"/></div>
            ) : details?.progress?.length > 0 ? (
              <div className="space-y-2">
                {details.progress.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <BookOpen size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.lessons?.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{p.lessons?.courses?.title}</p>
                    </div>
                    <div className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(p.completed_at).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">Henüz tamamlanmış dersi yok.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
