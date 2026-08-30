import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { t } from '@/i18n/en';

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  className,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    // The page behind must not scroll while a modal owns the screen.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-primary-dark/50"
        aria-hidden="true"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[90vh] w-full flex-col rounded-lg bg-white shadow-lg',
          SIZES[size],
          className,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-lightGray-dark px-6 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg leading-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-charcoal-light">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded p-1 text-charcoal-light hover:bg-lightGray hover:text-charcoal focus:outline-none focus-visible:shadow-focus"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-lightGray-dark px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
