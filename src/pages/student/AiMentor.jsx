import { useState, useRef, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { chatWithMentor } from '../../services/aiService';
import { Bot, Sparkles, Send, Trash2, Copy, Check, Shield, Terminal, BookOpen, HelpCircle } from 'lucide-react';

function FormattedContent({ text }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyCode = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!text) return null;

  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 leading-relaxed text-sm">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const raw = part.slice(3, -3);
          const langMatch = raw.match(/^[a-z0-9_-]+/i);
          const lang = langMatch ? langMatch[0] : '';
          const code = lang ? raw.slice(lang.length).trim() : raw.trim();

          return (
            <div key={idx} className="my-3 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono uppercase font-bold text-violet-400">{lang || 'KOD'}</span>
                <button
                  onClick={() => copyCode(code, idx)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400 text-[11px]">Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span className="text-[11px]">Kopyala</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;

              // Markdown başlıkları (#, ##, ###)
              if (trimmed.startsWith('### ')) {
                return <h4 key={lIdx} className="font-bold text-base text-violet-300 pt-2">{trimmed.slice(4)}</h4>;
              }
              if (trimmed.startsWith('## ')) {
                return <h3 key={lIdx} className="font-black text-lg text-white pt-2">{trimmed.slice(3)}</h3>;
              }
              if (trimmed.startsWith('# ')) {
                return <h2 key={lIdx} className="font-black text-xl text-white pt-3">{trimmed.slice(2)}</h2>;
              }

              // Liste elemanı
              if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-violet-400 mt-1.5 leading-none">•</span>
                    <span className="text-slate-200">{renderInlineStyles(trimmed.slice(2))}</span>
                  </div>
                );
              }

              // Numaralı liste
              const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-violet-400 font-bold text-xs mt-0.5">{numMatch[1]}.</span>
                    <span className="text-slate-200">{renderInlineStyles(numMatch[2])}</span>
                  </div>
                );
              }

              return <p key={lIdx} className="text-slate-200">{renderInlineStyles(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function renderInlineStyles(text) {
  const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-violet-950 text-violet-300 font-mono text-xs border border-violet-800/40">
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

const STARTER_CARDS = [
  {
    icon: Shield,
    title: 'Web Zafiyetleri (OWASP Top 10)',
    prompt: 'Bana OWASP Top 10 zafiyetlerini ve en yaygın olanlarını örneklerle açıklar mısın?',
    color: 'from-blue-600/20 to-cyan-600/20 border-blue-500/30 text-blue-400'
  },
  {
    icon: Terminal,
    title: 'Ağ Güvenliği ve Portlar',
    prompt: '22, 80, 443 gibi kritik portların siber güvenlikteki önemi ve nasıl güvene alınacağı hakkında bilgi ver.',
    color: 'from-violet-600/20 to-purple-600/20 border-violet-500/30 text-violet-400'
  },
  {
    icon: BookOpen,
    title: 'Sosyal Mühendislik Savunması',
    prompt: 'Oltalama (Phishing) ve sosyal mühendislik saldırılarını tespit etmek için hangi yöntemleri kullanmalıyım?',
    color: 'from-amber-600/20 to-orange-600/20 border-amber-500/30 text-amber-400'
  },
  {
    icon: HelpCircle,
    title: 'Siber Güvenlik Kariyer Tavsiyesi',
    prompt: 'Siber güvenlik alanında kendimi geliştirmek ve staj/iş bulmak için hangi adımları izlemeliyim?',
    color: 'from-emerald-600/20 to-teal-600/20 border-emerald-500/30 text-emerald-400'
  }
];

export default function AiMentor() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Merhaba **${profile?.display_name || 'Öğrenci'}**! 👋\n\nBen senin CyberEdu platformundaki yapay zeka siber güvenlik mentorünüm. Siber güvenlik prensipleri, ağ analizi, savunma taktikleri veya çözmekte zorlandığın konular hakkında istediğin her şeyi sorabilirsin.`
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
    scrollToBottom();
  }, [messages]);

  const handleSend = async (customPrompt = null) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: textToSend
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const reply = await chatWithMentor({
        message: textToSend,
        history,
        context: {
          role: 'Öğrenci',
          pageTitle: 'AI Mentor Özel Sayfası',
          studentName: profile?.display_name
        }
      });

      setMessages((prev) => [
        ...prev,
        {
          id: 'mentor-' + Date.now(),
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
          content: 'Üzgünüm, yanıt oluşturulurken bir hata oluştu: ' + (err.message || 'Lütfen bağlantınızı kontrol edin.')
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
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
        id: 'welcome-' + Date.now(),
        role: 'assistant',
        content: 'Sohbet temizlendi! Yeni bir konu veya soruyla devam edebiliriz. Sana nasıl yardımcı olabilirim?'
      }
    ]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-9.5rem)] md:h-[calc(100vh-10.5rem)] min-h-[480px]">
        
        {/* Üst Başlık & Kontroller */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white flex items-center gap-2">
                CyberEdu AI Mentor
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Çevrimiçi
                </span>
              </h1>
              <p className="text-xs text-slate-400">7/24 Kişisel Siber Güvenlik Rehberiniz</p>
            </div>
          </div>

          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold transition-all"
            title="Sohbet geçmişini sıfırla"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Sohbeti Sıfırla</span>
          </button>
        </div>

        {/* Mesaj Listesi Alanı */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl mb-4">
          
          {/* Başlangıç Kartları (Sadece az mesaj varken göster) */}
          {messages.length <= 2 && (
            <div className="my-4 space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
                Önerilen Başlangıç Konuları
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_CARDS.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(card.prompt)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl bg-gradient-to-br ${card.color} border text-left hover:scale-[1.01] active:scale-[0.99] transition-all`}
                    >
                      <div className="p-2 rounded-xl bg-white/10 shrink-0 mt-0.5">
                        <Icon size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white mb-1">{card.title}</h3>
                        <p className="text-[11px] text-slate-300 line-clamp-2">{card.prompt}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mesaj Balonları */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0 mt-1">
                    <Bot size={18} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[78%] px-5 py-3.5 rounded-3xl shadow-md ${
                    isUser
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-slate-800/95 border border-white/10 text-slate-200 rounded-bl-sm'
                  }`}
                >
                  <FormattedContent text={msg.content} />
                </div>
              </div>
            );
          })}

          {/* Yükleniyor Durumu */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0 mt-1">
                <Sparkles size={18} className="animate-spin text-violet-400" />
              </div>
              <div className="bg-slate-800/95 px-5 py-4 rounded-3xl rounded-bl-sm border border-white/10 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-slate-400 font-medium ml-2">Mentorünüz düşünüyor...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Mesaj Gönderme Giriş Alanı */}
        <div className="p-3 bg-slate-900/95 border border-white/10 rounded-2xl backdrop-blur-xl flex items-center gap-3 shrink-0 shadow-2xl sticky bottom-0 z-20">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Siber güvenlik mentorünüze bir soru sorun veya konu belirtin..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-400 outline-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-500 hover:to-pink-400 disabled:opacity-40 disabled:hover:from-violet-600 disabled:hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0"
          >
            <span>Gönder</span>
            <Send size={15} />
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
}
