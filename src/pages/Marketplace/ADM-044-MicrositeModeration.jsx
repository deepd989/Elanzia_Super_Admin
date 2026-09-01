// ADM-044
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Globe, Search, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { MediaViewer, SplitReviewLayout, TableShell } from '@/components';
import {
  clearMicrositeFilters,
  fetchMicrositeSubmission,
  fetchMicrositeSubmissions,
  openMicrositeSubmission,
  reviewMicrosite,
  selectMicrositeModeration,
  setMicrositeFilters,
  setMicrositePage,
  setMicrositePageSize,
  setMicrositeSearch,
} from '@/store/slices/marketplaceSlice';
import { formatDate, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const SUBMISSION_TONES = {
  submitted: 'info',
  in_review: 'info',
  changes_requested: 'warning',
  approved: 'success',
  rejected: 'danger',
  superseded: 'neutral',
};

const STATUS_OPTIONS = ['submitted', 'in_review', 'changes_requested', 'approved', 'rejected', 'superseded'].map(
  (value) => ({ value, label: t(`marketplace.submissionStatus.${value}`) }),
);

const DECISION_OPTIONS = ['approve', 'request_changes', 'reject', 'suspend'].map((value) => ({
  value,
  label: t(`marketplace.decision.${value}`),
}));

const REASON_CODES = [
  'private_piece_featured',
  'contact_bypass',
  'unsubstantiated_claim',
  'poor_imagery',
  'incomplete_profile',
  'trademark_misuse',
];

const COLUMN_COUNT = 7;

export default function MicrositeModeration() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const submissionId = searchParams.get('submissionId');

  // Data. ONE selector - this is the seam.
  const state = useSelector(selectMicrositeModeration);
  const { submissions, total, awaitingDecision, slaBreached, facets, query, viewState } = state;

  useEffect(() => {
    dispatch(fetchMicrositeSubmissions());
  }, [dispatch, query]);

  // The open submission lives in the URL, so a reviewer can send a colleague
  // the exact page they are looking at.
  useEffect(() => {
    dispatch(openMicrositeSubmission(submissionId));
    if (submissionId) dispatch(fetchMicrositeSubmission(submissionId));
  }, [dispatch, submissionId]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setMicrositeFilters({ ...query.filters, [field]: event.target.value }));

  const openReview = (id) => setSearchParams(id ? { submissionId: id } : {});

  if (submissionId) {
    return <SubmissionReview state={state} onBack={() => openReview(null)} />;
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('marketplace.eyebrow')}
        title={t('marketplace.micrositesTitle')}
        subtitle={t('marketplace.micrositesSubtitle')}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="info" label={t('marketplace.awaitingDecision', { count: awaitingDecision })} />
            {slaBreached > 0 ? (
              <StatusPill tone="danger" label={t('marketplace.breachedCount', { count: slaBreached })} />
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('marketplace.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setMicrositeSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-52"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="city"
          className="w-44"
          placeholder={t('marketplace.filter.city')}
          value={query.filters.city}
          onChange={setFilter('city')}
          options={facets.cities}
        />
        <Select
          id="manufacturer"
          className="w-52"
          placeholder={t('marketplace.filter.manufacturer')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearMicrositeFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setMicrositePage(page))}
            onPageSizeChange={(size) => dispatch(setMicrositePageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('marketplace.column.manufacturer')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.submission')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.version')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.submitted')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.policyChecks')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            submissions.map((submission) => (
              <TableShell.Row key={submission.id} onClick={() => openReview(submission.id)}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{submission.manufacturerName}</span>
                  <span className="block text-xs text-charcoal-light">{submission.city}</span>
                </TableShell.Cell>

                <TableShell.Cell className="font-mono text-xs">/{submission.slug}</TableShell.Cell>

                <TableShell.Cell>{t('marketplace.versionLabel', { version: submission.version })}</TableShell.Cell>

                <TableShell.Cell>
                  {formatDate(submission.submittedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(submission.submittedAt)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {submission.flags.length === 0 ? (
                    <span className="text-charcoal-light">{t('common.none')}</span>
                  ) : (
                    <Badge tone="danger">{submission.flags.length}</Badge>
                  )}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={SUBMISSION_TONES[submission.status]}
                    label={t(`marketplace.submissionStatus.${submission.status}`)}
                  />
                </TableShell.Cell>

                <TableShell.ActionsCell>
                  <Button size="sm" variant="ghost" onClick={() => openReview(submission.id)}>
                    {t('marketplace.reviewSubmission')}
                  </Button>
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState onRetry={() => dispatch(fetchMicrositeSubmissions())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearMicrositeFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Globe}
                  title={t('marketplace.micrositeEmptyTitle')}
                  body={t('marketplace.micrositeEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

// The review workspace. Evidence on the left, the decision pinned on the right,
// so approve and reject never scroll away while the reviewer reads the page.
function SubmissionReview({ state, onBack }) {
  const dispatch = useDispatch();
  const { current, reviewState, decisionStatus, decisionError, blockingFlags } = state;
  const [decision, setDecision] = useState('');
  const [reasons, setReasons] = useState([]);
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (reviewState === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }
  if (reviewState === 'error' || !current) {
    return <ErrorState onRetry={() => dispatch(fetchMicrositeSubmission(state.openId))} />;
  }

  const { submission, manufacturer, featuredProducts, flags } = current;

  // Rejecting without a written reason produces a manufacturer who cannot fix
  // anything, so everything except a clean approve needs a note and a reason.
  const noteRequired = decision !== '' && decision !== 'approve';
  const reasonRequired = decision === 'reject' || decision === 'request_changes';
  const approvalBlocked = decision === 'approve' && blockingFlags.length > 0;
  const canSubmit =
    decision !== '' &&
    acknowledged &&
    !approvalBlocked &&
    (!noteRequired || note.trim().length > 0) &&
    (!reasonRequired || reasons.length > 0);

  const toggleReason = (code) =>
    setReasons(reasons.includes(code) ? reasons.filter((row) => row !== code) : [...reasons, code]);

  const submit = () => {
    setConfirmOpen(false);
    dispatch(reviewMicrosite({ submissionId: submission.id, decision, reasons, note }));
  };

  return (
    <SplitReviewLayout
      header={
        <PageHeader
          eyebrow={t('marketplace.micrositeReviewTitle')}
          title={manufacturer.businessName}
          subtitle={`/${submission.slug} · ${t('marketplace.versionLabel', { version: submission.version })}`}
          meta={
            <StatusPill
              tone={SUBMISSION_TONES[submission.status]}
              label={t(`marketplace.submissionStatus.${submission.status}`)}
            />
          }
          actions={
            <Button variant="secondary" iconLeft={ArrowLeft} onClick={onBack}>
              {t('marketplace.backToQueue')}
            </Button>
          }
        />
      }
      media={
        <div className="flex flex-col gap-4">
          <MediaViewer items={submission.media} />

          <div className="rounded-md border border-lightGray-dark bg-white p-4">
            <h3 className="font-heading text-lg leading-tight">{submission.headline}</h3>
            <p className="mt-2 text-base text-charcoal">{submission.about}</p>
            <p className="mt-3 text-sm text-charcoal-light">{submission.changeSummary}</p>
          </div>

          {/* Every featured piece, with its visibility stated. A private piece
              on a public page is the same breach as a private piece in search. */}
          <div className="rounded-md border border-lightGray-dark bg-white p-4">
            <h3 className="mb-3 font-heading text-lg leading-tight">{t('marketplace.featuredPieces')}</h3>
            <ul className="divide-y divide-lightGray">
              {featuredProducts.map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 text-base text-charcoal">
                    {product.title}
                    <span className="block font-mono text-xs text-charcoal-light">{product.sku}</span>
                  </span>
                  <StatusPill
                    tone={product.visibility === 'public' ? 'neutral' : 'danger'}
                    label={
                      product.visibility === 'public'
                        ? t('marketplace.publicPiece')
                        : t('marketplace.privatePiece')
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      }
      decisionTitle={t('marketplace.decision.label')}
      decision={
        <div className="flex flex-col gap-field">
          <div className="rounded border border-lightGray-dark bg-lightGray p-3">
            <h4 className="mb-2 text-sm font-medium text-charcoal">{t('marketplace.policyChecks')}</h4>
            {flags.length === 0 ? (
              <p className="text-sm text-charcoal-light">{t('marketplace.noPolicyFlags')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {flags.map((flag) => (
                  <li key={`${flag.code}-${flag.entityId ?? 'page'}`} className="flex items-start gap-2">
                    <ShieldAlert size={14} className="mt-1 shrink-0 text-danger" aria-hidden="true" />
                    <span className="text-sm text-charcoal">
                      <span className="font-medium">{t(`marketplace.flag.${flag.code}`)}</span>
                      <span className="block text-charcoal-light">{flag.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Select
            id="decision"
            label={t('marketplace.decision.label')}
            required
            placeholder={t('marketplace.decision.choose')}
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            options={DECISION_OPTIONS}
          />

          {approvalBlocked ? (
            <p className="text-sm text-danger">{t('marketplace.blockedByPrivatePiece')}</p>
          ) : null}

          {reasonRequired ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-charcoal">
                {t('marketplace.decision.reasons')}
              </legend>
              {REASON_CODES.map((code) => (
                <Checkbox
                  key={code}
                  id={`reason-${code}`}
                  label={t(`marketplace.reasonCode.${code}`)}
                  checked={reasons.includes(code)}
                  onChange={() => toggleReason(code)}
                />
              ))}
            </fieldset>
          ) : null}

          <Textarea
            id="note"
            rows={5}
            label={t('marketplace.decision.note')}
            required={noteRequired}
            help={t('marketplace.decision.noteHelp')}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />

          <Checkbox
            id="acknowledge"
            label={t('marketplace.decision.acknowledge')}
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />

          <dl className="flex flex-col gap-2 border-t border-lightGray-dark pt-3 text-sm">
            <MetaRow label={t('marketplace.column.submitted')} value={formatDate(submission.submittedAt)} />
            <MetaRow label={t('marketplace.filter.city')} value={manufacturer.city} />
            <MetaRow label={t('marketplace.featuredPieces')} value={formatNumber(featuredProducts.length)} />
          </dl>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          {decisionError ? (
            <p className="mr-auto text-sm text-danger">{decisionError.message}</p>
          ) : null}
          <Button variant="secondary" onClick={onBack}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={!canSubmit}
            loading={decisionStatus === 'loading'}
            onClick={() => (decision === 'approve' ? setConfirmOpen(true) : submit())}
          >
            {t('common.submit')}
          </Button>

          {/* Approving publishes to the open internet, so it is the one
              decision that asks twice. */}
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={submit}
            loading={decisionStatus === 'loading'}
            title={t('marketplace.decision.publishTitle')}
            body={t('marketplace.decision.publishBody', { slug: submission.slug })}
            confirmLabel={t('marketplace.decision.publish')}
          />
        </div>
      }
    />
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-charcoal-light">{label}</dt>
      <dd className="text-right text-charcoal">{value}</dd>
    </div>
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
