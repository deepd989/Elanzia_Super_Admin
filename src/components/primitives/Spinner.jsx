import { cn } from '@/utils/cn';

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
};

const TONES = {
  primary: 'border-primary/25 border-t-primary',
  accent: 'border-accent/30 border-t-accent',
  inverse: 'border-onAction/30 border-t-onAction',
};

export default function Spinner({ size = 'md', tone = 'primary', label = 'Loading', className }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block animate-spin rounded-full', SIZES[size], TONES[tone], className)}
    />
  );
}
