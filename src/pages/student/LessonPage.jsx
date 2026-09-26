import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getLessonWithActivities, startLesson, completeLesson, rollbackLessonCompletion, saveActivityAttempt } from '../../services/lessonService';
import { supabase } from '../../lib/supabase';
import DashboardLayout from '../../layouts/DashboardLayout';
import ActivityRenderer from '../../components/activities/ActivityRenderer';
import StorylinePlayer from '../../components/player/StorylinePlayer';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  ArrowLeft, CheckCircle, Zap, BookOpen, ChevronRight,
  Trophy, RotateCcw, Sparkles
} from 'lucide-react';
import { findNewUnlockedReward } from '../../data/achievementsData';
import { notifyFollowersCourseCompleted } from '../../services/socialService';

const PASS_PERCENT = 50;

function SafeMarkdown({ content }) {
  if (!content) return null;
  const lines = content.split('\n');

  return (
    <div className="prose-custom space-y-3">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="font-display font-bold text-lg text-slate-900 dark:text-white mt-5 mb-2 first:mt-0">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="font-semibold text-base text-violet-700 dark:text-violet-300 mt-4 mb-1">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('```')) return null;
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-violet-600 dark:text-violet-400 mt-1 shrink-0">•</span>
              <span className="text-slate-800 dark:text-slate-300 text-sm leading-relaxed">
                {renderInline(line.slice(2))}
              </span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const num = line.match(/^(\d+)\./)[1];
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-violet-600 dark:text-violet-400 text-sm font-bold shrink-0 w-5">{num}.</span>
              <span className="text-slate-800 dark:text-slate-300 text-sm leading-relaxed">
                {renderInline(line.replace(/^\d+\.\s/, ''))}
              </span>
            </div>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-violet-50 dark:bg-violet-500/10 border-l-2 border-violet-500 dark:border-violet-400">
              <span className="text-sm text-slate-800 dark:text-slate-300 leading-relaxed">{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (line.startsWith('|') && line.endsWith('|')) {
          const cells = line.slice(1, -1).split('|').map((c) => c.trim());
          const isHeader = cells.every((c) => c && !c.includes('-'));
          return (
            <div key={i} className={`flex gap-2 ${isHeader ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-300'}`}>
              {cells.map((cell, j) => (
                <div key={j} className="flex-1 text-sm py-1.5 px-2 border-b border-slate-200 dark:border-white/10">{cell}</div>
              ))}
            </div>
          );
        }
        if (/^\|?[-|: ]+\|?$/.test(line) && line.includes('-')) return null;
        if (!line.trim()) return <div key={i} className="h-1" />;
        return (
          <p key={i} className="text-slate-800 dark:text-slate-300 text-sm leading-relaxed">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);

    if (!boldMatch && !codeMatch) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : Infinity;
    const codeIdx = codeMatch ? remaining.indexOf(codeMatch[0]) : Infinity;

    if (boldIdx <= codeIdx && boldMatch) {
      if (boldIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, boldIdx)}</span>);
      parts.push(<strong key={key++} className="text-slate-900 dark:text-white font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldIdx + boldMatch[0].length);
    } else if (codeMatch) {
      if (codeIdx > 0) parts.push(<span key={key++}>{remaining.slice(0, codeIdx)}</span>);
      parts.push(
        <code key={key++} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[0.8em] font-mono border border-violet-200 dark:border-violet-500/30">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeIdx + codeMatch[0].length);
    }
  }
  return parts;
}

