// ADM-016
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, Check, Clock, FileWarning, X } from 'lucide-react';
import {
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
import { MediaViewer, SplitReviewLayout } from '@/components';
import {
  clearJewellerWorkspace,
  decideJewellerApplication,
  fetchJewellerApplication,
  selectJewellerVerification,
} from '@/store/slices/onboardingSlice';
import { formatDate, formatDateTime, formatINR, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  applied: 'info',
  under_review: 'info',
  info_requested: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
};

const CHECK_ICONS = { pass: Check, fail: X, pending: Clock };
// Written out rather than interpolated. Tailwind scans for whole class names,
// so a `text-${tone}` template compiles to nothing at all.
const CHECK_ICON_COLOURS = {
  pass: 'text-success',
  fail: 'text-danger',
  pending: 'text-neutral',
};

const DECISION_OPTIONS = [
  { value: 'approve', label: t('onboarding.approve') },
  { value: 'request_info', label: t('onboarding.requestInfo') },
  { value: 'reject', label: t('onboarding.reject') },
];

export default function JewellerKycWorkspace() {
  const { jewellerId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    application,
    checks,
    mediaItems,
    missingDocuments,
    timeline,
    canApprove,
    isDecided,
    viewState,
    error,
    decisionStatus,
    decisionError,
  } = useSelector(selectJewellerVerification);

  const [decision, setDecision] = useState('');
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    dispatch(fetchJewellerApplication(jewellerId));
    return () => dispatch(clearJewellerWorkspace());
  }, [dispatch, jewellerId]);

  // Handlers.
  // Refusing or sending back without a written reason produces an applicant
  // who cannot fix anything, so the note is required for everything but a
  // clean approve.
  const noteRequired = decision !== '' && decision !== 'approve';
  const canSubmit =
    decision !== '' &&
    acknowledged &&
    !isDecided &&
    (decision !== 'approve' || canApprove) &&
    (!noteRequired || note.trim().length > 0);

  const handleSubmit = async () => {
    const result = await dispatch(
      decideJewellerApplication({ id: jewellerId, decision, reason: note }),
    );
    if (!result.error) {
      setDecision('');
      setNote('');
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
    return (
      <ErrorState
        detail={error?.message}
        onRetry={() => dispatch(fetchJewellerApplication(jewellerId))}
      />
    );
  }
  if (viewState === 'empty' || !application) {
    return (
      <EmptyState
        title={t('onboarding.notFoundTitle')}
        body={t('onboarding.notFoundBody')}
        actionLabel={t('onboarding.backToJewellers')}
        onAction={() => navigate('/onboarding/jewellers')}
      />
    );
  }

  // Markup.
  return (
    <SplitReviewLayout
      header={
        <PageHeader
          eyebrow={t('onboarding.eyebrow')}
          title={application.businessName}
          subtitle={`${application.shopType} · ${application.city} · ${formatRelativeTime(application.submittedAt)}`}
          meta={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone={STATUS_TONES[application.status]}>
                {t(`onboarding.status.${application.status}`)}
              </StatusPill>
              {application.slaBreached ? (
                <StatusPill tone="danger" size="sm">
                  {t('onboarding.pastSla')}
                </StatusPill>
              ) : null}
            </span>
          }
        />
      }
      media={
        <div className="flex flex-col gap-6">
          <MediaViewer items={mediaItems} />
          <MissingDocuments documents={missingDocuments} />
          <Timeline entries={timeline} />
        </div>
      }
      decisionTitle={t('onboarding.decisionTitle')}
      decision={
        <div className="flex flex-col gap-field">
          {/* The facts the reviewer checks the documents against, right next to
              the documents. */}
          <dl className="flex flex-col gap-2 rounded border border-lightGray-dark bg-lightGray p-3 text-sm">
            <MetaRow label={t('onboarding.columnGstin')} value={application.gstin} mono />
            <MetaRow label={t('onboarding.fieldPan')} value={application.pan} mono />
            <MetaRow label={t('onboarding.fieldContact')} value={application.contactName} />
            <MetaRow label={t('onboarding.fieldPhone')} value={application.phone} />
            <MetaRow label={t('onboarding.fieldShopType')} value={application.shopType} />
            {/* Elanzia's money is at risk on this number until the invoice
                clears, which is why it is on the decision panel and not
                buried in a tab. */}
            <MetaRow
              label={t('onboarding.fieldCreditLimit')}
              value={formatINR(application.creditLimit)}
            />
            <MetaRow
              label={t('onboarding.fieldPaymentTerms')}
              value={t('onboarding.paymentTermsDays', { days: application.paymentTermsDays })}
            />
            <MetaRow
              label={t('onboarding.fieldReferrer')}
              value={application.invitedByManufacturerId ?? t('onboarding.sourceDirect')}
            />
            <MetaRow
              label={t('onboarding.fieldSubmitted')}
              value={formatDate(application.submittedAt)}
            />
          </dl>

          <CheckList checks={checks} />

          {isDecided ? (
            <p className="rounded border border-neutral-border bg-neutral-surface px-3 py-2 text-xs text-charcoal">
              {t('onboarding.decidedBody')}
            </p>
          ) : null}

          {!canApprove && !isDecided ? (
            <p className="flex items-start gap-2 rounded border border-danger bg-danger-surface px-3 py-2 text-xs text-charcoal">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              {t('onboarding.approvalBlockedBody')}
            </p>
          ) : null}

          <Select
            id="decision"
            label={t('onboarding.decision')}
            required
            disabled={isDecided}
            placeholder={t('onboarding.chooseDecision')}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            options={DECISION_OPTIONS}
          />

          <Textarea
            id="note"
            rows={5}
            label={t('onboarding.reviewerNote')}
            required={noteRequired}
            disabled={isDecided}
            help={t('onboarding.reviewerNoteHelp')}
            error={
              decisionError?.code === 'decision_reason_required' ? decisionError.message : undefined
            }
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <Checkbox
            id="acknowledge"
            label={t('onboarding.acknowledge')}
            disabled={isDecided}
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />

          {decisionError && decisionError.code !== 'decision_reason_required' ? (
            <p className="text-sm text-danger">{decisionError.message}</p>
          ) : null}
        </div>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/onboarding/jewellers')}>
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

// Local sub-components. These repeat enough within one screen to be worth
// naming, and not enough across screens to be worth sharing.
function MetaRow({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd className={`text-right text-charcoal ${mono ? 'font-mono text-xs' : 'text-base'}`}>
        {value}
      </dd>
    </div>
  );
}

function CheckList({ checks }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading text-base text-charcoal">{t('onboarding.checksTitle')}</h3>
      <ul className="flex flex-col gap-1.5">
        {checks.map((check) => {
          const Icon = CHECK_ICONS[check.state];
          return (
            <li
              key={check.code}
              className="flex items-start gap-2 rounded border border-lightGray-dark px-3 py-2"
            >
              <Icon
                size={14}
                className={`mt-0.5 shrink-0 ${CHECK_ICON_COLOURS[check.state]}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-charcoal">
                  {t(`onboarding.check.${check.code}`)}
                  {check.blocking && check.state === 'fail' ? (
                    <StatusPill size="sm" tone="danger">
                      {t('onboarding.blockingCheck')}
                    </StatusPill>
                  ) : null}
                </p>
                <p className="text-xs text-charcoal-light">{check.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MissingDocuments({ documents }) {
  if (documents.length === 0) return null;

  return (
    <section className="rounded-md border border-warning bg-warning-surface px-5 py-4">
      <h3 className="flex items-center gap-2 font-heading text-base text-charcoal">
        <FileWarning size={16} aria-hidden="true" />
        {t('onboarding.approvalBlockedTitle')}
      </h3>
      <ul className="mt-2 flex flex-col gap-1">
        {documents.map((document) => (
          <li key={document.id} className="text-sm text-charcoal">
            {document.label} - {t('onboarding.missingDocument')}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Timeline({ entries }) {
  return (
    <section className="rounded-md border border-lightGray-dark bg-white">
      <header className="border-b border-lightGray-dark px-5 py-4">
        <h3 className="font-heading text-base text-charcoal">{t('onboarding.timelineTitle')}</h3>
      </header>
      <ul className="divide-y divide-lightGray">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-base text-charcoal">{entry.summary}</p>
              <p className="text-xs text-charcoal-light">
                {t(`onboarding.event.${entry.kind}`)} · {entry.actorName} ·{' '}
                {formatDateTime(entry.at)}
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
