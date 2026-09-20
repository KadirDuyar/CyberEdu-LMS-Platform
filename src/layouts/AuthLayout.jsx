/**
 * AuthLayout – Login / Kayıt sayfaları için animasyonlu arka planlı wrapper.
 * Siber güvenlik teması: 🔐 🛡️ 🔑 🌐 semboller
 */
export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen login-bg flex items-center justify-center p-4 overflow-hidden">

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
