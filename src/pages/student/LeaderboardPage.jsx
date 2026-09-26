import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Trophy, Medal, Award, UserPlus, UserCheck, Search,
  Shield, Zap, Star, ArrowRight, X, BookOpen, Clock, CheckCircle2, Flame
} from 'lucide-react';
import { getFollowingIds, followUser, unfollowUser } from '../../services/socialService';
import { getWeeklyLeaderboardData } from '../../services/cohortService';
import { BADGES, CHARACTERS } from '../../data/achievementsData';

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { studentId: paramStudentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all'); // 'all' | 'awareness' | 'technical'
  const [timeRange, setTimeRange] = useState('all'); // 'all' | 'week'

  // Profil Modalı için seçili öğrenci
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadLeaderboardData();
  }, [user, timeRange]);

  // URL parametresi ile belirli bir profil açılmışsa
  useEffect(() => {
    if (paramStudentId && students.length > 0) {
      const found = students.find((s) => s.id === paramStudentId);
      if (found) {
        handleOpenProfile(found);
      }
    }
  }, [paramStudentId, students]);

  async function loadLeaderboardData() {
    setLoading(true);
    try {
      if (timeRange === 'week') {
        const weeklyData = await getWeeklyLeaderboardData();
        setStudents(weeklyData || []);
      } else {
        // Tüm zamanlar: Tüm öğrencileri XP'ye göre sıralı çek
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'student')
          .order('xp', { ascending: false });

        if (error) {
          console.error('Liderlik tablosu hatası:', error.message);
        } else {
          setStudents(profilesData || []);
        }
      }

      // Takip edilenleri çek
      if (user) {
        const ids = await getFollowingIds(user.id);
        setFollowingIds(ids);
      }
    } catch (err) {
      console.error('Liderlik verisi yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  }

  // Takip Et / Bırak
  const handleToggleFollow = async (targetStudent, e) => {
    if (e) e.stopPropagation();
    if (!user || targetStudent.id === user.id) return;

    const isFollowing = followingIds.has(targetStudent.id);

    // Optimistic UI update
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(targetStudent.id);
      else next.add(targetStudent.id);
      return next;
    });

    if (isFollowing) {
      await unfollowUser(user.id, targetStudent.id);
    } else {
      await followUser(user.id, targetStudent.id, profile?.full_name || 'Bir öğrenci');
    }
  };

  // Öğrenci Profil Detaylarını Yükle ve Modalı Aç
  const handleOpenProfile = async (targetStudent) => {
    setSelectedStudent(targetStudent);
    setLoadingDetails(true);

    try {
      // 1. Tamamlanan ders sayısı
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('id, lesson_id, status')
        .eq('user_id', targetStudent.id)
        .eq('status', 'completed');

      const completedCount = progress?.length || 0;

      // 2. Kayıtlı kurslar
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('course_id, courses(id, title, category)')
        .eq('user_id', targetStudent.id);

      // 3. Kazanılan rozetleri hesapla (XP ve tamamlanan derslere göre)
      const earnedBadges = [];
      if (targetStudent.xp > 0) earnedBadges.push(BADGES[0]); // İlk adım
      if (completedCount >= 1) earnedBadges.push(BADGES[1]); // İlk ders
      if (completedCount >= 3) earnedBadges.push(BADGES[2]); // Temel farkındalık
      if (completedCount >= 6) earnedBadges.push(BADGES[3]); // Parola ustası
      if (completedCount >= 10) earnedBadges.push(BADGES[6]); // Quiz ustası
      if (targetStudent.xp >= 1000) earnedBadges.push(BADGES[7]); // Kurs mezunu

      setStudentDetails({
        completedCount,
        studyHours: Math.round(completedCount * 15 / 60 * 10) / 10,
        enrolledCount: enrolls?.length || 0,
        badges: earnedBadges.filter(Boolean),
      });
    } catch (err) {
      console.warn('Öğrenci detayları alınamadı:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Filtreleme
  const filteredStudents = students.filter((st) => {
    const matchesSearch = st.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArea =
      areaFilter === 'all'
        ? true
        : areaFilter === 'awareness'
          ? st.learning_area === 'awareness'
          : st.learning_area === 'technical';
    return matchesSearch && matchesArea;
  });

  const myStudent = students.find((s) => s.id === user?.id);
  const myRank = students.findIndex((s) => s.id === user?.id) + 1;
  const myDisplayXp = timeRange === 'week' ? (myStudent?.weekly_xp || 0) : (profile?.xp || 0);
  const topThree = filteredStudents.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-16">

        {/* ── Üst Başlık & İstatistik Kartı ────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-100 via-purple-50 to-white dark:from-violet-950/80 dark:via-purple-950/60 dark:to-slate-900 border border-violet-200 dark:border-violet-500/30 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-violet-300 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-bold mb-3">
                <Trophy size={14} className="text-amber-500 dark:text-amber-400" /> Siber Liderlik Arenası
              </div>
              <h1 className="font-display font-black text-2xl md:text-3xl text-slate-900 dark:text-white">
                Öğrenci Liderlik Tablosu 🏆
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1.5 max-w-xl leading-relaxed">
                CyberEdu'da en çok XP kazanan, dersleri tamamlayan ve siber güvenlik parkurlarında öne çıkan öğrencileri keşfet.
              </p>
            </div>

            {/* Kullanıcının Kendi Sıralaması */}
            {myRank > 0 && (
              <div className="glass-light rounded-2xl p-4 border border-violet-200 dark:border-violet-500/30 shrink-0 flex items-center gap-4 bg-violet-50 dark:bg-violet-900/20 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-amber-500/25">
                  #{myRank}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    {timeRange === 'week' ? 'Haftalık Sıralaman' : 'Senin Sıralaman'}
                  </p>
                  <p className="text-base font-black text-slate-900 dark:text-white">
                    {myDisplayXp.toLocaleString('tr-TR')} {timeRange === 'week' ? 'Haftalık XP' : 'XP'}
                  </p>
                  <p className="text-[11px] text-violet-700 dark:text-violet-300 font-medium">Seviye {profile?.level || 1}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Zaman Dilimi Filtresi ([Tüm Zamanlar] / [Bu Hafta]) ───────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl glass border border-white/10 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimeRange('all')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === 'all'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Trophy size={15} />
              Tüm Zamanlar
            </button>
            <button
              onClick={() => setTimeRange('week')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                timeRange === 'week'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame size={15} className={timeRange === 'week' ? 'text-slate-950' : 'text-amber-400'} />
              Bu Hafta (Son 7 Gün)
            </button>
          </div>

          {timeRange === 'week' && (
            <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              ⚡ Son 7 günün aktivite ve haftalık görev başarılarına göre sıralanır
            </span>
          )}
        </div>

        {/* ── İlk 3 Podyumu (Top 3) ─────────────────────────────────────── */}
        {!loading && topThree.length >= 3 && areaFilter === 'all' && !searchQuery && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* #2 Gümüş */}
            <div
              onClick={() => handleOpenProfile(topThree[1])}
              className="order-2 md:order-1 glass rounded-3xl p-5 border border-slate-400/30 bg-slate-900/60 hover:border-slate-300/60 transition-all cursor-pointer hover:scale-[1.02] shadow-xl flex flex-col items-center text-center relative overflow-hidden group"
            >
              <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-500/20 border border-slate-400/40 text-slate-300 text-[10px] font-black uppercase tracking-wider">
                🥈 2. Sıra
              </div>
              <div className="w-20 h-20 rounded-full bg-slate-800/80 border-2 border-slate-400 flex items-center justify-center text-4xl mb-3 shadow-lg group-hover:scale-110 transition-transform">
                {topThree[1].avatar_emoji || '👤'}
              </div>
              <h3 className="font-bold text-base text-white truncate max-w-[200px]">
                {topThree[1].full_name} {topThree[1].id === user?.id && '(Sen)'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Seviye {topThree[1].level || 1}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-400/10 border border-slate-400/20 text-slate-200 text-xs font-black font-mono">
                <Zap size={13} className="text-amber-400" /> {timeRange === 'week' ? `${topThree[1].weekly_xp || 0} Haftalık XP` : `${topThree[1].xp} XP`}
              </div>
            </div>

            {/* #1 Altın (Lider) */}
            <div
              onClick={() => handleOpenProfile(topThree[0])}
              className="order-1 md:order-2 glass rounded-3xl p-6 border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/40 via-slate-900/80 to-slate-900 transition-all cursor-pointer hover:scale-[1.03] shadow-2xl shadow-amber-500/20 flex flex-col items-center text-center relative overflow-hidden group md:-translate-y-3"
            >
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2 flex items-center gap-1">
                👑 1. Şampiyon
              </div>
              <div className="w-24 h-24 rounded-full bg-amber-900/30 border-3 border-amber-400 flex items-center justify-center text-5xl mb-3 shadow-xl shadow-amber-500/30 group-hover:scale-110 transition-transform">
                {topThree[0].avatar_emoji || '🚀'}
              </div>
              <h3 className="font-display font-black text-lg text-white truncate max-w-[220px]">
                {topThree[0].full_name} {topThree[0].id === user?.id && '(Sen)'}
              </h3>
              <p className="text-xs text-amber-400/80 font-bold mt-0.5">Seviye {topThree[0].level || 1} • Siber Usta</p>
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-black font-mono shadow-md">
                <Flame size={15} className="text-amber-400 animate-pulse" /> {timeRange === 'week' ? `${topThree[0].weekly_xp || 0} Haftalık XP` : `${topThree[0].xp} XP`}
              </div>
            </div>

            {/* #3 Bronz */}
            <div
              onClick={() => handleOpenProfile(topThree[2])}
              className="order-3 glass rounded-3xl p-5 border border-amber-700/30 bg-slate-900/60 hover:border-amber-600/60 transition-all cursor-pointer hover:scale-[1.02] shadow-xl flex flex-col items-center text-center relative overflow-hidden group"
            >
              <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-amber-700/20 border border-amber-700/40 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                🥉 3. Sıra
              </div>
              <div className="w-20 h-20 rounded-full bg-amber-950/40 border-2 border-amber-700 flex items-center justify-center text-4xl mb-3 shadow-lg group-hover:scale-110 transition-transform">
                {topThree[2].avatar_emoji || '👤'}
              </div>
              <h3 className="font-bold text-base text-white truncate max-w-[200px]">
                {topThree[2].full_name} {topThree[2].id === user?.id && '(Sen)'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Seviye {topThree[2].level || 1}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-700/10 border border-amber-700/20 text-amber-400 text-xs font-black font-mono">
                <Zap size={13} className="text-amber-400" /> {timeRange === 'week' ? `${topThree[2].weekly_xp || 0} Haftalık XP` : `${topThree[2].xp} XP`}
              </div>
            </div>
          </div>
        )}

        {/* ── Filtreler & Arama ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Parkur Filtresi */}
          <div className="flex items-center gap-2 p-1 rounded-2xl glass border border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setAreaFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-none ${
                areaFilter === 'all'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tüm Öğrenciler
            </button>
            <button
              onClick={() => setAreaFilter('awareness')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-none ${
                areaFilter === 'awareness'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛡️ Farkındalık
            </button>
            <button
              onClick={() => setAreaFilter('technical')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-none ${
                areaFilter === 'technical'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚔️ Teknik
            </button>
          </div>

          {/* İsim Arama */}
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Öğrenci ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl glass border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* ── Liderlik Tablosu Listesi ──────────────────────────────────── */}
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-16 glass rounded-3xl border border-white/10 p-8">
            <span className="text-4xl block mb-2">🔍</span>
            <h3 className="font-bold text-lg text-white">Öğrenci Bulunamadı</h3>
            <p className="text-xs text-slate-400 mt-1">Arama kriterlerine uyan bir öğrenci bulunmuyor.</p>
          </div>
        ) : (
          <div className="glass rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="divide-y divide-white/5">
              {filteredStudents.map((st, index) => {
                const isMe = st.id === user?.id;
                const isFollowing = followingIds.has(st.id);

                return (
                  <div
                    key={st.id}
                    onClick={() => handleOpenProfile(st)}
                    className={`flex items-center justify-between p-4 sm:p-5 transition-all cursor-pointer hover:bg-white/5 ${
                      isMe ? 'bg-violet-950/40 border-l-4 border-violet-500' : ''
                    }`}
                  >
                    {/* Sol: Sıralama + Avatar + İsim */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <span className={`w-7 text-center font-black text-sm sm:text-base ${
                        index === 0 ? 'text-amber-400 text-lg' :
                        index === 1 ? 'text-slate-300 text-base' :
                        index === 2 ? 'text-amber-600 text-base' : 'text-slate-500'
                      }`}>
                        #{index + 1}
                      </span>

                      <div className="w-11 h-11 rounded-2xl glass-light border border-white/10 flex items-center justify-center text-2xl shrink-0">
                        {st.avatar_emoji || '👤'}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold text-sm truncate ${isMe ? 'text-violet-300' : 'text-white'}`}>
                            {st.full_name}
                          </p>
                          {isMe && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                              Sen
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400 font-medium">
                            Lv.{st.level || 1}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-[10px] font-semibold text-slate-400">
                            {st.learning_area === 'technical' ? '💻 Teknik' : '🛡️ Farkındalık'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sağ: XP + Takip Et Butonu */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1 font-mono font-black text-sm sm:text-base text-amber-400 justify-end">
                          <Zap size={14} />
                          <span>
                            {(timeRange === 'week' ? (st.weekly_xp || 0) : st.xp).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          {timeRange === 'week' ? `Haftalık XP (Toplam: ${st.xp})` : 'Toplam XP'}
                        </p>
                      </div>

                      {!isMe && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleFollow(st, e)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isFollowing
                              ? 'bg-white/10 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30 border border-white/10'
                              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck size={13} className="text-emerald-400" />
                              <span className="hidden sm:inline">Takip Ediliyor</span>
                            </>
                          ) : (
                            <>
                              <UserPlus size={13} />
                              <span className="hidden sm:inline">Takip Et</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 👤 Öğrenci Detay Modalı (Public Profile) ────────────────────── */}
        {selectedStudent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg rounded-3xl glass border border-white/20 p-6 md:p-8 shadow-2xl bg-slate-900/95 overflow-hidden animate-scale-up max-h-[90vh] overflow-y-auto">
              {/* Arka Plan Gradyanı */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500" />
              
              {/* Kapat Butonu */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Kapat"
              >
                <X size={18} />
              </button>

              {/* Öğrenci Başlık Bilgisi */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-pink-600/20 border-2 border-violet-400/50 flex items-center justify-center text-5xl mb-3 shadow-xl shadow-violet-500/20">
                  {selectedStudent.avatar_emoji || '🚀'}
                </div>

                <h3 className="font-display font-black text-xl text-white">
                  {selectedStudent.full_name}
                </h3>

                <p className="text-xs text-violet-300 font-bold mt-1">
                  {selectedStudent.learning_area === 'technical' ? '💻 Teknik Siber Güvenlik Parkuru' : '🛡️ Siber Farkındalık Parkuru'}
                </p>

                {/* Takip Et Butonu */}
                {selectedStudent.id !== user?.id && (
                  <button
                    onClick={() => handleToggleFollow(selectedStudent)}
                    className={`mt-3 px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg ${
                      followingIds.has(selectedStudent.id)
                        ? 'bg-white/10 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10'
                        : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/30'
                    }`}
                  >
                    {followingIds.has(selectedStudent.id) ? (
                      <>
                        <UserCheck size={14} className="text-emerald-400" /> Takip Ediliyor
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} /> Takip Et
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* İstatistik Kutuları */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs text-slate-400 font-semibold">Seviye</p>
                  <p className="text-lg font-black text-white mt-0.5">Lv.{selectedStudent.level || 1}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs text-slate-400 font-semibold">Toplam XP</p>
                  <p className="text-lg font-black text-amber-400 mt-0.5 font-mono">{selectedStudent.xp || 0}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <p className="text-xs text-slate-400 font-semibold">Tamamlanan</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">
                    {loadingDetails ? '...' : `${studentDetails?.completedCount || 0} Ders`}
                  </p>
                </div>
              </div>

              {/* Başarı Rozetleri */}
              <div>
                <h4 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                  <Award size={16} className="text-violet-400" /> Kazanılan Rozetler
                </h4>

                {loadingDetails ? (
                  <div className="py-6 flex justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : studentDetails?.badges && studentDetails.badges.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {studentDetails.badges.map((b) => (
                      <div
                        key={b.key}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5"
                      >
                        <span className="text-2xl shrink-0">{b.emoji}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{b.name}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{b.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 bg-white/5 p-4 rounded-xl text-center">
                    Bu öğrenci henüz bir rozet kazanmamış.
                  </p>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
