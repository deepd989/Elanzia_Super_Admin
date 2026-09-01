import { Inbox } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';
import { t } from '@/i18n/en';

// Two flavours, and the difference matters. A genuinely empty collection
// invites the user to create something; a filtered-to-nothing collection
// invites them to widen the filters.
export default function EmptyState({
  icon: Icon = Inbox,
  title = t('states.emptyTitle'),
  body = t('states.emptyBody'),
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center border-t border-border px-5 py-12 text-center', className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-charcoal-tertiary">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h3 className="font-heading text-h3 text-charcoal">{title}</h3>
      <p className="mt-1.5 max-w-sm text-body text-charcoal-light">{body}</p>
      {actionLabel && onAction ? (
        <Button variant="secondary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
