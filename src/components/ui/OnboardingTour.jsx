import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, CheckCircle2, X, Compass, Map, Trophy, Bot } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

// ─── Kusursuz ve Mantıksal Sıralı Tur Adımları (1'den 5'e) ───────────────────
const TOUR_STEPS = [
  {
    target: '#tour-resume-card',
    icon: Sparkles,
    color: 'from-violet-600 to-indigo-600',
    badge: '1 / 5 • Hoş Geldin & Ders Takibi',
    title: '🚀 CyberEdu\'ya Hoş Geldin!',
    description: 'Kontrol panelinin merkezindeki bu alan, senin ana çalışma merkezindir. Seviyene uygun başlangıç dersi veya üzerinde çalıştığın en son ders daima burada seni bekler.',
    tip: 'Tamamlanan her ders için otomatik XP kazanır ve liderlik sıralamasında tırmanırsın.'
  },
  {
    target: '#tour-sidebar',
    icon: Map,
    color: 'from-cyan-600 to-blue-600',
    badge: '2 / 5 • Öğrenme Rotaları & Menü',
    title: '🗺️ Navigasyon & Öğrenme Menüsü',
    description: 'Sol menüden zorunlu sarmal müfredata (Öğrenme Yolculuğum), seçmeli Kurslar Kataloğuna ve Başarılar odasına dilediğin an kolayca ulaşabilirsin.',
    tip: 'Menüyü daraltıp genişletmek için kenarındaki ok simgesini kullanabilirsin.'
  },
  {
    target: '#tour-leaderboard',
    icon: Trophy,
    color: 'from-amber-600 to-orange-600',
    badge: '3 / 5 • Canlı Liderlik & Rekabet',
    title: '🏆 Canlı Liderlik & Sosyal Rekabet',
    description: 'Burada haftalık sıralamada en çok puan toplayan öğrencileri görebilir, profillerine tıklayarak arkadaşlarını takip edebilirsin.',
    tip: 'Takip ettiğin bir arkadaşın kurs bitirdiğinde sağ üstteki zil simgesine anında tebrik bildirimi düşer!'
  },
  {
    target: '#tour-profile-section, #tour-profile',
    icon: Compass,
    color: 'from-emerald-600 to-teal-600',
    badge: '4 / 5 • Profil, Seviye & Bildirimler',
    title: '👤 Profilin, Rozetlerin & Bildirimler',
    description: 'Sağ üst alandan anlık seviyeni ve XP durumunu izleyebilir, temayı açık/koyu olarak değiştirebilir ve gelen bildirimleri anlık takip edebilirsin.',
    tip: '13 farklı siber kahraman rozetinin kilidini açmak için dersleri tamamlamaya devam et!'
  },
  {
    target: '#tour-ai-widget',
    icon: Bot,
    color: 'from-fuchsia-600 to-pink-600',
    badge: '5 / 5 • 7/24 Akıllı Siber Mentor YZ',
    title: '🤖 7/24 Akıllı Siber Mentor YZ',
    description: 'Sağ alttaki butona tıklayarak takıldığın her an yapay zekadan yardım alabilirsin. O an bulunduğun sayfayı ve çalıştığın dersi otomatik olarak anlayıp sana özel Sokratik ipuçları üretir.',
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
  const { user, profile, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const spotlightRef = useRef(null);
  const tourKey = user ? `cyberedu_tour_completed_${user.id}` : 'cyberedu_tour_completed';

  // Belirli bir adımın hedefini hesapla ve spotlight ref'ini doğrudan güncelle
  const updateStepTarget = useCallback((stepIdx) => {
    const step = TOUR_STEPS[stepIdx];
    if (!step) return;

    const rect = getStepTargetRect(stepIdx);
    if (rect) {
      setTargetRect(rect);

      if (spotlightRef.current) {
        const isSidebar = step.target.includes('sidebar');
        const spotTop = isSidebar ? 0 : Math.max(0, rect.top - 6);
        const spotLeft = isSidebar ? 0 : Math.max(0, rect.left - 6);
        const spotWidth = isSidebar ? rect.width : rect.width + 12;
        const spotHeight = isSidebar ? window.innerHeight : rect.height + 12;

        spotlightRef.current.style.top = `${spotTop}px`;
        spotlightRef.current.style.left = `${spotLeft}px`;
        spotlightRef.current.style.width = `${spotWidth}px`;
        spotlightRef.current.style.height = `${spotHeight}px`;
      }
    } else {
      setTargetRect(null);
    }
  }, []);

  // Merkezi Adım Değiştirme Fonksiyonu (Stale closure hatasını ve sıralama kaymasını önler)
  const goToStep = useCallback((targetIndex) => {
    if (targetIndex < 0 || targetIndex >= TOUR_STEPS.length) return;

    setCurrentStep(targetIndex);

    const step = TOUR_STEPS[targetIndex];
    const el = document.querySelector(step?.target);

    // Sabit öğeler (sidebar, header, ai-widget) haricindekileri görünüme kaydır
    if (el) {
      const isFixed = step.target.includes('sidebar') || step.target.includes('profile') || step.target.includes('ai-widget');
      if (!isFixed) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // İlk ölçümü anında yap
    updateStepTarget(targetIndex);

    // Kaydırma bittiğinde bir kez daha tam yerini doğrula
    setTimeout(() => {
      updateStepTarget(targetIndex);
    }, 280);
  }, [updateStepTarget]);

  // Sayfa yüklendiğinde kontrol et (Farklı tarayıcılar dahil tek seferlik çalışır)
  useEffect(() => {
    // 1. Öğrenci henüz navigator seçimini yapmadıysa tur başlatılmaz
    if (!profile?.onboarding_completed) return;

    // 2. Veritabanı kontrolü: Eğer profilde tour_completed true ise ASLA tekrar açma
    if (profile?.tour_completed === true) return;

    // 3. LocalStorage kontrolü (veritabanı sütun geçişi ve anlık önbellek güvencesi)
    const localCompleted =
      localStorage.getItem(tourKey) === 'true' ||
      localStorage.getItem('cyberedu_tour_completed') === 'true';

    // Eğer veritabanında tour_completed açıkça false değilse ve local'de tamamlanmışsa gösterme
    if (profile?.tour_completed !== false && localCompleted) {
      return;
    }

    const timer = setTimeout(() => {
      // İlk adım (Hoş Geldin & Ders Takibi) koordinatını alıp aç
      const initialRect = getStepTargetRect(0);
      if (initialRect) {
        setTargetRect(initialRect);
      }
      setCurrentStep(0);
      setIsOpen(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [user?.id, profile?.onboarding_completed, profile?.tour_completed, tourKey]);

  // Manuel tur başlatma olayı (Profil sayfasından veya butondan tetiklendiğinde)
  useEffect(() => {
    const handleStartTour = () => {
      goToStep(0);
      setIsOpen(true);
    };
    window.addEventListener('start-cyberedu-tour', handleStartTour);
    return () => window.removeEventListener('start-cyberedu-tour', handleStartTour);
  }, [goToStep]);

  // Sayfa kaydırma ve yeniden boyutlandırmayı 60fps akıcı takip et
  useEffect(() => {
    if (!isOpen) return;

    let rafId = null;
    let scrollTimeout = null;

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (spotlightRef.current) {
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
        }
      });

      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        updateStepTarget(currentStep);
      }, 100);
    };

    const handleResize = () => {
      updateStepTarget(currentStep);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [isOpen, currentStep, updateStepTarget]);

  const handleComplete = async () => {
    // 1. Arayüzü anında kapat
    setIsOpen(false);

    // 2. LocalStorage'a kaydet
    if (user?.id) {
      localStorage.setItem(`cyberedu_tour_completed_${user.id}`, 'true');
    }
    localStorage.setItem(tourKey, 'true');
    localStorage.setItem('cyberedu_tour_completed', 'true');

    // 3. Veritabanına (profiles) kalıcı kaydet -> Farklı tarayıcı veya cihazlarda ASLA tekrar çıkmasın
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            tour_completed: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (!error && refreshProfile) {
          await refreshProfile();
        }
      } catch (err) {
        console.warn('tour_completed veritabanına yazılamadı:', err);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      goToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];
  const Icon = step.icon;

  // Popover Kart Pozisyonlama Hesabı (Öğelerin Üstüne Asla Binmez)
  const getCardStyle = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const cardWidth = isMobile ? (typeof window !== 'undefined' ? window.innerWidth - 32 : 360) : 420;
    const cardHeight = 310;

    // Hedef bulunamadıysa temiz ortala
    if (!targetRect || typeof window === 'undefined') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${cardWidth}px`,
        maxWidth: 'calc(100vw - 32px)',
      };
    }

    // Mobil Yerleşim: Hedef ekranın altındaysa kutu üste, üstündeyse kutu alta yerleşir
    if (isMobile) {
      const isTargetAtBottom = targetRect.bottom > window.innerHeight / 2;
      return {
        position: 'fixed',
        left: '16px',
        right: '16px',
        ...(isTargetAtBottom ? { top: '80px' } : { bottom: '24px' }),
        maxWidth: 'calc(100vw - 32px)',
      };
    }

    // 1. Masaüstü: AI Widget (Sağ alt) -> KUTU HEDEF BUTONUN ÜSTÜNDE OLUR
    if (step.target.includes('ai-widget')) {
      return {
        position: 'fixed',
        bottom: `${Math.max(24, window.innerHeight - targetRect.top + 20)}px`,
        right: '24px',
        width: `${cardWidth}px`,
      };
    }

    // 2. Masaüstü: Profil & Bildirimler (Sağ üst) -> KUTU HEDEFİN ALTINDA OLUR
    if (step.target.includes('profile')) {
      return {
        position: 'fixed',
        top: `${Math.max(80, targetRect.bottom + 16)}px`,
        right: '24px',
        width: `${cardWidth}px`,
      };
    }

    // 3. Masaüstü: Sol Sidebar -> KUTU MENÜNÜN SAĞINDA OLUR
    if (step.target.includes('sidebar')) {
      return {
        position: 'fixed',
        top: `${Math.max(80, Math.min(targetRect.top + 60, window.innerHeight - cardHeight - 40))}px`,
        left: `${Math.min(targetRect.right + 24, window.innerWidth - cardWidth - 24)}px`,
        width: `${cardWidth}px`,
      };
    }

    // 4. Masaüstü: Liderlik Tablosu -> KUTU TABLONUN SOLUNDA YERLEŞİR
    if (step.target.includes('leaderboard')) {
      const canFitLeft = targetRect.left >= cardWidth + 30;
      if (canFitLeft) {
        return {
          position: 'fixed',
          top: `${Math.max(80, Math.min(targetRect.top + 20, window.innerHeight - cardHeight - 30))}px`,
          left: `${targetRect.left - cardWidth - 20}px`,
          width: `${cardWidth}px`,
        };
      }
    }

    // 5. Masaüstü: Ders Takip Kartı / Genel İçerik -> KUTU KARTIN ALTINDA YERLEŞİR
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const cardTop = spaceBelow >= cardHeight + 20
      ? targetRect.bottom + 20
      : Math.max(80, targetRect.top - cardHeight - 20);

    return {
      position: 'fixed',
      top: `${cardTop}px`,
      left: `${Math.max(24, Math.min(targetRect.left + 30, window.innerWidth - cardWidth - 24))}px`,
      width: `${cardWidth}px`,
    };
  };

  const isSidebar = step.target.includes('sidebar');

  const spotTop = isSidebar ? 0 : Math.max(0, targetRect ? targetRect.top - 6 : 0);
  const spotLeft = isSidebar ? 0 : Math.max(0, targetRect ? targetRect.left - 6 : 0);
  const spotWidth = isSidebar ? (targetRect ? targetRect.width : 0) : (targetRect ? targetRect.width + 12 : 0);
  const spotHeight = isSidebar ? (typeof window !== 'undefined' ? window.innerHeight : 800) : (targetRect ? targetRect.height + 12 : 0);

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
            top: spotTop,
            left: spotLeft,
            width: spotWidth,
            height: spotHeight,
            // 9999px box shadow: Hedef alanı %100 kristal berrak, dışı derin karartma
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
        className="z-[160] pointer-events-auto rounded-3xl glass border border-white/25 p-6 shadow-2xl bg-slate-900/95 overflow-hidden backdrop-blur-xl transition-all duration-300 ease-out"
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
            <h3 className="font-display font-black text-lg text-white leading-tight">
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
                onClick={() => goToStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-violet-400'
                    : idx < currentStep
                      ? 'w-2 bg-violet-600/60 hover:bg-violet-500'
                      : 'w-2 bg-white/20 hover:bg-white/40'
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
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft size={13} /> Geri
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className={`px-4 py-2 rounded-xl font-bold text-xs text-white transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                currentStep === TOUR_STEPS.length - 1
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/30'
              }`}
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  <CheckCircle2 size={14} /> Tamamla
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
