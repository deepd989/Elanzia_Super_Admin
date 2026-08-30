import { cn } from '@/utils/cn';

export default function Card({ title, description, action, padded = true, className, children }) {
  const hasHeader = title || description || action;

  return (
    <section className={cn('rounded-md border border-lightGray-dark bg-white shadow-sm', className)}>
      {hasHeader ? (
        <header className="flex items-start justify-between gap-4 border-b border-lightGray-dark px-5 py-4">
          <div className="min-w-0">
            {title ? <h3 className="font-display text-lg leading-tight">{title}</h3> : null}
            {description ? (
              <p className="mt-1 text-sm text-charcoal-light">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}

      <div className={cn(padded && 'p-5')}>{children}</div>
    </section>
  );
}
