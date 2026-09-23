import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import {
  User, Lock, Shield, Zap, CheckCircle2,
  Calendar, Key, BookOpen, Save, Award, AlertCircle, ArrowRight, Sparkles, Trash2,
  Users, UserMinus, Trophy
} from 'lucide-react';
import { getFollowedUsersWithProfiles, unfollowUser } from '../services/socialService';

const AVATAR_OPTIONS = ['👨‍💻', '👩‍💻', '🚀', '🛡️', '🕵️‍♂️', '🔑', '⚡', '🌐', '🥷', '🧙‍♂️', '🦾', '🦅', '👑', '🤖', '👾'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, updateProfile, logout } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatar, setAvatar] = useState(profile?.avatar_emoji || '👤');
  const [learningArea, setLearningArea] = useState(profile?.learning_area || 'awareness');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Şifre değiştirme alanları
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Tamamlanan dersler & kurslar & arkadaşlar
  const [completedLessons, setCompletedLessons] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [friends, setFriends] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Hesap Silme (Danger Zone)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (deleteConfirmText.trim() !== 'HESABIMI SİL') {
      setDeleteError('Lütfen onaylamak için metin kutusuna tam olarak "HESABIMI SİL" yazın.');
      return;
    }

    if (!user) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      // 1. Güvenli veritabanı RPC fonksiyonunu çağır (Varsa SECURITY DEFINER ile tüm RLS'leri aşarak yorumlar, beğeniler, takipler, rozetler ve profil anında temizlenir)
      await supabase.rpc('delete_own_user_account');

      // 2. Client-side tam temizlik (Garanti silme adımı)
      await Promise.allSettled([
        supabase.from('course_feedbacks').delete().eq('user_id', user.id),
        supabase.from('notifications').delete().eq('user_id', user.id),
        supabase.from('notifications').delete().eq('actor_id', user.id),
        supabase.from('user_follows').delete().eq('follower_id', user.id),
        supabase.from('user_follows').delete().eq('following_id', user.id),
        supabase.from('lesson_progress').delete().eq('user_id', user.id),
        supabase.from('enrollments').delete().eq('user_id', user.id),
        supabase.from('activity_attempts').delete().eq('user_id', user.id),
        supabase.from('user_badges').delete().eq('user_id', user.id),
        supabase.from('profiles').delete().eq('id', user.id),
      ]);

      // 3. Tarayıcı önbelleğindeki kullanıcıya ait anahtarları sil
      try {
        localStorage.removeItem(`cyberedu_tour_completed_${user.id}`);
        localStorage.removeItem(`cyberedu_tour_last_seen_${user.id}`);
        localStorage.removeItem(`cyberedu_last_active_course_${user.id}`);
        localStorage.removeItem('cyberedu_tour_completed');
      } catch (locErr) {}

      // Oturumu kapat ve login sayfasına yönlendir
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Hesap silme hatası:', err);
      setDeleteError('Hesap silinirken bir hata oluştu: ' + (err.message || 'Lütfen tekrar deneyin.'));
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatar(profile.avatar_emoji || '👤');
      setLearningArea(profile.learning_area || 'awareness');
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  async function loadUserStats() {
    setStatsLoading(true);
    try {
      // 1. Öğrencinin tamamladığı dersler (yalnızca bu kullanıcıya ait)
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select(`
          lesson_id,
          completed_at,
          lessons (
            id,
            title,
            xp_reward,
            courses (
              id,
              title,
              category
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (progressData) {
        setCompletedLessons(progressData.filter(p => p.lessons));
      }

      // 2. Kayıtlı olunan kurslar
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          enrolled_at,
          courses (
            id,
            title,
            thumbnail_emoji,
            category,
            lessons (id, is_published)
          )
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      if (enrollData) {
        setEnrolledCourses(enrollData.filter(e => e.courses));
      }

      // 3. Takip edilen arkadaşlar
      try {
        const friendList = await getFollowedUsersWithProfiles(user.id);
        setFriends(friendList);
      } catch (fErr) {
        console.warn('Arkadaşlar yüklenemedi:', fErr);
      }
    } catch (err) {
      console.error('Profil verisi yükleme hatası:', err);
    } finally {
      setStatsLoading(false);
    }
  }

  const handleUnfollowFriend = async (friendId) => {
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
    await unfollowUser(user.id, friendId);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);

    const { error } = await updateProfile({
      full_name: fullName.trim(),
      avatar_emoji: avatar,
      learning_area: learningArea
    });

    setProfileSaving(false);
    if (error) {
      setProfileMsg({ type: 'error', text: 'Profil güncellenirken bir hata oluştu: ' + error.message });
    } else {
      setProfileMsg({ type: 'success', text: 'Profil bilgilerin başarıyla güncellendi!' });
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Yeni şifreniz en az 6 karakter olmalıdır.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Girdiğiniz yeni şifreler birbiriyle eşleşmiyor.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordMsg({ type: 'error', text: 'Şifre güncellenemedi: ' + error.message });
      } else {
        setPasswordMsg({ type: 'success', text: 'Şifreniz başarıyla değiştirildi!' });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMsg(null), 4000);
      }
    } catch (err) {
      setPasswordMsg({ type: 'error', text: 'Beklenmeyen bir hata oluştu.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">

        {/* Profil Başlık Kartı */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/80 via-slate-900 to-indigo-950/80 border border-violet-500/30 p-6 md:p-8 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-3xl bg-violet-600/30 border-2 border-violet-400 flex items-center justify-center text-5xl shadow-xl shrink-0">
              {avatar}
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="text-xs font-black uppercase px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {profile?.role === 'teacher' ? '👨‍🏫 Eğitmen' : profile?.role === 'admin' ? '⚡ Yönetici' : '🎓 Öğrenci'}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <Zap size={14} /> Seviye {profile?.level || 1} • {profile?.xp || 0} XP
                </span>
              </div>
              <h1 className="font-display font-black text-2xl md:text-3xl text-white">
                {profile?.full_name || 'Kullanıcı'}
              </h1>
              <p className="text-slate-400 text-sm mt-1">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Genel Bilgileri Düzenleme */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <User size={20} className="text-violet-400" /> Profil Bilgilerini Güncelle
            </h3>

            {profileMsg && (
              <div className={`p-3.5 rounded-xl text-xs font-medium mb-4 flex items-center gap-2 ${
                profileMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Avatar Emojisi</label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-900/60 rounded-xl border border-white/10">
                  {AVATAR_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setAvatar(em)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-transform ${
                        avatar === em ? 'bg-violet-600 ring-2 ring-violet-400 scale-110' : 'hover:bg-white/10'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                {profile?.role === 'student' && (
                  <button
                    type="button"
                    onClick={() => navigate('/student/achievements')}
                    className="mt-2 text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={13} className="text-amber-400" />
                    Karakter Koleksiyonu & Başarılar Odası <ArrowRight size={12} />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Ad Soyad</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">E-posta Adresi</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/5 text-slate-400 text-sm cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">E-posta hesabı değiştirilemez.</span>
              </div>

              {profile?.role === 'student' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Öğrenme Parkuru</label>
                  <select
                    value={learningArea}
                    onChange={(e) => setLearningArea(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white focus:outline-none focus:border-violet-500 text-sm"
                  >
                    <option value="awareness">🛡️ Siber Farkındalık Parkuru</option>
                    <option value="technical">💻 Teknik Siber Güvenlik Parkuru</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full mt-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {profileSaving ? <LoadingSpinner size="sm" /> : <Save size={16} />} Değişiklikleri Kaydet
              </button>
            </form>
          </Card>

          {/* Şifre Değiştirme */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Lock size={20} className="text-cyan-400" /> Şifre Değiştir
              </h3>

              {passwordMsg && (
                <div className={`p-3.5 rounded-xl text-xs font-medium mb-4 flex items-center gap-2 ${
                  passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}>
                  {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {passwordMsg.text}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Yeni Şifre</label>
                  <input
                    type="password"
                    placeholder="En az 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Yeni Şifre Tekrar</label>
                  <input
                    type="password"
                    placeholder="Şifreyi tekrar yazın"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {passwordLoading ? <LoadingSpinner size="sm" /> : <Key size={16} />} Şifreyi Güncelle
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-xs text-slate-400">
              <p>Hesap Oluşturulma: <span className="text-white font-semibold">{user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}</span></p>
            </div>
          </Card>
        </div>

        {/* Öğrenci Geçmişi: Tamamlanan Dersler */}
        {profile?.role === 'student' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Award size={20} className="text-amber-400" /> Tamamlanan Dersler ({completedLessons.length})
              </h3>
            </div>

            {statsLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            ) : completedLessons.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-slate-400 text-sm">Henüz tamamlanan bir dersiniz bulunmuyor.</p>
                <p className="text-slate-500 text-xs mt-1">Öğrenme yolculuğuna başlayarak ilk başarına imza at!</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {completedLessons.map((item, idx) => (
                  <div
                    key={item.lesson_id || idx}
                    className="p-3.5 rounded-xl glass border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{item.lessons?.title}</h4>
                        <span className="text-xs text-slate-400">
                          {item.lessons?.courses?.title || 'Siber Güvenlik'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <span className="text-xs font-black text-amber-400">+{item.lessons?.xp_reward || 100} XP</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar size={12} /> {item.completed_at ? new Date(item.completed_at).toLocaleDateString('tr-TR') : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}


        {/* Öğrenci Takip Ettiği Arkadaşlarım */}
        {profile?.role === 'student' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users size={20} className="text-violet-400" /> Takip Ettiğim Arkadaşlarım ({friends.length})
              </h3>
              <button
                type="button"
                onClick={() => navigate('/student/leaderboard')}
                className="text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
              >
                Yeni Arkadaşlar Keşfet <ArrowRight size={13} />
              </button>
            </div>

            {statsLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner /></div>
            ) : friends.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                <span className="text-3xl mb-2 block">🤝</span>
                <p className="text-slate-300 font-semibold text-sm">Henüz kimseyi takip etmiyorsun.</p>
                <p className="text-slate-500 text-xs mt-1 mb-4">Liderlik tablosundaki diğer siber güvenlik öğrencilerini takip ederek yarışabilirsin!</p>
                <button
                  type="button"
                  onClick={() => navigate('/student/leaderboard')}
                  className="px-4 py-2 rounded-xl bg-violet-600/30 hover:bg-violet-600 border border-violet-500/40 text-violet-200 text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <Trophy size={14} className="text-amber-400" /> Liderlik Tablosuna Git
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-3.5 rounded-2xl glass border border-white/10 bg-slate-900/60 flex items-center justify-between gap-3 hover:border-violet-500/40 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0 p-1.5 rounded-xl bg-white/5 border border-white/10">
                        {friend.avatar_emoji || '🚀'}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">
                          {friend.full_name || 'Öğrenci'}
                        </h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-bold text-amber-400">Lv.{friend.level || 1}</span>
                          <span>•</span>
                          <span className="text-violet-300 font-semibold">{friend.xp || 0} XP</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnfollowFriend(friend.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/20 transition-all shrink-0"
                      title="Takipten Çık"
                    >
                      <UserMinus size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tehlikeli Bölge: Hesabı Sil */}
        <Card className="p-6 border-rose-500/20 bg-rose-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Trash2 size={18} /> Tehlikeli Bölge: Hesabı Sil
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                Hesabınızı sildiğinizde kazandığınız tüm XP'ler, seviyeniz, rozetleriniz ve tamamladığınız ders kayıtları kalıcı olarak kaldırılır. Bu işlem geri alınamaz.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteConfirmText('');
                setDeleteError('');
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Hesabımı Sil
            </button>
          </div>
        </Card>

        {/* Hesap Silme Onay Modalı */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-md rounded-3xl glass border border-rose-500/30 p-6 md:p-8 shadow-2xl bg-slate-900/95 space-y-5 animate-scale-up">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 size={24} />
              </div>

              <div className="text-center">
                <h3 className="font-display font-black text-xl text-white">Hesabınızı Silmek İstiyor Musunuz?</h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Tüm ilerlemeniz, rozetleriniz ve kayıtlarınız tamamen silinecektir. Onaylamak için lütfen aşağıdaki kutuya büyük harflerle <strong className="text-rose-400">HESABIMI SİL</strong> yazın:
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs text-center font-medium">
                  {deleteError}
                </div>
              )}

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='HESABIMI SİL'
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-rose-500/40 text-white placeholder-slate-600 text-center font-mono font-bold text-sm tracking-wider focus:outline-none focus:border-rose-400"
                  autoFocus
                />

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    disabled={deleteLoading}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs transition-colors"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={deleteLoading || deleteConfirmText.trim() !== 'HESABIMI SİL'}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleteLoading ? <LoadingSpinner size="sm" /> : <><Trash2 size={14} /> Evet, Sil</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
