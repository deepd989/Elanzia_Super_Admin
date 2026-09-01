import { cn } from '@/utils/cn';

// Label, help text and error message wrapper shared by Input, Select,
// Textarea and Checkbox so form rows line up across every screen.
//
// The label is persistent and sits above the control. Placeholder text is
// never the label - it disappears exactly when the user needs it.
export default function Field({ id, label, help, error, required, className, children }) {
  return (
    <div className={cn('flex min-w-[190px] flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={id} className="font-body text-label font-bold text-charcoal">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}

      {children}

      {error ? (
        <p id={`${id}-error`} className="text-micro font-semibold text-danger">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-micro font-semibold text-charcoal-tertiary">
          {help}
        </p>
      ) : null}
    </div>
  );
}

// The shared control chrome. Exported so each control stays a thin wrapper.
export const controlClasses = (error, disabled) =>
  cn(
    'w-full rounded-sm border bg-white px-3 font-body text-body text-charcoal',
    'placeholder:text-charcoal-lighter transition-[border-color,box-shadow] duration-hover ease-standard',
    'focus:outline-none',
    error
      ? 'border-danger focus:border-danger focus:shadow-focus-error'
      : 'border-border-strong hover:border-charcoal-lighter focus:border-border-focus focus:shadow-focus',
    disabled && 'cursor-not-allowed border-border bg-surface-sunken text-charcoal-lighter',
  );
