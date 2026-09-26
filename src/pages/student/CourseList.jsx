import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCourses } from '../../hooks/useCourses';
import { supabase } from '../../lib/supabase';
import { enrollInCourse } from '../../services/courseService';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { BookOpen, Zap, ArrowRight, Shield, Code2, CheckCircle2, Play, Lock, AlertCircle, Sparkles, Filter, Calendar } from 'lucide-react';

// ─── Kategori görünüm ayarları ────────────────────────────────────────────────
const CATEGORY_UI = {
  awareness: {
    label: 'Siber Güvenlik Farkındalığı',
    desc: 'Günlük dijital hayatında güvende olman için gereken temel bilgiler',
    icon: Shield,
    banner: 'from-cyan-50 via-blue-50 to-white dark:from-cyan-900/50 dark:to-blue-900/30 border-cyan-200 dark:border-cyan-500/20 text-slate-900 dark:text-white',
    glow: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    badge: 'text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/10 border-cyan-300 dark:border-cyan-500/30',
    btn: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/30 text-white',
    progress: 'cyan',
  },
  technical: {
    label: 'Web Güvenliği & Teknik',
    desc: 'HTTP, SQL Injection, XSS ve güvenli kod yazımı üzerine teknik dersler',
    icon: Code2,
    banner: 'from-orange-50 via-red-50 to-white dark:from-orange-900/50 dark:to-red-900/30 border-orange-200 dark:border-orange-500/20 text-slate-900 dark:text-white',
    glow: 'bg-orange-500/10 dark:bg-orange-500/20',
    badge: 'text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30',
    btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/30 text-white',
    progress: 'amber',
  },
};

