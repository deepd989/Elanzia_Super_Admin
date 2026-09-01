import { cn } from '@/utils/cn';

// Four variants, and that is the whole set. A button is never a pill: radius
// is the 8px work-layer step, the same one inputs and menu items use.
const VARIANTS = {
  primary: 'bg-primary text-onAction hover:bg-primary-dark active:bg-primary-light',
  secondary:
    'bg-white text-link border-border-strong hover:bg-surface-hover hover:border-charcoal-lighter active:bg-surface-selected',
  ghost: 'bg-transparent text-link hover:bg-surface-hover',
  danger: 'bg-danger-bg text-danger-fg hover:bg-danger-bgHover',
};

// Height comes from the density variable, so the same button is 44px on the
// Marketplace and 32px in this console without a call site changing. `lg`
// buys horizontal weight, not height - a console stays on one control height.
const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-control px-[18px] text-sm gap-2',
  lg: 'h-control px-6 text-sm gap-2',
  xl: 'h-control px-8 text-sm gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  iconLeft: IconLeft,
  iconRight: IconRight,
  fullWidth = false,
  className,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center whitespace-nowrap rounded-sm border border-transparent',
        'font-body font-bold transition-colors duration-hover ease-standard',
        'focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
        // Disabled is a sunken surface, never a faded primary - a washed-out
        // brand colour reads as a rendering fault.
        'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-sunken disabled:text-charcoal-lighter',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth && 'w-full',
        loading && 'text-transparent',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute h-3.5 w-3.5 animate-spin rounded-full border-2 border-transparent',
            variant === 'primary' ? 'border-t-onAction' : 'border-t-link',
          )}
        />
      ) : null}
      {!loading && IconLeft ? <IconLeft size={15} aria-hidden="true" /> : null}
      {children}
      {!loading && IconRight ? <IconRight size={15} aria-hidden="true" /> : null}
    </button>
  );
}
