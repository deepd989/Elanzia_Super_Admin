import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import Field, { controlClasses } from './Field';

// options: [{ value, label }]
export default function Select({
  id,
  label,
  help,
  error,
  required,
  disabled,
  options = [],
  placeholder,
  className,
  ...rest
}) {
  return (
    <Field id={id} label={label} help={help} error={error} required={required} className={className}>
      <div className="relative">
        <select
          id={id}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
          className={cn(controlClasses(error, disabled), 'h-control appearance-none pr-9')}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-light"
        />
      </div>
    </Field>
  );
}
