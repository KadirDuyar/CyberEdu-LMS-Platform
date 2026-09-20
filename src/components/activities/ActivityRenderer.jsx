import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Play, Pause, RotateCcw, ArrowUp, ArrowDown } from 'lucide-react';

const formatAnswer = (ans) => {
  if (ans === undefined || ans === null) return '';
  if (typeof ans === 'boolean') return ans ? 'Doğru' : 'Yanlış';
  if (typeof ans === 'object') {
    if (ans.x !== undefined && ans.y !== undefined) {
      return `Hedef Bölge: (X: %${ans.x}, Y: %${ans.y})`;
    }
    return JSON.stringify(ans);
  }
  return String(ans);
};

const checkAnswer = (activity, userAnswer) => {
  if (activity.correct_answer === undefined || activity.correct_answer === null) return false;
  if (typeof activity.correct_answer === 'object') {
    return JSON.stringify(activity.correct_answer) === JSON.stringify(userAnswer);
  }
  return String(activity.correct_answer).trim().toLowerCase() === String(userAnswer).trim().toLowerCase();
};

function ResultBanner({ correct, explanation, points, correctAnswer }) {
  if (correct) {
    return (
      <div className="mt-5 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500 flex items-start gap-3 shadow-md">
        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={24} />
        <div>
          <h4 className="font-extrabold text-emerald-800 dark:text-emerald-300 text-base">
            Tebrikler, Doğru Cevap! (+{points || 50} XP)
          </h4>
          {explanation && (
            <p className="text-xs md:text-sm font-semibold text-emerald-700 dark:text-emerald-200 mt-1">
              {explanation}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 flex items-start gap-3 shadow-md">
      <XCircle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={24} />
      <div className="w-full">
        <h4 className="font-extrabold text-rose-800 dark:text-rose-300 text-base">
          Hatalı Cevap!
        </h4>

        {correctAnswer !== undefined && correctAnswer !== null && (
          <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-sm">
            <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 block mb-0.5">
              DOĞRU CEVAP:
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {formatAnswer(correctAnswer)}
            </span>
          </div>
        )}

        {explanation && (
          <div className="mt-3 p-3 bg-rose-100/70 dark:bg-rose-900/30 rounded-xl border border-rose-200 dark:border-rose-800/40">
            <span className="text-[11px] font-black text-rose-800 dark:text-rose-300 block mb-0.5">
              AÇIKLAMA & ÇÖZÜM MANTIĞI:
            </span>
            <p className="text-xs md:text-sm font-medium text-slate-800 dark:text-slate-200">
              {explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MultipleChoiceActivity({ activity, onSubmit, submitted, result, initialAnswer }) {
  const [selected, setSelected] = useState(initialAnswer || null);

  const handleSubmit = (opt) => {
    setSelected(opt);
    const correct = checkAnswer(activity, opt);
    onSubmit({ userAnswer: opt, isCorrect: correct });
  };

  return (
    <div className="space-y-4">
      <p className="font-bold text-lg text-slate-900 dark:text-white leading-relaxed">
        {activity.question}
      </p>
      <div className="grid gap-3">
        {(activity.options || []).map((opt, idx) => {
          const isSelected = selected === opt;
          const isCorrectAnswer = submitted && activity.correct_answer === opt;
          const isWrongSelection = submitted && isSelected && !result?.isCorrect;

          let btnClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-slate-800';

          if (submitted) {
            if (isCorrectAnswer) {
              btnClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold border-2';
            } else if (isWrongSelection) {
              btnClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-100 font-bold border-2';
            } else {
              btnClass = 'opacity-40 border-slate-200 dark:border-slate-800';
            }
          } else if (isSelected) {
            btnClass = 'bg-violet-50 dark:bg-violet-950/40 border-violet-500 text-violet-900 dark:text-violet-100 font-bold border-2';
          }

          return (
            <button
              key={idx}
              onClick={() => !submitted && handleSubmit(opt)}
              disabled={submitted}
              className={`w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 shadow-sm ${btnClass}`}
            >
              <span className="font-mono text-xs font-black mr-3 text-slate-400">
                {String.fromCharCode(65 + idx)})
              </span>
              <span className="text-sm font-semibold">{opt}</span>
            </button>
          );
        })}
      </div>
      {submitted && result && (
        <ResultBanner
          correct={result.isCorrect}
          explanation={activity.explanation}
          points={activity.points}
          correctAnswer={activity.correct_answer}
        />
      )}
    </div>
  );
}

function TrueFalseActivity(props) {
  return (
    <MultipleChoiceActivity
      {...props}
      activity={{ ...props.activity, options: ['Doğru', 'Yanlış'] }}
    />
  );
}

function FillBlankActivity({ activity, onSubmit, submitted, result, initialAnswer }) {
  const [val, setVal] = useState(initialAnswer || '');

  const handleSubmit = () => {
    if (!val.trim()) return;
    const isCorrect = checkAnswer(activity, val.trim());
    onSubmit({ userAnswer: val.trim(), isCorrect });
  };

  return (
    <div className="space-y-4">
      <p className="font-bold text-lg text-slate-900 dark:text-white leading-relaxed">
        {activity.question}
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !submitted && handleSubmit()}
          disabled={submitted}
          placeholder="Cevabınızı giriniz..."
          className="flex-1 p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base outline-none focus:border-violet-500 shadow-sm"
        />
        {!submitted && (
          <button
            onClick={handleSubmit}
            className="px-6 py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition-all"
          >
            Kontrol Et
          </button>
        )}
      </div>
      {submitted && result && (
        <ResultBanner
          correct={result.isCorrect}
          explanation={activity.explanation}
          points={activity.points}
          correctAnswer={activity.correct_answer}
        />
      )}
    </div>
  );
}

function YoutubeActivity({ activity, onSubmit, submitted }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(submitted || false);
  const iframeRef = useRef(null);

  // Öğretmenin seçimine göre tamamlama zorunluluğu (varsayılan: true)
  const isRequireCompletion = activity.options?.require_completion ?? true;

  const getYoutubeId = (url) => {
    const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const videoId = getYoutubeId(activity.question) || activity.question;

  useEffect(() => {
    const handleMessage = (e) => {
      try {
        if (typeof e.data !== 'string') return;
        const data = JSON.parse(e.data);
        if (data.event === 'onStateChange') {
          if (data.info === 0) { // ENDED
            setIsEnded(true);
            setIsPlaying(false);
          } else if (data.info === 1) {
            setIsPlaying(true);
          } else if (data.info === 2) {
            setIsPlaying(false);
          }
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const togglePlay = () => {
    if (!iframeRef.current) return;
    const cmd = isPlaying ? 'pauseVideo' : 'playVideo';
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: cmd, args: [] }),
      '*'
    );
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    if (!iframeRef.current) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
      '*'
    );
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
      '*'
    );
    setIsPlaying(true);
  };

  // Butonun tıklanabilirlik şartı: Zorunluluk yoksa doğrudan, varsa video bitince
  const canProceed = !isRequireCompletion || isEnded;

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 bg-black group">
        {videoId ? (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3`}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Ders Videosu"
          />
        ) : (
          <div className="text-white p-6">Geçersiz YouTube Video Linki</div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all flex items-center gap-2 text-xs"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Durdur' : 'Oynat'}
            </button>
            <button
              onClick={restart}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Başa Sar"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {isRequireCompletion ? 'İzleme Kontrolü Aktif' : 'Serbest İzleme'}
          </span>
        </div>
      </div>

      {!submitted ? (
        <button
          onClick={() => onSubmit({ userAnswer: 'watched', isCorrect: true })}
          disabled={!canProceed}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all ${
            canProceed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
          }`}
        >
          <CheckCircle2 size={18} />
          {canProceed ? 'Videoyu İnceledim, Devam Et' : 'Videoyu Sonuna Kadar İzleyiniz'}
        </button>
      ) : (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 size={18} /> Video eğitimi başarıyla tamamlandı.
        </div>
      )}
    </div>
  );
}

function ScenarioActivity({ activity, onSubmit, submitted, result, initialAnswer }) {
  const [selectedIdx, setSelectedIdx] = useState(initialAnswer !== undefined ? initialAnswer : null);

  const handleSubmit = (idx) => {
    setSelectedIdx(idx);
    const opt = activity.options[idx];
    onSubmit({ userAnswer: idx, isCorrect: opt.isCorrect });
  };

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-base">
        {activity.question}
      </div>
      <div className="grid gap-3">
        {(activity.options || []).map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          let btnClass = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200';

          if (submitted) {
            if (isSelected) {
              btnClass = opt.isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold border-2' : 'bg-rose-50 border-rose-500 text-rose-900 font-bold border-2';
            } else {
              btnClass = 'opacity-40 border-slate-200 dark:border-slate-800';
            }
          }

          return (
            <div key={idx} className="flex flex-col">
              <button
                onClick={() => !submitted && handleSubmit(idx)}
                disabled={submitted}
                className={`text-left p-4 rounded-2xl border font-semibold text-sm transition-all ${btnClass}`}
              >
                {opt.text}
              </button>
              {submitted && isSelected && opt.consequence && (
                <div className={`mt-2 p-3 rounded-xl text-xs font-bold border-l-4 ${opt.isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-rose-50 border-rose-500 text-rose-800'}`}>
                  {opt.consequence}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {submitted && result && (
        <ResultBanner
          correct={result.isCorrect}
          explanation={activity.explanation}
          points={activity.points}
        />
      )}
    </div>
  );
}

function OrderingActivity({ activity, onSubmit, submitted, result, initialAnswer }) {
  const [items, setItems] = useState(initialAnswer || []);

  useEffect(() => {
    if (activity.options && !submitted && items.length === 0) {
      setItems([...activity.options].sort(() => Math.random() - 0.5));
    }
  }, [activity.options, submitted]);

  const move = (idx, dir) => {
    if (submitted) return;
    const newItems = [...items];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;
    [newItems[idx], newItems[targetIdx]] = [newItems[targetIdx], newItems[idx]];
    setItems(newItems);
  };

  const handleSubmit = () => {
    const isCorrect = JSON.stringify(items) === JSON.stringify(activity.options);
    onSubmit({ userAnswer: items, isCorrect });
  };

  return (
    <div className="space-y-4">
      <p className="font-bold text-lg text-slate-900 dark:text-white leading-relaxed">
        {activity.question}
      </p>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black text-slate-500">
              {idx + 1}
            </span>
            <span className="flex-1 font-bold text-sm text-slate-800 dark:text-slate-200">{item}</span>
            {!submitted && (
              <div className="flex gap-1">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30">
                  <ArrowUp size={16} />
                </button>
                <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30">
                  <ArrowDown size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!submitted && (
        <button onClick={handleSubmit} className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md transition-all">
          Sıralamayı Kontrol Et
        </button>
      )}
      {submitted && result && (
        <ResultBanner
          correct={result.isCorrect}
          explanation={activity.explanation}
          points={activity.points}
          correctAnswer={(activity.options || []).map((o, i) => `${i + 1}. ${o}`).join(' → ')}
        />
      )}
    </div>
  );
}

function MatchingActivity({ activity, onSubmit, submitted, result, initialAnswer }) {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matches, setMatches] = useState(initialAnswer || {});

  const pairs = activity.options || [];

  const handleRightClick = (rightVal) => {
    if (submitted || selectedLeft === null) return;
    
    const updated = { ...matches };
    Object.keys(updated).forEach((k) => {
      if (updated[k] === rightVal) delete updated[k];
    });

    updated[selectedLeft] = rightVal;
    setMatches(updated);
    setSelectedLeft(null);
  };

  const handleCheck = () => {
    const isCorrect = pairs.every((p) => matches[p.left] === p.right);
    onSubmit({ userAnswer: matches, isCorrect });
  };

  return (
    <div className="space-y-4">
      <p className="font-bold text-lg text-slate-900 dark:text-white leading-relaxed">
        {activity.question || 'Kavramları doğru karşılıklarıyla eşleştirin:'}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {pairs.map((p, idx) => {
            const isMatched = Boolean(matches[p.left]);
            const isSelected = selectedLeft === p.left;
            return (
              <button
                key={idx}
                disabled={submitted}
                onClick={() => setSelectedLeft(p.left)}
                className={`w-full p-3 rounded-xl border text-left font-bold text-xs md:text-sm transition-all ${
                  isSelected 
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 text-violet-700' 
                    : isMatched 
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800' 
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200'
                }`}
              >
                {p.left} {matches[p.left] && `→ ${matches[p.left]}`}
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          {pairs.map((p, idx) => {
            const isAssigned = Object.values(matches).includes(p.right);
            return (
              <button
                key={idx}
                disabled={submitted || selectedLeft === null}
                onClick={() => handleRightClick(p.right)}
                className={`w-full p-3 rounded-xl border text-left font-semibold text-xs md:text-sm transition-all ${
                  isAssigned 
                    ? 'border-emerald-500/50 bg-emerald-50/20 text-emerald-700' 
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-400 text-slate-800 dark:text-slate-200'
                }`}
              >
                {p.right}
              </button>
            );
          })}
        </div>
      </div>

      {!submitted && Object.keys(matches).length === pairs.length && (
        <button onClick={handleCheck} className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow-md">
          Eşleştirmeyi Onayla
        </button>
      )}

      {submitted && result && (
        <ResultBanner
          correct={result.isCorrect}
          explanation={activity.explanation}
          points={activity.points}
          correctAnswer={pairs.map((p) => `${p.left} = ${p.right}`).join(', ')}
        />
      )}
    </div>
  );
}

function MemoryCardActivity({ activity, onSubmit, submitted }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  useEffect(() => {
    if (activity.options && !submitted) {
      const deck = [];
      activity.options.forEach((pair, idx) => {
        deck.push({ id: 'l_' + idx, text: pair.left, matchId: idx });
        deck.push({ id: 'r_' + idx, text: pair.right, matchId: idx });
      });
      setCards(deck.sort(() => Math.random() - 0.5));
    }
  }, [activity.options, submitted]);

  const handleCardClick = (idx) => {
    if (submitted || matched.includes(idx) || flipped.includes(idx) || flipped.length === 2) return;
    const nextFlipped = [...flipped, idx];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const card1 = cards[nextFlipped[0]];
      const card2 = cards[nextFlipped[1]];
      if (card1.matchId === card2.matchId) {
        const nextMatched = [...matched, nextFlipped[0], nextFlipped[1]];
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.length === cards.length) {
          setTimeout(() => onSubmit({ userAnswer: 'matched_all', isCorrect: true }), 500);
        }
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  return (
    <div className="space-y-4">
      <p className="font-bold text-lg text-slate-900 dark:text-white leading-relaxed">{activity.question}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(idx) || submitted;
          const isMatched = matched.includes(idx) || submitted;
          return (
            <button
              key={idx}
              onClick={() => handleCardClick(idx)}
              className={`aspect-[4/3] rounded-2xl p-3 flex items-center justify-center font-bold text-xs md:text-sm border-2 transition-all shadow-sm ${
                isMatched 
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' 
                  : isFlipped 
                    ? 'bg-white dark:bg-slate-800 border-violet-500 text-slate-900 dark:text-white' 
                    : 'bg-gradient-to-br from-violet-600 to-indigo-700 border-transparent text-white'
              }`}
            >
              {isFlipped ? card.text : '?'}
            </button>
          );
        })}
      </div>
      {submitted && <ResultBanner correct={true} explanation={activity.explanation} points={activity.points} />}
    </div>
  );
}

function HotspotActivity({ activity, onSubmit, submitted, result, initialAnswer }) {
  const [clickPos, setClickPos] = useState(initialAnswer || null);
  const [imgSrc, setImgSrc] = useState(
    activity.options || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800'
  );

  const handleImageClick = (e) => {
    if (submitted) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setClickPos({ x, y });
  };

  const handleSubmit = () => {
    if (!clickPos) return;
    const target = activity.correct_answer || { x: 50, y: 50 };
    const dist = Math.sqrt(Math.pow(clickPos.x - target.x, 2) + Math.pow(clickPos.y - target.y, 2));
    const isCorrect = dist <= 12;
    onSubmit({ userAnswer: clickPos, isCorrect });
  };

  return (
    <div className="space-y-4">
      <p className="font-bold text-lg text-slate-900 dark:text-white leading-relaxed">
        {activity.question || 'Aşağıdaki resimde ilgili güvenlik zafiyeti / hedef noktasını tıklayınız.'}
      </p>

      <div
        onClick={handleImageClick}
        className="relative inline-block border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden cursor-crosshair shadow-md bg-slate-900"
      >
        <img
          src={imgSrc}
          onError={() => {
            setImgSrc(
              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='350' viewBox='0 0 600 350'><rect fill='%230f172a' width='100%25' height='100%25'/><text fill='%2394a3b8' font-family='sans-serif' font-size='16' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'>Sistem Ağ Şeması (Örnek Görsel)</text></svg>"
            );
          }}
          alt="Hedef"
          className="w-full h-auto max-w-full block select-none"
        />

        {clickPos && (
          <div
            className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-fuchsia-500 bg-fuchsia-500/40 pointer-events-none animate-pulse"
            style={{ left: `${clickPos.x}%`, top: `${clickPos.y}%` }}
          />
        )}

        {submitted && activity.correct_answer && (
          <div
            className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-4 border-emerald-500 bg-emerald-500/30 pointer-events-none z-10"
            style={{ left: `${activity.correct_answer.x}%`, top: `${activity.correct_answer.y}%` }}
          />
        )}
      </div>

      {!submitted && (
        <div>
          <button
            onClick={handleSubmit}
            disabled={!clickPos}
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-sm shadow-md"
          >
            Seçimi Onayla
          </button>
        </div>
      )}

      {submitted && result && (
        <ResultBanner
          correct={result.isCorrect}
          explanation={activity.explanation}
          points={activity.points}
          correctAnswer={activity.correct_answer}
        />
      )}
    </div>
  );
}

function PhishingDetectorActivity({ activity, onSubmit, submitted, result }) {
  const [selectedThreats, setSelectedThreats] = useState([]);
  const emailData = typeof activity.options === 'string' ? JSON.parse(activity.options) : activity.options;

  const toggleThreat = (field) => {
    if (submitted) return;
    if (selectedThreats.includes(field)) {
      setSelectedThreats(selectedThreats.filter((f) => f !== field));
    } else {
      setSelectedThreats([...selectedThreats, field]);
    }
  };

  const handleVerify = () => {
    const isCorrect = selectedThreats.length >= 2;
    onSubmit({ userAnswer: selectedThreats, isCorrect });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-slate-200">{activity.question}</p>
        <span className="text-xs text-amber-400 font-bold">Riskli alanlara tıklayın</span>
      </div>

      <div className="bg-slate-950 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl font-sans">
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Kimden:</span>
            <button
              onClick={() => toggleThreat('sender')}
              className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-all ${
                selectedThreats.includes('sender')
                  ? 'border-rose-500 bg-rose-950/60 text-rose-300 font-bold'
                  : 'border-slate-700 hover:border-slate-500 text-slate-300'
              }`}
            >
              {emailData?.senderDisplay} &lt;{emailData?.sender}&gt;
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Konu:</span>
            <button
              onClick={() => toggleThreat('urgency')}
              className={`text-xs px-2.5 py-1 rounded-md border font-bold transition-all ${
                selectedThreats.includes('urgency')
                  ? 'border-rose-500 bg-rose-950/60 text-rose-300'
                  : 'border-transparent text-slate-200'
              }`}
            >
              {emailData?.subject}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4 text-xs md:text-sm text-slate-300 leading-relaxed">
          <p>{emailData?.body}</p>
          <div className="pt-2">
            <button
              onClick={() => toggleThreat('link')}
              className={`px-4 py-2 rounded-lg border text-xs font-mono transition-all ${
                selectedThreats.includes('link')
                  ? 'border-rose-500 bg-rose-950/60 text-rose-300 font-bold'
                  : 'border-violet-500/40 bg-violet-950/20 text-violet-300 hover:border-violet-400'
              }`}
            >
              🔗 {emailData?.linkText}
            </button>
          </div>
        </div>
      </div>

      {!submitted && (
        <button
          onClick={handleVerify}
          disabled={selectedThreats.length === 0}
          className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold text-xs md:text-sm shadow-md transition-all"
        >
          Şüpheli Unsurları Onayla ({selectedThreats.length} Seçildi)
        </button>
      )}

      {submitted && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/60 text-emerald-200 text-xs leading-relaxed">
          <span className="font-bold block mb-1">Analiz Tamamlandı:</span>
          {activity.explanation}
        </div>
      )}
    </div>
  );
}

export default function ActivityRenderer({ activity, onSubmit, submitted, result, initialAnswer }) {
  const [hints, setHints] = useState([]);
  const [loadingHint, setLoadingHint] = useState(false);
  const [dialogue, setDialogue] = useState([]);
  const [replyInput, setReplyInput] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Etkinlik değiştiğinde önceki ipuçlarını ve diyaloğu temizle
  useEffect(() => {
    setHints([]);
    setDialogue([]);
    setReplyInput('');
    setLoadingHint(false);
    setReplyLoading(false);
  }, [activity?.id, activity?.question]);

  const props = { activity, onSubmit, submitted, result, initialAnswer };

  // İpucu sadece cevaplanabilir soru tiplerinde gösterilir
  const HINTABLE_TYPES = [
    'multiple_choice', 'true_false', 'fill_blank', 'scenario',
    'ordering', 'matching', 'memory_card', 'hotspot', 'phishing_detector'
  ];

  const handleGetHint = async () => {
    if (loadingHint || hints.length >= 3) return;
    setLoadingHint(true);
    const nextLevel = hints.length + 1;
    try {
      const { getSocraticHint } = await import('../../services/aiService');
      const text = await getSocraticHint({
        question: activity.question,
        type: activity.type,
        options: activity.options,
        level: nextLevel,
        rawCorrectAnswer: activity.correct_answer
      });
      setHints((prev) => [...prev, { level: nextLevel, text }]);
    } catch (e) {
      setHints((prev) => [...prev, { level: nextLevel, text: "İpucu şu an alınamıyor: " + (e.message || "Bağlantı hatası") }]);
    } finally {
      setLoadingHint(false);
    }
  };

  const handleSendReply = async (e) => {
    e?.preventDefault();
    const text = replyInput.trim();
    if (!text || replyLoading) return;

    setReplyInput('');
    setReplyLoading(true);
    const userMsg = { role: 'user', text };
    setDialogue((prev) => [...prev, userMsg]);

    try {
      const { chatWithMentor } = await import('../../services/aiService');
      const history = [
        ...hints.map((h) => ({ role: 'assistant', content: `[İpucu Kademe ${h.level}]: ${h.text}` })),
        ...dialogue.map((d) => ({ role: d.role === 'assistant' ? 'assistant' : 'user', content: d.text }))
      ];

      const context = {
        role: 'Öğrenci',
        pageTitle: 'Etkinlik Çözümü Sokratik Rehberlik',
        lessonTitle: activity.question,
        lessonContent: `Soru Türü: ${activity.type}\nSoru Metni: ${activity.question}\nÖğrencinin Yorumu/Cevabı: ${text}\nÖNEMLİ KURAL: Kesinlikle doğru cevabı doğrudan söyleme. Öğrencinin yanıtı doğru yöndeyse doğrula ve tebrik et, yanlışsa onu doğru mantığa sevk edecek kısa bir ipucu ver (maks 2-3 cümle).`
      };

      const aiResponse = await chatWithMentor({
        message: `Öğrencinin soruya cevabı/sorusu: "${text}". Lütfen öğrenciye cevabı doğrudan söylemeden rehberlik et.`,
        history,
        context
      });

      setDialogue((prev) => [...prev, { role: 'assistant', text: aiResponse }]);
    } catch (err) {
      setDialogue((prev) => [...prev, { role: 'assistant', text: 'Yanıt alınamadı: ' + (err.message || 'Lütfen tekrar deneyin.') }]);
    } finally {
      setReplyLoading(false);
    }
  };

  const renderHintBox = () => {
    if (submitted) return null;
    if (!HINTABLE_TYPES.includes(activity.type)) return null;
    if (!activity.question) return null;

    return (
      <div className="mt-4 border-t border-slate-200 dark:border-white/10 pt-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {hints.length < 3 && (
            <button
              onClick={handleGetHint}
              disabled={loadingHint}
              className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              {loadingHint ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                  YZ Düşünüyor...
                </>
              ) : (
                <>
                  <span>💡</span>
                  {hints.length === 0 ? "YZ'den Destek Al" : `Daha Fazla İpucu (${hints.length}/3)`}
                </>
              )}
            </button>
          )}
          {hints.length > 0 && (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Kademeli Rehberlik: {hints.length}/3
            </span>
          )}
        </div>

        {hints.length > 0 && (
          <div className="mt-3 space-y-2">
            {hints.map((h, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent border border-violet-500/20 text-slate-800 dark:text-violet-200 text-xs leading-relaxed animate-in fade-in"
              >
                <div className="flex items-center gap-1.5 font-bold text-violet-600 dark:text-violet-400 mb-1">
                  <span>🤖 YZ Rehberi</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 font-mono">
                    Kademe {h.level}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{h.text}</p>
              </div>
            ))}

            {/* Öğrenci ile YZ Arasındaki Diyalog Mesajları */}
            {dialogue.map((d, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl text-xs leading-relaxed animate-in fade-in ${
                  d.role === 'user'
                    ? 'bg-violet-600/20 border border-violet-500/30 text-violet-200 ml-4'
                    : 'bg-slate-800/80 border border-white/10 text-slate-200 mr-4'
                }`}
              >
                <span className="font-bold text-[10px] uppercase tracking-wider block mb-0.5 opacity-75">
                  {d.role === 'user' ? 'Sen:' : '🤖 YZ Yanıtı:'}
                </span>
                <p className="whitespace-pre-wrap">{d.text}</p>
              </div>
            ))}

            {/* Yükleniyor Göstergesi */}
            {replyLoading && (
              <div className="p-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-xs text-slate-400 flex items-center gap-2 mr-4">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                <span>YZ yanıtını düşünüyor...</span>
              </div>
            )}

            {/* İnteraktif Soru-Cevap / Yanıt Giriş Kutusu */}
            <form onSubmit={handleSendReply} className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                disabled={replyLoading}
                placeholder="YZ'ye cevap ver veya ipucu hakkında soru sor..."
                className="flex-1 bg-slate-100 dark:bg-slate-900 border border-violet-500/30 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={!replyInput.trim() || replyLoading}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1 shrink-0"
              >
                {replyLoading ? (
                  <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <span>Gönder</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

  switch (activity.type) {
    case 'multiple_choice':
      return <div><MultipleChoiceActivity {...props} />{renderHintBox()}</div>;
    case 'true_false':
      return <div><TrueFalseActivity {...props} />{renderHintBox()}</div>;
    case 'fill_blank':
      return <div><FillBlankActivity {...props} />{renderHintBox()}</div>;
    case 'youtube':
      return <div><YoutubeActivity {...props} />{renderHintBox()}</div>;
    case 'scenario':
      return <div><ScenarioActivity {...props} />{renderHintBox()}</div>;
    case 'ordering':
      return <div><OrderingActivity {...props} />{renderHintBox()}</div>;
    case 'matching':
      return <div><MatchingActivity {...props} />{renderHintBox()}</div>;
    case 'memory_card':
      return <div><MemoryCardActivity {...props} />{renderHintBox()}</div>;
    case 'hotspot':
      return <div><HotspotActivity {...props} />{renderHintBox()}</div>;
    case 'phishing_detector':
      return <div><PhishingDetectorActivity {...props} />{renderHintBox()}</div>;
    default:
      return (
        <div>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500 text-amber-800 dark:text-amber-300 font-bold text-sm">
            Etkinlik tipi: {activity.type}
          </div>
          {renderHintBox()}
        </div>
      );
  }
}