import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, Mail, Lock, User, GraduationCap, Settings } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError('Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
    } else {
      // AuthContext içindeki onAuthStateChange yönlendirmeyi halledecek
    }
  };

  const demoLogin = (role) => {
    setEmail(`${role}@demo.com`);
    setPassword('demo123456');
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      {/* Decorative floating elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center z-10 relative">
        
        {/* Left Side: Branding / Modern Illustration Area */}
        <div className="hidden md:flex flex-col justify-center items-start space-y-6 pl-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30 text-white">
            <ShieldCheck size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-tight font-display">
            Siber Güvenliği <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">Oynayarak Öğren.</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">
            Yeni nesil interaktif senaryolar, gerçekçi tehdit simülasyonları ve oyunlaştırılmış içeriklerle siber dünyada güvende kalmayı keşfet.
          </p>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
            <div className="glass-light dark:glass p-4 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400"><User size={20}/></div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Kişiselleştirilmiş Yolculuk</div>
            </div>
            <div className="glass-light dark:glass p-4 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400"><GraduationCap size={20}/></div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Pratik Senaryolar</div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="glass-light dark:glass p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white font-display">Hoş Geldin!</h2>
            <p className="text-slate-500 mt-2 text-sm">Öğrenme yolculuğuna devam etmek için giriş yap.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <div className="mb-8 p-4 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/5 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center mb-2">Hızlı Demo Girişi</span>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={() => demoLogin('student')} className="py-2 flex flex-col items-center justify-center gap-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-violet-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                <span className="text-lg">🚀</span> Öğrenci
              </button>
              <button type="button" onClick={() => demoLogin('teacher')} className="py-2 flex flex-col items-center justify-center gap-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-violet-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                <span className="text-lg">🎓</span> Öğretmen
              </button>
              <button type="button" onClick={() => demoLogin('admin')} className="py-2 flex flex-col items-center justify-center gap-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-violet-500 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors">
                <span className="text-lg">⚙️</span> Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-1">E-posta Adresi</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@demo.com"
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-1">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-base shadow-lg shadow-violet-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 flex justify-center items-center"
            >
              {loading ? <LoadingSpinner size="sm" /> : <><LogIn size={18} className="mr-2" /> Giriş Yap</>}
            </button>
          </form>

          <p className="text-center mt-6 text-xs text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck size={14} /> Tüm veriler uçtan uca şifrelenmektedir.
          </p>
        </div>
      </div>
    </div>
  );
}
