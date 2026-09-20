import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { enrollInCourse } from '../../services/courseService';
import { Zap, CheckCircle2, Lock, ArrowRight, BookOpen, Sparkles, Play } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function LearningPath() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState(new Set());
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPath() {
      setLoading(true);
      try {
        const area = profile?.learning_area || 'awareness';

        // 1. Kullanıcının tamamladığı dersleri çek
        if (user) {
          const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('lesson_id, status')
            .eq('user_id', user.id)
            .eq('status', 'completed');

          setCompletedLessonIds(new Set((progressData || []).map((p) => p.lesson_id)));

          // 2. Kullanıcının kayıtlı olduğu kursları çek
          const { data: enrollData } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('user_id', user.id);

          setEnrolledCourseIds(new Set((enrollData || []).map((e) => e.course_id)));
        }

        // 3. Öğrencinin alanındaki TÜM kursları ve alt derslerini çek
        const { data: courseList } = await supabase
          .from('courses')
          .select('id, title, description, category, level, thumbnail_emoji, lessons(id, title, xp_reward, order_index, is_published)')
          .eq('category', area)
          .eq('is_published', true)
          .order('created_at', { ascending: true });

        if (courseList) {
          setCourses(courseList);

          // İlk kursa otomatik kayıt ol (eğer kayıtlı değilse)
          if (courseList.length > 0 && user) {
            const firstCourseId = courseList[0].id;
            setEnrolledCourseIds((prev) => {
              const updated = new Set(prev);
              updated.add(firstCourseId);
              return updated;
            });
            enrollInCourse(user.id, firstCourseId).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Yol haritası yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPath();
  }, [profile, user]);

  const handleCourseClick = async (course, isEnrolled) => {
    if (!isEnrolled && user) {
      // Kursa kaydol
      await enrollInCourse(user.id, course.id);
      setEnrolledCourseIds((prev) => new Set([...prev, course.id]));
    }
    navigate(`/student/courses/${course.id}`);
  };

  if (loading) {
    return <DashboardLayout><LoadingSpinner fullPage message="Öğrenme yolculuğunuz hazırlanıyor..." /></DashboardLayout>;
  }

  // İlk tamamlanmamış veya aktif kursun indeksi
  const activeCourseIndex = courses.findIndex((c) => {
    const pubLessons = (c.lessons || []).filter((l) => l.is_published);
    if (pubLessons.length === 0) return false;
    const isCompleted = pubLessons.every((l) => completedLessonIds.has(l.id));
    return !isCompleted;
  });

  const currentActiveIdx = activeCourseIndex === -1 ? courses.length : activeCourseIndex;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        
        {/* Başlık */}
        <div className="text-center space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-violet-400 bg-violet-950/60 border border-violet-800/40 px-3 py-1 rounded-full">
            Müfredat Ağacı & Kurs Yolculuğu
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-white">
            {profile?.learning_area === 'technical' ? 'Teknik Güvenlik' : 'Siber Farkındalık'} Sarmal Yolun
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-lg mx-auto">
            İlk temel kursunuz hazır. Sırasıyla kursları tamamlayarak siber güvenlik uzmanlığınızı pekiştirin.
          </p>
        </div>

        {/* Sarmal / Zigzag Kurs Haritası */}
        <div className="relative pt-6">
          {/* Ortadaki Dikey Çizgi */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-gradient-to-b from-violet-600 via-pink-600 to-slate-800 rounded-full z-0 hidden md:block" />

          <div className="space-y-12 relative z-10">
            {courses.map((course, idx) => {
              const isLeft = idx % 2 === 0;
              const pubLessons = (course.lessons || []).filter((l) => l.is_published);
              const totalLessons = pubLessons.length;
              const completedCount = pubLessons.filter((l) => completedLessonIds.has(l.id)).length;
              const isCompleted = totalLessons > 0 && completedCount === totalLessons;
              const isEnrolled = enrolledCourseIds.has(course.id) || idx === 0;
              const isActive = idx === currentActiveIdx;
              const isLocked = idx > currentActiveIdx + 1 && !isEnrolled;

              const totalXp = pubLessons.reduce((acc, l) => acc + (l.xp_reward || 0), 0);

              return (
                <div 
                  key={course.id} 
                  className={`flex flex-col md:flex-row items-center ${isLeft ? 'md:flex-row-reverse' : ''}`}
                >
                  {/* Kart Alanı */}
                  <div className={`w-full md:w-[45%] ${isLeft ? 'md:text-right' : 'md:text-left'}`}>
                    <div 
                      onClick={() => !isLocked && handleCourseClick(course, isEnrolled)}
                      className={`p-5 rounded-2xl border transition-all duration-300 ${
                        isCompleted
                          ? 'glass border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-400 hover:scale-[1.02] cursor-pointer'
                          : isActive || isEnrolled
                            ? 'glass border-violet-500 shadow-[0_0_25px_rgba(124,58,237,0.3)] hover:scale-[1.02] cursor-pointer' 
                            : isLocked
                              ? 'glass border-white/5 opacity-50 cursor-not-allowed'
                              : 'glass border-white/10 hover:border-violet-500/40 hover:scale-[1.02] cursor-pointer'
                      }`}
                    >
                      {/* Rozetler ve Başlık */}
                      <div className={`flex items-center gap-2 mb-2 flex-wrap ${isLeft ? 'md:justify-end' : 'md:justify-start'}`}>
                        {isCompleted ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Tamamlandı
                          </span>
                        ) : isEnrolled ? (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 animate-pulse">
                            Kayıtlı • {completedCount}/{totalLessons} Ders
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                            Kursa Katıl
                          </span>
                        )}

                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Zap size={13} /> {totalXp} XP
                        </span>
                      </div>

                      <div className={`flex items-start gap-3 ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                        <div className="text-3xl shrink-0 p-2 rounded-xl bg-white/5 border border-white/10">
                          {course.thumbnail_emoji || '🛡️'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-white">{course.title}</h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {course.description || 'İnteraktif siber güvenlik modülleri ve pratik senaryolar.'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Aksiyon Butonu */}
                      {!isLocked && (
                        <div className={`mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 text-xs font-bold ${
                          isCompleted ? 'text-emerald-400' : isEnrolled ? 'text-violet-400' : 'text-cyan-400'
                        } ${isLeft ? 'md:justify-end' : ''}`}>
                          {isCompleted ? (
                            <><span>Tekrar İncele</span> <ArrowRight size={14} /></>
                          ) : isEnrolled ? (
                            <><span>Kursa Devam Et</span> <ArrowRight size={14} /></>
                          ) : (
                            <><span>Kursa Dahil Ol & Başla</span> <Play size={13} /></>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bağlantı Çemberi */}
                  <div className="w-12 h-12 rounded-full border-4 border-[#0F0A1E] flex items-center justify-center font-black text-sm z-20 my-4 md:my-0 shrink-0 shadow-xl bg-slate-900">
                    {isCompleted ? (
                      <div className="w-full h-full rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 size={20} />
                      </div>
                    ) : isActive || isEnrolled ? (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white ring-4 ring-violet-500/30 shadow-lg shadow-violet-500/30">
                        {idx + 1}
                      </div>
                    ) : isLocked ? (
                      <div className="w-full h-full rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                        <Lock size={16} />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  {/* Denge Boşluğu */}
                  <div className="hidden md:block w-[45%]" />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}