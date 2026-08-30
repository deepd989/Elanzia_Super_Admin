import { cn } from '@/utils/cn';
import Field, { controlClasses } from './Field';

export default function Input({
  id,
  label,
  help,
  error,
  required,
  disabled,
  iconLeft: IconLeft,
  className,
  ...rest
}) {
  return (
    <Field id={id} label={label} help={help} error={error} required={required} className={className}>
      <div className="relative">
        {IconLeft ? (
          <IconLeft
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-lighter"
          />
        ) : null}
        <input
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          className={cn(controlClasses(error, disabled), 'h-10', IconLeft && 'pl-9')}
          {...rest}
        />
      </div>
    </Field>
  );
}
