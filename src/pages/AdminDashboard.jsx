import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { getAllProfiles, resetStudentProgress } from '../services/adminService';
import { supabase } from '../lib/supabase';
import {
  Users, ShieldCheck, Activity, BookOpen,
  RefreshCw, RotateCcw, UserCheck, ShieldAlert
} from 'lucide-react';
import Card from '../components/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ROLE_COLORS = {
  student: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  teacher: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  admin:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
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

  const handleResetProgress = async (userId, userName) => {
    if (window.confirm(`${userName} adlı kullanıcının tüm ders ilerlemesi ve XP puanı sıfırlanacak. Onaylıyor musunuz?`)) {
      const { error } = await resetStudentProgress(userId);
      if (error) {
        alert('Hata: ' + error.message);
      } else {
        alert('Kullanıcı ilerlemesi sıfırlandı.');
        loadDashboardData();
      }
    }
  };

  const handleRoleChange = async (userId, currentRole) => {
    const nextRole = currentRole === 'student' ? 'teacher' : 'student';
    if (window.confirm(`Kullanıcının rolü '${ROLE_LABELS[nextRole]}' olarak güncellensin mi?`)) {
      const { error } = await supabase
        .from('profiles')
        .update({ role: nextRole })
        .eq('id', userId);

      if (error) {
        alert('Rol güncellenemedi: ' + error.message);
      } else {
        loadDashboardData();
      }
    }
  };

  const studentCount = users.filter((u) => u.role === 'student').length;
  const teacherCount = users.filter((u) => u.role === 'teacher').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">

        {/* Hoş Geldin & Sistem Durumu Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900/60 border border-amber-500/30 p-6 md:p-8 shadow-2xl">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-400/30 inline-block mb-2">
              Sistem Denetim Merkezi
            </span>
            <h2 className="font-display font-black text-2xl md:text-3xl text-white mt-1">
              Yönetici Paneli: <span className="text-emerald-400 font-mono">Çevrimiçi</span>
            </h2>
            <p className="text-slate-300 text-sm mt-2">
              Platform kullanıcıları, içerik bütünlüğü ve rol tabanlı yetkilendirme (RBAC) kontrolleri aktif.
            </p>
          </div>
        </div>

        {/* Dinamik Sistem İstatistikleri */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card hover className="border-violet-500/20">
            <Users size={22} className="text-violet-400" />
            <p className="font-display font-black text-2xl mt-2 text-violet-400">
              {loading ? '—' : users.length}
            </p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Toplam Kullanıcı</p>
          </Card>

          <Card hover className="border-cyan-500/20">
            <BookOpen size={22} className="text-cyan-400" />
            <p className="font-display font-black text-2xl mt-2 text-cyan-400">
              {loading ? '—' : totalCourses}
            </p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Kayıtlı Kurs</p>
          </Card>

          <Card hover className="border-emerald-500/20">
            <ShieldCheck size={22} className="text-emerald-400" />
            <p className="font-display font-black text-2xl mt-2 text-emerald-400">RLS Aktif</p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Veri Güvenliği</p>
          </Card>

          <Card hover className="border-amber-500/20">
            <Activity size={22} className="text-amber-400" />
            <p className="font-display font-black text-2xl mt-2 text-amber-400">
              {studentCount} Ö / {teacherCount} E
            </p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Rol Dağılımı</p>
          </Card>
        </div>

        {/* Kullanıcı Listesi & Rol Yönetimi */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Platform Kullanıcıları</h3>
              <p className="text-xs text-slate-400">Rolleri yönetebilir veya öğrenci ilerlemelerini sıfırlayabilirsiniz.</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors border border-white/10"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Yenile
            </button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <LoadingSpinner />
            ) : (
              users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-amber-500/30 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {u.full_name || u.masked_email || 'Kullanıcı'}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Kayıt: {new Date(u.created_at).toLocaleDateString('tr-TR')} | XP: {u.xp || 0}
                    </p>
                  </div>

                  {u.learning_area && (
                    <span className="text-[10px] font-bold text-violet-300 bg-violet-950/60 border border-violet-700/40 px-2 py-0.5 rounded-md">
                      {u.learning_area === 'awareness' ? 'Farkındalık' : 'Teknik'}
                    </span>
                  )}

                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md border uppercase tracking-wider ${ROLE_COLORS[u.role] || ''}`}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Rol Değiştirme Butonu (Admin hariç) */}
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleRoleChange(u.id, u.role)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/20"
                        title="Rolü Öğrenci/Eğitmen olarak değiştir"
                      >
                        <UserCheck size={14} className="inline mr-1" />
                        {u.role === 'student' ? 'Eğitmen Yap' : 'Öğrenci Yap'}
                      </button>
                    )}

                    {/* Sıfırlama Butonu (Sadece öğrenci için) */}
                    {u.role === 'student' && (
                      <button
                        onClick={() => handleResetProgress(u.id, u.full_name || 'Öğrenci')}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20"
                        title="Ders ilerlemesini sıfırla"
                      >
                        <RotateCcw size={14} className="inline mr-1" /> Sıfırla
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

            {users.length === 0 && !loading && (
              <p className="text-center text-slate-500 text-sm py-6">Kayıtlı kullanıcı bulunamadı.</p>
            )}
          </div>
        </Card>

        {/* Siber Güvenlik Altyapı Notu */}
        <Card className="border-emerald-500/20 bg-emerald-950/10">
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-400 text-sm mb-1.5">Altyapı Güvenlik Mimarisi</h4>
              <ul className="space-y-1 text-xs text-slate-400">
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