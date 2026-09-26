import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import {
  getCohortById,
  updateCohort,
  getCohortWeeks,
  saveCohortWeek,
  deleteCohortWeek,
  getCohortMembers,
  addMemberToCohort,
  removeMemberFromCohort,
  searchStudents,
  notifyCohortStudents,
  regenerateCohortCode,
  getCohortProgressMatrix,
  notifyIncompleteStudents,
} from '../../services/cohortService';
import {
  ArrowLeft,
  Calendar,
  Users,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Edit2,
  Bell,
  Clock,
  BookOpen,
  Award,
  Search,
  UserPlus,
  AlertCircle,
  X,
  Lock,
  Unlock,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  BarChart3,
  Download,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function CohortDetails() {
  const { cohortId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cohort, setCohort] = useState(null);
  const [weeks, setWeeks] = useState([]);
  const [members, setMembers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('weeks'); // 'weeks' | 'members'
  const [toast, setToast] = useState(null);

  // Kopyalama & Aksiyon durumları
  const [copiedCode, setCopiedCode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Hafta Ekle/Düzenle Modal State
  const [weekModalOpen, setWeekModalOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [weekForm, setWeekForm] = useState({
    week_number: 1,
    title: '',
    course_id: '',
    lesson_id: '',
    unlock_date: '',
    due_date: '',
    is_locked: false,
    notify: true,
  });

  // Öğrenci Ekle Modal State
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Program Düzenleme Modal State
  const [editCohortModalOpen, setEditCohortModalOpen] = useState(false);
  const [editCohortForm, setEditCohortForm] = useState({ title: '', description: '', is_active: true });

  // Öğrenci İlerleme Takibi (Progress Matrix) State
  const [progressData, setProgressData] = useState({ students: [], weeks: [], stats: null });
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressSearchQuery, setProgressSearchQuery] = useState('');
  const [progressFilter, setProgressFilter] = useState('all'); // 'all' | 'completed' | 'incomplete'

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadAllData();
  }, [cohortId]);

  async function loadAllData() {
    setLoading(true);
    await Promise.all([loadCohort(), loadWeeks(), loadMembers(), loadCourses(), loadProgressData()]);
    setLoading(false);
  }

  async function loadProgressData() {
    setLoadingProgress(true);
    const { students: pStudents, weeks: pWeeks, stats: pStats } = await getCohortProgressMatrix(cohortId);
    setProgressData({ students: pStudents, weeks: pWeeks, stats: pStats });
    setLoadingProgress(false);
  }

  async function loadCohort() {
    const { data, error } = await getCohortById(cohortId);
    if (error || !data) {
      showToast('Program bulunamadı.', 'error');
      navigate('/teacher/cohorts');
      return;
    }
    setCohort(data);
    setEditCohortForm({
      title: data.title,
      description: data.description || '',
      is_active: data.is_active,
    });
  }

  async function loadWeeks() {
    const { data } = await getCohortWeeks(cohortId);
    if (data) setWeeks(data);
  }

  async function loadMembers() {
    const { data } = await getCohortMembers(cohortId);
    if (data) setMembers(data);
  }

  async function loadCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, title, category, level, thumbnail_emoji, is_published')
      .order('title', { ascending: true });
    if (data) setCourses(data);
  }

  // CSV formatında öğrenci ilerleme raporunu dışa aktar
  const handleExportCSV = () => {
    if (!progressData?.students?.length) {
      showToast('Dışa aktarılacak öğrenci verisi bulunmuyor.', 'error');
      return;
    }

    const headers = ['Öğrenci Adı', 'Seviye', 'Genel Tamamlama (%)', 'Grup İçi Toplam XP'];
    (progressData.weeks || []).forEach((w) => {
      headers.push(`${w.week_number}. Hafta: ${w.title.replace(/;/g, ' ')}`);
    });

    const rows = progressData.students.map((st) => {
      const row = [
        `"${st.full_name || 'Öğrenci'}"`,
        `"Seviye ${st.level || 1}"`,
        `"%${st.completionRate}"`,
        st.totalCohortXp,
      ];
      (st.weekStatuses || []).forEach((ws) => {
        let statusText = 'Başlamadı';
        if (ws.status === 'completed') statusText = `Tamamlandı (${ws.earnedXp} XP)`;
        else if (ws.status === 'completed_overdue') statusText = `Gecikmeli (${ws.earnedXp} XP)`;
        else if (ws.status === 'overdue') statusText = 'Süresi Geçti';
        else if (ws.status === 'pending') statusText = 'Devam Ediyor';
        else if (ws.status === 'locked') statusText = 'Kilitli';
        row.push(`"${statusText}"`);
      });
      return row.join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${cohort?.title || 'grup'}_ogrenci_ilerleme_raporu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Öğrenci ilerleme raporu CSV formatında indirildi! 📥');
  };

  // Bu haftayı henüz tamamlamamış olan öğrencilere hatırlatma gönder
  const handleNotifyWeekIncomplete = async (week) => {
    const incompleteStudentIds = (progressData.students || [])
      .filter((st) => {
        const ws = (st.weekStatuses || []).find((w) => w.weekId === week.id);
        return ws && (ws.status === 'not_started' || ws.status === 'overdue' || ws.status === 'pending');
      })
      .map((st) => st.id);

    if (incompleteStudentIds.length === 0) {
      showToast('Harika! Bu haftadaki görevi tüm öğrenciler tamamlamış.', 'success');
      return;
    }

    const { count } = await notifyIncompleteStudents({
      cohortId,
      weekId: week.id,
      weekTitle: week.title,
      studentIds: incompleteStudentIds,
      teacherId: user.id,
    });

    showToast(`${count} öğrenciye görev hatırlatması iletildi! 🔔`);
  };

  // Kurs seçildiğinde o kursun derslerini yükle
  const handleCourseChange = async (courseId) => {
    setWeekForm((prev) => ({ ...prev, course_id: courseId, lesson_id: '' }));
    if (!courseId) {
      setCourseLessons([]);
      return;
    }
    setLoadingLessons(true);
    const { data } = await supabase
      .from('lessons')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setCourseLessons(data || []);
    setLoadingLessons(false);
  };

  // Katılım kodu kopyala
  const handleCopyCode = () => {
    if (!cohort?.join_code) return;
    navigator.clipboard.writeText(cohort.join_code);
    setCopiedCode(true);
    showToast(`Katılım kodu (${cohort.join_code}) panoya kopyalandı!`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Yeni kod üret
  const handleRegenerateCode = async () => {
    if (window.confirm('Yeni bir katılım kodu oluşturulsun mu?')) {
      const { data, error } = await regenerateCohortCode(cohortId);
      if (error) {
        showToast('Kod yenilenemedi.', 'error');
      } else {
        setCohort(data);
        showToast(`Yeni kod: ${data.join_code}`);
      }
    }
  };

  // Tarihi datetime-local formatına çevir (Yerel saat dilimini korur)
  const toDateTimeLocal = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Hafta Modalını Aç (Ekleme veya Düzenleme)
  const openWeekModal = async (week = null) => {
    if (week) {
      setEditingWeek(week);
      setWeekForm({
        week_number: week.week_number,
        title: week.title,
        course_id: week.course_id,
        lesson_id: week.lesson_id || '',
        unlock_date: toDateTimeLocal(week.unlock_date),
        due_date: toDateTimeLocal(week.due_date),
        is_locked: week.is_locked,
        notify: false,
      });
      // Dersleri de getir
      if (week.course_id) {
        const { data } = await supabase
          .from('lessons')
          .select('id, title, order_index')
          .eq('course_id', week.course_id)
          .order('order_index', { ascending: true });
        setCourseLessons(data || []);
      }
    } else {
      setEditingWeek(null);
      const nextWeekNum = weeks.length > 0 ? Math.max(...weeks.map((w) => w.week_number)) + 1 : 1;
      const now = new Date();
      const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      setWeekForm({
        week_number: nextWeekNum,
        title: `${nextWeekNum}. Hafta Görevi`,
        course_id: courses[0]?.id || '',
        lesson_id: '',
        unlock_date: toDateTimeLocal(now),
        due_date: toDateTimeLocal(inSevenDays),
        is_locked: false,
        notify: true,
      });

      if (courses[0]?.id) {
        handleCourseChange(courses[0].id);
      }
    }
    setWeekModalOpen(true);
  };

  // Hafta Kaydet
  const handleSaveWeek = async (e) => {
    e.preventDefault();
    if (!weekForm.title.trim() || !weekForm.course_id || !weekForm.due_date) {
      showToast('Lütfen zorunlu alanları doldurun.', 'error');
      return;
    }

    setActionLoading(true);
    const payload = {
      cohort_id: cohortId,
      week_number: parseInt(weekForm.week_number, 10),
      title: weekForm.title.trim(),
      course_id: weekForm.course_id,
      lesson_id: weekForm.lesson_id || null,
      unlock_date: new Date(weekForm.unlock_date || Date.now()).toISOString(),
      due_date: new Date(weekForm.due_date).toISOString(),
      is_locked: weekForm.is_locked,
    };

    if (editingWeek?.id) {
      payload.id = editingWeek.id;
    }

    const { data, error } = await saveCohortWeek(payload);
    setActionLoading(false);

    if (error) {
      showToast('Hafta kaydedilemedi: ' + error.message, 'error');
      return;
    }

    showToast(editingWeek ? 'Haftalık görev güncellendi.' : 'Yeni hafta eklendi!');
    setWeekModalOpen(false);
    loadWeeks();

    // Öğrencilere bildirim gönder
    if (weekForm.notify && members.length > 0) {
      notifyCohortStudents({
        cohortId,
        weekTitle: weekForm.title,
        dueDate: weekForm.due_date,
        teacherId: user.id,
      });
      showToast(`${members.length} öğrenciye bildirim iletildi! 🔔`);
    }
  };

  // Hafta Sil
  const handleDeleteWeek = async (weekId, weekTitle) => {
    if (window.confirm(`"${weekTitle}" haftalık görevini silmek istediğinize emin misiniz?`)) {
      const { error } = await deleteCohortWeek(weekId);
      if (error) {
        showToast('Hafta silinemedi.', 'error');
      } else {
        showToast('Haftalık görev silindi.');
        loadWeeks();
      }
    }
  };

  // Hafta Bildirimini Manuel Tetikle
  const handleSendWeekNotification = async (week) => {
    if (members.length === 0) {
      showToast('Grupta henüz öğrenci yok.', 'error');
      return;
    }
    const { count } = await notifyCohortStudents({
      cohortId,
      weekTitle: week.title,
      dueDate: week.due_date,
      teacherId: user.id,
    });
    showToast(`${count} öğrencinin paneline bildirim gönderildi! 🔔`);
  };

  // Öğrenci Ara
  const handleSearchStudents = async (query) => {
    setStudentSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchingStudents(true);
    const { data } = await searchStudents(query, 8);
    // Zaten ekli olanları filtrele
    const existingIds = new Set(members.map((m) => m.studentId));
    setSearchResults((data || []).filter((s) => !existingIds.has(s.id)));
    setSearchingStudents(false);
  };

  // Manuel Öğrenci Ekle
  const handleAddStudent = async (studentId, studentName) => {
    setActionLoading(true);
    const { error } = await addMemberToCohort(cohortId, studentId);
    setActionLoading(false);

    if (error) {
      showToast('Öğrenci eklenemedi: ' + error.message, 'error');
    } else {
      showToast(`${studentName} gruba eklendi!`);
      loadMembers();
      // Arama sonucundan kaldır
      setSearchResults((prev) => prev.filter((s) => s.id !== studentId));
    }
  };

  // Öğrenciyi Çıkar
  const handleRemoveStudent = async (studentId, studentName) => {
    if (window.confirm(`${studentName} adlı öğrenciyi gruptan çıkarmak istediğinize emin misiniz?`)) {
      const { error } = await removeMemberFromCohort(cohortId, studentId);
      if (error) {
        showToast('Öğrenci çıkarılamadı.', 'error');
      } else {
        showToast(`${studentName} gruptan çıkarıldı.`);
        loadMembers();
      }
    }
  };

  // Program Bilgilerini Güncelle
  const handleUpdateCohort = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const { data, error } = await updateCohort(cohortId, editCohortForm);
    setActionLoading(false);

    if (error) {
      showToast('Program güncellenemedi.', 'error');
    } else {
      setCohort(data);
      setEditCohortModalOpen(false);
      showToast('Program bilgileri güncellendi.');
    }
  };

  // Filtrelenmiş öğrenci ilerleme matrisi
  const filteredStudentsMatrix = (progressData.students || []).filter((st) => {
    const matchesSearch = st.full_name?.toLowerCase().includes(progressSearchQuery.toLowerCase());
    let matchesFilter = true;
    if (progressFilter === 'completed') {
      matchesFilter = st.completionRate === 100;
    } else if (progressFilter === 'incomplete') {
      matchesFilter = st.completionRate < 100;
    }
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">

        {/* Toast Bildirim (AI asistan ile çakışmaması için sağ üstte) */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-[100] max-w-md px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-fade-in ${
              toast.type === 'error' ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={18} className="shrink-0" /> : <Check size={18} className="shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        )}

        {/* Üst Navigasyon & Başlık Banner */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/teacher/cohorts')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Programlara Geri Dön
          </button>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900 border border-cyan-500/30 p-6 md:p-8 shadow-2xl">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                      cohort.is_active
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                    }`}
                  >
                    {cohort.is_active ? '● Aktif Program' : '○ Duraklatıldı'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Oluşturulma: {new Date(cohort.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>

                <h1 className="font-display font-black text-2xl md:text-3xl text-white">
                  {cohort.title}
                </h1>
                <p className="text-slate-300 text-sm max-w-2xl">
                  {cohort.description || 'Bu program için henüz bir açıklama eklenmedi.'}
                </p>
              </div>

              {/* Katılım Kodu & Aksiyonlar */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-3 shrink-0">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-cyan-500/40 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 block">
                      Öğrenci Katılım Kodu
                    </span>
                    <span className="font-mono font-black text-2xl text-white tracking-widest">
                      {cohort.join_code}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="p-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors"
                    title="Kodu Kopyala"
                  >
                    {copiedCode ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditCohortModalOpen(true)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Edit2 size={14} /> Programı Düzenle
                  </button>
                  <button
                    onClick={handleRegenerateCode}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Yeni Kod Üret"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sekmeler (Tabs) */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('weeks')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === 'weeks'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar size={18} />
            Haftalık Akış & Görevler ({weeks.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('progress');
              loadProgressData();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === 'progress'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 size={18} />
            İlerleme & Not Takibi
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === 'members'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={18} />
            Kayıtlı Öğrenciler ({members.length})
          </button>
        </div>

        {/* ─── TAB 1: HAFTALIK AKIŞ & GÖREVLER ─── */}
        {activeTab === 'weeks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-black text-xl text-white">Müfredat Takvimi</h2>
                <p className="text-xs text-slate-400">
                  Öğrencilerin tamamlaması gereken haftalık kursları ve teslim sürelerini yönetin.
                </p>
              </div>

              <button
                onClick={() => openWeekModal(null)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 hover:scale-105"
              >
                <Plus size={16} /> Hafta Ekle
              </button>
            </div>

            {weeks.length === 0 ? (
              <EmptyState
                emoji="🎯"
                title="Henüz haftalık görev tanımlanmadı"
                desc="Programınıza 1. Hafta için bir kurs ve son teslim tarihi atayarak başlayın."
                action={{ label: 'İlk Haftayı Tanımla', onClick: () => openWeekModal(null) }}
              />
            ) : (
              <div className="space-y-3">
                {weeks.map((week) => {
                  const dueDateObj = new Date(week.due_date);
                  const unlockDateObj = new Date(week.unlock_date);
                  const isPast = dueDateObj < new Date();

                  return (
                    <div
                      key={week.id}
                      className="group relative rounded-2xl glass border border-white/10 hover:border-cyan-500/30 p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Sol: Hafta Rozeti & Detay */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex flex-col items-center justify-center text-cyan-300 shrink-0">
                          <span className="text-[10px] uppercase font-bold">Hafta</span>
                          <span className="text-lg font-black leading-none">{week.week_number}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-black text-base text-white">
                              {week.title}
                            </h3>
                            {week.is_locked && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Lock size={10} /> Kilitli
                              </span>
                            )}
                          </div>

                          {/* Kurs ve Opsiyonel Ders Bilgisi */}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-200">
                              <span>{week.courses?.thumbnail_emoji || '📚'}</span>
                              <span>{week.courses?.title || 'Kurs seçilmemiş'}</span>
                            </span>

                            {week.lessons && (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">
                                🎯 Ders: {week.lessons.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sağ: Tarihler & Aksiyonlar */}
                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className="text-left md:text-right">
                          <div className="flex items-center md:justify-end gap-1.5 text-xs text-slate-300 font-semibold">
                            <Clock size={14} className={isPast ? 'text-rose-400' : 'text-cyan-400'} />
                            <span>Son Teslim: {dueDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Açılış: {unlockDateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSendWeekNotification(week)}
                            className="p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-colors"
                            title="Öğrencilere Hatırlatma Bildirimi Gönder"
                          >
                            <Bell size={16} />
                          </button>
                          <button
                            onClick={() => openWeekModal(week)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                            title="Haftayı Düzenle"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteWeek(week.id, week.title)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Haftayı Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: KAYITLI ÖĞRENCİLER ─── */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-black text-xl text-white">Grup Üyeleri</h2>
                <p className="text-xs text-slate-400">
                  Bu programa dahil edilen ve haftalık görevleri takip eden öğrenciler.
                </p>
              </div>

              <button
                onClick={() => {
                  setMemberModalOpen(true);
                  setStudentSearchQuery('');
                  setSearchResults([]);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
              >
                <UserPlus size={16} /> Manuel Öğrenci Ekle
              </button>
            </div>

            {/* Katılım Kodu Hatırlatma Kartı */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📢</span>
                <div>
                  <h4 className="text-sm font-bold text-white">Öğrencilerinizi Kendi Başlarına Katın</h4>
                  <p className="text-xs text-slate-300">
                    Öğrencileriniz ana sayfalarındaki "Koda Göre Gruba Katıl" alanına{' '}
                    <strong className="text-cyan-300 font-mono tracking-wider">{cohort.join_code}</strong>{' '}
                    kodunu girerek anında bu gruba dahil olabilir.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                <Copy size={14} /> Kodu Kopyala
              </button>
            </div>

            {members.length === 0 ? (
              <EmptyState
                emoji="👥"
                title="Henüz öğrenci kaydı yok"
                desc="Katılım kodunu öğrencilerinizle paylaşabilir veya yukarıdaki butonla doğrudan arama yaparak ekleyebilirsiniz."
                action={{
                  label: 'Öğrenci Ara ve Ekle',
                  onClick: () => setMemberModalOpen(true),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div
                    key={member.membershipId}
                    className="p-4 rounded-2xl glass border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                        {member.avatar_emoji || '👤'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-white truncate">{member.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                          <span className="font-semibold text-cyan-400">Lv.{member.level || 1}</span>
                          <span>•</span>
                          <span>{member.xp || 0} XP</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveStudent(member.studentId, member.full_name)}
                      className="p-2 rounded-xl hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Gruptan Çıkar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: ÖĞRENCİ İLERLEME TAKİBİ & NOTLAR (PROGRESS MATRIX) ─── */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Üst Başlık & Aksiyonlar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-black text-xl text-white">
                  Öğrenci İlerleme & Not Takibi
                </h2>
                <p className="text-xs text-slate-400">
                  Öğrencilerin haftalık görev tamamlama durumları, kazandıkları XP'ler ve gecikme raporu.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadProgressData}
                  disabled={loadingProgress}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  title="Verileri Yenile"
                >
                  <RefreshCw size={14} className={loadingProgress ? 'animate-spin' : ''} />
                  Yenile
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 inline-flex items-center gap-1.5"
                >
                  <Download size={14} />
                  Excel / CSV İndir
                </button>
              </div>
            </div>

            {/* İstatistik Özet Kartları */}
            {progressData.stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl glass border border-cyan-500/20 bg-cyan-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-300 font-bold">Kayıtlı Öğrenci</span>
                    <Users size={18} className="text-cyan-400" />
                  </div>
                  <p className="font-display font-black text-2xl text-white mt-2">
                    {progressData.stats.totalStudents}
                  </p>
                  <span className="text-[10px] text-slate-400">Grupta aktif</span>
                </div>

                <div className="p-4 rounded-2xl glass border border-emerald-500/20 bg-emerald-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-300 font-bold">Sınıf Başarısı</span>
                    <TrendingUp size={18} className="text-emerald-400" />
                  </div>
                  <p className="font-display font-black text-2xl text-emerald-400 mt-2">
                    %{progressData.stats.avgCompletionRate}
                  </p>
                  <span className="text-[10px] text-slate-400">Ortalama tamamlama</span>
                </div>

                <div className="p-4 rounded-2xl glass border border-amber-500/20 bg-amber-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-300 font-bold">Dağıtılan Grup XP</span>
                    <Award size={18} className="text-amber-400" />
                  </div>
                  <p className="font-display font-black text-2xl text-amber-400 mt-2">
                    {progressData.stats.totalXpEarned.toLocaleString('tr-TR')}
                  </p>
                  <span className="text-[10px] text-slate-400">Haftalık görev ödülleri</span>
                </div>

                <div className="p-4 rounded-2xl glass border border-rose-500/20 bg-rose-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-rose-300 font-bold">Geciken Görevler</span>
                    <AlertTriangle size={18} className="text-rose-400" />
                  </div>
                  <p className="font-display font-black text-2xl text-rose-400 mt-2">
                    {progressData.stats.overdueCount}
                  </p>
                  <span className="text-[10px] text-slate-400">Süresi geçmiş teslimler</span>
                </div>
              </div>
            )}

            {/* Arama & Durum Filtre Çubuğu */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl glass border border-white/10">
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Öğrenci adı ara..."
                  value={progressSearchQuery}
                  onChange={(e) => setProgressSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setProgressFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    progressFilter === 'all'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                >
                  Tümü ({progressData.students.length})
                </button>
                <button
                  onClick={() => setProgressFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    progressFilter === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                >
                  Tümü Tamam (%100)
                </button>
                <button
                  onClick={() => setProgressFilter('incomplete')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    progressFilter === 'incomplete'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-white bg-white/5'
                  }`}
                >
                  Eksik / Gecikenler
                </button>
              </div>
            </div>

            {/* Öğrenci Matrisi Tablosu */}
            {loadingProgress ? (
              <div className="py-16 flex justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredStudentsMatrix.length === 0 ? (
              <EmptyState
                emoji="📊"
                title="Eşleşen veri bulunamadı"
                desc="Arama kriterlerine uygun öğrenci kaydı bulunamadı."
              />
            ) : (
              <div className="overflow-x-auto rounded-2xl glass border border-white/10 shadow-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4 sticky left-0 bg-slate-900 z-10 min-w-[200px]">
                        Öğrenci
                      </th>
                      <th className="py-3.5 px-3 min-w-[130px]">İlerleme</th>
                      <th className="py-3.5 px-3 min-w-[90px]">Grup XP</th>
                      {progressData.weeks.map((week) => (
                        <th key={week.id} className="py-3.5 px-3 text-center min-w-[140px]">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-white">{week.week_number}. Hafta</span>
                            <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                              {week.title}
                            </span>
                            <button
                              onClick={() => handleNotifyWeekIncomplete(week)}
                              className="mt-1 px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/20 flex items-center gap-1"
                              title="Bu haftayı bitirmemiş öğrencilere hatırlatma gönder"
                            >
                              <Bell size={10} /> Eksiklere Bildir
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStudentsMatrix.map((st) => (
                      <tr key={st.id} className="hover:bg-white/5 transition-colors">
                        {/* Öğrenci Bilgisi */}
                        <td className="py-3 px-4 sticky left-0 bg-slate-900/95 z-10 border-r border-white/5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">{st.avatar_emoji || '👤'}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate max-w-[150px]">
                                {st.full_name}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Lv.{st.level || 1} • {st.xp || 0} Genel XP
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Genel İlerleme */}
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className={st.completionRate === 100 ? 'text-emerald-400' : 'text-slate-300'}>
                                %{st.completionRate}
                              </span>
                              <span className="text-slate-500 text-[10px]">
                                {st.completedCount}/{progressData.weeks.length}
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  st.completionRate === 100 ? 'bg-emerald-500' : 'bg-cyan-500'
                                }`}
                                style={{ width: `${st.completionRate}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Grup İçi XP */}
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-amber-400 text-xs">
                            +{st.totalCohortXp} XP
                          </span>
                        </td>

                        {/* Hafta Sütunları */}
                        {st.weekStatuses.map((ws) => {
                          return (
                            <td key={ws.weekId} className="py-3 px-3 text-center">
                              {ws.status === 'completed' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                                  title={`Tamamlandı: ${ws.completedAt ? new Date(ws.completedAt).toLocaleDateString('tr-TR') : ''}`}
                                >
                                  <CheckCircle2 size={12} /> {ws.earnedXp} XP
                                </span>
                              ) : ws.status === 'completed_overdue' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold"
                                  title={`Gecikmeli Tamamlandı: ${ws.completedAt ? new Date(ws.completedAt).toLocaleDateString('tr-TR') : ''}`}
                                >
                                  <AlertCircle size={12} /> {ws.earnedXp} XP
                                </span>
                              ) : ws.status === 'overdue' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold"
                                  title="Teslim tarihi doldu, henüz tamamlanmadı"
                                >
                                  <Clock size={11} /> Gecikti
                                </span>
                              ) : ws.status === 'pending' ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-semibold"
                                  title="Görev aktif, devam ediyor"
                                >
                                  ⏳ Devam
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-500 text-[10px]"
                                  title="Kilitli veya gelecek hafta"
                                >
                                  <Lock size={10} /> Kilitli
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Renk ve Durum Rehberi */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="font-bold text-slate-300">Açıklamalar:</span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Zamanında Tamamlandı (100 XP)
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Gecikmeli Tamamlandı (80 XP)
              </span>
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Devam Ediyor
              </span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Süresi Geçti
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Kilitli
              </span>
            </div>
          </div>
        )}

        {/* ─── MODAL: HAFTA EKLE / DÜZENLE ─── */}
        {weekModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-lg rounded-3xl glass border border-white/15 p-6 md:p-8 bg-slate-900/95 shadow-2xl max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setWeekModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-white">
                    {editingWeek ? 'Haftalık Görevi Düzenle' : 'Yeni Hafta Tanımla'}
                  </h3>
                  <p className="text-xs text-slate-400">Öğrenciler için görev kursu ve zamanlama</p>
                </div>
              </div>

              <form onSubmit={handleSaveWeek} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Hafta No *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={52}
                      required
                      value={weekForm.week_number}
                      onChange={(e) => setWeekForm({ ...weekForm, week_number: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-sm font-bold"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Hafta Başlığı *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Ağ Güvenliği & Paket Analizi"
                      value={weekForm.title}
                      onChange={(e) => setWeekForm({ ...weekForm, title: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                    />
                  </div>
                </div>

                {/* Kurs Seçimi */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Dahil Edilecek Kurs *
                  </label>
                  <select
                    required
                    value={weekForm.course_id}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value="" disabled>Kurs seçin...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.thumbnail_emoji} {c.title} ({c.category === 'technical' ? 'Teknik' : 'Farkındalık'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Spesifik Ders Seçimi (Opsiyonel) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Spesifik Ders Seçimi (Opsiyonel)
                    </label>
                    {loadingLessons && <LoadingSpinner size="sm" />}
                  </div>
                  <select
                    value={weekForm.lesson_id}
                    onChange={(e) => setWeekForm({ ...weekForm, lesson_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:border-cyan-500 text-sm"
                  >
                    <option value="">🎯 Tüm Kursu Kapsasın (Önerilen)</option>
                    {courseLessons.map((l, idx) => (
                      <option key={l.id} value={l.id}>
                        {idx + 1}. Ders: {l.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Boş bırakırsanız öğrencinin haftalık görevi tamamlaması için kursun tamamını bitirmesi beklenir.
                  </p>
                </div>

                {/* Tarih Tanımlamaları */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Başlangıç Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      value={weekForm.unlock_date}
                      onChange={(e) => setWeekForm({ ...weekForm, unlock_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Son Teslim Tarihi *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={weekForm.due_date}
                      onChange={(e) => setWeekForm({ ...weekForm, due_date: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Bildirim Onayı */}
                {!editingWeek && (
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={weekForm.notify}
                      onChange={(e) => setWeekForm({ ...weekForm, notify: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-xs text-slate-300">
                      Kayıtlı öğrencilere panel üzerinden anında haftalık görev bildirimi gönder 🔔
                    </span>
                  </label>
                )}

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setWeekModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading ? <LoadingSpinner size="sm" /> : <Check size={16} />}
                    {editingWeek ? 'Değişiklikleri Kaydet' : 'Haftayı Ekle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: ÖĞRENCİ ARAMA VE EKLEME ─── */}
        {memberModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-md rounded-3xl glass border border-white/15 p-6 md:p-8 bg-slate-900/95 shadow-2xl">
              <button
                onClick={() => setMemberModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-white">Öğrenci Ekle</h3>
                  <p className="text-xs text-slate-400">İsme göre arayarak doğrudan gruba dahil edin</p>
                </div>
              </div>

              <div className="relative mb-4">
                <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Öğrenci adı yazın..."
                  value={studentSearchQuery}
                  onChange={(e) => handleSearchStudents(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchingStudents ? (
                  <div className="py-6 flex justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">
                    {studentSearchQuery.trim()
                      ? 'Eşleşen veya eklenmemiş öğrenci bulunamadı.'
                      : 'Aramak için öğrenci adını yazmaya başlayın.'}
                  </p>
                ) : (
                  searchResults.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl glass border border-white/5 hover:border-cyan-500/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl">{st.avatar_emoji || '👤'}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{st.full_name}</p>
                          <p className="text-[10px] text-slate-400">Lv.{st.level} • {st.xp} XP</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddStudent(st.id, st.full_name)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Gruba Ekle
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL: PROGRAM BİLGİLERİNİ DÜZENLE ─── */}
        {editCohortModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-md rounded-3xl glass border border-white/15 p-6 md:p-8 bg-slate-900/95 shadow-2xl">
              <button
                onClick={() => setEditCohortModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <h3 className="font-display font-black text-xl text-white mb-4">Programı Düzenle</h3>

              <form onSubmit={handleUpdateCohort} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Program Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCohortForm.title}
                    onChange={(e) => setEditCohortForm({ ...editCohortForm, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Açıklama
                  </label>
                  <textarea
                    rows={3}
                    value={editCohortForm.description}
                    onChange={(e) => setEditCohortForm({ ...editCohortForm, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editCohortForm.is_active}
                    onChange={(e) => setEditCohortForm({ ...editCohortForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-xs text-slate-300">
                    Program aktif ve öğrenciler tarafından erişilebilir olsun
                  </span>
                </label>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditCohortModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-xs font-bold"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    Güncelle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
