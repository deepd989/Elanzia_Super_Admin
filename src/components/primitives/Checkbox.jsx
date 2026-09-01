import { cn } from '@/utils/cn';

// Radius 4 - a checkbox is a stamp, not a pill. Radios and toggles are pills.
export default function Checkbox({
  id,
  label,
  help,
  disabled,
  indeterminate = false,
  className,
  ...rest
}) {
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={id}
        type="checkbox"
        disabled={disabled}
        ref={(node) => {
          if (node) node.indeterminate = indeterminate;
        }}
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 rounded-xs border border-border-strong accent-primary',
          'focus:outline-none focus-visible:shadow-focus',
          disabled && 'cursor-not-allowed opacity-50',
        )}
        {...rest}
      />
      {label ? (
        <div className="flex flex-col">
          <label
            htmlFor={id}
            className={cn(
              'font-body text-body leading-tight text-charcoal',
              disabled ? 'cursor-not-allowed text-charcoal-lighter' : 'cursor-pointer',
            )}
          >
            {label}
          </label>
          {help ? <span className="text-micro text-charcoal-tertiary">{help}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
