// ADM-041
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import { BULK_REFRESH_SCOPES, PRICING_CATEGORIES } from '@/data/pricingFixtures';
import { manufacturers } from '@/data/core';
import {
  cancelRefresh,
  clearActiveJob,
  fetchMetalRates,
  fetchRefreshJobs,
  pollRefreshJob,
  previewRefresh,
  selectBulkRefresh,
  setJobPage,
  setJobPageSize,
  setRefreshScope,
  startRefresh,
} from '@/store/slices/pricingSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatINR, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const JOB_TONES = {
  queued: 'neutral',
  running: 'info',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

const CATEGORY_OPTIONS = PRICING_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

const MANUFACTURER_OPTIONS = manufacturers
  .filter((manufacturer) => manufacturer.status === 'approved')
  .map((manufacturer) => ({ value: manufacturer.id, label: manufacturer.businessName }));

const PURITY_OPTIONS = [24, 22, 18, 14].map((purity) => ({
  value: String(purity),
  label: `${purity}K`,
}));

const COLUMN_COUNT = 7;

export default function BulkPriceRefresh() {
  const dispatch = useDispatch();

  // Data.
  const {
    scope,
    preview,
    previewStatus,
    previewError,
    activeJob,
    isRunning,
    jobs,
    jobsTotal,
    jobsQuery,
    jobsViewState,
    ratesStale,
    actionStatus,
    actionError,
  } = useSelector(selectBulkRefresh);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canRun = grantedPermissions.includes('pricing.rates.edit');

  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    dispatch(fetchMetalRates());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchRefreshJobs());
  }, [dispatch, jobsQuery, activeJob?.status]);

  // A running job reports progress, so it is polled until it stops running.
  useEffect(() => {
    if (!isRunning || !activeJob) return undefined;
    const timer = setInterval(() => dispatch(pollRefreshJob(activeJob.id)), 700);
    return () => clearInterval(timer);
  }, [dispatch, isRunning, activeJob]);

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.refreshTitle')}
        subtitle={t('pricing.refreshSubtitle')}
      />

      {/* Repricing the catalogue off a four-hour-old quote is worse than
          leaving it alone, so the screen blocks itself rather than letting the
          API refuse after the operator has committed. */}
      {ratesStale ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning-surface px-4 py-3">
          <TriangleAlert size={17} className="shrink-0 text-warning" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-body text-base font-semibold text-warning">
              {t('pricing.staleBlockTitle')}
            </p>
            <p className="text-sm text-charcoal-light">{t('pricing.staleBlockBody')}</p>
          </div>
          <Link to="/pricing/rates">
            <Button size="sm" variant="secondary">
              {t('pricing.goToRates')}
            </Button>
          </Link>
        </div>
      ) : null}

      {activeJob ? (
        <RunningJob
          job={activeJob}
          onCancel={() => setCancelling(true)}
          onDismiss={() => dispatch(clearActiveJob())}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card title={t('pricing.scopeCard')}>
          <div className="flex flex-col gap-field">
            <Select
              id="scope-type"
              label={t('pricing.scopeType')}
              value={scope.type}
              onChange={(event) => dispatch(setRefreshScope({ type: event.target.value }))}
              options={BULK_REFRESH_SCOPES}
            />

            {scope.type === 'category' ? (
              <Select
                id="scope-category"
                label={t('pricing.scopeCategory')}
                placeholder={t('common.all')}
                value={scope.category}
                onChange={(event) => dispatch(setRefreshScope({ category: event.target.value }))}
                options={CATEGORY_OPTIONS}
              />
            ) : null}

            {scope.type === 'manufacturer' ? (
              <Select
                id="scope-manufacturer"
                label={t('pricing.scopeManufacturer')}
                placeholder={t('common.all')}
                value={scope.manufacturerId}
                onChange={(event) => dispatch(setRefreshScope({ manufacturerId: event.target.value }))}
                options={MANUFACTURER_OPTIONS}
              />
            ) : null}

            {scope.type === 'purity' ? (
              <Select
                id="scope-purity"
                label={t('pricing.scopePurity')}
                placeholder={t('common.all')}
                value={scope.purity}
                onChange={(event) => dispatch(setRefreshScope({ purity: event.target.value }))}
                options={PURITY_OPTIONS}
              />
            ) : null}

            <Button
              variant="secondary"
              fullWidth
              loading={previewStatus === 'loading'}
              onClick={() => dispatch(previewRefresh())}
            >
              {t('pricing.runPreview')}
            </Button>
          </div>
        </Card>

        <PreviewPanel
          preview={preview}
          status={previewStatus}
          error={previewError}
          canRun={canRun && !ratesStale && !isRunning}
          starting={actionStatus === 'loading'}
          actionError={actionError}
          onRetry={() => dispatch(previewRefresh())}
          onRun={() => setConfirming(true)}
        />
      </div>

      <Card title={t('pricing.jobsTitle')} padded={false}>
        <TableShell
          className="rounded-none border-0 shadow-none"
          footer={
            <TableShell.Pagination
              page={jobsQuery.page}
              pageSize={jobsQuery.pageSize}
              total={jobsTotal}
              onPageChange={(page) => dispatch(setJobPage(page))}
              onPageSizeChange={(size) => dispatch(setJobPageSize(size))}
            />
          }
        >
          <TableShell.Head>
            <TableShell.HeadCell>{t('pricing.columnScope')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.columnStartedBy')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.columnStarted')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('pricing.columnProcessed')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('pricing.columnChanged')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">
              {t('pricing.columnOrdersRepriced')}
            </TableShell.HeadCell>
            <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {jobsViewState === 'populated' ? (
              jobs.map((job) => (
                <TableShell.Row key={job.id}>
                  <TableShell.Cell>
                    <span className="font-medium text-charcoal">{job.scope?.label ?? job.scope?.type}</span>
                    <span className="block font-mono text-xs text-charcoal-light">{job.id}</span>
                  </TableShell.Cell>
                  <TableShell.Cell>{job.startedByName}</TableShell.Cell>
                  <TableShell.Cell>{formatDateTime(job.startedAt)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatNumber(job.productsProcessed)} / {formatNumber(job.productsInScope)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatNumber(job.productsChanged)}
                  </TableShell.Cell>
                  {/* Always zero, and shown so an auditor can see it is
                      always zero. */}
                  <TableShell.Cell align="right" numeric>
                    <span className="text-charcoal-light">{formatNumber(job.ordersRepriced)}</span>
                  </TableShell.Cell>
                  <TableShell.Cell>
                    <StatusPill tone={JOB_TONES[job.status]}>
                      {t(`pricing.jobStatus.${job.status}`)}
                    </StatusPill>
                    {job.error ? (
                      <span className="block max-w-xs text-xs text-danger">{job.error}</span>
                    ) : null}
                  </TableShell.Cell>
                </TableShell.Row>
              ))
            ) : (
              <TableShell.StateRow colSpan={COLUMN_COUNT}>
                {jobsViewState === 'loading' ? <JobSkeleton /> : null}
                {jobsViewState === 'error' ? (
                  <ErrorState onRetry={() => dispatch(fetchRefreshJobs())} />
                ) : null}
                {jobsViewState.startsWith('empty') ? <EmptyState /> : null}
              </TableShell.StateRow>
            )}
          </TableShell.Body>
        </TableShell>
      </Card>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          await dispatch(startRefresh());
        }}
        loading={actionStatus === 'loading'}
        tone="primary"
        title={t('pricing.startRefreshTitle', { count: preview?.productsInScope ?? 0 })}
        body={t('pricing.startRefreshBody')}
        confirmLabel={t('pricing.startRefresh')}
      />

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={async () => {
          setCancelling(false);
          await dispatch(cancelRefresh(activeJob.id));
        }}
        title={t('pricing.cancelTitle')}
        body={t('pricing.cancelBody')}
        confirmLabel={t('pricing.cancelRefresh')}
      />
    </div>
  );
}

