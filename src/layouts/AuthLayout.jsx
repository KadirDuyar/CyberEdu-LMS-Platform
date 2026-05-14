/**
 * AuthLayout – Login / Kayıt sayfaları için animasyonlu arka planlı wrapper.
 * İçeriği ekranın tam ortasında gösterir.
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

      {/* Floating emojis */}
      <div className="absolute top-10 left-10 text-4xl animate-float opacity-40 select-none">⚡</div>
      <div className="absolute top-20 right-20 text-3xl animate-float opacity-30 select-none" style={{ animationDelay: '1s' }}>🚀</div>
      <div className="absolute bottom-20 left-20 text-4xl animate-float opacity-30 select-none" style={{ animationDelay: '0.5s' }}>🔬</div>
      <div className="absolute bottom-10 right-10 text-3xl animate-float opacity-40 select-none" style={{ animationDelay: '1.5s' }}>⭐</div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
