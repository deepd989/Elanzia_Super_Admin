import { cn } from '@/utils/cn';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-dark disabled:bg-charcoal-lighter',
  secondary:
    'bg-white text-primary border border-lightGray-dark hover:bg-lightGray disabled:text-charcoal-lighter',
  accent: 'bg-accent text-primary hover:bg-accent-dark disabled:bg-lightGray-darker',
  danger: 'bg-danger text-white hover:opacity-90 disabled:bg-charcoal-lighter',
  ghost: 'bg-transparent text-primary hover:bg-lightGray disabled:text-charcoal-lighter',
  link: 'bg-transparent text-info underline underline-offset-2 hover:text-primary p-0 h-auto',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-base gap-2',
  lg: 'h-12 px-6 text-md gap-2',
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
      className={cn(
        'inline-flex items-center justify-center rounded font-body font-medium transition-colors',
        'focus:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed',
        VARIANTS[variant],
        variant !== 'link' && SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size="sm" tone={variant === 'secondary' ? 'primary' : 'inverse'} /> : null}
      {!loading && IconLeft ? <IconLeft size={16} aria-hidden="true" /> : null}
      {children}
      {IconRight ? <IconRight size={16} aria-hidden="true" /> : null}
    </button>
  );
}
