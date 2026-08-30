// ADM-028
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RotateCw, Search, Wand2 } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearAiJobFilters,
  fetchAiJobCounts,
  fetchAiJobs,
  retryAiJob,
  selectAiJobQueue,
  setAiJobFilters,
  setAiJobPage,
  setAiJobPageSize,
  setAiJobSearch,
} from '@/store/slices/catalogueSlice';
import { formatDate, formatNumber, formatPercent, formatRelativeTime } from '@/utils/format';
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

const STATUS_OPTIONS = [
  'queued', 'running', 'needs_review', 'published', 'rejected', 'failed', 'cancelled',
].map((value) => ({ value, label: t(`catalogue.jobStatus.${value}`) }));

const FAILURE_OPTIONS = [
  'image_below_min_resolution',
  'no_jewellery_detected',
  'multiple_pieces_in_frame',
  'hallmark_unreadable',
  'model_timeout',
  'insufficient_credits',
].map((value) => ({ value, label: t(`catalogue.failureCode.${value}`) }));

const COLUMN_COUNT = 7;

export default function AiListingJobs() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const { jobs, total, query, counts, viewState, error, actionStatus, actionError } =
    useSelector(selectAiJobQueue);

  useEffect(() => {
    dispatch(fetchAiJobs());
    dispatch(fetchAiJobCounts());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setAiJobFilters({ ...query.filters, [field]: event.target.value }));

  const handleRetry = async (jobId) => {
    const result = await dispatch(retryAiJob({ jobId }));
    if (!result.error) dispatch(fetchAiJobCounts());
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('catalogue.eyebrow')}
        title={t('catalogue.aiJobsTitle')}
        subtitle={t('catalogue.aiJobsSubtitle')}
        meta={
          counts ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone="warning">
                {t('catalogue.aiJobsNeedReview', { count: counts.needsReview })}
              </StatusPill>
              {counts.failed > 0 ? (
                <StatusPill tone="danger">
                  {t('catalogue.aiJobsFailed', { count: counts.failed })}
                </StatusPill>
              ) : null}
              {counts.queued > 0 ? (
                <StatusPill tone="neutral">
                  {t('catalogue.aiJobsQueued', { count: counts.queued })}
                </StatusPill>
              ) : null}
            </span>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('catalogue.aiSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setAiJobSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="failureCode"
          className="w-56"
          placeholder={t('common.all')}
          value={query.filters.failureCode}
          onChange={setFilter('failureCode')}
          options={FAILURE_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearAiJobFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setAiJobPage(page))}
            onPageSizeChange={(size) => dispatch(setAiJobPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('catalogue.columnJob')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnImages')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnConfidence')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('catalogue.columnCredits')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('catalogue.columnSubmitted')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                busy={actionStatus === 'loading'}
                onOpen={() => navigate(`/catalogue/ai/jobs/${job.id}`)}
                onRetry={() => handleRetry(job.id)}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <JobSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchAiJobs())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearAiJobFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Wand2}
                  title={t('catalogue.aiEmptyTitle')}
                  body={t('catalogue.aiEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function JobRow({ job, busy, onOpen, onRetry }) {
  return (
    <TableShell.Row onClick={onOpen}>
      <TableShell.Cell>
        <span className="font-medium text-charcoal">{job.manufacturerName}</span>
        <span className="block font-mono text-xs text-charcoal-light">
          {job.id} · {job.model}
        </span>
        {job.failureCode ? (
          <span className="block text-xs text-danger">
            {t(`catalogue.failureCode.${job.failureCode}`)}
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatNumber(job.sourceImageCount)}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {job.overallConfidence !== null ? formatPercent(job.overallConfidence * 100) : '-'}
        {job.lowConfidenceFields?.length > 0 ? (
          <span className="block text-xs text-warning">
            {t('catalogue.lowConfidenceCount', { count: job.lowConfidenceFields.length })}
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {formatNumber(job.creditsUsed)}
      </TableShell.Cell>

      <TableShell.Cell>
        {formatDate(job.submittedAt)}
        <span className="block text-xs text-charcoal-light">
          {formatRelativeTime(job.submittedAt)}
        </span>
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={STATUS_TONES[job.status]}>
          {t(`catalogue.jobStatus.${job.status}`)}
        </StatusPill>
        {job.retryCount > 0 ? (
          <Badge tone="outline" className="ml-1">
            {job.retryCount}
          </Badge>
        ) : null}
      </TableShell.Cell>

      <TableShell.ActionsCell>
        {/* Only a failed or cancelled job can be retried, and the retry spends
            a credit. The server refuses the rest, so the button is not shown. */}
        {['failed', 'cancelled'].includes(job.status) ? (
          <Button size="sm" variant="ghost" iconLeft={RotateCw} loading={busy} onClick={onRetry}>
            {t('catalogue.retry')}
          </Button>
        ) : null}
        {job.status === 'needs_review' ? (
          <Button size="sm" variant="ghost" onClick={onOpen}>
            {t('catalogue.reviewJob')}
          </Button>
        ) : null}
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function JobSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-52 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-12 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
