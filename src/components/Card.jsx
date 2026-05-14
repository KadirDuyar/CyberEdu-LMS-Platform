/**
 * Card – Glassmorphism kart bileşeni.
 *
 * Props:
 *  glow   : 'purple' | 'pink' | 'cyan' | 'emerald' | 'amber' | false
 *  hover  : boolean (hover lift efekti)
 *  padding: 'sm' | 'md' | 'lg'
 */
export default function Card({
  children,
  glow = false,
  hover = false,
  padding = 'md',
  className = '',
  ...props
}) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const glows = {
    purple:  'shadow-[0_0_30px_rgba(124,58,237,0.3)]',
    pink:    'shadow-[0_0_30px_rgba(236,72,153,0.3)]',
    cyan:    'shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    emerald: 'shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    amber:   'shadow-[0_0_30px_rgba(245,158,11,0.3)]',
  };

  return (
    <div
      className={[
        'glass rounded-2xl',
        paddings[padding],
        hover ? 'card-lift cursor-pointer' : '',
        glow && glows[glow] ? glows[glow] : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
