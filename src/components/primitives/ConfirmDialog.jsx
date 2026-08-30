import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { t } from '@/i18n/en';

// Every destructive or irreversible action routes through this, so the
// wording and the button order never drift between feature areas.
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = t('common.confirm'),
  cancelLabel = t('common.cancel'),
  tone = 'danger',
  loading = false,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' ? (
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
        ) : null}
        <div className="text-base text-charcoal-light">
          {body ? <p>{body}</p> : null}
          {children}
        </div>
      </div>
    </Modal>
  );
}
