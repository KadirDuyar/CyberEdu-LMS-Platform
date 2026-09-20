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
import { BookOpen, Zap, ArrowRight, Shield, Code2, CheckCircle2, Play, Lock, AlertCircle, Sparkles, Filter } from 'lucide-react';

// ─── Kategori görünüm ayarları ────────────────────────────────────────────────
const CATEGORY_UI = {
  awareness: {
    label: 'Siber Güvenlik Farkındalığı',
    desc: 'Günlük dijital hayatında güvende olman için gereken temel bilgiler',
    icon: Shield,
    banner: 'from-cyan-900/50 to-blue-900/30 border-cyan-500/20',
    glow: 'bg-cyan-500/20',
    badge: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    btn: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/30',
    progress: 'cyan',
  },
  technical: {
    label: 'Web Güvenliği & Teknik',
    desc: 'HTTP, SQL Injection, XSS ve güvenli kod yazımı üzerine teknik dersler',
    icon: Code2,
    banner: 'from-orange-900/50 to-red-900/30 border-orange-500/20',
    glow: 'bg-orange-500/20',
    badge: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-500/30',
    progress: 'amber',
  },
};

const LEVEL_LABELS = {
  beginner:     { label: 'Başlangıç', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  intermediate: { label: 'Orta',      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  advanced:     { label: 'İleri',     color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
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

        // İlk kurs varsa otomatik kayıtlı say
        if (courses.length > 0 && !enrollMap[courses[0].id]) {
          enrollMap[courses[0].id] = true;
          enrollInCourse(user.id, courses[0].id).catch(() => {});
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
    if (!isEnrolled && user) {
      await enrollInCourse(user.id, course.id);
      setEnrolledMap((prev) => ({ ...prev, [course.id]: true }));
    }
    navigate(`/student/courses/${course.id}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto pb-16">

        {/* Banner */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${ui.banner} border p-6`}>
          <div className={`absolute -top-8 -right-8 w-36 h-36 ${ui.glow} rounded-full blur-3xl`} />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon size={24} className={ui.badge.split(' ')[0]} />
            </div>
            <div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ui.badge}`}>
                {area === 'awareness' ? '🛡️ Normal Kullanıcı' : '⚔️ Teknik Öğrenci'}
              </span>
              <h1 className="font-display font-black text-xl text-white mt-1">{ui.label}</h1>
              <p className="text-slate-400 text-sm mt-1">{ui.desc}</p>
            </div>
          </div>
        </div>

        {/* Filtreleme Sekmeleri: Tümü, Seçmeli, Zorunlu */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            Tüm Kurslar ({courses.filter((c) => !c.title.includes('Kurumsal Siber Güvenlik') && !c.title.includes('Uygulama Güvenliği')).length})
          </button>
          <button
            onClick={() => setActiveTab('elective')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'elective'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                : 'bg-white/5 hover:bg-white/10 text-amber-300/90'
            }`}
          >
            <Sparkles size={13} /> Seçmeli Kurslar
          </button>
          <button
            onClick={() => setActiveTab('mandatory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'mandatory'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25'
                : 'bg-white/5 hover:bg-white/10 text-cyan-300/90'
            }`}
          >
            📌 Zorunlu Müfredat
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

              return (
                <div
                  key={course.id}
                  onClick={() => handleCardClick(course, isEnrolled, isLocked, prevCourse)}
                  className={`group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Card
                    hover={!isLocked}
                    className={`h-full border transition-all duration-200 ${
                      isCompleted
                        ? 'border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400'
                        : isLocked
                          ? 'border-white/5 bg-slate-900/40 opacity-60'
                          : isElective
                            ? 'border-amber-500/40 bg-amber-950/10 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.05)] hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                            : isEnrolled
                              ? 'border-violet-500/40 hover:border-violet-400'
                              : 'border-white/10 hover:border-violet-500/40'
                    }`}
                  >
                    {/* Üst: emoji + badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border ${
                        isLocked 
                          ? 'bg-slate-800/50 border-white/5 grayscale' 
                          : isElective
                            ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30'
                            : 'bg-gradient-to-br from-violet-500/20 to-pink-500/10 border-white/10'
                      }`}>
                        {isLocked ? '🔒' : (course.thumbnail_emoji || '🛡️')}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {isCompleted ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Tamamlandı
                          </span>
                        ) : isLocked ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-white/10 flex items-center gap-1">
                            <Lock size={11} />
                            Kilitli
                          </span>
                        ) : isEnrolled ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40">
                            Kayıtlı ({completedCount}/{lessonCount})
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Kursa Katıl
                          </span>
                        )}

                        <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${
                          isElective
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                        }`}>
                          {isElective ? '🌟 Seçmeli' : '📌 Zorunlu'}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${level.color}`}>
                          {level.label}
                        </span>
                      </div>
                    </div>

                    {/* Başlık ve açıklama */}
                    <h3 className={`font-display font-bold text-lg transition-colors ${
                      isLocked ? 'text-slate-400' : 'text-white group-hover:text-violet-300'
                    }`}>
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-sm text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    {/* Alt bilgi */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <BookOpen size={13} />
                        <span>{lessonCount} ders</span>
                      </div>
                      <div className="ml-auto flex items-center gap-1 text-xs font-semibold transition-all">
                        {isCompleted ? (
                          <span className="text-emerald-400 flex items-center gap-1">Tekrar İncele <ArrowRight size={13} /></span>
                        ) : isLocked ? (
                          <span className="text-slate-500 flex items-center gap-1">Önceki Kursu Tamamla <Lock size={12} /></span>
                        ) : isEnrolled ? (
                          <span className="text-violet-400 flex items-center gap-1">Devam Et <ArrowRight size={13} /></span>
                        ) : (
                          <span className="text-cyan-400 flex items-center gap-1 font-bold">Kursa Katıl <Play size={12} /></span>
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
          <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 animate-slide-up bg-slate-900/95 text-sm font-medium ${
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
