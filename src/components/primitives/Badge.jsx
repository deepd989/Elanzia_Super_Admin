import { cn } from '@/utils/cn';

// A count or short tag. StatusPill carries lifecycle state; Badge carries a
// number or a label with no status meaning.
const TONES = {
  neutral: 'bg-lightGray-dark text-charcoal',
  primary: 'bg-primary text-white',
  accent: 'bg-accent text-primary',
  danger: 'bg-danger text-white',
  outline: 'border border-lightGray-dark bg-white text-charcoal-light',
};

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5',
        'font-body text-xs font-semibold tabular-nums',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
