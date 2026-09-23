import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Sparkles, X, Send, Trash2, Minimize2, Maximize2, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatWithMentor } from '../services/aiService';

// Basit Markdown & Metin Biçimlendirici
function FormattedMessage({ text }) {
  if (!text) return null;

  // Kod bloklarını ve paragrafları ayıkla
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 text-sm leading-relaxed break-words">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3).replace(/^[a-z]+\n/i, '');
          return (
            <pre key={idx} className="p-3 my-2 rounded-xl bg-slate-900/90 text-emerald-400 text-xs font-mono overflow-x-auto border border-white/10">
              <code>{content.trim()}</code>
            </pre>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-1">
            {lines.map((line, lIdx) => {
              if (!line.trim()) return null;

              // Liste elemanı
              if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                const itemText = line.trim().slice(2);
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-violet-400 mt-1">•</span>
                    <span>{renderInlineStyles(itemText)}</span>
                  </div>
                );
              }

              // Sayılı liste
              const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-violet-400 font-bold text-xs mt-0.5">{numMatch[1]}.</span>
                    <span>{renderInlineStyles(numMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lIdx}>{renderInlineStyles(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineStyles(text) {
  // Kalın (**bold**) ve satır içi kod (`code`) ayrımı
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={i} className="font-bold text-violet-200">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-violet-950/60 text-violet-300 font-mono text-xs border border-violet-800/40">
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

export default function AiChatWidget() {
  const { role, user } = useAuth();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      content: 'Merhaba! Size nasıl yardımcı olabilirim? Siber güvenlik kavramları, dersler veya aklınıza takılan sorular için buradayım.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, messages]);

  // Sayfadaki güncel ders, kurs veya içerik bağlamını ayıkla
  const extractCurrentContext = () => {
    const path = location.pathname;
    let pageName = 'Kontrol Paneli';
    let details = '';
    let courseTitle = '';
    let lessonTitle = '';

    if (path.includes('/student/lessons/')) {
      pageName = 'İnteraktif Ders Ekranı';
      const h1Text = document.querySelector('h1')?.innerText || '';
      lessonTitle = h1Text;
      const questionText = document.querySelector('.prose-custom p, h2, h3')?.innerText || '';
      details = `Ders: "${h1Text}". İçerik detayı: "${questionText.slice(0, 300)}"`;
    } else if (path.includes('/student/courses/')) {
      pageName = 'Kurs Bilgi Sayfası';
      const h1Text = document.querySelector('h1')?.innerText || '';
      courseTitle = h1Text;
      details = `İncelenen Kurs: "${h1Text}"`;
    } else if (path.includes('/student/learning-path')) {
      pageName = 'Öğrenme Yolculuğu Haritası';
      details = 'Öğrenci zorunlu müfredat sarmal haritasını inceliyor.';
    } else if (path.includes('/student/achievements')) {
      pageName = 'Başarılar & Rozetler Odası';
      details = 'Öğrenci kazandığı rozetleri, unvanları ve kilitli siber avatarları inceliyor.';
    } else if (path.includes('/teacher')) {
      pageName = 'Eğitmen Paneli';
      const title = document.querySelector('h1, h2')?.innerText || '';
      details = title ? `Eğitmen Sayfa Başlığı: "${title}"` : 'Eğitmen kurs veya ders yönetiminde.';
    }

    return {
      role: role === 'teacher' ? 'Eğitmen' : role === 'admin' ? 'Yönetici' : 'Öğrenci',
      pageName,
      pathname: path,
      lessonTitle,
      courseTitle,
      details
    };
  };

  const handleSend = async (customText = null) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Dinamik bağlam bilgisi hazırla
      const context = extractCurrentContext();

      const history = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const reply = await chatWithMentor({
        message: textToSend,
        history,
        context
      });

      setMessages((prev) => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: reply
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: 'Üzgünüm, bir bağlantı hatası oluştu: ' + (err.message || 'Lütfen tekrar deneyin.')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'init-' + Date.now(),
        role: 'assistant',
        content: 'Merhaba! Size nasıl yardımcı olabilirim? Yeni bir soru veya konu ile başlayabiliriz.'
      }
    ]);
  };

  const studentChips = [
    'Bu konuyu basitçe özetle',
    'Phishing saldırısı nasıl tespit edilir?',
    'Port 443 ile 80 arasındaki fark nedir?',
    'Siber güvenlikte ilk nereden başlamalıyım?'
  ];

  const teacherChips = [
    'Öğrenciler için interaktif senaryo fikri ver',
    'Ağ güvenliği dersi için pratik etkinlik öner',
    'Soru hazırlarken nelere dikkat etmeliyim?'
  ];

  const chips = role === 'teacher' ? teacherChips : studentChips;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Sohbet Penceresi */}
      {isOpen && (
        <div
          className={`glass-panel border border-violet-500/30 rounded-3xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden mb-3 ${
            isMinimized
              ? 'w-72 h-14 bg-slate-900/95'
              : 'w-[90vw] sm:w-[400px] md:w-[440px] h-[500px] max-h-[calc(100vh-6.5rem)] bg-slate-900/95 backdrop-blur-xl'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-900/60 to-slate-900/80 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-violet-600/30">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  CyberEdu AI
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-violet-300 font-medium">Siber Güvenlik Asistanı</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              {!isMinimized && (
                <button
                  onClick={clearChat}
                  title="Sohbeti Temizle"
                  className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? 'Genişlet' : 'Küçült'}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Kapat"
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {/* Güncel Bağlam / Konum Göstergesi */}
              {(() => {
                const ctx = extractCurrentContext();
                return (
                  <div className="px-4 py-1.5 bg-violet-950/40 border-b border-violet-800/30 flex items-center justify-between gap-2 text-[10px] text-violet-300">
                    <span className="truncate flex items-center gap-1">
                      <span className="text-amber-400 font-bold shrink-0">📍 {ctx.pageName}:</span>
                      <span className="truncate text-slate-300">{ctx.lessonTitle || ctx.courseTitle || 'Genel Konular'}</span>
                    </span>
                    <span className="shrink-0 font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">
                      Bağlamsal
                    </span>
                  </div>
                );
              })()}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
                          <Bot size={15} />
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] px-4 py-2.5 rounded-2xl ${
                          isUser
                            ? 'bg-violet-600 text-white rounded-br-sm shadow-md'
                            : 'bg-slate-800/90 text-slate-200 border border-white/10 rounded-bl-sm'
                        }`}
                      >
                        <FormattedMessage text={msg.content} />
                      </div>
                    </div>
                  );
                })}

                {/* Yükleniyor Durumu */}
                {loading && (
                  <div className="flex gap-2.5 justify-start">
                    <div className="w-7 h-7 rounded-lg bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0 mt-0.5">
                      <Sparkles size={15} className="animate-spin text-violet-400" />
                    </div>
                    <div className="bg-slate-800/90 px-4 py-3 rounded-2xl rounded-bl-sm border border-white/10 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Hızlı Öneri Butonları */}
              {messages.length <= 3 && !loading && (
                <div className="px-3 py-2 bg-slate-950/40 border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {chips.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(chip)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 transition-all text-left"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Alanı */}
              <div className="p-3 bg-slate-950/95 border-t border-white/10 flex items-center gap-2 shrink-0 sticky bottom-0 z-10">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Bir soru sorun veya konu belirtin..."
                  disabled={loading}
                  className="flex-1 bg-slate-800/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white flex items-center justify-center transition-all shadow-md shadow-violet-600/30 shrink-0"
                >
                  <Send size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tetikleyici Buton */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-pink-500 text-white shadow-xl shadow-violet-600/40 hover:shadow-violet-600/60 hover:scale-105 active:scale-95 transition-all"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
          </span>
          <Bot size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-xs sm:text-sm tracking-wide">
            AI Asistan
          </span>
          <Sparkles size={14} className="text-amber-300 animate-pulse" />
        </button>
      )}
    </div>
  );
}
