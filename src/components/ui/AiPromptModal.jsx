import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';

export default function AiPromptModal({
  isOpen,
  onClose,
  onSubmit,
  title = "Yapay Zeka ile Üret",
  subtitle = "Konuyu veya ne üretmek istediğinizi tarif edin, gerisini yapay zekaya bırakın.",
  placeholder = "Örn: Phishing türleri ve e-posta analizi...",
  options = null, // Opsiyonel tür/seçenek listesi [{ label, value }]
  optionsLabel = "Tür Seçin",
  suggestions = [],
  loading = false,
}) {
  const [promptText, setPromptText] = useState('');
  const [selectedOption, setSelectedOption] = useState(options?.[0]?.value || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPromptText('');
      if (options && options.length > 0) {
        setSelectedOption(options[0].value);
      }
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!promptText.trim() || loading) return;
    onSubmit({
      prompt: promptText.trim(),
      option: selectedOption,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-violet-500/40 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-950/70 via-purple-950/50 to-slate-900 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-violet-600/30">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Opsiyonel Tür Seçimi */}
          {options && options.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {optionsLabel}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {options.map((opt) => {
                  const isSelected = selectedOption === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedOption(opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-violet-600/30 border-violet-500 text-white shadow-md shadow-violet-600/20'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      {opt.icon && <span>{opt.icon}</span>}
                      <span className="truncate">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Konu / İstem Metni */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Konu veya İstek Detayı
            </label>
            <textarea
              ref={textareaRef}
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={placeholder}
              className="w-full bg-slate-950/70 border border-white/15 focus:border-violet-500 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all resize-none shadow-inner"
            />
          </div>

          {/* Hızlı Öneri Etiketleri */}
          {suggestions && suggestions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Örnek Konular:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPromptText(sug)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-violet-500/10 hover:bg-violet-500/25 text-violet-300 border border-violet-500/25 transition-all text-left"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer Butonları */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-40"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!promptText.trim() || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Üretiliyor...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>İçerik Üret</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
