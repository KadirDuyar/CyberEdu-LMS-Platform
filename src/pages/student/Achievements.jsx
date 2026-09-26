import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import Card from '../../components/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Trophy, Award, CheckCircle2, Lock, Sparkles, ArrowRight,
  Shield, Zap, Star, UserCheck, Flame
} from 'lucide-react';
import { CHARACTERS, BADGES, getCharacterUnlockStatus } from '../../data/achievementsData';

export default function Achievements() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('characters'); // 'characters' | 'badges' | 'titles'
  const [completedLessons, setCompletedLessons] = useState([]);
  const [completedCourseTitles, setCompletedCourseTitles] = useState([]);
  const [equippingId, setEquippingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadAchievementsData() {
      if (!user) return;
      setLoading(true);
      try {
        // 1. Tamamlanan dersleri çek
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, status')
          .eq('user_id', user.id)
          .eq('status', 'completed');

        const doneIds = new Set((progressData || []).map((p) => p.lesson_id));
        setCompletedLessons(progressData || []);

        // 2. Tüm yayınlanmış kursları ve derslerini çekerek tamamlanan kursları belirle
        const { data: allCourses } = await supabase
          .from('courses')
          .select('id, title, lessons(id, is_published)')
          .eq('is_published', true);

        const finishedTitles = [];
        (allCourses || []).forEach((c) => {
          const pubLessons = (c.lessons || []).filter((l) => l.is_published);
          if (pubLessons.length > 0 && pubLessons.every((l) => doneIds.has(l.id))) {
            finishedTitles.push(c.title);
          }
        });

        setCompletedCourseTitles(finishedTitles);
      } catch (err) {
        console.error('Başarılar yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAchievementsData();
  }, [user]);

  // Karakteri kuşan (Profile kaydet)
  const handleEquipCharacter = async (char) => {
    if (profile?.avatar_emoji === char.emoji) return;
    setEquippingId(char.id);
    const { error } = await updateProfile({ avatar_emoji: char.emoji });
    setEquippingId(null);

    if (error) {
      showToast('Karakter kuşanılırken hata oluştu: ' + error.message, 'error');
    } else {
      showToast(`🎉 "${char.name}" (${char.emoji}) başarıyla aktif karakterin olarak ayarlandı!`);
    }
  };

  // İstatistik hesaplamaları
  const stats = {
    completedCourseTitles,
    completedCoursesCount: completedCourseTitles.length,
    completedLessonsCount: completedLessons.length,
    xp: profile?.xp || 0,
  };

  const unlockedCharactersCount = CHARACTERS.filter(
    (c) => getCharacterUnlockStatus(c, stats).isUnlocked
  ).length;

  const unlockedBadgesCount = BADGES.filter((b) => b.check(stats)).length;

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner fullPage message="Başarıların ve karakterlerin hazırlanıyor..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-16">

        {/* ── Üst Başlık & Özet Kartı ────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-100 via-purple-50 to-white dark:from-violet-950/80 dark:via-purple-950/60 dark:to-slate-900 border border-violet-200 dark:border-violet-500/30 p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 px-3.5 py-1 rounded-full inline-flex items-center gap-1.5">
                <Trophy size={14} className="text-amber-500 dark:text-amber-400" /> Şampiyonlar Odası
              </span>
              <h1 className="font-display font-black text-2xl md:text-3xl text-slate-900 dark:text-white">
                Başarılarım & <span className="text-gradient">Karakter Koleksiyonum</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-sm max-w-xl leading-relaxed">
                Kursları ve dersleri tamamladıkça yeni karakterlerin kilitlerini aç, başarı rozetleri kazan ve siber güvenlik kimliğini özelleştir!
              </p>
            </div>

            {/* Aktif Kuşanılan Karakter Kartı */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-4 shrink-0 shadow-xl backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-pink-600/10 dark:from-violet-600/40 dark:to-pink-600/20 border border-violet-300 dark:border-violet-400/40 flex items-center justify-center text-4xl shadow-inner animate-bounce-subtle">
                {profile?.avatar_emoji || '🚀'}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded-full inline-block">
                  Kuşanılan Karakter
                </span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {profile?.full_name || 'Öğrenci'}
                </h4>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-black">+{profile?.xp || 0} XP</p>
              </div>
            </div>

          </div>
        </div>

        {/* ── İstatistik Metrikleri ────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card hover className="border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Kazanılan Rozetler</p>
                <p className="text-xl font-black text-amber-400">{unlockedBadgesCount} / {BADGES.length}</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Açılan Karakterler</p>
                <p className="text-xl font-black text-violet-400">{unlockedCharactersCount} / {CHARACTERS.length}</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Bitirilen Kurslar</p>
                <p className="text-xl font-black text-cyan-400">{stats.completedCoursesCount} Kurs</p>
              </div>
            </div>
          </Card>

          <Card hover className="border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Flame size={22} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold">Tamamlanan Ders</p>
                <p className="text-xl font-black text-emerald-400">{stats.completedLessonsCount} Ders</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Sekmeler: Madalyalar, Rozetler, Unvanlar ────────────── */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('characters')}
            className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'characters'
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-600/30'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Award size={16} /> Kurs Madalyaları ({unlockedCharactersCount}/{CHARACTERS.length})
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'badges'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-white/5 hover:bg-white/10 text-amber-300/90'
            }`}
          >
            <Trophy size={16} /> Başarı Rozetleri ({unlockedBadgesCount}/{BADGES.length})
          </button>

          <button
            onClick={() => setActiveTab('titles')}
            className={`px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'titles'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'bg-white/5 hover:bg-white/10 text-cyan-300/90'
            }`}
          >
            <Star size={16} /> Siber Unvanlar
          </button>
        </div>

        {/* ── 1. KURS MADALYALARI ────────────────────────────── */}
        {activeTab === 'characters' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-white">Kurs Tamamlama Madalyaları</h3>
                <p className="text-xs text-slate-400">Kursları tamamladıkça siber güvenlik koleksiyonuna yeni madalyalar eklersin.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {CHARACTERS.map((char) => {
                const { isUnlocked } = getCharacterUnlockStatus(char, stats);

                return (
                  <div
                    key={char.id}
                    className={`rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                      isUnlocked
                        ? 'border-violet-500/30 bg-slate-900/60 hover:border-violet-400 hover:bg-slate-800/60 shadow-lg'
                        : 'border-white/5 bg-slate-900/30 opacity-60'
                    }`}
                  >
                    <div>
                      {/* Üst Kısım: Emoji + Durum Rozeti */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl border ${
                          isUnlocked
                            ? 'bg-gradient-to-br from-violet-500/20 to-pink-500/10 border-violet-500/30 shadow-md'
                            : 'bg-slate-800/50 border-white/5 grayscale'
                        }`}>
                          {char.emoji}
                        </div>

                        {isUnlocked ? (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40">
                            Açıldı
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/10 flex items-center gap-1">
                            <Lock size={11} /> Kilitli
                          </span>
                        )}
                      </div>

                      {/* Madalya Bilgileri */}
                      <h4 className="font-display font-bold text-base text-white">{char.name}</h4>
                      <p className="text-xs font-bold text-violet-400 mb-1">{char.title}</p>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">{char.description}</p>
                    </div>

                    {/* Alt Kısım: Açılma Şartı */}
                    <div className="pt-3 border-t border-white/10">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="text-amber-400">🎯</span>
                        <span>{char.condition}</span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 2. BAŞARI ROZETLERİ ────────────────────────────── */}
        {activeTab === 'badges' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg text-white">Başarı Rozetleri</h3>
              <p className="text-xs text-slate-400">Eğitimlerdeki kilometre taşlarına ulaşarak kazandığın rozetler.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {BADGES.map((badge) => {
                const isEarned = badge.check(stats);

                return (
                  <div
                    key={badge.id}
                    className={`rounded-2xl border p-5 transition-all duration-200 ${
                      isEarned
                        ? 'border-amber-500/40 bg-amber-950/15 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                        : 'border-white/5 bg-slate-900/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shrink-0 ${
                        isEarned
                          ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/40 shadow-md'
                          : 'bg-slate-800/40 border-white/5 grayscale'
                      }`}>
                        {badge.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="font-bold text-sm text-white truncate">{badge.name}</h4>
                          {isEarned ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                              Kazanıldı ✅
                            </span>
                          ) : (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10 shrink-0">
                              Kilitli 🔒
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-2">{badge.description}</p>
                        <p className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                          <span>🎯 Hedef:</span> {badge.condition}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. SİBER UNVANLAR ────────────────────────────── */}
        {activeTab === 'titles' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg text-white">Kazanılan Siber Unvanlar</h3>
              <p className="text-xs text-slate-400">Tamamladığın her uzmanlık konusu sana saygın bir unvan kazandırır.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHARACTERS.map((char) => {
                const { isUnlocked } = getCharacterUnlockStatus(char, stats);

                return (
                  <div
                    key={char.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      isUnlocked
                        ? 'border-cyan-500/30 bg-cyan-950/15 shadow-md'
                        : 'border-white/5 bg-slate-900/30 opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="text-3xl">{char.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-white">{char.title}</h4>
                          {isUnlocked && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Kazanıldı
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{char.name} • {char.condition}</p>
                      </div>
                    </div>

                    {isUnlocked ? (
                      <span className="text-xs font-bold text-cyan-400 shrink-0">Aktif Edilebilir</span>
                    ) : (
                      <Lock size={16} className="text-slate-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toast Bildirimi */}
        {toast && (
          <div className="fixed top-20 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl transition-all duration-300 animate-slide-up bg-slate-900/95 border-emerald-500/50 text-emerald-300 text-sm font-medium">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
