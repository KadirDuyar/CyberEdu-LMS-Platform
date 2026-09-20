/**
 * ProgressBar – Yeniden kullanılabilir ilerleme çubuğu.
 *
 * Props:
 *  value      : number (0–100)
 *  label      : string (isteğe bağlı üst yazı)
 *  showPercent: boolean
 *  color      : 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose'
 *  size       : 'sm' | 'md'
 */
const COLORS = {
  violet:  'from-violet-500 to-pink-500',
  cyan:    'from-cyan-500 to-blue-500',
  emerald: 'from-emerald-500 to-teal-400',
  amber:   'from-amber-500 to-orange-400',
  rose:    'from-rose-500 to-pink-500',
};

export default function ProgressBar({
  value = 0,
  label = '',
  showPercent = false,
  color = 'violet',
  size = 'md',
}) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const gradient     = COLORS[color] || COLORS.violet;
  const height       = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className="space-y-1">
      {(label || showPercent) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
          {showPercent && (
            <span className="text-xs text-slate-400 font-bold">{clampedValue}%</span>
          )}
        </div>
      )}
      <div className={`${height} bg-white/10 rounded-full overflow-hidden`}>
        <div
          className={`${height} rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
