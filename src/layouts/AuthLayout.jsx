import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * AuthLayout – Login / Kayıt sayfaları için animasyonlu arka planlı wrapper.
 * Siber güvenlik teması: 🔐 🛡️ 🔑 🌐 semboller
 */
export default function AuthLayout({ children }) {
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('cyberedu_theme') === 'light';
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      document.body.classList.add('light-mode');
      localStorage.setItem('cyberedu_theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light-mode');
      localStorage.setItem('cyberedu_theme', 'dark');
    }
  }, [isLightMode]);

  return (
    <div className="relative min-h-screen login-bg flex items-center justify-center p-4 overflow-hidden">
      {/* Sağ Üst Tema Butonu */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setIsLightMode(!isLightMode)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all shadow-md cursor-pointer select-none"
          title={isLightMode ? 'Koyu Temaya Geç' : 'Açık Temaya Geç'}
        >
          {isLightMode ? (
            <>
              <span className="text-slate-800 font-bold">Açık Tema</span>
              <Sun size={15} className="text-amber-500 shrink-0" />
            </>
          ) : (
            <>
              <span className="text-slate-200 font-bold">Koyu Tema</span>
              <Moon size={15} className="text-cyan-300 shrink-0" />
            </>
          )}
        </button>
      </div>

      {/* Dekoratif floating orbs */}
      <div
        className="orb w-80 h-80 bg-violet-600"
        style={{ top: '-10%', left: '-5%', animationDelay: '0s' }}
      />
      <div
        className="orb w-64 h-64 bg-pink-600"
        style={{ bottom: '-8%', right: '-5%', animationDelay: '2s' }}
      />
      <div
        className="orb w-48 h-48 bg-cyan-500"
        style={{ top: '40%', right: '15%', animationDelay: '1s' }}
      />

      {/* Siber güvenlik floating emojileri */}
      <div className="absolute top-10 left-10 text-4xl animate-float opacity-30 select-none">🔐</div>
      <div className="absolute top-20 right-20 text-3xl animate-float opacity-25 select-none" style={{ animationDelay: '1s' }}>🛡️</div>
      <div className="absolute bottom-20 left-20 text-4xl animate-float opacity-25 select-none" style={{ animationDelay: '0.5s' }}>🔑</div>
      <div className="absolute bottom-10 right-10 text-3xl animate-float opacity-30 select-none" style={{ animationDelay: '1.5s' }}>🌐</div>
      <div className="absolute top-1/2 left-8 text-2xl animate-float opacity-20 select-none" style={{ animationDelay: '2.5s' }}>⚔️</div>
      <div className="absolute top-1/3 right-8 text-2xl animate-float opacity-20 select-none" style={{ animationDelay: '0.8s' }}>🔍</div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        <div className="glass rounded-3xl p-8 border border-white/10 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
