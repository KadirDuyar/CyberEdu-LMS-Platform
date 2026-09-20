import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Map, Zap, Clock, ArrowRight, ShieldCheck, Trophy,
  CheckCircle2, BookOpen, Sparkles
} from 'lucide-react';
import Card from '../components/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [isCourseFinished, setIsCourseFinished] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);

  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      navigate('/student/navigator', { replace: true });
      return;
    }
    if (user && profile) {
      loadDashboardData();
    }
  }, [profile, user]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // 1. Canlı Liderlik Tablosu
      const { data: board } = await supabase
        .from('profiles')
        .select('id, full_name, xp, level, avatar_emoji')
        .order('xp', { ascending: false })
        .limit(6);

      if (board) setLeaderboard(board);

      // 2. Tamamlanmış dersler (yalnızca bu kullanıcıya ait)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, status')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const doneIds = new Set((progressData || []).map((p) => p.lesson_id));
      setCompletedLessonIds(doneIds);

      // 3. Kullanıcının kayıtlı olduğu kurslar
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id, status, enrolled_at')
        .eq('user_id', user.id);

      const enrolledIds = new Set((enrollments || []).map((e) => e.course_id));

      // 4. Öğrencinin parkurundaki tüm kurslar
      const area = profile?.learning_area || 'awareness';
      const { data: allCourses } = await supabase
        .from('courses')
        .select('id, title, category, description, thumbnail_emoji, lessons(id, title, xp_reward, order_index, is_published)')
        .eq('category', area)
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      if (allCourses && allCourses.length > 0) {
        // Eğer hiçbir kursa kayıtlı değilse, ilk zorunlu kursa otomatik kaydet
        if (enrolledIds.size === 0) {
          const firstCourse = allCourses[0];
          await supabase.from('enrollments').upsert({
            user_id: user.id,
            course_id: firstCourse.id,
            status: 'active',
          }, { onConflict: 'user_id,course_id' });
          enrolledIds.add(firstCourse.id);
        }

        // Kayıtlı kursları işle
        const processedCourses = allCourses
          .filter((c) => enrolledIds.has(c.id))
          .map((c) => {
            const pubLessons = (c.lessons || [])
              .filter((l) => l.is_published)
              .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

            const doneCount = pubLessons.filter((l) => doneIds.has(l.id)).length;
            const isCompleted = pubLessons.length > 0 && doneCount === pubLessons.length;

            return {
              ...c,
              publishedLessons: pubLessons,
              totalLessons: pubLessons.length,
              doneCount,
              isCompleted,
            };
          });

        setEnrolledCourses(processedCourses);

        // Aktif kurs belirleme:
        // Öncelik: Tamamlanmamış ilk kurs
        // Eğer hepsi tamamlanmışsa: son tamamlanan kurs seçilir ve isCourseFinished = true olur
        const ongoingCourse = processedCourses.find((c) => !c.isCompleted);

        if (ongoingCourse) {
          setActiveCourse(ongoingCourse);
          setIsCourseFinished(false);
          const nextLesson = ongoingCourse.publishedLessons.find((l) => !doneIds.has(l.id)) || ongoingCourse.publishedLessons[0];
          setActiveLesson(nextLesson);
        } else if (processedCourses.length > 0) {
          const lastCompleted = processedCourses[processedCourses.length - 1];
          setActiveCourse(lastCompleted);
          setIsCourseFinished(true);
          setActiveLesson(null);
        } else {
          setActiveCourse(allCourses[0]);
          setIsCourseFinished(false);
        }
      }
    } catch (err) {
      console.error('Dashboard yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }

  // İstatistikler
  const totalCompletedCount = completedLessonIds.size;
  const totalMinutes = totalCompletedCount * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const learningTimeFormatted = hours > 0 ? `${hours}s ${minutes}dk` : `${minutes}dk`;

  // Aktif kurs ilerleme yüzdesi
  const activeCourseLessons = activeCourse?.publishedLessons || [];
  const activeTotal = activeCourseLessons.length || 1;
  const activeDone = activeCourseLessons.filter((l) => completedLessonIds.has(l.id)).length;
  const activePercent = Math.round((activeDone / activeTotal) * 100);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage message="Dashboard yükleniyor..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">

        {/* ── Banner: Kurs Tamamlandı vs Devam Et ──────────────────────── */}
        {isCourseFinished ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/90 via-teal-950/70 to-slate-900 border border-emerald-500/40 p-6 md:p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 bg-emerald-900/50 border border-emerald-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                  <Trophy size={14} className="text-amber-400" /> Kurs Başarıyla Tamamlandı!
                </span>
                <span className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                  {profile?.learning_area === 'technical' ? '💻 Teknik Parkur' : '🛡️ Farkındalık Parkuru'}
                </span>
              </div>

              <h2 className="font-display font-black text-2xl md:text-3xl text-white">
                Tebrikler, <span className="text-gradient">{profile?.full_name?.split(' ')[0] || 'Öğrenci'}!</span> 🎉
              </h2>

              <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                <strong className="text-emerald-300 font-bold">{activeCourse?.title}</strong> kursundaki tüm dersleri başarıyla bitirdin! Yeni yetenekler kazanmak ve siber güvenlikte uzmanlaşmak için sıradaki kurslara katılabilirsin.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate('/student/courses')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 hover:scale-105"
                >
                  <BookOpen size={18} /> Başka Kurslara Göz At
                </button>
                <button
                  onClick={() => navigate('/student/learning-path')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-sm font-bold transition-all"
                >
                  <Map size={18} /> Öğrenme Yolculuğum
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/80 via-purple-950/60 to-slate-900 border border-violet-500/30 p-6 md:p-8 shadow-2xl">
            <div className="relative z-10">
              <span className="text-xs font-black uppercase tracking-wider text-violet-300 bg-violet-900/40 border border-violet-700/40 px-3 py-1 rounded-full inline-block mb-3">
                {profile?.learning_area === 'technical' ? '💻 Teknik Siber Güvenlik Parkuru' : '🛡️ Siber Farkındalık Parkuru'}
              </span>
              <h2 className="font-display font-black text-2xl md:text-3xl text-white">
                Kaldığın yerden devam et, <span className="text-gradient">{profile?.full_name?.split(' ')[0] || 'Öğrenci'}!</span>
              </h2>
              <p className="text-slate-300 text-sm mt-2 max-w-xl">
                Şu an <span className="text-violet-300 font-bold underline decoration-violet-500">{activeCourse?.title || 'Eğitim Kursu'}</span> modülünde{' '}
                <strong className="text-white">"{activeLesson?.title || 'Eğitim Dersi'}"</strong> üzerindesin.
              </p>
              {activeLesson && (
                <button
                  onClick={() => navigate(`/student/lessons/${activeLesson.id}`)}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all shadow-lg shadow-violet-500/25 hover:scale-105"
                >
                  Derse Devam Et <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Dinamik İstatistik Metrikleri ────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card hover className="border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Öğrenme Süresi</p>
                <p className="text-xl font-black text-cyan-400">{totalCompletedCount === 0 ? '0 dk' : learningTimeFormatted}</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Zap size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Kazanılan Puan</p>
                <p className="text-xl font-black text-amber-400">+{profile?.xp || 0} XP</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Mevcut Kurs İlerlemesi</p>
                <p className="text-xl font-black text-emerald-400">%{activePercent}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Ders Akışı & Liderlik Tablosu ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sol Kolon: Kurs Dersleri */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <BookOpen size={18} className="text-violet-400" /> {activeCourse?.title || 'Kurs Dersleri'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isCourseFinished ? '✅ Bu kursun tüm derslerini tamamladın.' : `${activeDone} / ${activeTotal} Ders Tamamlandı`}
                </p>
              </div>

              <button
                onClick={() => navigate('/student/learning-path')}
                className="text-xs font-bold text-violet-400 hover:underline flex items-center gap-1"
              >
                Tüm Yolu Gör <ArrowRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {activeCourseLessons.map((l, idx) => {
                const isDone = completedLessonIds.has(l.id);
                const isCurrent = l.id === activeLesson?.id && !isDone;

                return (
                  <div
                    key={l.id}
                    onClick={() => navigate(`/student/lessons/${l.id}`)}
                    className={`p-4 rounded-2xl glass border transition-all flex items-center justify-between cursor-pointer hover:scale-[1.01] ${
                      isDone
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : isCurrent
                          ? 'border-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.2)]'
                          : 'border-white/5 hover:border-violet-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isDone
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isCurrent
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/50 animate-pulse'
                            : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{l.title}</h4>
                          {isDone && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Tamamlandı
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{activeCourse?.title}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">+{l.xp_reward || 100} XP</span>
                  </div>
                );
              })}
            </div>

            {/* Kayıtlı Diğer Kurslar Seçeneği */}
            {enrolledCourses.length > 1 && (
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Kayıtlı Kursların</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {enrolledCourses.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveCourse(c);
                        setIsCourseFinished(c.isCompleted);
                        const next = c.publishedLessons.find((l) => !completedLessonIds.has(l.id)) || c.publishedLessons[0];
                        setActiveLesson(next);
                      }}
                      className={`p-3 rounded-xl glass border cursor-pointer transition-all ${
                        activeCourse?.id === c.id ? 'border-violet-500 bg-violet-600/10' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white truncate">{c.title}</span>
                        {c.isCompleted && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                            ✅ Bitti
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{c.doneCount} / {c.totalLessons} Ders Tamamlandı</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sağ Kolon: Liderlik Tablosu & Hızlı Aksiyon */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" /> Canlı Liderlik Tablosu
            </h3>
            <div className="glass rounded-2xl border border-white/10 p-4 space-y-2.5">
              {leaderboard.map((st, i) => {
                const isMe = st.id === profile?.id;
                return (
                  <div
                    key={st.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                      isMe ? 'bg-violet-600/30 border border-violet-500/50 shadow-md' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className={`w-5 text-center font-black text-xs ${
                      i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'
                    }`}>
                      #{i + 1}
                    </span>
                    <span className="text-lg">{st.avatar_emoji || '👤'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {st.full_name} {isMe && '(Sen)'}
                      </p>
                      <p className="text-[10px] text-slate-400">Seviye {st.level || 1}</p>
                    </div>
                    <span className="text-xs font-black text-amber-400 font-mono">
                      {st.xp} XP
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Kurs Keşfet Kartı */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/40 to-indigo-950/40 border border-violet-500/20">
              <div className="flex items-center gap-2 text-violet-300 text-sm font-bold mb-1">
                <Sparkles size={16} /> Yeni Kurslar Keşfet
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Kataloğumuzdaki diğer siber güvenlik kurslarına katılarak rozet ve XP kazanabilirsin.
              </p>
              <button
                onClick={() => navigate('/student/courses')}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                Kurs Kataloğunu Aç <ArrowRight size={14} />
              </button>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}