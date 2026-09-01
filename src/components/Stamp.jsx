import { cn } from '@/utils/cn';

// The stamp replaces every coloured left border in the portal. A card or a
// banner never carries a tinted edge to say how a thing is going - it carries
// one of these, and a stamp always carries the date it was made.
//
// It sits square. No rotation, no skew.
const TONES = {
  neutral: 'text-link',
  positive: 'text-success',
  attention: 'text-warning',
  negative: 'text-danger',
};

export default function Stamp({ tone = 'neutral', label, date, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-xs border-2 border-current bg-white px-2.5 py-[5px]',
        'font-body text-micro font-bold',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      <span>{label}</span>
      {date ? <span className="font-semibold tabular-nums opacity-75">{date}</span> : null}
    </span>
  );
}
