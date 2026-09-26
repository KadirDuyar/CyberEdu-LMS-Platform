import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { getAllProfiles, resetStudentProgress } from '../services/adminService';
import { supabase } from '../lib/supabase';
import {
  Users, ShieldCheck, Activity, BookOpen,
  RefreshCw, RotateCcw, UserCheck, ShieldAlert,
  Search, X, Sparkles
} from 'lucide-react';
import Card from '../components/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ROLE_COLORS = {
  student: 'text-violet-700 bg-violet-100 border-violet-300 dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/30',
  teacher: 'text-cyan-700 bg-cyan-100 border-cyan-300 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/30',
  admin:   'text-amber-700 bg-amber-100 border-amber-300 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/30',
};

const ROLE_LABELS = {
  student: 'Öğrenci',
  teacher: 'Eğitmen',
  admin: 'Yönetici',
};

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCourses, setTotalCourses] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      // Kullanıcı profillerini çek
      const { data: profilesData } = await getAllProfiles();
      if (profilesData) {
        setUsers(profilesData);
      }

      // Toplam kurs sayısını çek
      const { count } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      setTotalCourses(count || 0);
    } catch (err) {
      console.error('Admin veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Onayla',
    isDanger: false,
    onConfirm: null,
  });
  const [toast, setToast] = useState(null);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleResetProgress = (userId, userName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Öğrenci Verilerini ve İlerlemesini Sıfırla',
      message: `${userName} adlı öğrencinin e-postası ve şifresi hariç; kayıtlı olduğu tüm kurslar, dahil olduğu haftalık sınıf programları, ders ilerlemeleri, sınav sonuçları, yorumları, takipleri ve rozetleri kalıcı olarak silinecektir. Bu işlemi onaylıyor musunuz?`,
      confirmText: 'Evet, Tamamen Sıfırla',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        const { error } = await resetStudentProgress(userId);
        if (error) {
          showToast('error', 'Hata: ' + error.message);
        } else {
          showToast('success', `${userName} kullanıcısının tüm kurs, program ve ders ilerlemeleri başarıyla sıfırlandı.`);
          loadDashboardData();
        }
      },
    });
  };

  const handleRoleChange = (userId, currentRole) => {
    const nextRole = currentRole === 'student' ? 'teacher' : 'student';
    const nextLabel = ROLE_LABELS[nextRole] || nextRole;
    setConfirmModal({
      isOpen: true,
      title: 'Kullanıcı Rolünü Güncelle',
      message: `Kullanıcının rolü '${nextLabel}' olarak değiştirilecektir. Onaylıyor musunuz?`,
      confirmText: 'Rolü Değiştir',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, isOpen: false }));
        const { error } = await supabase
          .from('profiles')
          .update({ role: nextRole })
          .eq('id', userId);

        if (error) {
          showToast('error', 'Rol güncellenemedi: ' + error.message);
        } else {
          showToast('success', `Kullanıcı rolü başarıyla '${nextLabel}' olarak güncellendi.`);
          loadDashboardData();
        }
      },
    });
  };

  const studentCount = users.filter((u) => u.role === 'student').length;
  const teacherCount = users.filter((u) => u.role === 'teacher').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;

  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (u.full_name && u.full_name.toLowerCase().includes(query)) ||
      (u.masked_email && u.masked_email.toLowerCase().includes(query)) ||
      (u.id && u.id.toLowerCase().includes(query));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12 px-1 sm:px-0">

        {/* Hoş Geldin & Sistem Durumu Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50 to-slate-100 dark:from-amber-950/70 dark:via-orange-950/50 dark:to-slate-900/60 border border-amber-200 dark:border-amber-500/30 p-5 sm:p-7 md:p-8 shadow-sm dark:shadow-2xl">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-400/30 inline-block mb-2">
              Sistem Denetim Merkezi
            </span>
            <h2 className="font-display font-black text-xl sm:text-2xl md:text-3xl text-slate-900 dark:text-white mt-1">
              Yönetici Paneli: <span className="text-emerald-600 dark:text-emerald-400 font-mono">Çevrimiçi</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Platform kullanıcıları, içerik bütünlüğü ve rol tabanlı yetkilendirme (RBAC) kontrolleri aktif.
            </p>
          </div>
        </div>

        {/* Dinamik Sistem İstatistikleri */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card hover className="border-violet-500/20 p-3.5 sm:p-5">
            <Users size={20} className="text-violet-600 dark:text-violet-400 sm:w-6 sm:h-6" />
            <p className="font-display font-black text-xl sm:text-2xl mt-2 text-violet-600 dark:text-violet-400">
              {loading ? '—' : users.length}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Toplam Kullanıcı</p>
          </Card>

          <Card hover className="border-cyan-500/20 p-3.5 sm:p-5">
            <BookOpen size={20} className="text-cyan-600 dark:text-cyan-400 sm:w-6 sm:h-6" />
            <p className="font-display font-black text-xl sm:text-2xl mt-2 text-cyan-600 dark:text-cyan-400">
              {loading ? '—' : totalCourses}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Kayıtlı Kurs</p>
          </Card>

          <Card hover className="border-emerald-500/20 p-3.5 sm:p-5">
            <ShieldCheck size={20} className="text-emerald-600 dark:text-emerald-400 sm:w-6 sm:h-6" />
            <p className="font-display font-black text-xl sm:text-2xl mt-2 text-emerald-600 dark:text-emerald-400">RLS Aktif</p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Veri Güvenliği</p>
          </Card>

          <Card hover className="border-amber-500/20 p-3.5 sm:p-5">
            <Activity size={20} className="text-amber-600 dark:text-amber-400 sm:w-6 sm:h-6" />
            <p className="font-display font-black text-lg sm:text-2xl mt-2 text-amber-600 dark:text-amber-400">
              {studentCount} Ö / {teacherCount} E
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">Rol Dağılımı</p>
          </Card>
        </div>

        {/* Kullanıcı Listesi & Rol Yönetimi */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Platform Kullanıcıları</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                  {filteredUsers.length}
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Rolleri yönetebilir veya öğrencilerin tüm verilerini tek tıkla sıfırlayabilirsiniz.
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors border border-slate-200 dark:border-white/10 cursor-pointer shadow-sm"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Yenile
            </button>
          </div>

          {/* Mobilde Uyumlu Arama ve Rol Filtreleme Çubuğu */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pt-1">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="İsim veya e-posta ile kullanıcı ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500 shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                }`}
              >
                Tümü ({users.length})
              </button>
              <button
                onClick={() => setRoleFilter('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === 'student'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                }`}
              >
                Öğrenciler ({studentCount})
              </button>
              <button
                onClick={() => setRoleFilter('teacher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  roleFilter === 'teacher'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                }`}
              >
                Eğitmenler ({teacherCount})
              </button>
            </div>
          </div>

          {/* Kullanıcı Kartları Listesi */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-amber-400 dark:hover:border-amber-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm"
                >
                  {/* Sol: Avatar + İsim + E-posta/Kayıt + Rozetler */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xl shrink-0 border border-slate-200 dark:border-white/10 shadow-sm">
                      {u.avatar_emoji || (u.role === 'teacher' ? '🎓' : u.role === 'admin' ? '🛡️' : '🚀')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {u.full_name || u.masked_email || 'Kullanıcı'}
                        </p>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-wider ${ROLE_COLORS[u.role] || ''}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                        {u.learning_area && (
                          <span className="text-[10px] font-bold text-violet-700 bg-violet-100 border border-violet-300 dark:text-violet-300 dark:bg-violet-950/60 dark:border-violet-700/40 px-2 py-0.5 rounded-md">
                            {u.learning_area === 'awareness' ? '🛡️ Farkındalık' : '⚔️ Teknik'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Kayıt: {new Date(u.created_at).toLocaleDateString('tr-TR')}</span>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">{u.xp || 0} XP</span>
                        <span>•</span>
                        <span>Seviye {u.level || 1}</span>
                      </p>
                    </div>
                  </div>

                  {/* Sağ: Aksiyon Butonları (Mobilde tam genişlik ve rahat tıklama) */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 md:border-0 md:pt-0 shrink-0 flex-wrap sm:flex-nowrap justify-end">
                    {/* Rol Değiştirme Butonu (Admin hariç) */}
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleRoleChange(u.id, u.role)}
                        className="flex-1 sm:flex-none p-2 sm:px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-500/10 dark:hover:bg-cyan-500/25 text-cyan-800 dark:text-cyan-300 text-xs font-bold border border-cyan-300 dark:border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        title="Rolü Öğrenci/Eğitmen olarak değiştir"
                      >
                        <UserCheck size={14} />
                        <span>{u.role === 'student' ? 'Eğitmen Yap' : 'Öğrenci Yap'}</span>
                      </button>
                    )}

                    {/* Sıfırlama Butonu (Sadece öğrenci için) */}
                    {u.role === 'student' && (
                      <button
                        onClick={() => handleResetProgress(u.id, u.full_name || 'Öğrenci')}
                        className="flex-1 sm:flex-none p-2 sm:px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold border border-rose-300 dark:border-rose-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                        title="Öğrencinin tüm kurs kayıtlarını, programlarını ve ilerlemesini sıfırla"
                      >
                        <RotateCcw size={14} />
                        <span>Verileri Sıfırla</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {filteredUsers.length === 0 && !loading && (
              <p className="text-center text-slate-500 text-xs sm:text-sm py-8">
                {searchQuery || roleFilter !== 'all' ? 'Arama kriterlerine uygun kullanıcı bulunamadı.' : 'Kayıtlı kullanıcı bulunamadı.'}
              </p>
            )}
          </div>
        </Card>

        {/* Özel Onay Modalı (window.confirm yerine) */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModal.isDanger ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30' : 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-300 dark:border-violet-500/30'
                }`}>
                  {confirmModal.isDanger ? <RotateCcw size={22} /> : <UserCheck size={22} />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{confirmModal.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Yönetici İşlem Onayı</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
                  className="w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-lg cursor-pointer ${
                    confirmModal.isDanger
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/30'
                      : 'bg-violet-600 hover:bg-violet-500 shadow-violet-500/30'
                  }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Bildirimi */}
        {toast && (
          <div className="fixed top-20 right-6 z-[100] animate-bounce">
            <div className={`px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/50'
                : 'bg-rose-100 dark:bg-rose-950/90 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/50'
            }`}>
              {toast.type === 'success' ? '✅' : '⚠️'} {toast.text}
            </div>
          </div>
        )}

        {/* Siber Güvenlik Altyapı Notu */}
        <Card className="border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/10">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-800 dark:text-emerald-400 text-sm mb-1.5">Altyapı Güvenlik Mimarisi</h4>
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Supabase PostgreSQL Row Level Security (RLS) kuralları uygulanmaktadır.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Service Role Key istemciye (frontend) sızdırılmamaktadır.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Öğretmen ve öğrenci oturumları JWT token doğrulaması ile ayrıştırılmıştır.
                </li>
              </ul>
            </div>
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}