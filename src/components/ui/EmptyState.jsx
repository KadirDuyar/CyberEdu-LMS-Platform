/**
 * EmptyState – Veri olmadığında gösterilen boş durum bileşeni.
 *
 * Props:
 *  emoji  : string
 *  title  : string
 *  desc   : string
 *  action : { label: string, onClick: fn } (isteğe bağlı)
 */
export default function EmptyState({
  emoji = '📭',
  title = 'Henüz içerik yok',
  desc = '',
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="text-6xl animate-float">{emoji}</div>
      <div className="space-y-1">
        <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
        {desc && (
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xs mx-auto">{desc}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-violet-500/30"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
