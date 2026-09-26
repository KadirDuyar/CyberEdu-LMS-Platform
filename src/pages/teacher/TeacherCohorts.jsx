import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import {
  getTeacherCohorts,
  createCohort,
  deleteCohort,
  updateCohort,
  regenerateCohortCode,
} from '../../services/cohortService';
import {
  Users,
  Calendar,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ChevronRight,
  Sparkles,
  Layers,
  AlertCircle,
  Clock,
  BookOpen,
  X,
} from 'lucide-react';

export default function TeacherCohorts() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Yeni program form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    loadCohorts();
  }, [user]);

  async function loadCohorts() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await getTeacherCohorts(user.id);
    if (error) {
      showToast('Programlar yüklenirken hata oluştu.', 'error');
    } else {
      setCohorts(data);
    }
    setLoading(false);
  }

  const handleCopyCode = (code, e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Katılım kodu (${code}) panoya kopyalandı!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleCreateCohort = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Lütfen program başlığı girin.', 'error');
      return;
    }

    setActionLoading(true);
    const { data, error } = await createCohort({
      title: formData.title.trim(),
      description: formData.description.trim(),
      teacher_id: user.id,
    });
    setActionLoading(false);

    if (error) {
      showToast('Program oluşturulamadı: ' + error.message, 'error');
    } else {
      showToast('Yeni program başarıyla oluşturuldu!');
      setModalOpen(false);
      setFormData({ title: '', description: '' });
      loadCohorts();
      // Doğrudan detayına git
      if (data?.id) {
        navigate(`/teacher/cohorts/${data.id}`);
      }
    }
  };

  const handleDeleteCohort = async (cohortId, cohortTitle, e) => {
    e?.stopPropagation();
    if (window.confirm(`"${cohortTitle}" programını silmek istediğinize emin misiniz? Bu gruba ait tüm haftalık planlar ve öğrenci kayıtları silinecektir.`)) {
      const { error } = await deleteCohort(cohortId);
      if (error) {
        showToast('Program silinemedi: ' + error.message, 'error');
      } else {
        showToast('Program silindi.');
        loadCohorts();
      }
    }
  };

  const handleRegenerateCode = async (cohortId, e) => {
    e?.stopPropagation();
    if (window.confirm('Yeni bir katılım kodu oluşturulsun mu? Eski kod artık geçerli olmayacaktır.')) {
      const { data, error } = await regenerateCohortCode(cohortId);
      if (error) {
        showToast('Kod yenilenemedi.', 'error');
      } else {
        showToast(`Yeni katılım kodu: ${data.join_code}`);
        loadCohorts();
      }
    }
  };

  const handleToggleStatus = async (cohort, e) => {
    e?.stopPropagation();
    const newStatus = !cohort.is_active;
    const { error } = await updateCohort(cohort.id, { is_active: newStatus });
    if (error) {
      showToast('Durum güncellenemedi.', 'error');
    } else {
      showToast(newStatus ? 'Program aktif edildi.' : 'Program arşivlendi/durduruldu.');
      loadCohorts();
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">

        {/* Toast Bildirim (AI asistan ile çakışmaması için sağ üstte) */}
        {toast && (
          <div
            className={`fixed top-20 right-6 z-[100] max-w-md px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 animate-fade-in ${
              toast.type === 'error'
                ? 'bg-rose-500 text-white shadow-rose-500/20'
                : 'bg-emerald-500 text-white shadow-emerald-500/20'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle size={18} className="shrink-0" /> : <Check size={18} className="shrink-0" />}
            <span className="leading-snug">{toast.message}</span>
          </div>
        )}

        {/* Üst Başlık & Aksiyonlar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
                <Calendar size={20} />
              </span>
              <h1 className="font-display font-black text-2xl md:text-3xl text-slate-900 dark:text-white">
                Haftalık Programlar & Gruplar
              </h1>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Öğrenci grupları oluşturun, 4-5 haftalık ders programları tanımlayın ve teslim sürelerini yönetin.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-500/20 hover:scale-105"
          >
            <Plus size={18} /> Yeni Program Oluştur
          </button>
        </div>

        {/* İçerik */}
        {loading ? (
          <LoadingSpinner fullPage />
        ) : cohorts.length === 0 ? (
          <EmptyState
            emoji="📅"
            title="Henüz bir haftalık program oluşturmadınız"
            desc="Sınıfınız veya öğrenci grubunuz için bir program oluşturup haftalık görevler ve teslim süreleri atayın."
            action={{ label: 'İlk Programı Başlat', onClick: () => setModalOpen(true) }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cohorts.map((cohort) => (
              <div
                key={cohort.id}
                onClick={() => navigate(`/teacher/cohorts/${cohort.id}`)}
                className="group relative cursor-pointer rounded-2xl bg-white dark:glass border border-slate-200 dark:border-white/10 hover:border-cyan-400 dark:hover:border-cyan-500/40 p-5 transition-all duration-200 hover:-translate-y-1 shadow-sm hover:shadow-xl hover:shadow-cyan-500/5 flex flex-col justify-between"
              >
                {/* Üst Kısım: Başlık & Durum */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        cohort.is_active
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-500/30'
                      }`}
                    >
                      {cohort.is_active ? '● Aktif Program' : '○ Duraklatıldı'}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleToggleStatus(cohort, e)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                        title={cohort.is_active ? 'Programı Duraklat' : 'Programı Aktifleştir'}
                      >
                        <Clock size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteCohort(cohort.id, cohort.title, e)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                        title="Programı Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display font-black text-lg text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {cohort.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 line-clamp-2 min-h-[32px]">
                    {cohort.description || 'Açıklama belirtilmedi.'}
                  </p>
                </div>

                {/* Orta Kısım: Katılım Kodu Kutusu */}
                <div
                  onClick={(e) => handleCopyCode(cohort.join_code, e)}
                  className="mt-4 p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 hover:border-cyan-400 dark:hover:border-cyan-500/30 flex items-center justify-between transition-colors shadow-sm"
                  title="Katılım kodunu kopyala"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Katılım Kodu:</span>
                    <span className="font-mono font-black text-cyan-700 dark:text-cyan-300 text-sm tracking-wider">
                      {cohort.join_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {copiedCode === cohort.join_code ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Check size={13} /> Kopyalandı
                      </span>
                    ) : (
                      <Copy size={14} className="text-slate-400 group-hover:text-cyan-400" />
                    )}
                    <button
                      onClick={(e) => handleRegenerateCode(cohort.id, e)}
                      className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300"
                      title="Yeni kod üret"
                    >
                      <RefreshCw size={12} />
                    </button>
                  </div>
                </div>

                {/* Alt Kısım: İstatistikler & Git */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      <Users size={14} className="text-violet-400" />
                      {cohort.member_count} Öğrenci
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-slate-300">
                      <Calendar size={14} className="text-cyan-400" />
                      {cohort.week_count} Hafta
                    </span>
                  </div>

                  <span className="inline-flex items-center text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                    Yönet <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Yeni Program Oluşturma Modalı */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-md rounded-3xl bg-white dark:glass border border-slate-200 dark:border-white/15 p-6 md:p-8 dark:bg-slate-900/95 shadow-2xl">
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/20 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-display font-black text-xl text-slate-900 dark:text-white">Yeni Program Oluştur</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sınıf veya grup için haftalık takvim planı</p>
                </div>
              </div>

              <form onSubmit={handleCreateCohort} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Program / Grup Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 2026 Bahar - Siber Savunma Grubu A"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Açıklama (Opsiyonel)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Programın hedefi, kapsadığı konular veya öğrencilere notlar..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm resize-none shadow-sm"
                  />
                </div>

                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/20 text-xs text-cyan-800 dark:text-cyan-300 flex items-start gap-2.5">
                  <Sparkles size={16} className="shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                  <span>
                    Program oluşturulduğunda öğrencilerin kendi başlarına katılabileceği 6 haneli bir <strong>Katılım Kodu</strong> otomatik üretilir.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-bold transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading ? <LoadingSpinner size="sm" /> : <Plus size={16} />}
                    Oluştur ve Haftaları Planla
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
