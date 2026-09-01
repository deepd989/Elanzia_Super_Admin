import { cn } from '@/utils/cn';
import Field, { controlClasses } from './Field';

export default function Textarea({
  id,
  label,
  help,
  error,
  required,
  disabled,
  rows = 4,
  className,
  ...rest
}) {
  return (
    <Field id={id} label={label} help={help} error={error} required={required} className={className}>
      <textarea
        id={id}
        rows={rows}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        className={cn(controlClasses(error, disabled), 'min-h-[84px] resize-y py-2.5 leading-normal')}
        {...rest}
      />
    </Field>
  );
}
