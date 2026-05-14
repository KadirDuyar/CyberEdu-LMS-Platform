import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Users, Server, ShieldCheck, Activity, Trash2, UserPlus } from 'lucide-react';
import Card from '../components/Card';

const SYSTEM_STATS = [
  { icon: Users,      label: 'Toplam Kullanıcı', value: '47',   color: 'text-violet-400', glow: 'purple' },
  { icon: Server,     label: 'Aktif Oturum',     value: '12',   color: 'text-cyan-400',   glow: 'cyan'   },
  { icon: ShieldCheck,label: 'Güvenlik Puanı',   value: '98/100',color: 'text-emerald-400',glow: 'emerald'},
  { icon: Activity,   label: 'Sistem Yükü',      value: '%23',  color: 'text-amber-400',  glow: 'amber'  },
];

const USERS = [
  { name: 'Ayşe Kaya',    email: 'ogretmen@demo.com', role: 'Öğretmen', avatar: '🎓', status: 'active' },
  { name: 'Ahmet Yılmaz', email: 'ogrenci@demo.com',  role: 'Öğrenci',  avatar: '🚀', status: 'active' },
  { name: 'Zeynep Arslan',email: 'z.arslan@demo.com', role: 'Öğrenci',  avatar: '💡', status: 'inactive'},
];

const ROLE_COLORS = {
  'Öğretmen': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  'Öğrenci':  'text-violet-400 bg-violet-500/10 border-violet-500/30',
  'Admin':    'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-900/50 via-orange-900/30 to-red-900/20 border border-amber-500/20 p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl" />
          <p className="text-slate-400 text-sm">Yönetici Paneli ⚙️</p>
          <h2 className="font-display font-black text-2xl text-white mt-1">
            Sistem Durumu: <span className="text-amber-400">Çevrimiçi ✅</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
          </p>
          <button
            id="btn-add-user"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-amber-500/30"
          >
            <UserPlus size={16} /> Kullanıcı Ekle
          </button>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SYSTEM_STATS.map(({ icon: Icon, label, value, color, glow }) => (
            <Card key={label} glow={glow} hover>
              <Icon size={22} className={color} />
              <p className={`font-display font-black text-2xl mt-2 ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* User Management Table */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-white">Kullanıcı Yönetimi</h3>
            <span className="text-xs text-slate-500">{USERS.length} kullanıcı</span>
          </div>
          <div className="space-y-2">
            {USERS.map((u) => (
              <div
                key={u.email}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <span className="text-2xl">{u.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[u.role] || ''}`}>
                  {u.role}
                </span>
                <span className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400"
                  title="Kullanıcıyı sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
