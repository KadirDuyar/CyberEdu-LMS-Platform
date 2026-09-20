import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCourses } from '../../hooks/useCourses';
import { supabase } from '../../lib/supabase';
import { enrollInCourse } from '../../services/courseService';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { BookOpen, Zap, ArrowRight, Shield, Code2, CheckCircle2, Play } from 'lucide-react';

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
  const { user, profile }    = useAuth();
  const { courses, loading, error } = useCourses();

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

  const handleCardClick = async (courseId, isEnrolled) => {
    if (!isEnrolled && user) {
      await enrollInCourse(user.id, courseId);
      setEnrolledMap((prev) => ({ ...prev, [courseId]: true }));
    }
    navigate(`/student/courses/${courseId}`);
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
              .map((course, idx) => {
              const lessonsForCourse = courseLessonsMap[course.id] || [];
              const lessonCount = lessonsForCourse.length || course.lessons?.[0]?.count || 0;
              const completedCount = lessonsForCourse.filter((id) => completedLessons.has(id)).length;
              const isCompleted = lessonCount > 0 && completedCount === lessonCount;
              const isEnrolled = enrolledMap[course.id] || idx === 0;
              const level = LEVEL_LABELS[course.level] || LEVEL_LABELS.beginner;

              return (
                <div
                  key={course.id}
                  onClick={() => handleCardClick(course.id, isEnrolled)}
                  className="group cursor-pointer"
                >
                  <Card
                    hover
                    className={`h-full border transition-all duration-200 ${
                      isCompleted
                        ? 'border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400'
                        : isEnrolled
                          ? 'border-violet-500/40 hover:border-violet-400'
                          : 'border-white/10 hover:border-violet-500/40'
                    }`}
                  >
                    {/* Üst: emoji + badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/10 flex items-center justify-center text-3xl border border-white/10">
                        {course.thumbnail_emoji || '🛡️'}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {isCompleted ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Tamamlandı
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
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${level.color}`}>
                          {level.label}
                        </span>
                      </div>
                    </div>

                    {/* Başlık ve açıklama */}
                    <h3 className="font-display font-bold text-lg text-white group-hover:text-violet-300 transition-colors">
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

      </div>
    </DashboardLayout>
  );
}
