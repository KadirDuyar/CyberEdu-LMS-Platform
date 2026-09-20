/**
 * Badge – XP, rol ve başarı rozetleri için bileşen.
 *
 * Props:
 *  variant: 'xp' | 'role' | 'category' | 'status' | 'level'
 *  label  : string
 *  emoji  : string (isteğe bağlı)
 *  color  : 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'orange' | 'slate'
 *  size   : 'xs' | 'sm'
 */
const COLORS = {
  violet:  'text-violet-400 bg-violet-500/15 border-violet-500/30',
  cyan:    'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  emerald: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  amber:   'text-amber-400 bg-amber-500/15 border-amber-500/30',
  rose:    'text-rose-400 bg-rose-500/15 border-rose-500/30',
  orange:  'text-orange-400 bg-orange-500/15 border-orange-500/30',
  slate:   'text-slate-500 bg-slate-700/50 border-slate-600/30',
};

const ROLE_CONFIG = {
  student: { label: 'Öğrenci', color: 'violet', emoji: '🚀' },
  teacher: { label: 'Öğretmen', color: 'cyan',  emoji: '🎓' },
  admin:   { label: 'Admin',   color: 'amber',  emoji: '⚙️' },
};

const CATEGORY_CONFIG = {
  awareness: { label: 'Farkındalık', color: 'cyan',   emoji: '🛡️' },
  technical: { label: 'Teknik',      color: 'orange', emoji: '⚔️' },
};

const LEVEL_CONFIG = {
  beginner:     { label: 'Başlangıç', color: 'emerald' },
  intermediate: { label: 'Orta',      color: 'amber'   },
  advanced:     { label: 'İleri',     color: 'rose'    },
};

export default function Badge({
  variant = 'custom',
  label,
  emoji,
  color = 'violet',
  size = 'sm',
  // Önceden tanımlı varyantlar için değer
  value,
}) {
  let resolvedLabel = label;
  let resolvedEmoji = emoji;
  let resolvedColor = color;

  if (variant === 'role' && value) {
    const cfg = ROLE_CONFIG[value];
    resolvedLabel = cfg?.label || value;
    resolvedEmoji = cfg?.emoji;
    resolvedColor = cfg?.color || color;
  } else if (variant === 'category' && value) {
    const cfg = CATEGORY_CONFIG[value];
    resolvedLabel = cfg?.label || value;
    resolvedEmoji = cfg?.emoji;
    resolvedColor = cfg?.color || color;
  } else if (variant === 'level' && value) {
    const cfg = LEVEL_CONFIG[value];
    resolvedLabel = cfg?.label || value;
    resolvedColor = cfg?.color || color;
  } else if (variant === 'xp') {
    resolvedEmoji = '⚡';
    resolvedColor = 'amber';
  }

  const colorCls = COLORS[resolvedColor] || COLORS.violet;
  const sizeCls  = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${colorCls} ${sizeCls}`}>
      {resolvedEmoji && <span>{resolvedEmoji}</span>}
      {resolvedLabel}
    </span>
  );
}
