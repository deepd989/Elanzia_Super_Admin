import { cn } from '@/utils/cn';

// A count or a short label. Status uses StatusPill instead - a badge carries
// no meaning about how a thing is going.
const TONES = {
  primary: 'bg-primary text-onAction',
  accent: 'bg-accent text-accent-on',
  danger: 'bg-danger-bg text-danger-fg',
  neutral: 'bg-neutral-surface text-neutral border border-neutral-border',
};

export default function Badge({ tone = 'neutral', className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5',
        'font-body text-micro font-semibold tabular-nums',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
