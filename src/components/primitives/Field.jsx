import { cn } from '@/utils/cn';

// Label, help text and error message wrapper shared by Input, Select,
// Textarea and Checkbox so form rows line up across every screen.
export default function Field({ id, label, help, error, required, className, children }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="font-body text-sm font-medium text-charcoal">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-xs text-charcoal-light">
          {help}
        </p>
      ) : null}
    </div>
  );
}

// The shared control chrome. Exported so each control stays a thin wrapper.
export const controlClasses = (error, disabled) =>
  cn(
    'w-full rounded border bg-white px-3 font-body text-base text-charcoal',
    'placeholder:text-charcoal-lighter focus:outline-none focus-visible:shadow-focus',
    error ? 'border-danger' : 'border-lightGray-dark focus:border-primary',
    disabled && 'cursor-not-allowed bg-lightGray text-charcoal-lighter',
  );
