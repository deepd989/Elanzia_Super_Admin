import { AlertOctagon, RotateCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';
import { t } from '@/i18n/en';

export default function ErrorState({
  title = t('states.errorTitle'),
  body = t('states.errorBody'),
  detail,
  onRetry,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center border-t border-border px-5 py-12 text-center', className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-surface text-danger">
        <AlertOctagon size={22} aria-hidden="true" />
      </span>
      <h3 className="font-heading text-h3 text-charcoal">{title}</h3>
      <p className="mt-1.5 max-w-sm text-body text-charcoal-light">{body}</p>
      {detail ? <p className="mt-2 id text-charcoal-lighter">{detail}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-5" iconLeft={RotateCw} onClick={onRetry}>
          {t('states.errorAction')}
        </Button>
      ) : null}
    </div>
  );
}
