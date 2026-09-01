import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatPercent } from '@/utils/format';
import Spinner from './primitives/Spinner';

// A single dashboard number. The screen formats the value before passing it
// in, so this component never has to know whether it is money or grams.
//
// trend: { direction: 'up'|'down'|'flat', value: number, label: string }
// A rising refund rate is bad, so the screen states whether up is good via
// `invertTrend` rather than this component guessing.
export default function MetricTile({
  label,
  value,
  caption,
  icon: Icon,
  trend,
  invertTrend = false,
  loading = false,
  onClick,
  className,
}) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border border-border bg-white p-card text-left',
        onClick && 'transition-colors duration-hover ease-standard hover:border-border-strong hover:bg-surface-hover focus:outline-none focus-visible:shadow-focus',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-body text-label font-bold text-charcoal-tertiary">{label}</span>
        {Icon ? <Icon size={16} className="shrink-0 text-charcoal-lighter" aria-hidden="true" /> : null}
      </div>

      {loading ? (
        <div className="flex h-8 items-center">
          <Spinner size="sm" />
        </div>
      ) : (
        <span className="font-heading text-h2 leading-none text-charcoal num">{value}</span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {trend && !loading ? <Trend trend={trend} invert={invertTrend} /> : null}
        {caption ? <span className="text-micro text-charcoal-light">{caption}</span> : null}
      </div>
    </Tag>
  );
}

function Trend({ trend, invert }) {
  const { direction, value, label } = trend;
  const isFlat = direction === 'flat';
  const isGood = isFlat ? null : (direction === 'up') !== invert;

  const Icon = isFlat ? Minus : direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-micro font-semibold num',
        isFlat ? 'text-charcoal-tertiary' : isGood ? 'text-success' : 'text-danger',
      )}
    >
      <Icon size={13} aria-hidden="true" />
      {value != null ? formatPercent(Math.abs(value)) : null}
      {label ? <span className="ml-1 font-normal text-charcoal-light">{label}</span> : null}
    </span>
  );
}