export default function LessonPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user, addXP } = useAuth();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [isCourseFinished, setIsCourseFinished] = useState(false);

  const [activityStates, setActivityStates] = useState({});
  const [failedMessage, setFailedMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error: err } = await getLessonWithActivities(lessonId);
      if (cancelled) return;

      if (err) {
        setError('Ders yüklenemedi.');
      } else {
        setLesson(data);
      }

      if (user && data) {
        if (data.course_id) {
          localStorage.setItem('cyberedu_last_active_course', data.course_id);
          localStorage.setItem(`cyberedu_last_active_course_${user.id}`, data.course_id);
        }
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('status')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (progress?.status === 'completed') {
          setAlreadyCompleted(true);
        } else {
          await startLesson(user.id, lessonId);
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [lessonId, user]);

  const interactiveActivities = lesson?.activities?.filter((a) => !['heading', 'text'].includes(a.type)) || [];
  const allActivitiesDone = interactiveActivities.length > 0
    ? interactiveActivities.every((a) => activityStates[a.id]?.submitted)
    : true;

  const handleActivitySubmit = async (activity, { userAnswer, isCorrect }) => {
    const points = isCorrect ? activity.points : 0;

    setActivityStates((prev) => ({
      ...prev,
      [activity.id]: { submitted: true, result: { isCorrect, points } },
    }));

    if (user) {
      await saveActivityAttempt({
        userId: user.id,
        activityId: activity.id,
        userAnswer,
        isCorrect,
        pointsEarned: points,
      });
    }
  };

  const checkCourseCompletion = async () => {
    if (!lesson?.course_id || !user) return false;
    try {
      const { data: cLessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', lesson.course_id)
        .eq('is_published', true);

      if (cLessons && cLessons.length > 0) {
        const { data: doneLessons } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .in('lesson_id', cLessons.map((l) => l.id));

        const doneSet = new Set((doneLessons || []).map((l) => l.lesson_id));
        doneSet.add(lessonId); // include this lesson

        const allFinished = cLessons.every((l) => doneSet.has(l.id));
        if (allFinished) {
          setIsCourseFinished(true);
          await supabase
            .from('enrollments')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('course_id', lesson.course_id);

          // Takipçilere arkadaşın kursu tamamladı bildirimi gönder
          try {
            const { data: cData } = await supabase
              .from('courses')
              .select('title')
              .eq('id', lesson.course_id)
              .single();

            const { data: profData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .single();

            notifyFollowersCourseCompleted({
              userId: user.id,
              userName: profData?.full_name || 'Arkadaşın',
              courseId: lesson.course_id,
              courseTitle: cData?.title || 'Siber Güvenlik'
            });
          } catch (notifErr) {
            console.warn('Takipçilere bildirim gönderilemedi:', notifErr);
          }

          return true;
        }
      }
    } catch (e) {
      console.error('Kurs tamamlama kontrolü hatası:', e);
    }
    return false;
  };

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    setFailedMessage(null);

    const totalQuestions = interactiveActivities.length;
    const correctCount = Object.values(activityStates).filter((s) => s.result?.isCorrect).length;

    if (totalQuestions > 0) {
      const percentage = (correctCount / totalQuestions) * 100;
      if (percentage < PASS_PERCENT) {
        setFailedMessage(`Soruların en az %${PASS_PERCENT}'sini doğru cevaplamalısın. (Senin başarın: %${Math.round(percentage)})`);
        setCompleting(false);
        return;
      }
    }

    if (alreadyCompleted) {
      await checkCourseCompletion();
      setEarnedXP(0);
      setCompleted(true);
      setCompleting(false);
      return;
    }

    const totalActivityPoints = interactiveActivities.reduce((sum, a) => sum + (a.points || 0), 0);
    const xpFromActivities = Object.values(activityStates)
      .filter((s) => s.result?.isCorrect)
      .reduce((sum, s) => sum + (s.result.points ?? 0), 0);

    let totalXP = lesson?.xp_reward || 0;
    if (totalActivityPoints > 0) {
      totalXP = Math.round((xpFromActivities / totalActivityPoints) * totalXP);
    }

    if (user) {
      const { error: compError } = await completeLesson(user.id, lessonId);
      if (compError) {
        setFailedMessage('Ders kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
        setCompleting(false);
        return;
      }

      if (addXP) {
        const xpRes = await addXP(totalXP);
        if (xpRes && xpRes.error) {
          console.error('XP yazılamadı, ders tamamlama geri alınıyor:', xpRes.error);
          await rollbackLessonCompletion(user.id, lessonId);
          setFailedMessage('XP puanınız kaydedilemediği için ders tamamlanamadı. Lütfen tekrar deneyin.');
          setCompleting(false);
          return;
        }
      }

      await checkCourseCompletion();
    }

    setEarnedXP(totalXP);
    setCompleted(true);
    setAlreadyCompleted(true);
    setCompleting(false);
  };

  const handleRetry = () => {
    setActivityStates({});
    setFailedMessage(null);
    setRetryCount((c) => c + 1);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage message="Ders yükleniyor..."/>
      </DashboardLayout>
    );
  }

  if (error || !lesson) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center gap-4 min-h-[50vh] justify-center">
          <p className="text-slate-400">{error || 'Ders bulunamadı.'}</p>
          <button onClick={() => navigate(-1)} className="text-violet-400 underline text-sm">Geri dön</button>
        </div>
      </DashboardLayout>
    );
  }

  if (completed) {
    if (isCourseFinished) {
      return (
        <DashboardLayout>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-100 via-teal-50 to-white dark:from-emerald-950/70 dark:via-slate-900 dark:to-indigo-950/80 border-2 border-emerald-400/50 dark:border-emerald-500/40 p-8 md:p-12 text-center max-w-xl mx-auto my-8 shadow-2xl space-y-6">
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500 to-emerald-400 p-1 shadow-2xl shadow-emerald-500/30 animate-bounce mb-2">
                <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[22px] flex items-center justify-center text-5xl">
                  🏆
                </div>
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 px-4 py-1.5 rounded-full inline-block mt-3 mb-2">
                Kurs Tamamlandı!
              </span>

              <h2 className="font-display font-black text-3xl md:text-4xl text-slate-900 dark:text-white mt-1">
                Tebrikler, Şampiyon! 🎉
              </h2>

              <p className="text-emerald-700 dark:text-emerald-300 font-bold text-lg mt-2">
                {lesson.courses?.title || 'Siber Güvenlik Kursu'}
              </p>

              <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto mt-2 leading-relaxed">
                Bu kurstaki tüm dersleri, soru ve uygulamaları başarıyla tamamladın. Siber güvenlik yolculuğunda büyük bir adım attın!
              </p>

              {/* XP Kazancı */}
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 my-3 shadow-lg">
                <Zap className="text-amber-500 dark:text-amber-400" size={24} />
                <span className="font-display font-black text-2xl text-amber-600 dark:text-amber-400">
                  {earnedXP > 0 ? `+${earnedXP} XP` : 'Tüm XP\'ler Toplandı'}
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-xs font-semibold">
                  {earnedXP > 0 ? 'kazandın!' : 'Kayıtlara Geçti'}
                </span>
              </div>

              {/* Yeni Açılan Karakter & Ödül Kartı */}
              {(() => {
                const reward = findNewUnlockedReward(lesson.courses?.title);
                if (!reward) return null;
                return (
                  <div className="w-full my-3 p-4 rounded-2xl bg-gradient-to-r from-violet-100 via-purple-50 to-white dark:from-violet-950/80 dark:via-purple-950/60 dark:to-slate-900 border border-violet-200 dark:border-violet-500/40 flex items-center gap-4 text-left shadow-xl">
                    <div className="w-14 h-14 rounded-2xl bg-violet-200 dark:bg-violet-600/30 border border-violet-300 dark:border-violet-400/50 flex items-center justify-center text-3xl shadow-inner shrink-0 animate-bounce-subtle">
                      {reward.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/30 inline-flex items-center gap-1">
                        <Sparkles size={11} /> Yeni Başarı Rozeti & Unvanı Kazandın!
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-base mt-1.5">{reward.title}</h4>
                      <p className="text-xs text-violet-700 dark:text-violet-300 font-bold mb-0.5">{reward.name}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">Başarılar menüsünden yeni rozetini ve madalyanı inceleyebilirsin.</p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-3">
                <button
                  onClick={() => navigate('/student/achievements')}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-violet-600/30 hover:scale-[1.02] transition-all cursor-pointer"
                >
                  <Trophy size={18} /> Rozetlerimi & Başarılarımı Gör
                </button>
                <button
                  onClick={() => navigate('/student/courses')}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all cursor-pointer"
                >
                  <BookOpen size={18} /> Başka Kurslara Bak
                </button>
              </div>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-6 max-w-md mx-auto">
          <div className="text-6xl animate-float">🎉</div>
          <div>
            <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">
              {earnedXP > 0 ? 'Ders Başarıyla Tamamlandı!' : 'Ders Tekrar İncelendi!'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">{lesson.title}</p>
          </div>

          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <Zap className="text-amber-500 dark:text-amber-400" size={20}/>
            <span className="font-display font-black text-2xl text-amber-600 dark:text-amber-400">
              {earnedXP > 0 ? `+${earnedXP} XP` : 'Tamamlanmış Ders'}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              {earnedXP > 0 ? 'kazandın!' : '(XP daha önce alındı)'}
            </span>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => navigate('/student')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft size={16}/> Dashboard'a Dön
            </button>
            <button
              onClick={() => navigate('/student/learning-path')}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-all hover:-translate-y-0.5 shadow-md shadow-violet-500/25 cursor-pointer"
            >
              Yol Haritası <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const activities = [...(lesson.activities ?? [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  // ─── Storyline TAM DERS MODU ─────────────────────────────────────────────
  if (lesson.content_type === 'storyline' && lesson.storyline_url) {
    return (
      <DashboardLayout forceCollapsed={sidebarCollapsed}>
        <div className="space-y-4 pb-6">
          {/* Geri Dön + Başlık */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium cursor-pointer"
          >
            <ArrowLeft size={16}/> Geri Dön
          </button>

          <div className="flex items-start gap-4 p-5 rounded-2xl glass border border-slate-200 dark:border-white/10">
            <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <BookOpen className="text-violet-600 dark:text-violet-400" size={20}/>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display font-black text-xl text-slate-900 dark:text-white">{lesson.title}</h1>
                {alreadyCompleted && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                    Daha Önce Tamamlandı
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                  <Zap size={12}/>
                  <span>+{lesson.xp_reward || 0} XP</span>
                </div>
                <span className="text-xs text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/30">
                  🎬 Storyline Modülü
                </span>
              </div>
            </div>
          </div>

          {/* StorylinePlayer — Full Mod */}
          <StorylinePlayer
            url={lesson.storyline_url}
            mode="full"
            title={lesson.title}
            allowFullscreen={true}
            onCollapseSidebar={setSidebarCollapsed}
            submitted={alreadyCompleted}
            onSubmit={alreadyCompleted ? undefined : async () => {
              await handleComplete();
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium cursor-pointer"
        >
          <ArrowLeft size={16}/> Geri Dön
        </button>

        <div className="flex items-start gap-4 p-5 rounded-2xl glass border border-slate-200 dark:border-white/10">
          <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="text-violet-600 dark:text-violet-400" size={20}/>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-black text-xl text-slate-900 dark:text-white">{lesson.title}</h1>
              {alreadyCompleted && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30">
                  Daha Önce Tamamlandı
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                <Zap size={12}/>
                <span>+{lesson.xp_reward || 0} XP</span>
              </div>
              {activities.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Trophy size={12}/>
                  <span>{activities.length} içerik / etkinlik</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {activities.length > 0 && (
          <div className="space-y-6">
            <h2 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="text-amber-500 dark:text-amber-400" size={18}/>
              Etkileşimli Ders Akışı
            </h2>

            {activities.map((activity, idx) => {
              const isText = activity.type === 'heading' || activity.type === 'text';
              const state = activityStates[activity.id];

              const isUnlocked = idx === 0 || activities.slice(0, idx).every((a) =>
                ['heading', 'text'].includes(a.type) ? true : activityStates[a.id]?.submitted
              );

              if (isText) {
                if (!isUnlocked) return null;
                return (
                  <div key={activity.id} className="py-2 animate-in fade-in slide-in-from-bottom-4">
                    {activity.type === 'heading' ? (
                      <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white mt-4 border-b border-slate-200 dark:border-white/10 pb-2 mb-4">
                        {activity.question}
                      </h3>
                    ) : (
                      <div className="text-slate-800 dark:text-slate-300 leading-relaxed font-normal">
                        <SafeMarkdown content={activity.question}/>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={activity.id}
                  className={`glass rounded-2xl border p-5 transition-all duration-500 ${
                    !isUnlocked
                      ? 'border-slate-200 dark:border-white/5 opacity-50 scale-[0.98] pointer-events-none'
                      : state?.submitted
                        ? state.result?.isCorrect
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-rose-500/30 bg-rose-500/5'
                        : 'border-violet-500/30 shadow-[0_0_20px_rgba(124,58,237,0.08)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      state?.submitted
                        ? state.result?.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : 'bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                    }`}>
                      {state?.submitted
                        ? (state.result?.isCorrect ? '✓' : '✗')
                        : '?'}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      {{
                        multiple_choice:   'Çoktan Seçmeli',
                        true_false:        'Doğru / Yanlış',
                        fill_blank:        'Boşluk Doldur',
                        matching:          'Eşleştirme',
                        youtube:           'Video İçerik',
                        ordering:          'Sıralama',
                        memory_card:       'Hafıza Kartı',
                        hotspot:           'Resim Hedefi (Hotspot)',
                        scenario:          'Senaryo',
                        phishing_detector: 'Oltalama Analizi',
                        storyline:         'Storyline Modülü',
                      }[activity.type] || activity.type}
                    </span>
                    <div className="ml-auto flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      <Zap size={11}/>
                      <span>{activity.points} puan</span>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <ActivityRenderer
                      key={`${activity.id}-${retryCount}`}
                      activity={activity}
                      onSubmit={(res) => handleActivitySubmit(activity, res)}
                      submitted={state?.submitted ?? false}
                      result={state?.result}
                    />
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                      Bu soruyu görmek için önceki etkinlikleri tamamlamalısın
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {allActivitiesDone && !completed && (
          <div className="space-y-4 pt-4">
            {failedMessage && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center">
                <p className="text-rose-400 font-bold mb-2">{failedMessage}</p>
                <button
                  onClick={handleRetry}
                  className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-all hover:-translate-y-0.5"
                >
                  <RotateCcw className="inline mr-2 -mt-0.5" size={16}/>
                  Cevapları Sıfırla ve Tekrar Dene
                </button>
              </div>
            )}

            {!failedMessage && (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-500/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60"
              >
                {completing ? (
                  'Kaydediliyor...'
                ) : (
                  <>
                    <CheckCircle size={20}/>
                    {alreadyCompleted ? 'Dersi İncelemeyi Tamamla' : 'Dersi Tamamla & XP Kazan'}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}