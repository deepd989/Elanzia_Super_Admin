import { cn } from '@/utils/cn';
import { humanise } from '@/utils/format';

// Tones, not statuses. Feature areas map their own status vocabulary onto a
// tone so a new status never needs an edit here.
const TONES = {
  neutral: 'bg-lightGray text-charcoal-light border-lightGray-dark',
  info: 'bg-info-surface text-info border-info/25',
  success: 'bg-success-surface text-success border-success/25',
  warning: 'bg-warning-surface text-warning border-warning/25',
  danger: 'bg-danger-surface text-danger border-danger/25',
  accent: 'bg-accent-light/40 text-accent-dark border-accent/40',
};

const SIZES = {
  sm: 'h-5 px-2 text-xs',
  md: 'h-6 px-2.5 text-xs',
};

export default function StatusPill({ tone = 'neutral', size = 'md', dot = false, label, children, className }) {
  const text = children ?? humanise(label);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-body font-medium',
        TONES[tone] ?? TONES.neutral,
        SIZES[size],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {text}
    </span>
  );
}
