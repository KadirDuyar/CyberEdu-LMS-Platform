/**
 * LoadingSpinner – Supabase veri yüklenirken kullanılan spinner bileşeni.
 *
 * Props:
 *  size    : 'sm' | 'md' | 'lg'
 *  message : string (isteğe bağlı yükleme mesajı)
 *  fullPage: boolean (tam sayfa ortala)
 */
export default function LoadingSpinner({
  size = 'md',
  message = '',
  fullPage = false,
}) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <svg
        className={`animate-spin text-violet-400 ${sizes[size]}`}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      {message && (
        <p className="text-slate-400 text-sm">{message}</p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