const LEVEL_LABELS = {
  beginner:     { label: 'Başlangıç', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30' },
  intermediate: { label: 'Orta',      color: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30' },
  advanced:     { label: 'İleri',     color: 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30' },
};

export default function CourseList() {
  const navigate             = useNavigate();
  const [searchParams]       = useSearchParams();
  const { user, profile }    = useAuth();
  const { courses, loading, error } = useCourses();

  const [activeTab, setActiveTab] = useState(searchParams.get('filter') === 'elective' ? 'elective' : 'all');
  const [enrolledMap, setEnrolledMap] = useState({});
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [courseLessonsMap, setCourseLessonsMap] = useState({});
  const [cohortCourseIds, setCohortCourseIds] = useState(new Set());

  const area = profile?.learning_area ?? 'awareness';
  const ui   = CATEGORY_UI[area] || CATEGORY_UI.awareness;
  const Icon = ui.icon;

  useEffect(() => {
    async function loadStudentCourseStatus() {
      if (!user) return;
      try {
        // 1. Kayıtlı kurslar
        const { data: enrolls } = await supabase
          .from('enrollments')
          .select('course_id')
          .eq('user_id', user.id);

        const enrollMap = {};
        (enrolls || []).forEach((e) => {
          enrollMap[e.course_id] = true;
        });

        // 2. Tamamlanan dersler
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        setCompletedLessons(new Set((progress || []).map((p) => p.lesson_id)));

        // 3. Kursların derslerini çek
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('id, course_id, is_published')
          .eq('is_published', true);

        const lessonMap = {};
        (allLessons || []).forEach((l) => {
          if (!lessonMap[l.course_id]) lessonMap[l.course_id] = [];
          lessonMap[l.course_id].push(l.id);
        });
        setCourseLessonsMap(lessonMap);

        // 4. Öğrencinin kayıtlı olduğu haftalık sınıf görevleri (cohort) kursları
        const { data: memberCohorts } = await supabase
          .from('cohort_members')
          .select('cohort_id')
          .eq('student_id', user.id);

        const cIds = (memberCohorts || []).map((m) => m.cohort_id);
        if (cIds.length > 0) {
          const { data: cohortWeeks } = await supabase
            .from('cohort_weeks')
            .select('course_id')
            .in('cohort_id', cIds)
            .not('course_id', 'is', null);

          setCohortCourseIds(new Set((cohortWeeks || []).map((w) => w.course_id)));
        }

        setEnrolledMap(enrollMap);
      } catch (err) {
        console.error('Kurs durumları yüklenemedi:', err);
      }
    }

    loadStudentCourseStatus();
  }, [user, courses]);

  // Navigator tamamlanmadıysa yönlendir
  if (profile && !profile.onboarding_completed) {
    return (
      <DashboardLayout>
        <EmptyState
          emoji="🧭"
          title="Önce öğrenme yolunu belirle"
          desc="Sana uygun kursları gösterebilmek için Navigator'ı tamamlaman gerekiyor."
          action={{ label: 'Navigatöre Git', onClick: () => navigate('/student/navigator') }}
        />
      </DashboardLayout>
    );
  }

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCardClick = async (course, isEnrolled, isLocked, prevCourse) => {
    if (isLocked) {
      showToast(`🔒 Bu kurs kilitlidir. Başlamak için önce "${prevCourse?.title || 'önceki kursu'}" tamamlamalısınız.`, 'warning');
      return;
    }
    localStorage.setItem('cyberedu_last_active_course', course.id);
    if (user) {
      localStorage.setItem(`cyberedu_last_active_course_${user.id}`, course.id);
    }
    navigate(`/student/courses/${course.id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-16">

        {/* Banner */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${ui.banner} border p-6 shadow-sm`}>
          <div className={`absolute -top-8 -right-8 w-36 h-36 ${ui.glow} rounded-full blur-3xl`} />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
              <Icon size={24} className={ui.badge.split(' ')[0]} />
            </div>
            <div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ui.badge}`}>
                {area === 'awareness' ? '🛡️ Normal Kullanıcı' : '⚔️ Teknik Öğrenci'}
              </span>
              <h1 className="font-display font-black text-xl text-slate-900 dark:text-white mt-1">{ui.label}</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{ui.desc}</p>
            </div>
          </div>
        </div>

        {/* Filtreleme Sekmeleri: Tümü, Zorunlu Patika, Sınıf Görevleri, Seçmeli */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent'
            }`}
          >
            Tüm Kurslar ({courses.filter((c) => !c.title.includes('Kurumsal Siber Güvenlik') && !c.title.includes('Uygulama Güvenliği')).length})
          </button>
          <button
            onClick={() => setActiveTab('mandatory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'mandatory'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25'
                : 'bg-rose-50 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-white/10 text-rose-700 dark:text-rose-300/90 border border-rose-200 dark:border-transparent'
            }`}
          >
            🔴 Zorunlu Patika ({courses.filter((c) => c.is_mandatory !== false && c.course_type !== 'elective').length})
          </button>
          <button
            onClick={() => setActiveTab('cohort')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'cohort'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                : 'bg-cyan-50 hover:bg-cyan-100 dark:bg-white/5 dark:hover:bg-white/10 text-cyan-700 dark:text-cyan-300/90 border border-cyan-200 dark:border-transparent'
            }`}
          >
            <Calendar size={13} /> 🔵 Sınıf Görevleri ({courses.filter((c) => cohortCourseIds.has(c.id)).length})
          </button>
          <button
            onClick={() => setActiveTab('elective')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'elective'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-white/5 dark:hover:bg-white/10 text-emerald-700 dark:text-emerald-300/90 border border-emerald-200 dark:border-transparent'
            }`}
          >
            <Sparkles size={13} /> 🟢 Seçmeli Kurslar ({courses.filter((c) => c.is_mandatory === false || c.course_type === 'elective').length})
          </button>
        </div>

        {/* İçerik */}
        {loading ? (
          <LoadingSpinner fullPage message="Kurslar yükleniyor..." />
        ) : error ? (
          <EmptyState emoji="⚠️" title="Hata" desc={error} />
        ) : courses.length === 0 ? (
          <EmptyState
            emoji="📚"
            title="Henüz kurs yok"
            desc="Bu kategori için kurs yakında eklenecek."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {courses
              .filter((c) => !c.title.includes('Kurumsal Siber Güvenlik') && !c.title.includes('Uygulama Güvenliği'))
              .filter((c) => {
                const isElective = c.is_mandatory === false || c.course_type === 'elective';
                if (activeTab === 'elective') return isElective;
                if (activeTab === 'mandatory') return !isElective;
                if (activeTab === 'cohort') return cohortCourseIds.has(c.id);
                return true;
              })
              .map((course, idx, arr) => {
              const lessonsForCourse = courseLessonsMap[course.id] || [];
              const lessonCount = lessonsForCourse.length || course.lessons?.[0]?.count || 0;
              const completedCount = lessonsForCourse.filter((id) => completedLessons.has(id)).length;
              const isCompleted = lessonCount > 0 && completedCount === lessonCount;
              const isEnrolled = enrolledMap[course.id] || idx === 0;
              const level = LEVEL_LABELS[course.level] || LEVEL_LABELS.beginner;

              const isElective = course.is_mandatory === false || course.course_type === 'elective';
              const isMandatory = !isElective;

              // Sıralı ilerleme mantığı:
              // Seçmeli kurslar serbestçe alınabilir (kilitli değildir).
              // Zorunlu kurslar: İlk zorunlu kurs açık, sonrakiler bir önceki zorunlu kurs tamamlandığında açılır.
              let isLocked = false;
              let prevCourse = null;
              if (isMandatory) {
                const mandatoryCourses = courses
                  .filter((c) => !c.title.includes('Kurumsal Siber Güvenlik') && !c.title.includes('Uygulama Güvenliği'))
                  .filter((c) => c.is_mandatory !== false && c.course_type !== 'elective');
                const mandIdx = mandatoryCourses.findIndex((c) => c.id === course.id);
                if (mandIdx > 0) {
                  prevCourse = mandatoryCourses[mandIdx - 1];
                  const prevLessons = prevCourse ? (courseLessonsMap[prevCourse.id] || []) : [];
                  const isPrevCompleted = prevLessons.length > 0 && prevLessons.every((id) => completedLessons.has(id));
                  isLocked = !isPrevCompleted;
                }
              }

              const isCohortCourse = cohortCourseIds.has(course.id);

              return (
                <div
                  key={course.id}
                  onClick={() => handleCardClick(course, isEnrolled, isLocked, prevCourse)}
                  className={`group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Card
                    hover={!isLocked}
                    className={`h-full border transition-all duration-200 shadow-sm ${
                      isCompleted
                        ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/10 hover:border-emerald-400'
                        : isLocked
                          ? 'border-slate-200 dark:border-white/5 bg-slate-100/70 dark:bg-slate-900/40 opacity-60'
                          : isCohortCourse
                            ? 'border-cyan-300 dark:border-cyan-500/50 bg-cyan-50/70 dark:bg-cyan-950/20 hover:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                            : isElective
                              ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/10 hover:border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                              : isEnrolled
                                ? 'border-rose-300 dark:border-rose-500/40 hover:border-rose-400 bg-rose-50/50 dark:bg-rose-950/10'
                                : 'border-slate-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/40 bg-white dark:bg-transparent'
                    }`}
                  >
                    {/* Üst: emoji + badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border ${
                        isLocked 
                          ? 'bg-slate-200 dark:bg-slate-800/50 border-slate-300 dark:border-white/5 grayscale' 
                          : isCohortCourse
                            ? 'bg-cyan-100 dark:bg-gradient-to-br dark:from-cyan-500/20 dark:to-blue-500/10 border-cyan-300 dark:border-cyan-500/40'
                            : isElective
                              ? 'bg-emerald-100 dark:bg-gradient-to-br dark:from-emerald-500/20 dark:to-teal-500/10 border-emerald-300 dark:border-emerald-500/30'
                              : 'bg-rose-100 dark:bg-gradient-to-br dark:from-rose-500/20 dark:to-pink-500/10 border-rose-300 dark:border-rose-500/30'
                      }`}>
                        {isLocked ? '🔒' : (course.thumbnail_emoji || '🛡️')}
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-end gap-1.5 max-w-[70%]">
                        {isCompleted ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Tamamlandı
                          </span>
                        ) : isLocked ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-white/10 flex items-center gap-1">
                            <Lock size={11} />
                            Kilitli
                          </span>
                        ) : isEnrolled ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-500/40">
                            Kayıtlı ({completedCount}/{lessonCount})
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                            Kursa Katıl
                          </span>
                        )}

                        {/* Aktif Sınıf Görevi Rozeti */}
                        {isCohortCourse && (
                          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/50 flex items-center gap-1 shadow-sm">
                            <Calendar size={11} className="text-cyan-600 dark:text-cyan-400" />
                            Sınıf Görevi
                          </span>
                        )}

                        {/* Müfredat / Patika Türü Rozeti */}
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${
                          isElective
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                        }`}>
                          {isElective ? '🟢 Seçmeli' : '🔴 Zorunlu'}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${level.color}`}>
                          {level.label}
                        </span>
                      </div>
                    </div>

                    {/* Başlık ve açıklama */}
                    <h3 className={`font-display font-bold text-lg transition-colors ${
                      isLocked ? 'text-slate-400' : 'text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300'
                    }`}>
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Alt bilgi */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <BookOpen size={13} />
                        <span>{lessonCount} ders</span>
                      </div>
                      <div className="ml-auto flex items-center gap-1 text-xs font-semibold transition-all">
                        {isCompleted ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">Tekrar İncele <ArrowRight size={13} /></span>
                        ) : isLocked ? (
                          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">Önceki Kursu Tamamla <Lock size={12} /></span>
                        ) : isEnrolled ? (
                          <span className="text-violet-600 dark:text-violet-400 flex items-center gap-1">Devam Et <ArrowRight size={13} /></span>
                        ) : (
                          <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1 font-bold">Kursa Katıl <Play size={12} /></span>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Toast Bildirimi */}
        {toast && (
          <div className={`fixed top-20 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 animate-slide-up bg-slate-900/95 text-sm font-medium ${
            toast.type === 'warning' ? 'border-amber-500/50 text-amber-300' : 'border-emerald-500/50 text-emerald-300'
          }`}>
            <AlertCircle size={18} className={`shrink-0 ${toast.type === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>{toast.message}</span>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
