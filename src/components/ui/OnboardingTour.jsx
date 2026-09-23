import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X, Compass, Map, Trophy, Bot } from 'lucide-react';

const TOUR_STEPS = [
  {
    icon: Sparkles,
    color: 'from-violet-600 to-pink-600',
    badge: '1 / 5 • Hoş Geldin',
    title: 'CyberEdu Siber Güvenlik LMS\'e Hoş Geldin! 🚀',
    description: 'Burası hem teorik kavramları hem de uygulamalı laboratuvarları interaktif olarak deneyimleyeceğin yeni nesil siber güvenlik öğrenme platformun.',
    tip: 'Platformda ilerledikçe XP kazanacak, unvanlar alacak ve 13 farklı siber kahraman rozetinin kilidini açacaksın.'
  },
  {
    icon: Compass,
    color: 'from-cyan-600 to-blue-600',
    badge: '2 / 5 • Ders Takibi',
    title: 'Kaldığın Yerden Asla Kopma 🎯',
    description: 'Kontrol panelinin en üstünde son çalıştığın ders daima seni bekler. Tek tıkla kaldığın yerden eğitime devam edebilir, ilerleme çubuğundan tamamlanma yüzdeni görebilirsin.',
    tip: 'Eğer yeni başladıysan "🎯 İlk Kursun Hazır!" kartı senin seviyene en uygun başlangıç dersini önerir.'
  },
  {
    icon: Map,
    color: 'from-emerald-600 to-teal-600',
    badge: '3 / 5 • Öğrenme Yolculuğu',
    title: 'Zorunlu Müfredat ve Seçmeli Kurslar 🗺️',
    description: 'Sol menüdeki "Öğrenme Yolculuğum" sekmesi, alanına özel (Farkındalık veya Teknik) zorunlu dersleri adım adım ve kilitli bir sarmal yapıyla sunar. "Kurslar" menüsünden ise dilediğin seçmeli kursa kilit olmadan kaydolabilirsin.',
    tip: 'Kurs sayfalarının altında eğitmenimize Like/Dislike ve açık ya da anonim yorum bırakabilirsin.'
  },
  {
    icon: Trophy,
    color: 'from-amber-600 to-orange-600',
    badge: '4 / 5 • Sosyal Etkileşim & Liderlik',
    title: 'Arkadaşlarını Takip Et & Bildirim Al 🤝',
    description: 'Liderlik tablosundaki diğer öğrencileri "Takip Et" butonuyla izlemeye alabilirsin. Takip ettiğin arkadaşların bir kursu bitirdiğinde sağ üstteki zil menüsüne anında tebrik bildirimi düşer!',
    tip: 'Profilinden başarı rozetlerini inceleyebilir, istersen hesabını dilediğin zaman silebilirsin.'
  },
  {
    icon: Bot,
    color: 'from-fuchsia-600 to-violet-600',
    badge: '5 / 5 • Akıllı AI Mentor',
    title: 'Sayfayı Bilen Bağlamsal Yapay Zeka 🤖',
    description: 'Sağ altta yer alan AI Asistan, sadece genel sohbet etmekle kalmaz; o an hangi derste, hangi sayfada ve hangi soruda olduğunu bilerek sana özel Sokratik ipuçları üretir.',
    tip: 'Cevabı doğrudan vermez, seni doğru düşünceye ve çözüme yönlendirir!'
  }
];

export default function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Daha önce gösterildi mi kontrol et
    const seen = localStorage.getItem('cyberedu_tour_completed');
    if (!seen) {
      // Sayfa açıldıktan 700ms sonra yumuşakça açılsın
      const timer = setTimeout(() => setIsOpen(true), 700);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('cyberedu_tour_completed', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((c) => c + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((c) => c - 1);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl glass border border-white/20 p-6 md:p-8 shadow-2xl bg-slate-900/95 overflow-hidden animate-scale-up">
        {/* Üst Gradyan Efekti */}
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${step.color}`} />

        {/* Kapat / Atla */}
        <button
          onClick={handleComplete}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Turu Atla"
        >
          <X size={18} />
        </button>

        {/* İkon & Rozet */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg shadow-violet-500/20 shrink-0`}>
            <Icon size={24} />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-violet-300 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20">
              {step.badge}
            </span>
          </div>
        </div>

        {/* Başlık & Açıklama */}
        <h3 className="font-display font-black text-xl md:text-2xl text-white mb-2 leading-snug">
          {step.title}
        </h3>

        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          {step.description}
        </p>

        {/* İpucu Kutusu */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 mb-6 flex items-start gap-2.5">
          <span className="text-amber-400 text-base shrink-0 mt-0.5">💡</span>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {step.tip}
          </p>
        </div>

        {/* Adım Göstergesi (Dots) & Aksiyon Butonları */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-violet-400'
                    : idx < currentStep
                      ? 'w-2 bg-violet-600/60'
                      : 'w-2 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Geri
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-lg flex items-center gap-1.5 ${
                currentStep === TOUR_STEPS.length - 1
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/30'
              }`}
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  <CheckCircle2 size={15} /> Harika, Başlayalım!
                </>
              ) : (
                <>
                  Sonraki <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
