import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import WeeklyTasksBanner from '../../components/cohorts/WeeklyTasksBanner';
import { Calendar, Sparkles, CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export default function StudentCohorts() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProgressUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* Üst Bilgi Başlığı */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/80 via-blue-950/60 to-slate-900 border border-cyan-500/30 p-6 md:p-8 shadow-2xl">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <Calendar size={22} />
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
                  Öğretmen & Sınıf Görevleri
                </span>
              </div>

              <h1 className="font-display font-black text-2xl md:text-3xl text-white">
                Haftalık Programlarım & Görevlerim
              </h1>
              <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
                Öğretmeninizin belirlediği teslim takvimine göre haftalık ders ve kurs görevlerini tamamlayın, 
                grup içi ilerlemenizi sürdürün ve haftalık sıralamalarda yerinizi alın.
              </p>
            </div>

            {/* Bilgilendirici İpuçları */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <Clock size={18} className="text-amber-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Zaman Takibi</p>
                  <p className="text-xs font-bold text-white">Süreli Teslim</p>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase">Otomatik Senk</p>
                  <p className="text-xs font-bold text-white">XP Ödülleri</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Çoklu Program Listesi ve Görev Akışları */}
        {user?.id && (
          <WeeklyTasksBanner
            key={refreshKey}
            userId={user.id}
            onProgressUpdated={handleProgressUpdated}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
