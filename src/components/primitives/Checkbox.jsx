import { cn } from '@/utils/cn';

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
          'mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-lightGray-dark accent-primary',
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
              'font-body text-base leading-tight text-charcoal',
              disabled ? 'cursor-not-allowed text-charcoal-lighter' : 'cursor-pointer',
            )}
          >
            {label}
          </label>
          {help ? <span className="text-xs text-charcoal-light">{help}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
