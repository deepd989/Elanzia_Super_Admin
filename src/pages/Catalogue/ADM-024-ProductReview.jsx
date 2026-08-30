// ADM-024
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, Lock } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { MediaViewer, PriceBreakup, SplitReviewLayout } from '@/components';
import {
  decideProduct,
  fetchProduct,
  selectProductReview,
} from '@/store/slices/catalogueSlice';
import {
  formatDate,
  formatDateTime,
  formatGrams,
  formatPurity,
  formatRelativeTime,
} from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  draft: 'neutral',
  pending_review: 'warning',
  live: 'success',
  out_of_stock: 'warning',
  archived: 'neutral',
  rejected: 'danger',
};

const SEVERITY_TONES = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };

const DECISION_OPTIONS = [
  { value: 'approve', label: t('catalogue.approve') },
  { value: 'request_changes', label: t('catalogue.requestChanges') },
  { value: 'reject', label: t('catalogue.reject') },
];

export default function ProductReview() {
  const { productId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const { listing, price, media, flags, audit, lockedByOrder, viewState, error, decisionStatus, decisionError } =
    useSelector(selectProductReview);

  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    dispatch(fetchProduct(productId));
  }, [dispatch, productId]);

  // Handlers.
  // Rejecting without a written reason produces a manufacturer who cannot fix
  // anything, so the note is required for everything except a clean approve.
  const reasonRequired = decision !== '' && decision !== 'approve';
  const canSubmit =
    decision !== '' && acknowledged && (!reasonRequired || reason.trim().length > 0);

  const handleSubmit = async () => {
    const result = await dispatch(decideProduct({ productId, decision, reason }));
    if (!result.error) {
      setDecision('');
      setReason('');
      setAcknowledged(false);
    }
  };

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={() => dispatch(fetchProduct(productId))} />;
  }
  if (viewState === 'empty' || !listing) {
    return (
      <EmptyState
        title={t('catalogue.notFoundTitle')}
        body={t('catalogue.notFoundBody')}
        actionLabel={t('common.back')}
        onAction={() => navigate('/catalogue/moderation')}
      />
    );
  }

  // Markup.
  return (
    <SplitReviewLayout
      header={
        <PageHeader
          eyebrow={t('catalogue.eyebrow')}
          title={listing.title}
          subtitle={`${listing.manufacturerName} · ${listing.sku} · ${t('catalogue.reviewTitle')}`}
          meta={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone={STATUS_TONES[listing.status]}>
                {t(`catalogue.status.${listing.status}`)}
              </StatusPill>
              {listing.visibility === 'private' ? (
                <Badge tone="outline">{t('catalogue.visibility.private')}</Badge>
              ) : null}
              {lockedByOrder ? (
                <StatusPill tone="info" size="sm">
                  {t('catalogue.lockedByOrder')}
                </StatusPill>
              ) : null}
            </span>
          }
          actions={
            <Button
              variant="secondary"
              disabled={lockedByOrder}
              onClick={() => navigate(`/catalogue/products/${productId}/edit`)}
            >
              {t('catalogue.openEdit')}
            </Button>
          }
        />
      }
      media={
        <div className="flex flex-col gap-6">
          <MediaViewer items={media} />
          {/* The price is never assembled by a screen. PriceBreakup is shared
              precisely because that arithmetic is a domain rule. */}
          <PriceBreakup breakup={price} />
          <AuditPanel audit={audit} />
        </div>
      }
      decisionTitle={t('catalogue.decisionTitle')}
      decision={
        <div className="flex flex-col gap-field">
          {/* The facts the reviewer checks the photographs against, right next
              to the photographs. */}
          <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
            <MetaRow label={t('units.purity')} value={formatPurity(listing.purity)} />
            <MetaRow label={t('units.gross')} value={formatGrams(listing.grossWeight)} />
            <MetaRow label={t('catalogue.fieldStone')} value={formatGrams(listing.stoneWeight)} />
            <MetaRow label={t('units.net')} value={formatGrams(listing.netWeight)} emphasis />
            <MetaRow label={t('catalogue.fieldHuid')} value={listing.huid ?? t('common.none')} mono />
            <MetaRow label={t('catalogue.fieldHsn')} value={listing.hsn} mono />
            <MetaRow label={t('catalogue.columnGst')} value={`${listing.gstRate}%`} />
            <MetaRow label={t('common.createdAt')} value={formatDate(listing.listedAt)} />
          </dl>

          <FlagList flags={flags} />

          {lockedByOrder ? (
            <p className="flex items-start gap-2 rounded border border-info bg-info-surface px-3 py-2 text-xs text-charcoal">
              <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {t('catalogue.lockedByOrderHelp')}
            </p>
          ) : null}

          <Select
            id="decision"
            label={t('catalogue.decision')}
            required
            placeholder={t('catalogue.chooseDecision')}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            options={DECISION_OPTIONS}
          />

          <Textarea
            id="reason"
            rows={5}
            label={t('catalogue.reviewerNote')}
            required={reasonRequired}
            help={t('catalogue.reviewerNoteHelp')}
            error={
              decisionError?.code === 'rejection_reason_required' ? decisionError.message : undefined
            }
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          <Checkbox
            id="acknowledge"
            label={t('catalogue.acknowledge')}
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />

          {decisionError && decisionError.code !== 'rejection_reason_required' ? (
            <p className="text-sm text-danger">{decisionError.message}</p>
          ) : null}
        </div>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/catalogue/moderation')}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!canSubmit}
            loading={decisionStatus === 'loading'}
            onClick={handleSubmit}
          >
            {t('common.submit')}
          </Button>
        </div>
      }
    />
  );
}

// Local sub-component. Meta rows repeat enough within one screen to be worth
// naming, and not enough across screens to be worth sharing.
function MetaRow({ label, value, mono = false, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd
        className={`text-right text-base ${mono ? 'font-mono text-xs' : ''} ${
          emphasis ? 'font-semibold text-charcoal' : 'text-charcoal'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function FlagList({ flags }) {
  if (flags.length === 0) {
    return <p className="text-xs text-charcoal-light">{t('catalogue.noFlags')}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {flags.map((flag) => (
        <li
          key={flag.code}
          className="flex items-start gap-2 rounded border border-lightGray-dark px-3 py-2"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-charcoal">
              {t(`catalogue.flag.${flag.code}`)}
              <StatusPill size="sm" tone={SEVERITY_TONES[flag.severity]}>
                {flag.severity}
              </StatusPill>
            </p>
            <p className="text-xs text-charcoal-light">{flag.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AuditPanel({ audit }) {
  return (
    <section className="rounded-md border border-lightGray-dark bg-white">
      <header className="border-b border-lightGray-dark px-5 py-4">
        <h3 className="font-display text-base text-primary">{t('catalogue.auditTitle')}</h3>
      </header>
      <ul className="divide-y divide-lightGray">
        {audit.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-base text-charcoal">{entry.summary}</p>
              <p className="text-xs text-charcoal-light">
                {entry.actorName} · {formatDateTime(entry.at)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-charcoal-light">
              {formatRelativeTime(entry.at)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
