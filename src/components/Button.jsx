/**
 * Button – Yeniden kullanılabilir buton bileşeni.
 *
 * Props:
 *  variant  : 'primary' | 'secondary' | 'ghost' | 'danger'
 *  size     : 'sm' | 'md' | 'lg'
 *  fullWidth: boolean
 *  loading  : boolean
 *  icon     : ReactNode (solda görünür)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon = null,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-bold rounded-xl ' +
    'transition-all duration-200 active:scale-95 select-none cursor-pointer ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm:  'px-4 py-2 text-sm',
    md:  'px-6 py-3 text-base',
    lg:  'px-8 py-4 text-lg',
  };

  const variants = {
    primary:
      'text-white bg-gradient-to-r from-violet-600 to-pink-500 ' +
      'shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5',
    secondary:
      'text-white bg-white/10 border border-white/15 ' +
      'hover:bg-white/20 hover:border-white/25',
    ghost:
      'text-slate-300 hover:text-white hover:bg-white/10',
    danger:
      'text-white bg-gradient-to-r from-rose-600 to-red-500 ' +
      'shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:-translate-y-0.5',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}
