import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, User, AlertCircle,
  Shield, GraduationCap, BookOpen, ChevronRight, CheckCircle,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Rol Seçimi Verisi ────────────────────────────────────────────────────────
const ROLES = [
  {
    value: 'student',
    label: 'Öğrenci',
    emoji: '🚀',
    desc: 'Siber güvenlik konularını öğrenmek, dersler almak ve ilerlemeni takip etmek istiyorum.',
    color: 'border-violet-500/60 bg-violet-500/10',
    activeColor: 'border-violet-400 bg-violet-500/25 shadow-[0_0_20px_rgba(124,58,237,0.3)]',
    textColor: 'text-violet-300',
  },
  {
    value: 'teacher',
    label: 'Öğretmen',
    emoji: '🎓',
    desc: 'Kurs ve ders oluşturmak, etkinlik eklemek ve öğrenci ilerlemesini takip etmek istiyorum.',
    color: 'border-cyan-500/60 bg-cyan-500/10',
    activeColor: 'border-cyan-400 bg-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
    textColor: 'text-cyan-300',
  },
];

// ─── Şifre gücü hesapla ────────────────────────────────────────────────────────
function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0–4
}

const STRENGTH_LABELS = ['', 'Zayıf', 'Orta', 'İyi', 'Güçlü'];
const STRENGTH_COLORS = ['', 'bg-rose-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'];

export default function RegisterPage() {
  const navigate               = useNavigate();
  const { register, loading, error } = useAuth();

  const [step, setStep]         = useState(1); // 1: Bilgiler, 2: Rol seçimi
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const [touched, setTouched]   = useState({});
  const [localError, setLocalError] = useState('');

  const strength = getPasswordStrength(password);

  // ── Adım 1 doğrulama ───────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!fullName.trim())           return 'Ad Soyad gereklidir.';
    if (!email.trim())              return 'E-posta adresi gereklidir.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Geçerli bir e-posta adresi girin.';
    if (password.length < 6)        return 'Şifre en az 6 karakter olmalıdır.';
    if (password !== confirm)       return 'Şifreler eşleşmiyor.';
    return null;
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirm: true });
    const err = validateStep1();
    if (err) { setLocalError(err); return; }
    setLocalError('');
    setStep(2);
  };

  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/student`
        }
      });
      if (error) {
        setShowGoogleNotice(true);
      }
    } catch (err) {
      setShowGoogleNotice(true);
    }
  };

  // ── Kayıt tamamla ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const result = await register({
      email,
      password,
      fullName: fullName.trim(),
      role: selectedRole,
    });

    if (result.success) {
      // Öğrenci → navigator'a gönder; öğretmen → teacher dashboard
      if (selectedRole === 'student') {
        navigate('/student/navigator', { replace: true });
      } else {
        navigate('/teacher', { replace: true });
      }
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
                  <h3 className="text-base font-bold text-white">Google İle Kayıt Bilgisi</h3>
                  <p className="text-xs text-slate-400">Supabase Provider Yapılandırması</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Supabase projenizde Google ile oturum açmayı aktifleştirmek için <strong className="text-violet-400">Authentication &gt; Providers &gt; Google</strong> menüsünden Google Client ID ve Secret girilmelidir.
              </p>
              <p className="text-xs text-slate-400">
                Lütfen aşağıdaki formdan e-posta adresiniz ve şifrenizle doğrudan kayıt olunuz.
              </p>

              <button
                onClick={() => setShowGoogleNotice(false)}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all shadow-lg"
              >
                Anladım, Formu Doldur
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-500 shadow-xl shadow-violet-500/40 text-2xl mb-1">
            🛡️
          </div>
          <h1 className="font-display font-black text-2xl text-gradient">
            CyberEdu'ya Katıl
          </h1>
          <p className="text-slate-400 text-sm">
            Siber güvenlik öğrenme yolculuğuna başla
          </p>
        </div>

        {/* Adım göstergesi */}
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                  step > s
                    ? 'bg-emerald-500 text-white'
                    : step === s
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/40'
                    : 'bg-white/10 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle size={14} /> : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? 'text-slate-300' : 'text-slate-600'}`}>
                {s === 1 ? 'Hesap Bilgileri' : 'Rol Seçimi'}
              </span>
              {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-emerald-500/50' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* ─── ADIM 1: Hesap Bilgileri ──────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Google ile Kayıt Butonu */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
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

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-slate-500 font-medium">veya e-posta ile</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleStep1Next} className="space-y-4" noValidate>

            {/* Ad Soyad */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">Ad Soyad</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                  placeholder="Adın ve soyadın"
                  autoComplete="name"
                  className="form-input has-icon-left"
                  required
                />
              </div>
            </div>

            {/* E-posta */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">E-posta Adresi</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
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
            </div>

            {/* Şifre */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">Şifre</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="form-input has-icon-left has-icon-right"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Şifreyi göster/gizle"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Şifre güç göstergesi */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i <= strength ? STRENGTH_COLORS[strength] : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Şifre gücü:{' '}
                    <span className={strength >= 3 ? 'text-emerald-400' : 'text-amber-400'}>
                      {STRENGTH_LABELS[strength]}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Şifre Tekrar */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">Şifre Tekrar</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`form-input has-icon-left has-icon-right ${
                    confirm && confirm !== password ? 'border-rose-500/60' : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCf((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Şifreyi göster/gizle"
                >
                  {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm && confirm !== password && (
                <p className="text-xs text-rose-400 flex items-center gap-1">
                  <AlertCircle size={11} /> Şifreler eşleşmiyor
                </p>
              )}
            </div>

            {/* Hata */}
            {localError && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {localError}
              </div>
            )}

            <button type="submit" className="btn-primary flex items-center justify-center gap-2">
              Devam Et <ChevronRight size={18} />
            </button>
          </form>
          </div>
        )}

        {/* ─── ADIM 2: Rol Seçimi ───────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300 font-medium text-center">
              Platforma hangi amaçla katılıyorsun?
            </p>

            <div className="space-y-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelectedRole(r.value)}
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 text-left ${
                    selectedRole === r.value ? r.activeColor : r.color
                  }`}
                >
                  <span className="text-3xl shrink-0 mt-0.5">{r.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-base ${selectedRole === r.value ? r.textColor : 'text-white'}`}>
                        {r.label}
                      </p>
                      {selectedRole === r.value && (
                        <CheckCircle size={16} className={r.textColor} />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* API Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 bg-white/10 border border-white/15 hover:bg-white/20 transition-all"
              >
                Geri
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-2 btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Kayıt yapılıyor...
                  </>
                ) : (
                  <>
                    {selectedRole === 'student' ? <BookOpen size={18} /> : <GraduationCap size={18} />}
                    Kayıt Ol
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Login Linki */}
        <p className="text-center text-sm text-slate-400">
          Zaten hesabın var mı?{' '}
          <Link
            to="/login"
            className="text-violet-400 font-semibold hover:text-violet-300 transition-colors"
          >
            Giriş Yap →
          </Link>
        </p>

        {/* Güvenlik notu */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Shield size={14} className="text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400">
            Bilgilerin Supabase ile şifrelenerek güvenle saklanır.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
