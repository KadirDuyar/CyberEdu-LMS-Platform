import { useState } from 'react';
import { Shield, GraduationCap, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function RoleSelectModal({ user, onRoleSelected }) {
  const [selectedRole, setSelectedRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirmRole = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Sunucudan kullanıcının auth.users tablosunda geçerli olduğunu doğrula
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      const currentAuthUser = authData?.user || user;

      if (authErr || !currentAuthUser) {
        await supabase.auth.signOut();
        throw new Error('Oturumunuzun süresi dolmuş veya hesap bulunamadı. Lütfen tekrar giriş yapın.');
      }

      const fullName = currentAuthUser.user_metadata?.full_name || currentAuthUser.email?.split('@')[0] || 'Kullanıcı';
      const avatarEmoji = selectedRole === 'teacher' ? '🎓' : '🚀';

      const { data, error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: currentAuthUser.id,
          full_name: fullName,
          role: selectedRole,
          avatar_emoji: avatarEmoji,
          xp: 0,
          level: 1,
          onboarding_completed: selectedRole === 'teacher', // Öğretmen navigator'a girmesin
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (upsertErr) {
        throw upsertErr;
      }

      localStorage.removeItem('cyberedu_oauth_intent_role');
      if (onRoleSelected) {
        onRoleSelected(data);
      }
    } catch (err) {
      console.error('Rol kaydedilemedi:', err);
      setError('Profil kaydedilirken hata oluştu: ' + (err.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl glass border border-white/20 p-6 md:p-8 shadow-2xl bg-slate-900/95 overflow-hidden">
        {/* Dekoratif Işık */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-violet-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg shadow-violet-500/30">
            🔐
          </div>
          <h2 className="font-display font-black text-2xl text-white">
            CyberEdu'ya Hoş Geldin! 🎉
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-sm mx-auto">
            Google hesabınla ilk kez giriş yapıyorsun. Platformu hangi amaçla kullanmak istediğini seçerek başla:
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {/* Öğrenci Kartı */}
          <div
            onClick={() => setSelectedRole('student')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              selectedRole === 'student'
                ? 'bg-violet-600/20 border-violet-500 shadow-lg shadow-violet-600/20 scale-[1.02]'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-300 mb-3">
                <Shield size={20} />
              </div>
              <h4 className="font-bold text-sm text-white mb-1">Öğrenci</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Siber güvenlik derslerini tamamla, interaktif lab sorularını çöz, XP kazan ve rozetler topla.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-violet-400">
              <span>🚀 Öğrenici Parkuru</span>
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                selectedRole === 'student' ? 'border-violet-400 bg-violet-500' : 'border-slate-500'
              }`}>
                {selectedRole === 'student' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
              </span>
            </div>
          </div>

          {/* Öğretmen Kartı */}
          <div
            onClick={() => setSelectedRole('teacher')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              selectedRole === 'teacher'
                ? 'bg-cyan-600/20 border-cyan-500 shadow-lg shadow-cyan-600/20 scale-[1.02]'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 mb-3">
                <GraduationCap size={20} />
              </div>
              <h4 className="font-bold text-sm text-white mb-1">Eğitmen / Öğretmen</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Kendi kurslarını ve interaktif derslerini oluştur, YZ desteğiyle sorular üret, öğrenci başarılarını izle.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-cyan-400">
              <span>🎓 Eğitmen Paneli</span>
              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                selectedRole === 'teacher' ? 'border-cyan-400 bg-cyan-500' : 'border-slate-500'
              }`}>
                {selectedRole === 'teacher' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirmRole}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-violet-600/30 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              {selectedRole === 'student' ? 'Öğrenci Olarak Devam Et' : 'Eğitmen Olarak Devam Et'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
