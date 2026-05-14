import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Users, BookOpen, TrendingUp, CheckCircle, PlusCircle } from 'lucide-react';
import Card from '../components/Card';

const STATS = [
  { icon: Users,     label: 'Toplam Öğrenci',  value: '32',  color: 'text-cyan-400',    glow: 'cyan'    },
  { icon: BookOpen,  label: 'Aktif Ders',       value: '5',   color: 'text-violet-400',  glow: 'purple'  },
  { icon: TrendingUp,label: 'Ortalama Başarı',  value: '%74', color: 'text-emerald-400', glow: 'emerald' },
  { icon: CheckCircle,label:'Tamamlanan Quiz', value: '128', color: 'text-amber-400',   glow: 'amber'   },
];

const RECENT_STUDENTS = [
  { name: 'Ahmet Yılmaz',  avatar: '🚀', progress: 68, xp: 1250 },
  { name: 'Elif Demir',    avatar: '🌟', progress: 92, xp: 2100 },
  { name: 'Can Çelik',     avatar: '🎯', progress: 45, xp: 800  },
  { name: 'Zeynep Arslan', avatar: '💡', progress: 77, xp: 1600 },
];

export default function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-900/50 via-blue-900/30 to-violet-900/30 border border-cyan-500/20 p-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl" />
          <p className="text-slate-400 text-sm">Öğretmen Paneli 🎓</p>
          <h2 className="font-display font-black text-2xl text-white mt-1">
            Hoş geldin, <span className="text-gradient-cyan">{user?.name?.split(' ')[0]}!</span>
          </h2>
          <p className="text-slate-400 text-sm mt-2">Bugün 3 öğrenci yeni konuyu tamamladı. 🎉</p>
          <button
            id="btn-add-lesson"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-cyan-500/30"
          >
            <PlusCircle size={16} /> Yeni Ders Ekle
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(({ icon: Icon, label, value, color, glow }) => (
            <Card key={label} glow={glow} hover>
              <Icon size={22} className={color} />
              <p className={`font-display font-black text-2xl mt-2 ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* Student List */}
        <Card>
          <h3 className="font-display font-bold text-lg text-white mb-4">Son Aktif Öğrenciler</h3>
          <div className="space-y-3">
            {RECENT_STUDENTS.map((s) => (
              <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <span className="text-2xl">{s.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full max-w-[120px]">
                      <div
                        className="progress-bar h-full"
                        style={{ width: `${s.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">%{s.progress}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-400">⚡ {s.xp}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </DashboardLayout>
  );
}