function RunningJob({ job, onCancel, onDismiss }) {
  const done = job.status !== 'running' && job.status !== 'queued';

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4">
        {done ? (
          <StatusPill tone={JOB_TONES[job.status]}>{t(`pricing.jobStatus.${job.status}`)}</StatusPill>
        ) : (
          <Spinner />
        )}

        <div className="min-w-0 flex-1">
          <p className="font-body text-base font-medium text-charcoal">
            {done ? t(`pricing.jobStatus.${job.status}`) : t('pricing.running')}
          </p>
          <p className="text-sm text-charcoal-light num">
            {t('pricing.progressLabel', {
              done: formatNumber(job.productsProcessed),
              total: formatNumber(job.productsInScope),
            })}
          </p>
        </div>

        {done ? (
          <Button size="sm" variant="secondary" onClick={onDismiss}>
            {t('common.close')}
          </Button>
        ) : (
          <Button size="sm" variant="danger" onClick={onCancel}>
            {t('pricing.cancelRefresh')}
          </Button>
        )}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-lightGray-dark">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${job.progress}%` }}
        />
      </div>
    </Card>
  );
}

function PreviewPanel({ preview, status, error, canRun, starting, actionError, onRetry, onRun }) {
  if (status === 'failed') return <ErrorState detail={error?.message} onRetry={onRetry} />;
  if (status === 'loading') {
    return (
      <Card>
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Card>
    );
  }
  if (!preview) {
    return (
      <Card>
        <EmptyState title={t('pricing.previewCard')} body={t('pricing.previewEmpty')} />
      </Card>
    );
  }

  return (
    <Card
      title={t('pricing.previewCard')}
      action={
        <Button iconLeft={RefreshCw} disabled={!canRun} loading={starting} onClick={onRun}>
          {t('pricing.startRefresh')}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricTile
          label={t('pricing.productsInScope')}
          value={formatNumber(preview.productsInScope)}
        />
        <MetricTile
          label={t('pricing.productsChanged')}
          value={formatNumber(preview.productsChanged)}
        />
        <MetricTile
          label={t('pricing.avgChange')}
          value={`${preview.avgChangePercent >= 0 ? '+' : ''}${formatPercent(preview.avgChangePercent, { decimals: 2 })}`}
        />
      </div>

      {/* Stated positively, because this is the guarantee the operator is
          relying on: a confirmed order's price is permanent. */}
      <div className="mt-4 flex items-start gap-3 rounded border border-success/30 bg-success-surface px-4 py-3">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="font-body text-base font-semibold text-success">
            {t('pricing.ordersUntouchedTitle', { count: preview.confirmedOrdersExcluded })}
          </p>
          <p className="mt-0.5 text-sm text-charcoal-light">{t('pricing.ordersUntouchedBody')}</p>
        </div>
      </div>

      {preview.biggestMovers.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-charcoal-light">
            {t('pricing.biggestMovers')}
          </p>
          <ul className="divide-y divide-lightGray">
            {preview.biggestMovers.map((move) => (
              <li key={move.productId} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-base text-charcoal">{move.title}</span>
                <span className="shrink-0 text-sm text-charcoal-light num">
                  {formatINR(move.oldTotal)} {'->'} {formatINR(move.newTotal)}
                </span>
                <Badge tone={move.changePercent >= 0 ? 'neutral' : 'outline'}>
                  {move.changePercent >= 0 ? '+' : ''}
                  {formatPercent(move.changePercent, { decimals: 2 })}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {actionError ? <p className="mt-3 text-sm text-danger">{actionError.message}</p> : null}
    </Card>
  );
}

function JobSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
