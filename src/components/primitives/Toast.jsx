import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';

const TONES = {
  success: { icon: CheckCircle2, classes: 'border-success-border bg-success-surface text-success' },
  warning: { icon: AlertTriangle, classes: 'border-warning-border bg-warning-surface text-warning' },
  danger: { icon: XCircle, classes: 'border-danger-border bg-danger-surface text-danger' },
  info: { icon: Info, classes: 'border-neutral-border bg-neutral-surface text-neutral' },
};

export function Toast({ tone = 'info', title, body, onDismiss, autoDismissMs = 5000, className }) {
  const { icon: Icon, classes } = TONES[tone] ?? TONES.info;

  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return undefined;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      role="status"
      className={cn('flex w-80 items-start gap-3 rounded-md border p-3 shadow-toast duration-overlay ease-spring', classes, className)}
    >
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-body text-base font-medium">{title}</p>
        {body ? <p className="mt-0.5 text-sm opacity-80">{body}</p> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('common.close')}
          className="shrink-0 rounded-sm p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus-visible:shadow-focus"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

// Fixed stack in the bottom right. Mount once, in AdminShell.
export function ToastStack({ toasts = [], onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-toast flex flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={() => onDismiss?.(toast.id)} />
        </div>
      ))}
    </div>
  );
}

export default Toast;
