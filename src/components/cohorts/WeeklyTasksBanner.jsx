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
  const [selectedWeekId, setSelectedWeekId] = useState(null);

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
    if (loadedActive?.id) {
      setSelectedWeekId(loadedActive.id);
    } else if (loadedTasks.length > 0) {
      setSelectedWeekId(loadedTasks[0].id);
    }
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
      <div className="relative overflow-hidden rounded-3xl glass border border-cyan-500/30 p-6 md:p-7 shadow-xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30 inline-flex items-center gap-1.5">
                <Calendar size={13} /> Sınıf & Grup Programı
              </span>
            </div>
            <h3 className="font-display font-black text-xl md:text-2xl text-white">
              Haftalık Görevlerini Takip Et 🎯
            </h3>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
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
                className="w-full sm:w-44 px-4 py-3 rounded-xl bg-slate-950/80 border border-cyan-500/40 text-center font-mono font-black text-base text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 uppercase tracking-widest"
              />
            </div>
            <button
              type="submit"
              disabled={joining}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
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

  // 2. ÖĞRENCİ EN AZ BİR PROGRAMA KAYITLIYSA
  const primaryCohort = cohorts[0];
  const displayedTask = tasks.find((t) => t.id === selectedWeekId) || activeTask || tasks[0];
  const remaining = displayedTask ? getRemainingTime(displayedTask.due_date) : null;

  return (
    <div className="space-y-3">
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

      {/* Ana Haftalık Görev Kartı */}
      <div className="relative overflow-hidden rounded-3xl glass border border-cyan-500/30 p-6 md:p-8 bg-gradient-to-r from-slate-900/90 via-cyan-950/40 to-slate-900 shadow-2xl">
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Üst Kısım: Program Bilgisi & Katıl Butonu */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Calendar size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  Haftalık Görev Planı
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs text-slate-300 font-semibold">{primaryCohort?.title}</span>
              </div>
              {primaryCohort?.profiles?.full_name && (
                <p className="text-[11px] text-slate-400">
                  👨‍🏫 Eğitmen: {primaryCohort.profiles.full_name}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setJoinModalOpen(true)}
            className="text-xs font-bold text-slate-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <Plus size={14} /> Başka Koda Katıl
          </button>
        </div>

        {/* Hafta Sekmeleri / Yol Haritası */}
        {tasks.length > 0 && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {tasks.map((task) => {
              const isSelected = task.id === displayedTask?.id;
              return (
                <button
                  key={task.id}
                  onClick={() => setSelectedWeekId(task.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                      : task.isCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {task.isCompleted ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : task.isLocked ? (
                    <Lock size={12} className="text-slate-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  )}
                  <span>{task.week_number}. Hafta</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Gösterilen Görev Detayları */}
        {displayedTask ? (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {displayedTask.week_number}. Hafta Görevi
                </span>

                {displayedTask.isCompleted ? (
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Görev Tamamlandı (+{displayedTask.earned_xp || 100} XP)
                  </span>
                ) : remaining?.isExpired ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-flex items-center gap-1.5">
                    <AlertCircle size={14} /> Teslim Süresi Geçti
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1.5">
                    <Clock size={14} /> {remaining?.text}
                  </span>
                )}
              </div>

              <h2 className="font-display font-black text-2xl md:text-3xl text-white">
                {displayedTask.title}
              </h2>

              {/* Kurs & Ders Kutusu */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-3">
                  <span className="text-2xl">{displayedTask.courses?.thumbnail_emoji || '🛡️'}</span>
                  <div>
                    <p className="text-xs text-slate-400">Hedef Kurs</p>
                    <p className="font-bold text-sm text-white">{displayedTask.courses?.title}</p>
                  </div>
                </div>

                {displayedTask.lessons && (
                  <div className="p-3 rounded-2xl bg-violet-950/40 border border-violet-500/20 flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <div>
                      <p className="text-[10px] text-violet-300 font-semibold">Özel Ders</p>
                      <p className="font-bold text-xs text-white">{displayedTask.lessons.title}</p>
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
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <BookOpen size={18} /> Tekrar İncele
                </button>
              ) : displayedTask.isLocked ? (
                <button
                  disabled
                  className="px-6 py-3.5 rounded-2xl bg-slate-800 text-slate-500 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed border border-white/5"
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
        ) : (
          <p className="text-xs text-slate-400">Bu programa henüz haftalık görev atanmadı.</p>
        )}
      </div>

      {/* Koda Katılma Açılır Modalı */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl glass border border-white/15 p-6 md:p-8 bg-slate-900/95 shadow-2xl">
            <button
              onClick={() => setJoinModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-display font-black text-xl text-white">Yeni Gruba Katıl</h3>
                <p className="text-xs text-slate-400">Öğretmeninin verdiği 6 haneli kod</p>
              </div>
            </div>

            <form onSubmit={handleJoinCohort} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Katılım Kodu *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Örn: X8K2M9"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/10 text-center font-mono font-black text-xl text-cyan-300 focus:outline-none focus:border-cyan-500 uppercase tracking-widest"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setJoinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
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
