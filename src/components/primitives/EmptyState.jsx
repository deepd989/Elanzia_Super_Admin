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
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-lightGray text-charcoal-lighter">
        <Icon size={22} aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg text-primary">{title}</h3>
      <p className="mt-1.5 max-w-sm text-base text-charcoal-light">{body}</p>
      {actionLabel && onAction ? (
        <Button variant="secondary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
