import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Users, BookOpen, Trophy, Clock, Search,
  CheckCircle2, TrendingUp, Filter, Shield, Code2, ArrowUpDown
} from 'lucide-react';

export default function TeacherStats() {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all'); // 'all' | 'awareness' | 'technical'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'xp' | 'lessons'

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        // 1. Tüm öğrenci profillerini çek
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_emoji, xp, level, learning_area, created_at')
          .eq('role', 'student')
          .order('xp', { ascending: false });

        // 2. Tüm dersleri ve bağlı oldukları kursları çek
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('id, title, course_id, xp_reward, courses(id, title, category)')
          .eq('is_published', true);

        const lessonMap = {};
        (allLessons || []).forEach((l) => {
          lessonMap[l.id] = {
            id: l.id,
            title: l.title,
            courseTitle: l.courses?.title || 'Eğitim Kursu',
            category: l.courses?.category || 'awareness',
          };
        });

        // 3. Tüm tamamlanan ders kayıtlarını çek
        const { data: allProgress } = await supabase
          .from('lesson_progress')
          .select('id, user_id, lesson_id, status, completed_at, updated_at')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false });

        // 4. Öğrencileri ders ilerlemeleri ve en son tamamladıkları ders ile harmanla
        const progressByUser = {};
        (allProgress || []).forEach((p) => {
          if (!progressByUser[p.user_id]) {
            progressByUser[p.user_id] = [];
          }
          progressByUser[p.user_id].push(p);
        });

        const studentStats = (studentProfiles || []).map((st) => {
          const userProgressList = progressByUser[st.id] || [];
          const completedCount = userProgressList.length;

          // En son tamamlanan dersi bul (completed_at veya updated_at zamanına göre)
          let lastCompleted = null;
          if (userProgressList.length > 0) {
            // Zaten completed_at desc sıralı, ilk geçerli dersi al
            for (const prog of userProgressList) {
              const lessonInfo = lessonMap[prog.lesson_id];
              if (lessonInfo) {
                lastCompleted = {
                  lessonTitle: lessonInfo.title,
                  courseTitle: lessonInfo.courseTitle,
                  category: lessonInfo.category,
                  completedAt: prog.completed_at || prog.updated_at,
                };
                break;
              }
            }
          }

          return {
            ...st,
            completedLessonsCount: completedCount,
            lastCompletedLesson: lastCompleted,
          };
        });

        setStudents(studentStats);

        // 5. Kurs istatistikleri
        const { data: courseList } = await supabase
          .from('courses')
          .select('id, title, category, thumbnail_emoji, lessons(id)')
          .eq('is_published', true);

        const courseStats = (courseList || []).map((c) => {
          const courseLessons = c.lessons || [];
          return {
            ...c,
            lessonsCount: courseLessons.length,
          };
        });

        setCourses(courseStats);
      } catch (err) {
        console.error('Öğretmen istatistikleri yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  // Zamanı insan dostu formata dönüştür
  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Bilinmiyor';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 2) return 'Az önce';
      if (diffMin < 60) return `${diffMin} dk önce`;
      if (diffHours < 24) return `${diffHours} saat önce`;
      if (diffDays === 1) return 'Dün';
      if (diffDays < 7) return `${diffDays} gün önce`;

      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch {
      return 'Yakın zamanda';
    }
  };

  // Filtreleme ve Sıralama
  const filteredStudents = students
    .filter((st) => {
      const matchesSearch =
        (st.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArea =
        selectedArea === 'all' || st.learning_area === selectedArea;
      return matchesSearch && matchesArea;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const timeA = a.lastCompletedLesson?.completedAt
          ? new Date(a.lastCompletedLesson.completedAt).getTime()
          : 0;
        const timeB = b.lastCompletedLesson?.completedAt
          ? new Date(b.lastCompletedLesson.completedAt).getTime()
          : 0;
        return timeB - timeA;
      }
      if (sortBy === 'xp') {
        return (b.xp || 0) - (a.xp || 0);
      }
      if (sortBy === 'lessons') {
        return b.completedLessonsCount - a.completedLessonsCount;
      }
      return 0;
    });

  // KPI hesaplamaları
  const totalStudents = students.length;
  const totalCompletedLessons = students.reduce((sum, s) => sum + s.completedLessonsCount, 0);
  const averageXP = totalStudents > 0 ? Math.round(students.reduce((sum, s) => sum + (s.xp || 0), 0) / totalStudents) : 0;
  const activeStudentsCount = students.filter((s) => s.completedLessonsCount > 0).length;

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage message="Öğrenci istatistikleri ve analizler yükleniyor..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto pb-16">

        {/* ── Üst Başlık Banner ────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-100 via-blue-50 to-white dark:from-cyan-950/80 dark:via-blue-950/60 dark:to-slate-900 border border-cyan-200 dark:border-cyan-500/30 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-800 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-300 dark:border-cyan-500/40 px-3.5 py-1 rounded-full inline-flex items-center gap-1.5">
                <Users size={14} className="text-cyan-600 dark:text-cyan-400" /> Eğitmen Öğrenci Takip Merkezi
              </span>
              <h1 className="font-display font-black text-2xl md:text-3xl text-slate-900 dark:text-white">
                Öğrenci İlerleme & <span className="text-gradient-cyan">Ders İstatistikleri</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm max-w-2xl leading-relaxed">
                Öğrencilerinin gerçek zamanlı tamamladığı dersleri, en son aktivitelerini, puan durumlarını ve parkur başarılarını buradan detaylıca takip edebilirsin.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-center shrink-0 shadow-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Aktif Katılım</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {totalStudents > 0 ? Math.round((activeStudentsCount / totalStudents) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Metrik Kartları ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card hover className="border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Users size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Kayıtlı Öğrenci</p>
                <p className="text-xl font-black text-cyan-400">{totalStudents}</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Bitirilen Toplam Ders</p>
                <p className="text-xl font-black text-emerald-400">{totalCompletedLessons}</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Ortalama Öğrenci XP</p>
                <p className="text-xl font-black text-amber-400">{averageXP} XP</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                <BookOpen size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Yayındaki Kurs Sayısı</p>
                <p className="text-xl font-black text-violet-400">{courses.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Arama, Filtre ve Sıralama Çubuğu ────────────────────────────── */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl glass border border-white/10">
          
          {/* Arama Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Öğrenci adı ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Parkur Filtresi */}
            <div className="flex items-center gap-1 bg-slate-900/60 border border-white/10 p-1 rounded-xl">
              <button
                onClick={() => setSelectedArea('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedArea === 'all'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setSelectedArea('awareness')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedArea === 'awareness'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield size={12} /> Farkındalık
              </button>
              <button
                onClick={() => setSelectedArea('technical')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedArea === 'technical'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 size={12} /> Teknik
              </button>
            </div>

            {/* Sıralama */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
            >
              <option value="recent">En Son Tamamlayanlar</option>
              <option value="xp">En Çok XP Kazananlar</option>
              <option value="lessons">En Çok Ders Bitirenler</option>
            </select>
          </div>

        </div>

        {/* ── Öğrenci Detaylı İlerleme Tablosu ────────────────────────────── */}
        <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users size={18} className="text-cyan-400" /> Öğrenci İlerleme Kayıtları
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Gösterilen: {filteredStudents.length} / {students.length} Öğrenci
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-slate-900/60 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <th className="py-3.5 px-5">Öğrenci</th>
                  <th className="py-3.5 px-4">Parkur</th>
                  <th className="py-3.5 px-4 font-bold text-cyan-300">En Son Tamamladığı Ders</th>
                  <th className="py-3.5 px-4 text-center">Biten Ders</th>
                  <th className="py-3.5 px-4 text-right">Puan & Seviye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                      Kriterlere uygun öğrenci bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => {
                    const last = st.lastCompletedLesson;

                    return (
                      <tr key={st.id} className="hover:bg-white/[0.02] transition-colors">
                        
                        {/* Öğrenci Bilgisi */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                              {st.avatar_emoji || '👤'}
                            </span>
                            <div>
                              <p className="font-bold text-sm text-white">{st.full_name || 'İsimsiz Öğrenci'}</p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {st.created_at ? new Date(st.created_at).toLocaleDateString('tr-TR') : 'Kayıtlı'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Parkur */}
                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                            st.learning_area === 'technical'
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}>
                            {st.learning_area === 'technical' ? (
                              <><Code2 size={11} /> Teknik</>
                            ) : (
                              <><Shield size={11} /> Farkındalık</>
                            )}
                          </span>
                        </td>

                        {/* EN SON TAMAMLANAN DERS (Önemli İstek) */}
                        <td className="py-4 px-4">
                          {last ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs hover:text-cyan-300 transition-colors">
                                  {last.lessonTitle}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span className="font-semibold text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {last.courseTitle}
                                </span>
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Clock size={10} className="text-cyan-400" />
                                  {formatTimeAgo(last.completedAt)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-xs flex items-center gap-1">
                              <Clock size={12} className="text-slate-600" /> Henüz ders tamamlamadı
                            </span>
                          )}
                        </td>

                        {/* Tamamlanan Ders Sayısı */}
                        <td className="py-4 px-4 text-center">
                          <span className="font-display font-black text-base text-white">
                            {st.completedLessonsCount}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Ders Bitti</span>
                        </td>

                        {/* XP ve Seviye */}
                        <td className="py-4 px-4 text-right">
                          <span className="font-black text-amber-400 text-sm font-mono block">
                            +{st.xp || 0} XP
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Seviye {st.level || 1}
                          </span>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
