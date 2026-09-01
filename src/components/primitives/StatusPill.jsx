import { cn } from '@/utils/cn';
import { humanise } from '@/utils/format';

// The design system has exactly four tones. Everything a feature area wants
// to say about a status has to land on one of them, which is what stops the
// portal from growing a fifth colour every time a new status appears.
//
// Each tone is a foreground / surface / border triple, so it stays legible
// when the aliases are remapped for dark mode.
const POSITIVE = 'bg-success-surface text-success border-success-border';
const ATTENTION = 'bg-warning-surface text-warning border-warning-border';
const NEGATIVE = 'bg-danger-surface text-danger border-danger-border';
const NEUTRAL = 'bg-neutral-surface text-neutral border-neutral-border';

const TONES = {
  success: POSITIVE,
  warning: ATTENTION,
  danger: NEGATIVE,
  neutral: NEUTRAL,

  // The vocabulary the screens were written against, mapped onto the four.
  primary: POSITIVE, // an active or current thing is going well
  accent: ATTENTION, // gold means look at this, which is attention
  info: NEUTRAL, // a note carries no verdict
  outline: NEUTRAL,
  inverse: NEUTRAL,
};

const SIZES = {
  sm: 'h-5 px-2 text-micro',
  md: 'h-6 px-2.5 text-micro',
};

export default function StatusPill({
  tone = 'neutral',
  size = 'md',
  dot = false,
  label,
  children,
  className,
}) {
  const text = children ?? humanise(label);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-body font-semibold',
        TONES[tone] ?? NEUTRAL,
        SIZES[size],
        className,
      )}
    >
      {dot ? <span className="h-[5px] w-[5px] rounded-full bg-current" aria-hidden="true" /> : null}
      {text}
    </span>
  );
}
