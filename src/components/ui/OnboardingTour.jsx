import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X, Compass, Map, Trophy, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TOUR_STEPS = [
  {
    target: '#tour-sidebar',
    icon: Map,
    color: 'from-violet-600 to-indigo-600',
    badge: '1 / 4 • Öğrenme Rotaları',
    title: '🗺️ Navigasyon & Öğrenme Menüsü',
    description: 'Sol menüden Öğrenme Yolculuğum (zorunlu sarmal müfredat), seçmeli Kurslar Kataloğu ve Başarılar odasına dilediğin an ulaşabilirsin.',
    tip: 'Menüyü daraltıp genişletmek için yanındaki ok simgesini kullanabilirsin.'
  },
  {
    target: '#tour-resume-card',
    icon: Compass,
    color: 'from-cyan-600 to-blue-600',
    badge: '2 / 4 • Ders Takibi',
    title: '🎯 Kaldığın Yerden Asla Kopma',
    description: 'Kontrol panelinin merkezindeki bu kart, üzerinde çalıştığın en son dersi daima hatırlar. "Derse Devam Et" butonuyla tek tıkla eğitime dönebilirsin.',
    tip: 'Tamamlanan her ders için otomatik XP kazanır ve liderlik tablosunda üst sıralara tırmanırsın.'
  },
  {
    target: '#tour-profile-section, #tour-profile',
    icon: Trophy,
    color: 'from-amber-600 to-orange-600',
    badge: '3 / 4 • Profil & Bildirimler',
    title: '👤 Profil, Rozetler & Bildirimler',
    description: 'Sağ üstten seviyeni ve toplam XP durumunu izleyebilir, profilini yönetebilir ve arkadaş etkileşimlerini zil simgesinden anlık takip edebilirsin.',
    tip: 'Arkadaşların bir kursu bitirdiğinde veya eğitmen geri bildirim verdiğinde buraya bildirim düşer.'
  },
  {
    target: '#tour-ai-widget',
    icon: Bot,
    color: 'from-fuchsia-600 to-pink-600',
    badge: '4 / 4 • Yapay Zeka Mentor',
    title: '🤖 7/24 Akıllı Siber Mentor YZ',
    description: 'Sağ alttaki bu butona tıklayarak dilediğin an yapay zekadan yardım alabilirsin. O an bulunduğun sayfayı ve çalıştığın dersi otomatik olarak anlayıp sana özel Sokratik ipuçları sunar.',
    tip: 'Cevabı doğrudan söylemek yerine düşünmeni sağlayacak akılcı yönlendirmeler yapar!'
  }
];

// Yardımcı: Hedef elemanın koordinatlarını anında DOM'dan ölç
const getStepTargetRect = (stepIndex) => {
  if (typeof document === 'undefined') return null;
  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;
  const selectors = step.target.split(',').map((s) => s.trim());
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom,
          right: rect.right,
        };
      }
    }
  }
  return null;
};

