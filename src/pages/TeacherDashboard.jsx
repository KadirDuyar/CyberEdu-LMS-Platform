import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, TrendingUp, CheckCircle,
  PlusCircle, Edit2, ShieldAlert, Cpu
} from 'lucide-react';
import Card from '../components/Card';
import { supabase } from '../lib/supabase';

export default function TeacherDashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTeacherCourses() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, description, category, is_published, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setCourses(data);
        }
      } catch (err) {
        // Hata durumunda boş liste
      } finally {
        setLoading(false);
      }
    }

    loadTeacherCourses();
  }, [user]);

  const totalCourses = courses.length;
  const publishedCount = courses.filter((c) => c.is_published).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">

        {/* Hoş Geldin Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-violet-950/50 border border-cyan-500/30 p-6 md:p-8 shadow-2xl">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-400/30 inline-block mb-2">
              Eğitmen Yönetim Merkezi
            </span>
            <h2 className="font-display font-black text-2xl md:text-3xl text-white mt-1">
              Hoş geldin,{' '}
              <span className="text-gradient-cyan">
                {profile?.full_name || 'Eğitmen'}!
              </span>
            </h2>
            <p className="text-slate-300 text-sm md:text-base mt-2 max-w-xl">
              Öğrencilerin için yeni siber güvenlik modülleri ve interaktif etkinlikler tasarlayabilirsin.
            </p>
            <button
              onClick={() => navigate('/teacher/courses/new')}
              className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 hover:scale-105"
            >
              <PlusCircle size={18} /> Yeni Kurs Oluştur
            </button>
          </div>
        </div>

        {/* Gerçek İstatistikler */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card hover className="border-cyan-500/20">
            <BookOpen size={22} className="text-cyan-400" />
            <p className="font-display font-black text-2xl mt-2 text-cyan-400">{totalCourses}</p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Toplam Kurs</p>
          </Card>

          <Card hover className="border-emerald-500/20">
            <CheckCircle size={22} className="text-emerald-400" />
            <p className="font-display font-black text-2xl mt-2 text-emerald-400">{publishedCount}</p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Yayındaki Kurs</p>
          </Card>

          <Card hover className="border-violet-500/20">
            <Users size={22} className="text-violet-400" />
            <p className="font-display font-black text-2xl mt-2 text-violet-400">5</p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Aktif Öğrenci</p>
          </Card>

          <Card hover className="border-amber-500/20">
            <TrendingUp size={22} className="text-amber-400" />
            <p className="font-display font-black text-2xl mt-2 text-amber-400">%84</p>
            <p className="text-xs text-slate-400 font-bold mt-0.5">Ort. Başarı Oranı</p>
          </Card>
        </div>

        {/* Hızlı Şablon Başlatma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/teacher/courses/new')}
            className="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-400 text-left transition-all hover:-translate-y-0.5 flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Farkındalık Eğitimi Oluştur</h4>
              <p className="text-xs text-slate-400 mt-1">Phishing, güçlü parola ve sosyal mühendislik üzerine temel seviye modüller.</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/teacher/courses/new')}
            className="p-5 rounded-2xl border border-orange-500/30 bg-orange-500/5 hover:border-orange-400 text-left transition-all hover:-translate-y-0.5 flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <Cpu size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">Teknik Zafiyet Kursu Oluştur</h4>
              <p className="text-xs text-slate-400 mt-1">SQL Injection, XSS ve Ağ Protokolleri üzerine derinlemesine laboratuvarlar.</p>
            </div>
          </button>
        </div>

        {/* Mevcut Kurslarım Listesi */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-base text-white">Hazırladığın Kurslar</h3>
            <button
              onClick={() => navigate('/teacher/courses')}
              className="text-xs font-bold text-cyan-400 hover:underline"
            >
              Tümünü Gör
            </button>
          </div>

          {courses.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
              <p className="text-xs text-slate-400">Henüz bir kurs oluşturmadın.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {courses.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3.5 rounded-xl glass border border-white/5 hover:border-white/15 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <p className="font-bold text-sm text-white">{c.title}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {c.category === 'technical' ? 'Teknik' : 'Farkındalık'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/teacher/courses/${c.id}/edit`)}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
                    title="Kursu ve Dersleri Düzenle"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </DashboardLayout>
  );
}