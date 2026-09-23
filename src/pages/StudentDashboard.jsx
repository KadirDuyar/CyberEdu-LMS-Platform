import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Map, Zap, Clock, ArrowRight, ShieldCheck, Trophy,
  CheckCircle2, BookOpen, Sparkles, UserPlus, UserCheck
} from 'lucide-react';
import Card from '../components/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import OnboardingTour from '../components/ui/OnboardingTour';
import { getFollowingIds, followUser, unfollowUser } from '../services/socialService';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [leaderboard, setLeaderboard] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [isCourseFinished, setIsCourseFinished] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      navigate('/student/navigator', { replace: true });
      return;
    }
    if (user && profile) {
      const isInitial = !initialLoadDone.current;
      initialLoadDone.current = true;
      loadDashboardData(isInitial);
      loadFollowing();
    }
  }, [profile?.onboarding_completed, profile?.learning_area, profile?.xp, profile?.level, user?.id]);

  async function loadFollowing() {
    if (!user) return;
    const ids = await getFollowingIds(user.id);
    setFollowingIds(ids);
  }

  const handleToggleFollow = async (targetStudent) => {
    if (!user || targetStudent.id === user.id) return;
    const isFollowing = followingIds.has(targetStudent.id);

    // Optimistic update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetStudent.id);
      else next.add(targetStudent.id);
      return next;
    });

    if (isFollowing) {
      await unfollowUser(user.id, targetStudent.id);
    } else {
      await followUser(user.id, targetStudent.id, profile?.full_name || 'Bir arkadaşın');
    }
  };

  async function loadDashboardData(isInitial = false) {
    if (isInitial || !activeCourse) {
      setLoading(true);
    }
    try {
      // 1. Canlı Liderlik Tablosu
      const { data: board } = await supabase
        .from('profiles')
        .select('id, full_name, xp, level, avatar_emoji')
        .order('xp', { ascending: false })
        .limit(6);

      if (board) setLeaderboard(board);

      // 2. Tamamlanmış ve devam eden dersler (yalnızca bu kullanıcıya ait)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, status, completed_at, updated_at')
        .eq('user_id', user.id);

      const progressList = progressData || [];
      const doneIds = new Set(progressList.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
      setCompletedLessonIds(doneIds);

      // 3. Kullanıcının kayıtlı olduğu kurslar
      let enrollments = [];
      try {
        const { data } = await supabase
          .from('enrollments')
          .select('course_id, enrolled_at')
          .eq('user_id', user.id)
          .order('enrolled_at', { ascending: false });
        if (data) enrollments = data;
      } catch (e) {
        console.warn('Enrollments fetch error:', e);
      }

      const enrolledIds = new Set(enrollments.map((e) => e.course_id));
      const latestEnrolledCourseId = enrollments?.[0]?.course_id;

      // 4. Tüm yayınlanmış kursları çek (tüm kategoriler dahil)
      const area = profile?.learning_area || 'awareness';
      const { data: rawCourses } = await supabase
        .from('courses')
        .select('*, lessons(id, title, xp_reward, order_index, is_published)')
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      const allCourses = (rawCourses || []).filter(
        (c) => !c.title.includes('Kurumsal Siber Güvenlik') && !c.title.includes('Uygulama Güvenliği')
      );

      if (allCourses && allCourses.length > 0) {
        // Her kurs için ilerleme durumunu ve son aktivite zamanını hesapla
        const processedCourses = allCourses.map((c, idx) => {
          const pubLessons = (c.lessons || [])
            .filter((l) => l.is_published)
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

          const lessonIdSet = new Set(pubLessons.map((l) => l.id));
          const courseProgresses = progressList.filter((p) => lessonIdSet.has(p.lesson_id));
          const doneLessons = courseProgresses.filter((p) => p.status === 'completed');
          const doneCount = doneLessons.length;
          const isCompleted = pubLessons.length > 0 && doneCount === pubLessons.length;
          const isInProgress = doneCount > 0 && !isCompleted;
          const isEnrolled = enrolledIds.has(c.id);

          // Bu kurstaki en son aktivite zamanı
          const latestActivityTime = courseProgresses.reduce((max, p) => {
            const time = new Date(p.completed_at || p.updated_at || 0).getTime();
            return time > max ? time : max;
          }, 0);

          return {
            ...c,
            publishedLessons: pubLessons,
            totalLessons: pubLessons.length,
            doneCount,
            isCompleted,
            isInProgress,
            latestActivityTime,
            isEnrolled,
            courseOrder: idx,
            isMandatory: c.is_mandatory !== false,
          };
        });

        // ── AKILLI AKTİF KURS BELİRLEME MANTIĞI ──
        const savedLastCourseId = localStorage.getItem(`cyberedu_last_active_course_${user.id}`) || localStorage.getItem('cyberedu_last_active_course');
        let targetCourse = null;

        // A) Eğer kullanıcının devam ettiği (başlamış ama bitirmemiş) kurslar varsa en son işlem yapılanı bul
        const inProgressCourses = processedCourses
          .filter((c) => c.isInProgress)
          .sort((a, b) => b.latestActivityTime - a.latestActivityTime);

        // B) Eğer localStorage'daki kurs geçerliyse:
        if (savedLastCourseId) {
          const found = processedCourses.find((c) => c.id === savedLastCourseId);
          if (found) {
            // Eğer localStorage'daki kurs bitmemişse veya aktif olarak üzerinde çalışılıyorsa öncelik ver
            if (!found.isCompleted) {
              targetCourse = found;
            } else if (inProgressCourses.length > 0) {
              // localStorage'daki kurs bitti ama başka devam eden kurs varsa o devam eden kursa geç
              targetCourse = inProgressCourses[0];
            } else {
              // Başka devam eden kurs yoksa bitirilen kursu göster (Tebrik banner'ı için)
              targetCourse = found;
            }
          }
        }

        // C) Eğer hala belirlenmediyse: Devam eden ilk kurs
        if (!targetCourse && inProgressCourses.length > 0) {
          targetCourse = inProgressCourses[0];
        }

        // D) En son kayıt olunan kurs (eğer henüz başlanmamış veya devam ediyorsa)
        if (!targetCourse && latestEnrolledCourseId) {
          const found = processedCourses.find((c) => c.id === latestEnrolledCourseId);
          if (found && !found.isCompleted) {
            targetCourse = found;
          }
        }

        // E) Öğrencinin alanındaki (awareness/technical) ilk tamamlanmamış ZORUNLU kurs, yoksa ilk tamamlanmamış kurs
        if (!targetCourse) {
          const areaCourses = processedCourses.filter((c) => c.category === area);
          targetCourse = areaCourses.find((c) => c.isMandatory && !c.isCompleted)
            || areaCourses.find((c) => !c.isCompleted)
            || processedCourses.find((c) => !c.isCompleted);
        }

        // F) Tüm kurslar bittiyse veya yeni öğrenci için ilk alan kursunu seç
        if (!targetCourse) {
          targetCourse = processedCourses.find((c) => c.category === area) || processedCourses[0];
        }

        if (targetCourse) {
          // Hedef kursa kaydı yoksa kaydet
          if (!targetCourse.isEnrolled) {
            supabase.from('enrollments').upsert({
              user_id: user.id,
              course_id: targetCourse.id,
              enrolled_at: new Date().toISOString(),
            }, { onConflict: 'user_id,course_id' }).then(({ error }) => {
              if (error) console.error('Otomatik kayıt hatası:', error);
            });
            targetCourse.isEnrolled = true;
            enrolledIds.add(targetCourse.id);
          }

          setActiveCourse(targetCourse);
          setIsCourseFinished(targetCourse.isCompleted);

          // Sıradaki tamamlanmamış dersi bul
          const nextLesson = targetCourse.publishedLessons.find((l) => !doneIds.has(l.id))
            || targetCourse.publishedLessons[targetCourse.publishedLessons.length - 1];
          setActiveLesson(nextLesson);

          // Hafızaya kaydet
          localStorage.setItem(`cyberedu_last_active_course_${user.id}`, targetCourse.id);
          localStorage.setItem('cyberedu_last_active_course', targetCourse.id);
        }

        // Kayıtlı kurslar listesini güncelle
        setEnrolledCourses(processedCourses.filter((c) => c.isEnrolled || enrolledIds.has(c.id) || c.id === targetCourse?.id));
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

  // Yeni öğrenci kontrolü (hiç tamamlanmış dersi olmayan)
  const isNewStudent = completedLessonIds.size === 0 && activeDone === 0;

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

        {/* ── Banner: Kurs Tamamlandı vs Yeni Öğrenci vs Devam Et ──────────────────────── */}
        <div id="tour-resume-card">
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
          ) : isNewStudent ? (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/90 via-blue-950/70 to-slate-900 border border-cyan-500/40 p-6 md:p-8 shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-300 bg-cyan-900/50 border border-cyan-500/40 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                    🎯 İlk Kursun Hazır!
                  </span>
                  <span className="text-xs font-bold text-slate-300 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                    {profile?.learning_area === 'technical' ? '💻 Teknik Siber Güvenlik Parkuru' : '🛡️ Siber Farkındalık Parkuru'}
                  </span>
                </div>

                <h2 className="font-display font-black text-2xl md:text-3xl text-white">
                  Aramıza Hoş Geldin, <span className="text-gradient">{profile?.full_name?.split(' ')[0] || 'Öğrenci'}!</span> 🚀
                </h2>

                <p className="text-slate-300 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                  Siber güvenlik yolculuğuna <strong className="text-cyan-300 font-bold">{activeCourse?.title || 'Temel Güvenlik Kursu'}</strong> ile başlamaya hazırsın. Hemen ilk dersine gir ve maceraya başla!
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {activeLesson && (
                    <button
                      onClick={() => navigate(`/student/lessons/${activeLesson.id}`)}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-all shadow-lg shadow-cyan-500/25 hover:scale-105"
                    >
                      İlk Kursuna Başla 🚀 <ArrowRight size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate('/student/learning-path')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-sm font-bold transition-all"
                  >
                    <Map size={18} /> Yol Haritasını Gör
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
        </div>

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
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <BookOpen size={18} className="text-violet-400" /> {activeCourse?.title || 'Kurs Dersleri'}
                  </h3>
                  {activeCourse && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      activeCourse.isMandatory
                        ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {activeCourse.isMandatory ? '📌 Zorunlu Müfredat' : '🌟 Seçmeli Kurs'}
                    </span>
                  )}
                </div>
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
                        const next = c.publishedLessons.find((l) => !completedLessonIds.has(l.id)) || c.publishedLessons[c.publishedLessons.length - 1];
                        setActiveLesson(next);
                        if (user) {
                          localStorage.setItem(`cyberedu_last_active_course_${user.id}`, c.id);
                        }
                        localStorage.setItem('cyberedu_last_active_course', c.id);
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
          <div id="tour-leaderboard" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Trophy size={18} className="text-amber-400" /> Canlı Liderlik
              </h3>
              <button
                onClick={() => navigate('/student/leaderboard')}
                className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1"
              >
                Tümünü Gör <ArrowRight size={13} />
              </button>
            </div>

            <div className="glass rounded-2xl border border-white/10 p-4 space-y-2.5">
              {leaderboard.map((st, i) => {
                const isMe = st.id === profile?.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => navigate(`/student/leaderboard/${st.id}`)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer ${
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">Lv.{st.level || 1}</span>
                        <span className="text-[10px] font-black text-amber-400 font-mono">
                          {st.xp} XP
                        </span>
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFollow(st);
                        }}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                          followingIds.has(st.id)
                            ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                            : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
                        }`}
                        title={followingIds.has(st.id) ? 'Takibi Bırak' : 'Takip Et'}
                      >
                        {followingIds.has(st.id) ? (
                          <>
                            <UserCheck size={11} className="text-violet-400" /> Takipte
                          </>
                        ) : (
                          <>
                            <UserPlus size={11} /> Takip Et
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => navigate('/student/leaderboard')}
                className="w-full mt-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-violet-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1 border border-white/5"
              >
                🏆 Liderlik Tablosu Sayfası <ArrowRight size={13} />
              </button>
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

        {/* Tek Gösterimlik Platform Tanıtım Rehberi */}
        <OnboardingTour />

      </div>
    </DashboardLayout>
  );
}