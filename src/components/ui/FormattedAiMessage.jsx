import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Satır içi Markdown vurguları: **kalın**, *italik*, `kod`.
 * Ayrıca tırnak içi veya kelime etrafındaki başıboş yıldız (*) ve çizgi artıklarını temizler.
 */
export function renderInlineStyles(text) {
  if (!text) return null;

  // 1. Tırnak işaretlerinin etrafındaki veya içindeki tuhaf yıldız kombinasyonlarını temizle
  // örn: "*Bu sorunun amacı:*" -> "Bu sorunun amacı:"
  let cleanText = text
    .replace(/"\*(.*?)\*"/g, '"$1"')
    .replace(/“\*(.*?)\*”/g, '“$1”')
    .replace(/'\*(.*?)\*'/g, "'$1'");

  // 2. Tokenize: **kalın**, *italik*, `kod`
  const tokens = cleanText.split(/(\*\*[\s\S]*?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g);

  return tokens.map((token, i) => {
    if (!token) return null;

    // **Kalın**
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-violet-200">
          {token.slice(2, -2)}
        </strong>
      );
    }

    // `Kod`
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/70 text-violet-800 dark:text-violet-300 font-mono text-xs border border-violet-200 dark:border-violet-800/40"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    // *İtalik / Hafif Vurgu*
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={i} className="italic font-medium text-violet-900 dark:text-violet-200">
          {token.slice(1, -1)}
        </em>
      );
    }

    // Başıboş tek yıldızları temizle (kelime arası değilse)
    const sanitized = token.replace(/(^|\s)\*(\s|$)/g, '$1$2');
    return sanitized;
  });
}

function isTableRow(line) {
  const trimmed = line.trim();
  return (trimmed.startsWith('|') && trimmed.includes('|', 1)) || trimmed.split('|').length >= 3;
}

function isTableSeparator(line) {
  const trimmed = line.trim();
  return /^\|?(\s*:?-{2,}:?\s*\|?)+$/.test(trimmed);
}

function parseRowCells(line) {
  const trimmed = line.trim();
  const rawCells = trimmed.split('|');
  const cells = rawCells.map((c) => c.trim());
  if (trimmed.startsWith('|') && cells[0] === '') cells.shift();
  if (trimmed.endsWith('|') && cells[cells.length - 1] === '') cells.pop();
  return cells;
}

/**
 * Tablo satırlarını toplayıp şık, yatay kaydırılabilir modern bir tablo veya kart şeklinde render eder.
 */
function RenderTable({ rows }) {
  if (!rows || rows.length === 0) return null;

  let separatorIndex = -1;
  const parsedRows = [];

  rows.forEach((r, idx) => {
    if (isTableSeparator(r)) {
      separatorIndex = idx;
    } else {
      parsedRows.push({ originalIdx: idx, cells: parseRowCells(r) });
    }
  });

  const hasHeader = separatorIndex > 0;
  const headerRow = hasHeader ? parsedRows[0] : null;
  const bodyRows = hasHeader ? parsedRows.slice(1) : parsedRows;

  return (
    <div className="my-2.5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/70 shadow-sm max-w-full">
      <table className="w-full text-xs text-left border-collapse min-w-[280px]">
        {hasHeader && headerRow && (
          <thead className="bg-slate-100/90 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
            <tr>
              {headerRow.cells.map((cell, cIdx) => (
                <th
                  key={cIdx}
                  className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap"
                >
                  {renderInlineStyles(cell)}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
          {bodyRows.map((rowObj, rIdx) => (
            <tr
              key={rIdx}
              className="hover:bg-slate-100/50 dark:hover:bg-white/5 transition-colors"
            >
              {rowObj.cells.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className="px-3 py-2 text-slate-700 dark:text-slate-300 align-top leading-relaxed"
                >
                  {renderInlineStyles(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Ana FormattedAiMessage Bileşeni
 */
export default function FormattedAiMessage({ text, className = '' }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyCode = (code, idx) => {
    navigator.clipboard?.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!text) return null;

  // 1. Kod bloklarını ayır
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-2 text-sm leading-relaxed break-words ${className}`}>
      {parts.map((part, idx) => {
        // Kod bloğu
        if (part.startsWith('```') && part.endsWith('```')) {
          const raw = part.slice(3, -3);
          const langMatch = raw.match(/^[a-z0-9_-]+/i);
          const lang = langMatch ? langMatch[0] : '';
          const code = lang ? raw.slice(lang.length).trim() : raw.trim();

          return (
            <div
              key={idx}
              className="my-3 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-md"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono uppercase font-bold text-violet-400 text-[11px]">
                  {lang || 'KOD'}
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(code, idx)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-[11px]"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Kopyalandı</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Kopyala</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-emerald-400 font-mono text-xs overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        // Satır bazlı blokları işle (tablolar, başlıklar, listeler, paragraflar)
        const lines = part.split('\n');
        const elements = [];
        let tableBuffer = [];

        const flushTable = () => {
          if (tableBuffer.length > 0) {
            elements.push(<RenderTable key={`tbl-${elements.length}`} rows={[...tableBuffer]} />);
            tableBuffer = [];
          }
        };

        lines.forEach((line, lIdx) => {
          const trimmed = line.trim();

          // Tablo satırı mı?
          if (isTableRow(trimmed) || (tableBuffer.length > 0 && isTableSeparator(trimmed))) {
            tableBuffer.push(trimmed);
            return;
          }

          // Tablo bittiyse flush et
          flushTable();

          if (!trimmed) return;

          // Markdown Başlıkları
          if (trimmed.startsWith('### ')) {
            elements.push(
              <h4 key={lIdx} className="font-bold text-sm md:text-base text-violet-700 dark:text-violet-300 pt-1.5">
                {renderInlineStyles(trimmed.slice(4))}
              </h4>
            );
            return;
          }
          if (trimmed.startsWith('## ')) {
            elements.push(
              <h3 key={lIdx} className="font-black text-base md:text-lg text-slate-900 dark:text-white pt-2">
                {renderInlineStyles(trimmed.slice(3))}
              </h3>
            );
            return;
          }
          if (trimmed.startsWith('# ')) {
            elements.push(
              <h2 key={lIdx} className="font-black text-lg md:text-xl text-slate-900 dark:text-white pt-2.5">
                {renderInlineStyles(trimmed.slice(2))}
              </h2>
            );
            return;
          }

          // Madde imi listesi (*, -, •)
          if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            const itemText = trimmed.replace(/^[*•-]\s+/, '');
            elements.push(
              <div key={lIdx} className="flex items-start gap-2 pl-2">
                <span className="text-violet-600 dark:text-violet-400 mt-1 font-bold leading-none shrink-0">•</span>
                <span className="text-slate-800 dark:text-slate-200">{renderInlineStyles(itemText)}</span>
              </div>
            );
            return;
          }

          // Numaralı liste (1., 2. vs)
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            elements.push(
              <div key={lIdx} className="flex items-start gap-2 pl-2">
                <span className="text-violet-700 dark:text-violet-400 font-bold text-xs mt-0.5 shrink-0">
                  {numMatch[1]}.
                </span>
                <span className="text-slate-800 dark:text-slate-200">{renderInlineStyles(numMatch[2])}</span>
              </div>
            );
            return;
          }

          // Normal paragraf
          elements.push(
            <p key={lIdx} className="text-slate-800 dark:text-slate-200">
              {renderInlineStyles(line)}
            </p>
          );
        });

        flushTable();

        return (
          <div key={idx} className="space-y-1.5">
            {elements}
          </div>
        );
      })}
    </div>
  );
}
