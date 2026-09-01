import { cn } from '@/utils/cn';

// Radius 12 - the conversation layer, alongside panels, banners and modals.
// A card carries no shadow and no coloured left border: it separates from the
// page with a hairline, and anything it needs to say about state it says with
// a stamp or a status pill inside it.
export default function Card({ title, description, action, padded = true, className, children }) {
  const hasHeader = title || description || action;

  return (
    <section className={cn('rounded-md border border-border bg-white', className)}>
      {hasHeader ? (
        <header className="flex items-start justify-between gap-4 border-b border-border px-card py-3">
          <div className="min-w-0">
            {title ? <h3 className="font-heading text-h3 leading-tight">{title}</h3> : null}
            {description ? (
              <p className="mt-1 text-sm text-charcoal-light">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div className={cn(padded && 'p-card')}>{children}</div>
    </section>
  );
}
