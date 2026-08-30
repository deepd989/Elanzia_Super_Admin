import { cn } from '@/utils/cn';

// The top of every screen. Title, optional subtitle and eyebrow, and a slot
// for the screen's primary actions on the right.
export default function PageHeader({ eyebrow, title, subtitle, actions, meta, className }) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 font-body text-xs font-semibold uppercase tracking-wide text-charcoal-light">
            {eyebrow}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl leading-tight">{title}</h1>
          {meta}
        </div>

        {subtitle ? <p className="mt-1.5 max-w-2xl text-base text-charcoal-light">{subtitle}</p> : null}
      </div>

      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
