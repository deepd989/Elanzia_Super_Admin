// ADM-029
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Check, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { MediaViewer, SplitReviewLayout } from '@/components';
import {
  acceptAiField,
  clearAiJob,
  decideAiJob,
  fetchAiJob,
  selectAiListingReview,
  setAiFieldOverride,
} from '@/store/slices/catalogueSlice';
import { formatDateTime, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  queued: 'neutral',
  running: 'info',
  needs_review: 'warning',
  published: 'success',
  rejected: 'danger',
  failed: 'danger',
  cancelled: 'neutral',
};

const DECISION_OPTIONS = [
  { value: 'publish', label: t('catalogue.publishListing') },
  { value: 'return_to_manufacturer', label: t('catalogue.returnToManufacturer') },
  { value: 'reject', label: t('catalogue.rejectJob') },
];

export default function AiListingReview() {
  const { jobId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const { job, fields, media, overrides, outstanding, canPublish, viewState, error, decisionStatus, decisionError } =
    useSelector(selectAiListingReview);

  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchAiJob(jobId));
    return () => dispatch(clearAiJob());
  }, [dispatch, jobId]);

  // Handlers.
  const reasonRequired = decision !== '' && decision !== 'publish';
  const canSubmit =
    decision !== '' &&
    (decision !== 'publish' || canPublish) &&
    (!reasonRequired || reason.trim().length > 0);

  const handleSubmit = async () => {
    // The accepted value for every field: the override where the reviewer
    // typed one, the extraction where they only accepted it.
    const accepted = Object.fromEntries(fields.map((field) => [field.name, field.acceptedValue]));
    const result = await dispatch(decideAiJob({ jobId, decision, fields: accepted, reason }));
    if (!result.error) navigate('/catalogue/ai/jobs');
  };

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error' || !job) {
    return (
      <ErrorState detail={error?.message} onRetry={() => dispatch(fetchAiJob(jobId))} />
    );
  }
  if (!job.extracted) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title={t(`catalogue.failureCode.${job.failureCode}`)}
        body={job.failureReason}
        actionLabel={t('common.back')}
        onAction={() => navigate('/catalogue/ai/jobs')}
      />
    );
  }

  // Markup.
  return (
    <SplitReviewLayout
      header={
        <PageHeader
          eyebrow={t('catalogue.eyebrow')}
          title={t('catalogue.aiReviewTitle')}
          subtitle={`${job.manufacturerName} · ${job.id} · ${job.model}`}
          meta={
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone={STATUS_TONES[job.status]}>
                {t(`catalogue.jobStatus.${job.status}`)}
              </StatusPill>
              <Badge tone="outline">
                {t('catalogue.confidenceLabel', {
                  percent: formatPercent(job.overallConfidence * 100),
                })}
              </Badge>
            </span>
          }
        />
      }
      media={
        <div className="flex flex-col gap-6">
          <MediaViewer items={media} />
          <FieldTable fields={fields} dispatch={dispatch} />
        </div>
      }
      decisionTitle={t('catalogue.decisionTitle')}
      decision={
        <div className="flex flex-col gap-field">
          {/* The server refuses a publish while any low confidence field is
              unreviewed. Publishing an unchecked purity is how a 14K piece
              reaches the marketplace labelled 22K. */}
          {outstanding.length > 0 ? (
            <p className="rounded border border-warning bg-warning-surface px-3 py-2 text-xs text-charcoal">
              {t('catalogue.outstandingWarning', { count: outstanding.length })}
            </p>
          ) : null}

          <p className="text-xs text-charcoal-light">{t('catalogue.netFromAccepted')}</p>

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
            rows={4}
            label={t('catalogue.aiDecisionReason')}
            required={reasonRequired}
            help={t('catalogue.aiDecisionReasonHelp')}
            error={decisionError?.code === 'reason_required' ? decisionError.message : undefined}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />

          {decisionError && decisionError.code !== 'reason_required' ? (
            <p className="text-sm text-danger">{decisionError.message}</p>
          ) : null}

          <dl className="flex flex-col gap-2 border-t border-lightGray-dark pt-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-charcoal-light">{t('catalogue.columnSubmitted')}</dt>
              <dd className="text-charcoal">{formatDateTime(job.submittedAt)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-charcoal-light">{t('catalogue.columnCredits')}</dt>
              <dd className="tabular-nums text-charcoal">{job.creditsUsed}</dd>
            </div>
          </dl>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate('/catalogue/ai/jobs')}>
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

// One row per extracted field: what the model read, how sure it was, and what
// the human did about it. Extraction and override stay side by side, because
// merging them would lose the record of what the model actually said.
function FieldTable({ fields, dispatch }) {
  return (
    <section className="rounded-md border border-lightGray-dark bg-white">
      <header className="border-b border-lightGray-dark px-5 py-4">
        <h3 className="font-heading text-base text-charcoal">{t('catalogue.extractedTitle')}</h3>
      </header>

      <ul className="divide-y divide-lightGray">
        {fields.map((field) => (
          <li key={field.name} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-charcoal">
                {field.name}
                {field.needsReview && !field.isReviewed ? (
                  <StatusPill size="sm" tone="warning">
                    {t('catalogue.needsCheck')}
                  </StatusPill>
                ) : null}
                {field.isOverridden ? (
                  <Badge tone="accent">{t('catalogue.overridden')}</Badge>
                ) : field.isReviewed ? (
                  <Badge tone="outline">{t('catalogue.accepted')}</Badge>
                ) : null}
              </p>
              <p className="text-xs text-charcoal-light">
                {String(field.extractedValue)} ·{' '}
                {t('catalogue.confidenceLabel', {
                  percent: formatPercent(field.confidence * 100),
                })}
              </p>
            </div>

            <Input
              id={`override-${field.name}`}
              className="w-44"
              placeholder={String(field.extractedValue ?? '')}
              value={field.isOverridden ? String(field.overriddenValue ?? '') : ''}
              onChange={(event) =>
                dispatch(setAiFieldOverride({ field: field.name, value: event.target.value }))
              }
            />

            <Button
              size="sm"
              variant={field.isReviewed ? 'ghost' : 'secondary'}
              iconLeft={field.isReviewed ? Check : undefined}
              onClick={() => dispatch(acceptAiField(field.name))}
            >
              {field.isReviewed ? t('catalogue.accepted') : t('catalogue.accept')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
