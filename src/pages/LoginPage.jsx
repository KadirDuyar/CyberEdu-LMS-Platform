import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Shield } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Demo hesap listesi ────────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  {
    label: 'Öğrenci',
    email: 'ogrenci@demo.com',
    role: 'student',
    icon: '🚀',
    color: 'from-violet-600/30 to-pink-600/20',
    border: 'border-violet-500/40',
  },
  {
    label: 'Öğretmen',
    email: 'ogretmen@demo.com',
    role: 'teacher',
    icon: '🎓',
    color: 'from-cyan-600/30 to-blue-600/20',
    border: 'border-cyan-500/40',
  },
  {
    label: 'Admin',
    email: 'admin@demo.com',
    role: 'admin',
    icon: '⚙️',
    color: 'from-amber-600/30 to-orange-600/20',
    border: 'border-amber-500/40',
  },
];

// ─── Role yönlendirme ─────────────────────────────────────────────────────────
function getRoleRedirect(role, from) {
  if (from) return from;
  if (role === 'admin')   return '/admin';
  if (role === 'teacher') return '/teacher';
  return '/student';
}

export default function LoginPage() {
  const navigate        = useNavigate();
  const location        = useLocation();
  const { login, loading, error, role: currentRole, user, profile, needsRoleSelection } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched]           = useState({ email: false, password: false });
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  const from = location.state?.from?.pathname || null;

  // Kullanıcı zaten oturum açmışsa doğrudan paneline yönlendir
  useEffect(() => {
    if (user && profile?.role && !needsRoleSelection) {
      navigate(getRoleRedirect(profile.role, from), { replace: true });
    }
  }, [user, profile?.role, needsRoleSelection, from, navigate]);

  const handleGoogleLogin = async () => {
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`
        }
      });
      if (error) {
        setShowGoogleNotice(true);
      }
    } catch (err) {
      setShowGoogleNotice(true);
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!email || password.length < 6) return;

    const result = await login(email, password);
    if (result.success) {
      // role AuthContext'ten gelir (profile yüklendikten sonra)
      // Kısa gecikme: profile yüklensin
      setTimeout(() => {
        // currentRole henüz null olabilir — e-postadan tahmin et (demo hesaplar için)
        const prefix = email.split('@')[0].toLowerCase();
        const guessedRole = prefix === 'admin' ? 'admin' : prefix === 'ogretmen' ? 'teacher' : 'student';
        navigate(getRoleRedirect(currentRole || guessedRole, from), { replace: true });
      }, 300);
    }
  };

  const handleDemoLogin = async (account) => {
    setEmail(account.email);
    setPassword('demo123456');
    const result = await login(account.email, 'demo123456');
    if (result.success) {
      navigate(getRoleRedirect(account.role, from), { replace: true });
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-6">

        {/* Google OAuth Bilgi Modalı */}
        {showGoogleNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google İle Giriş Bilgisi</h3>
                  <p className="text-xs text-slate-400">Supabase Provider Yapılandırması</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Supabase projenizde Google ile oturum açmayı aktifleştirmek için <strong className="text-violet-400">Authentication &gt; Providers &gt; Google</strong> menüsünden Google Client ID ve Secret girilmelidir.
              </p>
              <p className="text-xs text-slate-400">
                Şu an için aşağıdaki <strong>Hızlı Demo Hesapları</strong> ile veya e-posta ve şifrenizle doğrudan giriş yapabilirsiniz.
              </p>

              <button
                onClick={() => setShowGoogleNotice(false)}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all shadow-lg"
              >
                Anladım, E-posta İle Devam Et
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 shadow-2xl shadow-violet-500/40 text-3xl mb-2 animate-float">
            🔐
          </div>
          <h1 className="font-display font-black text-3xl text-gradient">
            CyberEdu
          </h1>
          <p className="text-slate-400 text-sm">
            Siber güvenlik öğrenme yolculuğuna devam et!
          </p>
        </div>

        {/* Demo Hesaplar */}
        <div>
          <p className="text-xs text-slate-500 mb-2 text-center uppercase tracking-wider font-semibold">
            Hızlı Demo Girişi
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                onClick={() => handleDemoLogin(acc)}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-gradient-to-b ${acc.color} ${acc.border} hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50`}
              >
                <span className="text-2xl">{acc.icon}</span>
                <span className="text-xs font-bold text-white leading-tight text-center">{acc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Google ile Giriş Butonu */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={oauthLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 transition-all hover:scale-[1.01] shadow-lg disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Google ile Devam Et
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500 font-medium">veya e-posta ile giriş</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* E-posta */}
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-sm font-semibold text-slate-300">
              E-posta Adresi
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder="ornek@eposta.com"
                autoComplete="email"
                className="form-input has-icon-left"
                required
              />
            </div>
            {touched.email && !email && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle size={11} /> E-posta adresi gerekli
              </p>
            )}
          </div>

          {/* Şifre */}
          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-semibold text-slate-300">
              Şifre
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder="••••••••"
                autoComplete="current-password"
                className="form-input has-icon-left has-icon-right"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && password.length > 0 && password.length < 6 && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle size={11} /> Şifre en az 6 karakter olmalı
              </p>
            )}
          </div>

          {/* API Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Giriş yapılıyor...
              </>
            ) : (
              <>
                <LogIn size={18} />
                Giriş Yap
              </>
            )}
          </button>
        </form>

        {/* Kayıt Ol Linki */}
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-400">
            Hesabın yok mu?{' '}
            <Link
              to="/register"
              className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
            >
              Ücretsiz Kayıt Ol →
            </Link>
          </p>
          <p className="text-center text-xs text-slate-500">
            Demo şifresi:{' '}
            <span className="text-violet-400 font-bold">demo123456</span>
          </p>
        </div>

        {/* Güvenlik notu */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Shield size={14} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400">
            Veriler Supabase ile şifrelenerek saklanmaktadır.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
