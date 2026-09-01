import { cn } from '@/utils/cn';

// A document is not a card. Radius 0 and a 1.5px near-black edge, because a
// price slip, an invoice, a hallmark certificate and a rate board are records
// of what was agreed - they should read as paper, not as UI.
//
// Nothing inside a document frame may round its corners.
export default function DocumentFrame({ title, meta, footer, className, children }) {
  return (
    <article className={cn('rounded-none border-2 border-charcoal bg-white', className)}>
      {title || meta ? (
        <header className="flex items-start justify-between gap-3 border-b border-border-strong px-4 py-3">
          <div className="min-w-0">{title}</div>
          {meta ? (
            <div className="shrink-0 text-right text-micro font-semibold tabular-nums text-charcoal-tertiary">
              {meta}
            </div>
          ) : null}
        </header>
      ) : null}

      {children}

      {footer ? (
        <footer className="border-t border-border-strong px-4 py-3">{footer}</footer>
      ) : null}
    </article>
  );
}

// One line of a slip: a key on the left, a figure on the right. `fold` draws
// the rule that separates a running total from what follows it.
export function DocumentLine({ label, hint, value, fold = false, emphasis = false, className }) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3.5 py-[5px] text-sm',
        fold && 'border-t border-charcoal pt-2 mt-1',
        className,
      )}
    >
      <span className="min-w-0">
        <span className={emphasis ? 'font-semibold text-charcoal' : 'text-charcoal-light'}>
          {label}
        </span>
        {hint ? <span className="ml-2 text-micro text-charcoal-lighter num">{hint}</span> : null}
      </span>
      <span
        className={cn(
          'shrink-0 whitespace-nowrap tabular-nums',
          emphasis ? 'font-bold text-charcoal' : 'font-medium text-charcoal',
        )}
      >
        {value}
      </span>
    </div>
  );
}
