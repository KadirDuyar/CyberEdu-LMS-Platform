import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Map, Zap, Clock, ArrowRight, Star, Flame } from 'lucide-react';
import Card from '../components/Card';

// ─── Konu Yol Haritası Verisi (statik mock) ───────────────────────────────────
const TOPICS = [
  { id: 1, title: 'Kuvvet Nedir?',        emoji: '💪', xp: 100, status: 'done',    desc: 'Kuvvetin tanımı ve çeşitleri' },
  { id: 2, title: 'Newton\'un Yasaları',  emoji: '🍎', xp: 150, status: 'done',    desc: 'Hareketin üç temel yasası' },
  { id: 3, title: 'Sürtünme Kuvveti',     emoji: '🏎️', xp: 120, status: 'active',  desc: 'Sürtünmenin etkileri ve hesaplaması' },
  { id: 4, title: 'Yerçekimi',            emoji: '🌍', xp: 130, status: 'locked',  desc: 'Dünya\'nın çekim kuvveti' },
  { id: 5, title: 'Basit Makineler',      emoji: '⚙️', xp: 200, status: 'locked',  desc: 'Kaldıraç, makara ve eğik düzlem' },
];

// ─── Status renk ve etiket ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  done:   { label: 'Tamamlandı', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  active: { label: 'Devam Ediyor', cls: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  locked: { label: 'Kilitli', cls: 'bg-slate-700/50 text-slate-500 border-slate-600/30' },
};

// ─── Streak ve Stats mock ─────────────────────────────────────────────────────
const STATS = [
  { icon: Flame, label: 'Günlük Seri', value: '7 Gün', color: 'text-orange-400', bg: 'from-orange-500/20 to-red-500/10' },
  { icon: Star,  label: 'Bu Hafta XP', value: '+420',   color: 'text-amber-400',  bg: 'from-amber-500/20 to-yellow-500/10' },
  { icon: Clock, label: 'Öğrenme Süresi', value: '3s 20dk', color: 'text-cyan-400',  bg: 'from-cyan-500/20 to-blue-500/10' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const activeIndex = TOPICS.findIndex((t) => t.status === 'active');

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-900/60 via-purple-900/40 to-pink-900/30 border border-violet-500/20 p-6">
          {/* Glow effect */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-slate-400 text-sm font-medium">Öğrenmeye hazır mısın? 🎯</p>
            <h2 className="font-display font-black text-2xl text-white mt-1">
              Kaldığın yerden devam et,{' '}
              <span className="text-gradient">{user?.name?.split(' ')[0]}!</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Şu an <span className="text-violet-300 font-semibold">Sürtünme Kuvveti</span> konusundasın.
              Devam etmek için aşağıya tıkla.
            </p>
            <button
              id="btn-continue-lesson"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-violet-500/30"
            >
              Derse Devam Et <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map(({ icon: Icon, label, value, color, bg }) => (
            <Card key={label} hover className={`bg-gradient-to-br ${bg}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center`}>
                  <Icon size={20} className={color} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">{label}</p>
                  <p className={`text-xl font-display font-black ${color}`}>{value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Roadmap Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Map size={20} className="text-violet-400" />
            <h2 className="font-display font-bold text-lg text-white">Yol Haritası</h2>
            <span className="ml-auto text-xs text-slate-400">
              {TOPICS.filter(t => t.status === 'done').length}/{TOPICS.length} Tamamlandı
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
            <div
              className="progress-bar h-full"
              style={{ width: `${(TOPICS.filter(t => t.status === 'done').length / TOPICS.length) * 100}%` }}
            />
          </div>

          {/* Topic Cards */}
          <div className="space-y-3">
            {TOPICS.map((topic, idx) => {
              const status  = STATUS_CONFIG[topic.status];
              const isLocked = topic.status === 'locked';
              return (
                <div
                  key={topic.id}
                  className={[
                    'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200',
                    isLocked
                      ? 'glass border-white/5 opacity-50 cursor-not-allowed'
                      : 'glass border-white/10 hover:border-violet-500/40 hover:-translate-y-0.5 cursor-pointer card-lift',
                    topic.status === 'active' ? 'border-violet-500/30 shadow-[0_0_20px_rgba(124,58,237,0.2)]' : '',
                  ].join(' ')}
                >
                  {/* Step Number */}
                  <div className={[
                    'w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shrink-0',
                    topic.status === 'done'   ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30' :
                    topic.status === 'active' ? 'bg-violet-500/20 text-violet-400 ring-2 ring-violet-500/50 animate-pulse-slow' :
                    'bg-white/5 text-slate-600',
                  ].join(' ')}>
                    {topic.status === 'done' ? '✓' : topic.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-bold text-sm ${isLocked ? 'text-slate-600' : 'text-white'}`}>
                        {topic.title}
                      </h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isLocked ? 'text-slate-700' : 'text-slate-400'}`}>
                      {topic.desc}
                    </p>
                  </div>

                  {/* XP Badge */}
                  <div className="shrink-0 flex items-center gap-1">
                    <Zap size={13} className={isLocked ? 'text-slate-600' : 'text-amber-400'} />
                    <span className={`text-sm font-bold ${isLocked ? 'text-slate-600' : 'text-amber-400'}`}>
                      +{topic.xp} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
