import { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize, Minimize, ExternalLink, MonitorPlay, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * StorylinePlayer — Articulate Storyline HTML5 / SCORM web çıktısı oynatıcı
 *
 * İki mod:
 *  - "inline"  → Aktivite içi kart (16:9 oran, Theatre Mode + Fullscreen butonları)
 *  - "full"    → Dersin kendisi tam ekran modu (sidebar otomatik daralır)
 *
 * Props:
 *  url              — story.html URL'si (zorunlu)
 *  mode             — "inline" | "full" (varsayılan: "inline")
 *  height           — inline modda iframe yüksekliği (varsayılan: "450px")
 *  allowFullscreen  — Fullscreen butonunu göster (varsayılan: true)
 *  onCollapseSidebar— Full modda sidebar'ı daralt callback
 *  submitted        — Ders akışında bu aktivite tamamlandı mı
 *  onSubmit         — Tamamlandı callback ({ userAnswer, isCorrect, score })
 *  title            — Oynatıcı başlığı (isteğe bağlı)
 *  maxScore         — Storyline'ın max puanı (varsayılan: 100) — XP oranı için
 *  xpReward         — Bu aktivite için verilecek max XP
 *
 * Storyline'dan XP almak için son slayta şu JavaScript trigger'ı ekleyin:
 *   window.parent.postMessage(
 *     JSON.stringify({ type: 'storyline_complete', score: <puan> }),
 *     '*'
 *   );
 * <puan> yerine Storyline'ın Quiz Result değişkenini (ör. %Results.ScorePoints%) kullanın.
 */
export default function StorylinePlayer({
  url,
  mode = 'inline',
  height = '450px',
  allowFullscreen = true,
  onCollapseSidebar,
  submitted = false,
  onSubmit,
  title,
  maxScore = 100,
  xpReward,
}) {
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(submitted);
  const [capturedScore, setCapturedScore] = useState(null);

  // Full modda sidebar'ı otomatik daralt
  useEffect(() => {
    if (mode === 'full' && onCollapseSidebar) {
      onCollapseSidebar(true);
      return () => onCollapseSidebar(false);
    }
  }, [mode, onCollapseSidebar]);

  // Tarayıcı Fullscreen API
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      );
      setIsBrowserFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
    };
  }, []);

  const [currentMaxScore, setCurrentMaxScore] = useState(maxScore || 100);

  // Callback ref'i oluşturarak closure stale state sorunlarını engelle
  const handleCompleteRef = useRef();

  const handleCompleteWithScore = useCallback((scoreOverride, maxScoreOverride) => {
    if (isCompleted) return;
    setIsCompleted(true);

    const targetMax = maxScoreOverride ?? currentMaxScore;
    const finalScore = scoreOverride !== null && scoreOverride !== undefined
      ? scoreOverride
      : (capturedScore !== null ? capturedScore : targetMax);

    const isCorrect = finalScore >= (targetMax * 0.5);

    if (onSubmit) {
      onSubmit({
        userAnswer: `score:${finalScore ?? 'completed'}`,
        isCorrect,
        score: finalScore,
        maxScore: targetMax,
        earnedXP: xpReward && finalScore !== null
          ? Math.round((finalScore / targetMax) * xpReward)
          : (xpReward || finalScore),
      });
    }
  }, [isCompleted, onSubmit, capturedScore, currentMaxScore, xpReward]);

  handleCompleteRef.current = handleCompleteWithScore;

  // ─── SCORM / xAPI / özel postMessage dinleyicisi ───────────────────────────
  useEffect(() => {
    const handleMessage = (e) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;

        // Skor yakalama (farklı Storyline değişken adlarına karşı toleranslı)
        let score = null;
        let incomingMax = null;

        // 1) Özel mesaj: { type: 'storyline_complete', score: 300, maxScore: 300 }
        if (data.type === 'storyline_complete') {
          const rawCandidate = data.score ?? data.points ?? data.finalScore ?? data.totalScore;
          if (rawCandidate !== undefined && rawCandidate !== null && !isNaN(Number(rawCandidate))) {
            score = parseFloat(rawCandidate);
          }
        }

        // 2) SCORM 1.2: LMSSetValue ile cmi.core.score.raw veya cmi.score.raw
        if (data.LMSSetValue && typeof data.LMSSetValue === 'string') {
          const match = data.LMSSetValue.match(/cmi\.(?:core\.)?score\.raw=(\d+(?:\.\d+)?)/);
          if (match) score = parseFloat(match[1]);
        }

        // 3) xAPI / SCORM 2004
        if (data.score?.raw !== undefined) score = parseFloat(data.score.raw);
        if (data.result?.score?.raw !== undefined) score = parseFloat(data.result.score.raw);

        // MaxScore yakalama
        const maxCandidate = data.maxScore ?? data.max_score ?? data.maxPoints ?? data.totalPoints;
        if (maxCandidate !== undefined && !isNaN(Number(maxCandidate))) {
          incomingMax = parseFloat(maxCandidate);
          setCurrentMaxScore(incomingMax);
        } else if (score !== null && score > (maxScore || 100)) {
          incomingMax = score;
          setCurrentMaxScore(score);
        }

        if (score !== null && !isNaN(score)) {
          setCapturedScore(score);
        }

        // Tamamlama sinyalleri
        const isComplete =
          data.type === 'storyline_complete' ||
          data.status === 'completed' ||
          data.verb === 'completed' ||
          data.completion === 'completed' ||
          (data.LMSSetValue && (
            data.LMSSetValue.includes('completion_status=completed') ||
            data.LMSSetValue.includes('lesson_status=passed') ||
            data.LMSSetValue.includes('lesson_status=completed')
          ));

        if (isComplete) {
          handleCompleteRef.current?.(score, incomingMax);
        }
      } catch {
        // JSON parse hatası veya alakasız mesaj
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [maxScore]);

  const handleComplete = () => handleCompleteWithScore(capturedScore ?? currentMaxScore);

  // Tarayıcı Fullscreen aç/kapat
  const toggleBrowserFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!isBrowserFullscreen) {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.mozRequestFullScreen) await el.mozRequestFullScreen();
      } catch (err) {
        console.warn('Fullscreen isteği reddedildi:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        else if (document.mozCancelFullScreen) await document.mozCancelFullScreen();
      } catch (err) {
        console.warn('Fullscreen çıkış hatası:', err);
      }
    }
  };


  if (!url) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 rounded-2xl border-2 border-dashed border-amber-400/50 bg-amber-50 dark:bg-amber-950/20 text-center">
        <AlertTriangle className="text-amber-500" size={32} />
        <p className="text-amber-700 dark:text-amber-300 font-bold text-sm">
          Storyline URL tanımlanmamış. Ders düzenleyicisinden URL ekleyin.
        </p>
      </div>
    );
  }

  // ─────────────────── INLINE MOD ────────────────────────────────────────────
  if (mode === 'inline') {
    return (
      <div
        ref={containerRef}
        className={`
          relative overflow-hidden rounded-2xl border
          ${isBrowserFullscreen
            ? 'fixed inset-0 z-[200] border-0 rounded-none bg-black'
            : 'border-slate-200 dark:border-white/10 bg-black/5 dark:bg-slate-900/60'}
        `}
      >
        {/* Üst Araç Çubuğu */}
        <div className={`
          flex items-center justify-between px-4 py-2.5
          ${isBrowserFullscreen
            ? 'bg-black/80 text-white'
            : 'bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'}
        `}>
          <div className="flex items-center gap-2">
            <MonitorPlay
              size={16}
              className={isBrowserFullscreen ? 'text-violet-400' : 'text-violet-600 dark:text-violet-400'}
            />
            <span className={`text-xs font-bold truncate max-w-[200px] sm:max-w-sm
              ${isBrowserFullscreen ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'}`}>
              {title || 'Storyline İçeriği'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Yeni sekmede aç */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Yeni sekmede aç"
              className={`p-1.5 rounded-lg transition-colors
                ${isBrowserFullscreen
                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              <ExternalLink size={15} />
            </a>

            {/* Tarayıcı Tam Ekran */}
            {allowFullscreen && (
              <button
                onClick={toggleBrowserFullscreen}
                title={isBrowserFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
                className={`p-1.5 rounded-lg transition-colors
                  ${isBrowserFullscreen
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >
                {isBrowserFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
              </button>
            )}
          </div>
        </div>

        {/* iframe Kapsayıcı — 16:9 oran */}
        <div
          className="relative w-full bg-black"
          style={isBrowserFullscreen ? { height: 'calc(100% - 44px)' } : { paddingTop: '56.25%' }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 className="animate-spin" size={32} />
                <span className="text-sm font-medium">Storyline içeriği yükleniyor...</span>
              </div>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <AlertTriangle className="text-amber-400" size={32} />
                <p className="text-slate-300 font-bold text-sm">İçerik yüklenemedi</p>
                <p className="text-slate-500 text-xs max-w-xs">
                  URL'yi kontrol edin veya{' '}
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="text-violet-400 underline">
                    yeni sekmede açın
                  </a>
                </p>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={url}
            title={title || 'Storyline Player'}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            allow="fullscreen; autoplay; accelerometer; gyroscope"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setLoadError(true); }}
          />
        </div>

        {/* Tamamla Butonu */}
        {onSubmit && !isCompleted && !submitted && (
          <div className={`p-3 flex items-center justify-between border-t
            ${isBrowserFullscreen
              ? 'bg-black/80 border-white/10'
              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
            {capturedScore !== null && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                📊 Puan: {capturedScore}/{currentMaxScore}
              </span>
            )}
            <button
              onClick={handleComplete}
              className="ml-auto px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all hover:scale-105 shadow-md shadow-emerald-600/20"
            >
              ✓ İçeriği Tamamladım
            </button>
          </div>
        )}

        {/* Tamamlandı rozeti */}
        {(isCompleted || submitted) && (
          <div className="p-2.5 text-center bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-500/30 flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              ✓ Bu içerik tamamlandı
            </span>
            {capturedScore !== null && (
              <span className="text-xs text-emerald-600 dark:text-emerald-500 font-bold font-mono">
                · Puan: {capturedScore}/{currentMaxScore}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────── FULL MOD ──────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`
        relative w-full flex flex-col
        ${isBrowserFullscreen
          ? 'fixed inset-0 z-[200] bg-black'
          : 'rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10'}
      `}
      style={isBrowserFullscreen ? {} : { height: '80vh', minHeight: '500px' }}
    >
      {/* Araç çubuğu */}
      <div className={`flex items-center justify-between px-4 py-3 shrink-0
        ${isBrowserFullscreen
          ? 'bg-black/90 text-white border-b border-white/10'
          : 'bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800'}`}>
        <div className="flex items-center gap-2">
          <MonitorPlay
            size={18}
            className={isBrowserFullscreen ? 'text-violet-400' : 'text-violet-600 dark:text-violet-400'}
          />
          <span className={`font-bold text-sm truncate max-w-xs
            ${isBrowserFullscreen ? 'text-slate-200' : 'text-slate-800 dark:text-white'}`}>
            {title || 'Storyline Modülü'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Yeni sekmede aç"
            className={`p-1.5 rounded-lg transition-colors
              ${isBrowserFullscreen
                ? 'text-slate-300 hover:text-white hover:bg-white/10'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            <ExternalLink size={16} />
          </a>

          {allowFullscreen && (
            <button
              onClick={toggleBrowserFullscreen}
              title={isBrowserFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran'}
              className={`p-1.5 rounded-lg transition-colors
                ${isBrowserFullscreen
                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              {isBrowserFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 relative bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="animate-spin" size={36} />
              <span className="text-sm font-medium">Storyline modülü yükleniyor...</span>
            </div>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
            <div className="flex flex-col items-center gap-4 text-center px-8">
              <AlertTriangle className="text-amber-400" size={40} />
              <div>
                <p className="text-slate-200 font-bold">İçerik yüklenemedi</p>
                <p className="text-slate-400 text-sm mt-1">
                  URL'yi kontrol edin veya{' '}
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="text-violet-400 underline">
                    yeni sekmede açın
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          title={title || 'Storyline Modülü'}
          className="absolute inset-0 w-full h-full border-0"
          allow="fullscreen; autoplay; accelerometer; gyroscope"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setLoadError(true); }}
        />
      </div>

      {/* Tamamla Butonu — full mod */}
      {onSubmit && !isCompleted && !submitted && (
        <div className={`px-4 py-3 flex items-center justify-between shrink-0 border-t
          ${isBrowserFullscreen
            ? 'bg-black/90 border-white/10'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
          {capturedScore !== null && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              📊 Puan: {capturedScore}/{currentMaxScore}
            </span>
          )}
          <button
            onClick={handleComplete}
            className="ml-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all hover:scale-105 shadow-md shadow-emerald-600/20"
          >
            ✓ Modülü Tamamladım
          </button>
        </div>
      )}
    </div>
  );
}
