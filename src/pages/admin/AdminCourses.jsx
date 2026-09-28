import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { deleteCourse } from '../../services/teacherService';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import {
  BookOpen, Plus, Search, Edit2, Trash2, Eye,
  RefreshCw, CheckCircle, Clock, Shield, Code2,
  AlertCircle, Globe, ToggleLeft, ToggleRight
} from 'lucide-react';

export default function AdminCourses() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*, lessons(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Admin kurs listesi yüklenemedi:', err);
      showToast('error', 'Kurslar yüklenirken bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleTogglePublish = async (course) => {
    const newStatus = !course.is_published;
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: newStatus, updated_at: new Date().toISOString() })
        .eq('id', course.id);

      if (error) throw error;

      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_published: newStatus } : c))
      );
      showToast(
        'success',
        `"${course.title}" kursu ${newStatus ? 'yayına alındı' : 'taslağa çekildi'}.`
      );
    } catch (err) {
      showToast('error', 'Durum güncellenemedi: ' + err.message);
    }
  };

  const handleDeleteCourse = async (course) => {
    const confirmMsg = `"${course.title}" kursunu ve veritabanındaki TÜM ilişkili verileri (dersler, aktiviteler, öğrenci kayıtları ve ilerlemeleri) kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(course.id);
    try {
      const { error } = await deleteCourse(course.id);
      if (error) throw error;

      setCourses((prev) => prev.filter((c) => c.id !== course.id));
      showToast('success', `"${course.title}" kursu ve tüm ilişkili veriler kalıcı olarak silindi.`);
    } catch (err) {
      showToast('error', 'Kurs silinirken hata oluştu: ' + (err.message || 'Veritabanı kısıtlaması'));
    } finally {
      setDeletingId(null);
    }
  };

  // İstatistikler
  const totalCount = courses.length;
  const publishedCount = courses.filter((c) => c.is_published).length;
  const mandatoryCount = courses.filter((c) => c.course_type === 'mandatory' || c.is_mandatory !== false).length;
  const electiveCount = courses.filter((c) => c.course_type === 'elective' || c.is_mandatory === false).length;

  // Filtreleme
  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.title?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.id?.toLowerCase().includes(q);

    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    const isMandatory = c.course_type === 'mandatory' || c.is_mandatory !== false;
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'mandatory' && isMandatory) ||
      (typeFilter === 'elective' && !isMandatory);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && c.is_published) ||
      (statusFilter === 'draft' && !c.is_published);

    return matchesSearch && matchesCategory && matchesType && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-16 px-1 sm:px-0">

        {/* Üst Başlık ve Aksiyon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-300 dark:border-amber-400/30 inline-block">
                Yönetici Paneli
              </span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Tüm Kursların Yönetimi
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mt-1">
              Platformdaki tüm dersleri, aktiviteleri, zorunlu ve seçmeli kursları yönetin veya düzenleyin.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadCourses}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all border border-slate-200 dark:border-white/10 cursor-pointer shadow-sm"
              title="Yenile"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Yenile</span>
            </button>

            <button
              onClick={() => navigate('/teacher/courses/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all shadow-lg shadow-violet-500/30 hover:scale-105 cursor-pointer"
            >
              <Plus size={18} /> Yeni Kurs Oluştur
            </button>
          </div>
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card hover className="border-violet-500/20 p-4">
            <BookOpen size={20} className="text-violet-600 dark:text-violet-400" />
            <p className="font-display font-black text-2xl mt-2 text-violet-600 dark:text-violet-400">
              {loading ? '—' : totalCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Toplam Kurs</p>
          </Card>

          <Card hover className="border-emerald-500/20 p-4">
            <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
            <p className="font-display font-black text-2xl mt-2 text-emerald-600 dark:text-emerald-400">
              {loading ? '—' : publishedCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Yayındaki Kurslar</p>
          </Card>

          <Card hover className="border-cyan-500/20 p-4">
            <Shield size={20} className="text-cyan-600 dark:text-cyan-400" />
            <p className="font-display font-black text-2xl mt-2 text-cyan-600 dark:text-cyan-400">
              {loading ? '—' : mandatoryCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Zorunlu Müfredat</p>
          </Card>

          <Card hover className="border-amber-500/20 p-4">
            <Globe size={20} className="text-amber-600 dark:text-amber-400" />
            <p className="font-display font-black text-2xl mt-2 text-amber-600 dark:text-amber-400">
              {loading ? '—' : electiveCount}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Seçmeli Kurslar</p>
          </Card>
        </div>

        {/* Arama ve Filtreleme */}
        <Card className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Kurs başlığı veya açıklamada ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-amber-500 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Kategori Filtresi */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Kategoriler</option>
                <option value="awareness">Farkındalık</option>
                <option value="technical">Teknik</option>
              </select>

              {/* Tür Filtresi */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Türler</option>
                <option value="mandatory">📌 Zorunlu</option>
                <option value="elective">☀️ Seçmeli</option>
              </select>

              {/* Yayın Durumu Filtresi */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="published">✅ Yayında</option>
                <option value="draft">⚠️ Taslak</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Kurslar Listesi */}
        {loading ? (
          <LoadingSpinner fullPage />
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            emoji="📚"
            title="Kurs bulunamadı"
            desc="Arama veya filtre kriterlerinize uyan kurs kaydı yok."
            action={{ label: 'Yeni Kurs Oluştur', onClick: () => navigate('/teacher/courses/new') }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => {
              const lessonCount = course.lessons?.[0]?.count ?? 0;
              const isAwareness = course.category === 'awareness';
              const isMandatory = course.course_type === 'mandatory' || course.is_mandatory !== false;
              const isDeleting = deletingId === course.id;

              return (
                <Card
                  key={course.id}
                  hover
                  className="p-0 overflow-hidden flex flex-col bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-sm"
                >
                  {/* Üst Başlık & Rozetler */}
                  <div className="p-5 flex-1 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-white/5 dark:to-transparent">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-3xl bg-white dark:bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm">
                        {course.thumbnail_emoji || '🔐'}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            isMandatory
                              ? 'text-violet-700 bg-violet-100 border-violet-300 dark:text-violet-300 dark:bg-violet-950/60 dark:border-violet-500/30'
                              : 'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-950/60 dark:border-amber-500/30'
                          }`}
                        >
                          {isMandatory ? '📌 Zorunlu' : '☀️ Seçmeli'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isAwareness
                              ? 'text-cyan-700 bg-cyan-100 border-cyan-300 dark:text-cyan-400 dark:bg-cyan-950/40 dark:border-cyan-500/30'
                              : 'text-orange-700 bg-orange-100 border-orange-300 dark:text-orange-400 dark:bg-orange-950/40 dark:border-orange-500/30'
                          }`}
                        >
                          {isAwareness ? 'Farkındalık' : 'Teknik'}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 mb-1">
                      {course.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[32px] mb-3 leading-relaxed">
                      {course.description || 'Açıklama girilmemiş.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-bold">
                        <BookOpen size={14} className="text-slate-400" />
                        <span>{lessonCount} Ders</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePublish(course)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          course.is_published
                            ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-200'
                            : 'text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 hover:bg-amber-200'
                        }`}
                        title="Tıklayarak durumu değiştir"
                      >
                        {course.is_published ? (
                          <>
                            <CheckCircle size={12} /> Yayında
                          </>
                        ) : (
                          <>
                            <Clock size={12} /> Taslak
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Alt İşlem Butonları */}
                  <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5">
                    <button
                      onClick={() => navigate(`/teacher/courses/${course.id}/edit`)}
                      className="py-3 text-xs text-slate-700 dark:text-slate-300 font-bold hover:text-violet-700 dark:hover:text-violet-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 size={13} /> Düzenle
                    </button>

                    <button
                      onClick={() => navigate(`/student/courses/${course.id}`)}
                      className="py-3 text-xs text-cyan-700 dark:text-cyan-400 font-bold hover:text-cyan-800 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} /> Önizle
                    </button>

                    <button
                      onClick={() => handleDeleteCourse(course)}
                      disabled={isDeleting}
                      className="py-3 text-xs text-rose-600 dark:text-rose-400 font-bold hover:text-rose-800 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isDeleting ? <LoadingSpinner size="sm" /> : <Trash2 size={13} />}
                      <span>{isDeleting ? 'Siliniyor' : 'Sil'}</span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>

      {/* Toast Bildirimi */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 animate-slide-up bg-slate-900/95 text-sm font-medium ${
            toast.type === 'error'
              ? 'border-rose-500/50 text-rose-300'
              : 'border-emerald-500/50 text-emerald-300'
          }`}
        >
          <AlertCircle
            size={18}
            className={`shrink-0 ${toast.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}
          />
          <span>{toast.text}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
