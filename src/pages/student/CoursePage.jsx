import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCourse } from '../../hooks/useCourses';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/Card';
import ProgressBar from '../../components/ui/ProgressBar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  ArrowLeft, BookOpen, Zap, CheckCircle, Lock,
  Play, ChevronRight, Users,
} from 'lucide-react';

const LEVEL_LABELS = {
  beginner:     'Başlangıç',
  intermediate: 'Orta',
  advanced:     'İleri',
};

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const { user, addXP } = useAuth();
  const {
    course, enrolled, progress, loading, enrolling, error,
    enroll, completedCount, totalCount, progressPct,
  } = useCourse(courseId);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage message="Kurs yükleniyor..." />
      </DashboardLayout>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-slate-400">{error || 'Kurs bulunamadı.'}</p>
          <button onClick={() => navigate('/student/courses')} className="text-violet-400 text-sm underline">
            Kurslara dön
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Sıralı dersler
  const sortedLessons = [...(course.lessons ?? [])].sort(
    (a, b) => a.order_index - b.order_index
  );

  // Bir ders açık mı? (sıralı kilit: önceki tamamlanmadan bir sonraki kilitli)
  const isLessonUnlocked = (idx) => {
    if (!enrolled) return false;
    if (idx === 0) return true;
    return progress[sortedLessons[idx - 1]?.id] === 'completed';
  };

  const handleEnroll = async () => {
    await enroll();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Geri */}
        <button
          onClick={() => navigate('/student/courses')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Kurslara Dön
        </button>

        {/* Kurs Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/50 to-purple-900/30 border border-violet-500/20 p-6">
          <div className="absolute -top-8 -right-8 w-36 h-36 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="relative flex gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/30 to-pink-500/20 flex items-center justify-center text-4xl border border-white/10 shrink-0">
              {course.thumbnail_emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-violet-400 bg-violet-500/10 border-violet-500/30">
                  {course.category === 'awareness' ? '🛡️ Farkındalık' : '⚔️ Teknik'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-400 bg-white/5 border-white/10">
                  {LEVEL_LABELS[course.level]}
                </span>
              </div>
              <h1 className="font-display font-black text-xl text-white">{course.title}</h1>
              {course.description && (
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">{course.description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <BookOpen size={13} />
                  <span>{totalCount} ders</span>
                </div>
              </div>
            </div>
          </div>

          {/* İlerleme (kayıtlıysa) */}
          {enrolled && totalCount > 0 && (
            <div className="relative mt-5">
              <ProgressBar
                value={progressPct}
                showPercent
                color="violet"
                label={`${completedCount}/${totalCount} ders tamamlandı`}
              />
            </div>
          )}
        </div>

        {/* Kayıt kartı (kayıtlı değilse) */}
        {!enrolled && (
          <Card className="border border-violet-500/30 bg-violet-500/5 text-center space-y-3">
            <p className="text-white font-semibold">Bu kursa kayıt ol ve öğrenmeye başla!</p>
            <p className="text-xs text-slate-400">Dersleri görmek ve ilerlemeyi takip etmek için kayıt gerekiyor.</p>
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              {enrolling ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Kayıt yapılıyor...
                </>
              ) : (
                <>
                  <Play size={16} /> Kursa Kayıt Ol
                </>
              )}
            </button>
          </Card>
        )}

        {/* Ders Listesi */}
        <div>
          <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-violet-400" />
            Dersler
          </h2>

          <div className="space-y-3">
            {sortedLessons.map((lesson, idx) => {
              const lessonStatus = progress[lesson.id];
              const unlocked     = isLessonUnlocked(idx);
              const isDone       = lessonStatus === 'completed';
              const isActive     = lessonStatus === 'in_progress';

              return (
                <div
                  key={lesson.id}
                  onClick={() => unlocked && navigate(`/student/lessons/${lesson.id}`)}
                  className={[
                    'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200',
                    !unlocked
                      ? 'glass border-white/5 opacity-50 cursor-not-allowed'
                      : isDone
                      ? 'glass border-emerald-500/20 hover:border-emerald-500/40 cursor-pointer card-lift'
                      : isActive
                      ? 'glass border-violet-500/30 shadow-[0_0_20px_rgba(124,58,237,0.15)] cursor-pointer card-lift'
                      : 'glass border-white/10 hover:border-violet-500/40 cursor-pointer card-lift',
                  ].join(' ')}
                >
                  {/* Adım göstergesi */}
                  <div className={[
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0',
                    isDone    ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30' :
                    isActive  ? 'bg-violet-500/20 text-violet-400 ring-2 ring-violet-500/50 animate-pulse-slow' :
                    !unlocked ? 'bg-white/5 text-slate-600' :
                    'bg-white/10 text-slate-300',
                  ].join(' ')}>
                    {isDone ? <CheckCircle size={18} /> : !unlocked ? <Lock size={15} /> : idx + 1}
                  </div>

                  {/* Bilgi */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${!unlocked ? 'text-slate-600' : 'text-white'}`}>
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {isDone && (
                        <span className="text-[10px] font-bold text-emerald-400">✓ Tamamlandı</span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-bold text-violet-400">▶ Devam ediyor</span>
                      )}
                      {!isDone && !isActive && unlocked && (
                        <span className="text-[10px] text-slate-500">Başlanmadı</span>
                      )}
                      {!unlocked && (
                        <span className="text-[10px] text-slate-600">Önceki dersi tamamla</span>
                      )}
                    </div>
                  </div>

                  {/* XP */}
                  <div className="shrink-0 flex items-center gap-1">
                    <Zap size={13} className={!unlocked ? 'text-slate-600' : 'text-amber-400'} />
                    <span className={`text-xs font-bold ${!unlocked ? 'text-slate-600' : 'text-amber-400'}`}>
                      +{lesson.xp_reward}
                    </span>
                  </div>

                  {/* Ok */}
                  {unlocked && (
                    <ChevronRight size={16} className="text-slate-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Kurs tamamlama tebrik */}
        {enrolled && completedCount > 0 && completedCount === totalCount && (
          <Card className="border border-emerald-500/30 bg-emerald-500/5 text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <h3 className="font-display font-bold text-emerald-400">Tebrikler! Kursu tamamladın!</h3>
            <p className="text-xs text-slate-400">Bu kursu başarıyla bitirdin. Diğer kurslara göz atabilirsin.</p>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