export default function OnboardingTour() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const spotlightRef = useRef(null);
  const tourKey = user ? `cyberedu_tour_completed_${user.id}` : 'cyberedu_tour_completed';

  // Hedef elemanın koordinatlarını senkron ve anında güncelle
  const updateRect = useCallback(() => {
    if (!isOpen) return;
    const rect = getStepTargetRect(currentStep);
    if (rect) {
      setTargetRect(rect);

      if (spotlightRef.current) {
        const step = TOUR_STEPS[currentStep];
        const isSidebar = step?.target.includes('sidebar');
        const spotTop = isSidebar ? 0 : Math.max(0, rect.top - 6);
        const spotLeft = isSidebar ? 0 : Math.max(0, rect.left - 6);
        const spotWidth = isSidebar ? rect.width : rect.width + 12;
        const spotHeight = isSidebar ? window.innerHeight : rect.height + 12;

        spotlightRef.current.style.top = `${spotTop}px`;
        spotlightRef.current.style.left = `${spotLeft}px`;
        spotlightRef.current.style.width = `${spotWidth}px`;
        spotlightRef.current.style.height = `${spotHeight}px`;
      }
    }
  }, [isOpen, currentStep]);

  // Sadece kaydırma sırasında doğrudan DOM güncelleyerek 60fps akıcılık sağla
  const updateSpotlightOnScroll = useCallback(() => {
    if (!isOpen || !spotlightRef.current) return;
    const rect = getStepTargetRect(currentStep);
    if (rect) {
      const step = TOUR_STEPS[currentStep];
      const isSidebar = step?.target.includes('sidebar');
      const spotTop = isSidebar ? 0 : Math.max(0, rect.top - 6);
      const spotLeft = isSidebar ? 0 : Math.max(0, rect.left - 6);
      const spotWidth = isSidebar ? rect.width : rect.width + 12;
      const spotHeight = isSidebar ? window.innerHeight : rect.height + 12;

      spotlightRef.current.style.top = `${spotTop}px`;
      spotlightRef.current.style.left = `${spotLeft}px`;
      spotlightRef.current.style.width = `${spotWidth}px`;
      spotlightRef.current.style.height = `${spotHeight}px`;
    }
  }, [isOpen, currentStep]);

  // Sayfa yüklendiğinde kontrol et ve turu başlatmadan önce koordinatı ölç
  useEffect(() => {
    if (!profile?.onboarding_completed) return;

    const lastSeenKey = user ? `cyberedu_tour_last_seen_${user.id}` : 'cyberedu_tour_last_seen';
    const lastSeenTime = localStorage.getItem(lastSeenKey);

    const shouldShow =
      !lastSeenTime ||
      (profile.updated_at && new Date(profile.updated_at).getTime() > new Date(lastSeenTime).getTime());

    if (shouldShow) {
      const timer = setTimeout(() => {
        // Tur açılmadan ÖNCE ilk hedef koordinatını al (Böylece ortaya gelip sola kayma yaşanmaz)
        const initialRect = getStepTargetRect(0);
        if (initialRect) {
          setTargetRect(initialRect);
        }
        setIsOpen(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [user?.id, profile?.onboarding_completed, profile?.updated_at]);

  // Manuel tur başlatma olayını dinle
  useEffect(() => {
    const handleStartTour = () => {
      setCurrentStep(0);
      const initialRect = getStepTargetRect(0);
      if (initialRect) {
        setTargetRect(initialRect);
      }
      setIsOpen(true);
    };
    window.addEventListener('start-cyberedu-tour', handleStartTour);
    return () => window.removeEventListener('start-cyberedu-tour', handleStartTour);
  }, []);

  // Adım değiştiğinde veya yeniden boyutlandırmada takip
  useEffect(() => {
    if (!isOpen) return;

    // İlk anda anında güncelle
    updateRect();

    let rafId = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateSpotlightOnScroll);
    };

    const handleResize = () => {
      updateRect();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isOpen, currentStep, updateRect, updateSpotlightOnScroll]);

  const handleComplete = () => {
    const lastSeenKey = user ? `cyberedu_tour_last_seen_${user.id}` : 'cyberedu_tour_last_seen';
    localStorage.setItem(lastSeenKey, new Date().toISOString());
    localStorage.setItem(tourKey, 'true');
    localStorage.setItem('cyberedu_tour_completed', 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const next = currentStep + 1;
      const step = TOUR_STEPS[next];
      const el = document.querySelector(step?.target);
      if (el) {
        const blockPos = step.target.includes('resume') ? 'start' : 'center';
        el.scrollIntoView({ behavior: 'smooth', block: blockPos });
      }

      // Koordinatı hemen al ve adıma geç (Bekletmeden pürüzsüz akış)
      const nextRect = getStepTargetRect(next);
      if (nextRect) {
        setTargetRect(nextRect);
      }
      setCurrentStep(next);

      // Kaydırma bitince milimetrik tekrar ayarla
      setTimeout(updateRect, 320);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      const step = TOUR_STEPS[prev];
      const el = document.querySelector(step?.target);
      if (el) {
        const blockPos = step.target.includes('resume') ? 'start' : 'center';
        el.scrollIntoView({ behavior: 'smooth', block: blockPos });
      }

      const prevRect = getStepTargetRect(prev);
      if (prevRect) {
        setTargetRect(prevRect);
      }
      setCurrentStep(prev);

      setTimeout(updateRect, 320);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  // Popover Kart Pozisyonlama Hesabı (Pürüzsüz ve asla ortaya sıçramayan hesaplama)
  const getCardStyle = () => {
    if (!targetRect || typeof window === 'undefined') {
      // Eğer hedef ölçülemediyse kartı ortada flaşlamak yerine görünmez tut
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 0,
        pointerEvents: 'none',
      };
    }

    const isMobile = window.innerWidth < 768;
    const cardWidth = isMobile ? window.innerWidth - 32 : 430;
    const cardHeight = 310;

    // Mobil yerleşim: Hedefin durumuna göre üste veya alta yerleşir
    if (isMobile) {
      const isTargetAtBottom = targetRect.bottom > window.innerHeight / 2;
      return {
        position: 'fixed',
        left: '16px',
        right: '16px',
        ...(isTargetAtBottom ? { top: '80px' } : { bottom: '24px' }),
        maxWidth: 'calc(100vw - 32px)',
        opacity: 1,
      };
    }

    // 1. Masaüstü: AI Mentor Widget
    if (step.target.includes('ai-widget')) {
      return {
        position: 'fixed',
        bottom: `${Math.max(24, window.innerHeight - targetRect.top + 20)}px`,
        right: '24px',
        width: `${cardWidth}px`,
        opacity: 1,
      };
    }

    // 2. Masaüstü: Profil & Bildirimler
    if (step.target.includes('profile') || step.target.includes('notifications')) {
      return {
        position: 'fixed',
        top: `${Math.max(80, targetRect.bottom + 16)}px`,
        right: '24px',
        width: `${cardWidth}px`,
        opacity: 1,
      };
    }

    // 3. Masaüstü: Sol Sidebar
    if (step.target.includes('sidebar')) {
      return {
        position: 'fixed',
        top: `${Math.max(80, Math.min(targetRect.top + 60, window.innerHeight - cardHeight - 40))}px`,
        left: `${Math.min(targetRect.right + 24, window.innerWidth - cardWidth - 24)}px`,
        width: `${cardWidth}px`,
        opacity: 1,
      };
    }

    // 4. Masaüstü: Devam Et Kartı
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const cardTop = spaceBelow >= cardHeight + 20
      ? targetRect.bottom + 20
      : Math.max(80, window.innerHeight - cardHeight - 24);

    return {
      position: 'fixed',
      top: `${cardTop}px`,
      left: `${Math.max(24, Math.min(targetRect.left + 30, window.innerWidth - cardWidth - 24))}px`,
      width: `${cardWidth}px`,
      opacity: 1,
    };
  };

  const isSidebar = step.target.includes('sidebar');
  
  const initialSpotTop = isSidebar ? 0 : Math.max(0, targetRect ? targetRect.top - 6 : 0);
  const initialSpotLeft = isSidebar ? 0 : Math.max(0, targetRect ? targetRect.left - 6 : 0);
  const initialSpotWidth = isSidebar ? (targetRect ? targetRect.width : 0) : (targetRect ? targetRect.width + 12 : 0);
  const initialSpotHeight = isSidebar ? (typeof window !== 'undefined' ? window.innerHeight : 800) : (targetRect ? targetRect.height + 12 : 0);

  const handleBackdropClick = (e) => {
    if (targetRect && spotlightRef.current) {
      const { clientX, clientY } = e;
      const rect = spotlightRef.current.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return;
      }
    }
    handleComplete();
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden">
      {/* Sayfa geneli dış tıklama yakalayıcı */}
      <div
        className="fixed inset-0 z-[149] pointer-events-auto"
        onClick={handleBackdropClick}
      />

      {/* 🎯 Hedef Eleman Üzerinde Parlayan Spot ve Kesim Alanı (Spotlight Cutout) */}
      {targetRect ? (
        <div
          ref={spotlightRef}
          className={`fixed pointer-events-none transition-all duration-300 ease-out z-[151] border-2 border-violet-400 ring-4 ring-violet-500/60 ${
            isSidebar ? 'rounded-r-2xl' : 'rounded-2xl'
          }`}
          style={{
            top: initialSpotTop,
            left: initialSpotLeft,
            width: initialSpotWidth,
            height: initialSpotHeight,
            // 9999px box shadow: Hedefin içi %100 şeffaf ve kristal netliktedir (0 karartma, 0 blur)!
            // Dışında kalan tüm sayfa alanı ise 0.85 derin slate ile karartılır.
            boxShadow: '0 0 0 9999px rgba(3, 7, 18, 0.85), 0 0 35px rgba(139, 92, 246, 0.7)',
          }}
        />
      ) : (
        /* Hedef koordinatı henüz hesaplanmamışsa veya yoksa genel arka plan karartması */
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[151] pointer-events-none transition-opacity duration-300"
        />
      )}

      {/* 💬 İnteraktif Bilgi Kartı (Popover) */}
      <div
        style={getCardStyle()}
        className="z-[160] pointer-events-auto rounded-3xl glass border border-white/25 p-6 shadow-2xl bg-slate-900/95 overflow-hidden backdrop-blur-xl transition-[top,left,bottom,right,opacity] duration-300 ease-out"
      >
        {/* Üst Gradyan Çizgisi */}
        <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${step.color}`} />

        {/* Turu Kapat (X) */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Turu Kapat"
        >
          <X size={18} />
        </button>

        {/* İkon & Başlık */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg shadow-violet-500/20 shrink-0`}>
            <Icon size={22} />
          </div>
          <div>
            <h3 className="font-display font-black text-lg text-white leading-snug">
              {step.title}
            </h3>
            <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider">
              {step.badge}
            </span>
          </div>
        </div>

        {/* Açıklama */}
        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-3">
          {step.description}
        </p>

        {/* İpucu */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-5 flex items-start gap-2">
          <span className="text-amber-400 text-sm shrink-0">💡</span>
          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
            {step.tip}
          </p>
        </div>

        {/* Alt Çubuk: Noktalar & Butonlar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          {/* Adım Noktaları */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-6 bg-violet-400'
                    : idx < currentStep
                      ? 'w-2 bg-violet-600/60'
                      : 'w-2 bg-white/20'
                }`}
                title={`Adım ${idx + 1}`}
              />
            ))}
          </div>

          {/* İleri / Geri Butonları */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1"
              >
                <ArrowLeft size={13} /> Geri
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-4 py-2 rounded-xl font-bold text-xs text-white transition-all shadow-lg flex items-center gap-1.5 ${
                currentStep === TOUR_STEPS.length - 1
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/30'
              }`}
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  <CheckCircle2 size={14} /> Anladım, Başla!
                </>
              ) : (
                <>
                  İleri <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
