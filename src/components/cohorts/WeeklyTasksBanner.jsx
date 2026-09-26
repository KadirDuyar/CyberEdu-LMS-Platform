import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
  Plus,
  BookOpen,
  Trophy,
  Users,
  Shield,
  Layers,
  X,
} from 'lucide-react';
import {
  getStudentCohortData,
  joinCohortByCode,
} from '../../services/cohortService';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function WeeklyTasksBanner({ userId, onProgressUpdated }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [selectedWeekByCohort, setSelectedWeekByCohort] = useState({});

  // Koda göre katılma modalı / inputu
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    if (userId) {
      loadCohortData();
    }
  }, [userId]);

  async function loadCohortData() {
    setLoading(true);
    const { cohorts: loadedCohorts, tasks: loadedTasks, activeTask: loadedActive } =
      await getStudentCohortData(userId);

    setCohorts(loadedCohorts);
    setTasks(loadedTasks);
    setActiveTask(loadedActive);

    // Her program için varsayılan seçili haftayı belirle (ilk aktif veya ilk hafta)
    const initialSelected = {};
    for (const c of loadedCohorts) {
      const cTasks = loadedTasks.filter((t) => t.cohort_id === c.id);
      const firstActive = cTasks.find((t) => !t.isCompleted && !t.isLocked) || cTasks[0];
      if (firstActive?.id) {
        initialSelected[c.id] = firstActive.id;
      }
    }
    setSelectedWeekByCohort(initialSelected);
    setLoading(false);
  }

  const handleJoinCohort = async (e) => {
    e?.preventDefault();
    if (!joinCodeInput.trim()) {
      showFeedback('Lütfen 6 haneli katılım kodunu girin.', 'error');
      return;
    }

    setJoining(true);
    const { data, error } = await joinCohortByCode(joinCodeInput, userId);
    setJoining(false);

    if (error) {
      showFeedback(error.message, 'error');
    } else {
      showFeedback(`"${data.title}" programına başarıyla katıldın! 🎉`);
      setJoinCodeInput('');
      setJoinModalOpen(false);
      await loadCohortData();
      if (onProgressUpdated) onProgressUpdated();
    }
  };

  // Zaman farkı hesaplayıcı
  const getRemainingTime = (dueDateStr) => {
    if (!dueDateStr) return '';
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffMs = due - now;

    if (diffMs <= 0) {
      return { isExpired: true, text: 'Süresi doldu (Gecikmeli tamamlayabilirsin)' };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    if (diffDays > 0) {
      return {
        isExpired: false,
        text: `Kalan Süre: ${diffDays} gün ${remainingHours > 0 ? `${remainingHours} saat` : ''}`,
      };
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return {
      isExpired: false,
      text: `Kalan Süre: ${diffHours > 0 ? `${diffHours} saat ` : ''}${diffMins % 60} dakika`,
    };
  };

  // Göreve git
  const handleGoToTask = (task) => {
    if (!task) return;
    if (task.lesson_id) {
      navigate(`/student/lessons/${task.lesson_id}`);
    } else if (task.course_id) {
      navigate(`/student/courses/${task.course_id}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 rounded-3xl glass border border-white/10 flex items-center justify-center min-h-[140px]">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  // 1. ÖĞRENCİ HENÜZ BİR GRUBA KAYITLI DEĞİLSE
  if (cohorts.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl glass border border-slate-200 dark:border-cyan-500/30 p-6 md:p-7 shadow-xl bg-white dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-slate-900/60 dark:to-cyan-950/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-500/30 inline-flex items-center gap-1.5">
                <Calendar size={13} /> Sınıf & Grup Programı
              </span>
            </div>
            <h3 className="font-display font-black text-xl md:text-2xl text-slate-900 dark:text-white">
              Haftalık Görevlerini Takip Et 🎯
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm leading-relaxed">
              Öğretmeninin verdiği 6 haneli <strong>Katılım Kodunu</strong> girerek sınıfının haftalık görev akışına katılabilir ve teslim tarihlerini takip edebilirsin.
            </p>
          </div>

          {/* Kod Giriş Formu */}
          <form
            onSubmit={handleJoinCohort}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0"
          >
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                placeholder="ÖRN: AB12CD"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full sm:w-44 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-cyan-500/40 text-center font-mono font-black text-base text-slate-900 dark:text-cyan-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 uppercase tracking-widest shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={joining}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {joining ? <LoadingSpinner size="sm" /> : <Sparkles size={15} />}
              Gruba Katıl
            </button>
          </form>
        </div>

        {feedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'error'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Çubuk: Genel Başlık & Yeni Koda Katıl Butonu */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 shadow-sm">
            <Calendar size={18} />
          </span>
          <div>
            <h2 className="text-lg md:text-xl font-display font-black text-slate-900 dark:text-white flex items-center gap-2">
              Haftalık Görev Planlarım
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                {cohorts.length} Program
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dahil olduğun sınıfların haftalık görev ve teslim takvimleri
            </p>
          </div>
        </div>

        <button
          onClick={() => setJoinModalOpen(true)}
          className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 shadow-sm cursor-pointer"
        >
          <Plus size={14} /> Yeni Koda Katıl
        </button>
      </div>

      {/* Bildirim Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in ${
            feedback.type === 'error'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }`}
        >
          {feedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Alt Alta Program Kartları (1. Program, 2. Program vb.) */}
      <div className="space-y-6">
        {cohorts.map((cohort, index) => {
          const cohortTasks = tasks.filter((t) => t.cohort_id === cohort.id);
          const selectedId = selectedWeekByCohort[cohort.id];
          const cohortActiveTask = cohortTasks.find((t) => !t.isCompleted && !t.isLocked) || cohortTasks[0];
          const displayedTask = cohortTasks.find((t) => t.id === selectedId) || cohortActiveTask || cohortTasks[0];
          const remaining = displayedTask ? getRemainingTime(displayedTask.due_date) : null;
          const completedCount = cohortTasks.filter((t) => t.isCompleted).length;

          return (
            <div
              key={cohort.id}
              className="relative overflow-hidden rounded-3xl glass border border-slate-200 dark:border-cyan-500/30 p-6 md:p-8 bg-white dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-cyan-950/40 dark:to-slate-900 shadow-xl dark:shadow-2xl"
            >
              <div className="absolute -top-10 -right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Üst Kısım: Program Sırası & Başlığı & İlerleme */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 shrink-0">
                    {index + 1}. Program
                  </span>
                  <div>
                    <h3 className="font-display font-black text-lg md:text-xl text-slate-900 dark:text-white">
                      {cohort.title}
                    </h3>
                    {cohort.profiles?.full_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        👨‍🏫 Eğitmen: {cohort.profiles.full_name}
                      </p>
                    )}
                  </div>
                </div>

                {cohortTasks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      İlerleme:
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      {completedCount} / {cohortTasks.length} Hafta
                    </span>
                  </div>
                )}
              </div>

              {/* Bu Programa Ait Hafta Sekmeleri / Yol Haritası */}
              {cohortTasks.length > 0 ? (
                <>
                  <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {cohortTasks.map((task) => {
                      const isSelected = task.id === displayedTask?.id;
                      return (
                        <button
                          key={task.id}
                          onClick={() =>
                            setSelectedWeekByCohort((prev) => ({ ...prev, [cohort.id]: task.id }))
                          }
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40 shadow-sm'
                              : task.isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {task.isCompleted ? (
                            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                          ) : task.isLocked ? (
                            <Lock size={12} className="text-slate-400 dark:text-slate-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                          )}
                          <span>{task.week_number}. Hafta</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Seçili Hafta Görev Detayları */}
                  {displayedTask ? (
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-3 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/30">
                            {displayedTask.week_number}. Hafta Görevi
                          </span>

                          {displayedTask.isCompleted ? (
                            <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 inline-flex items-center gap-1.5">
                              <CheckCircle2 size={14} /> Görev Tamamlandı (+{displayedTask.earned_xp || 100} XP)
                            </span>
                          ) : remaining?.isExpired ? (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30 inline-flex items-center gap-1.5">
                              <AlertCircle size={14} /> Teslim Süresi Geçti
                            </span>
                          ) : (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 inline-flex items-center gap-1.5">
                              <Clock size={14} /> {remaining?.text}
                            </span>
                          )}
                        </div>

                        <h2 className="font-display font-black text-2xl md:text-3xl text-slate-900 dark:text-white">
                          {displayedTask.title}
                        </h2>

                        {/* Kurs & Ders Kutusu */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 flex items-center gap-3 shadow-sm">
                            <span className="text-2xl">{displayedTask.courses?.thumbnail_emoji || '🛡️'}</span>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Hedef Kurs</p>
                              <p className="font-bold text-sm text-slate-900 dark:text-white">{displayedTask.courses?.title}</p>
                            </div>
                          </div>

                          {displayedTask.lessons && (
                            <div className="p-3 rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-500/20 flex items-center gap-2 shadow-sm">
                              <span className="text-base">🎯</span>
                              <div>
                                <p className="text-[10px] text-violet-700 dark:text-violet-300 font-semibold">Özel Ders</p>
                                <p className="font-bold text-xs text-slate-900 dark:text-white">{displayedTask.lessons.title}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Aksiyon Butonu */}
                      <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-3">
                        {displayedTask.isCompleted ? (
                          <button
                            onClick={() => handleGoToTask(displayedTask)}
                            className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                          >
                            <BookOpen size={18} /> Tekrar İncele
                          </button>
                        ) : displayedTask.isLocked ? (
                          <button
                            disabled
                            className="px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200 dark:border-white/5"
                          >
                            <Lock size={16} /> Bu Hafta Henüz Kilitli
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGoToTask(displayedTask)}
                            className="px-8 py-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-base font-black transition-all shadow-xl shadow-cyan-500/25 hover:scale-105 flex items-center justify-center gap-2.5 cursor-pointer"
                          >
                            <span>Haftalık Göreve Başla</span>
                            <ArrowRight size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 py-3">Bu programa henüz haftalık görev atanmadı.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Koda Katılma Açılır Modalı */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-white/15 p-6 md:p-8 shadow-2xl">
            <button
              onClick={() => setJoinModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">Yeni Gruba Katıl</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Öğretmeninin verdiği 6 haneli kod</p>
              </div>
            </div>

            <form onSubmit={handleJoinCohort} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Katılım Kodu *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Örn: X8K2M9"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 text-center font-mono font-black text-xl text-slate-900 dark:text-cyan-300 focus:outline-none focus:border-cyan-500 uppercase tracking-widest shadow-sm"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {joining ? <LoadingSpinner size="sm" /> : <Sparkles size={16} />}
                  Katıl
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
