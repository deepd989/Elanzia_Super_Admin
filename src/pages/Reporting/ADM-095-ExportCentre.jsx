// ADM-095
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Download, Plus, RotateCcw, Search, ShieldAlert } from 'lucide-react';
import {
  Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal,
  PageHeader, Select, StatusPill,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  cancelExport,
  clearExportFilters,
  dismissDownload,
  fetchExportDatasets,
  fetchExportJobs,
  requestExportDownload,
  resetExportDraft,
  retryExport,
  selectExportCentre,
  setExportDraft,
  setExportFilters,
  setExportPage,
  setExportPageSize,
  setExportSearch,
  submitExportRequest,
} from '@/store/slices/reportingSlice';
import { formatDateTime, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  queued: 'neutral',
  running: 'info',
  succeeded: 'success',
  failed: 'danger',
  expired: 'warning',
  cancelled: 'neutral',
};

const FORMAT_OPTIONS = [
  { value: 'csv', label: t('platform.formatCsv') },
  { value: 'xlsx', label: t('platform.formatXlsx') },
];

// The periods an export may be scoped to. Same vocabulary the reports use, so
// a pulled file and the screen it came from cover the same months.
const PERIOD_VALUES = ['last_7_days', 'last_30_days', 'last_90_days', 'last_12_months', 'financial_ytd'];

const COLUMN_COUNT = 7;

export default function ExportCentre() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    jobs, total, query, facets, retentionDays, datasets, draft, selectedDataset,
    lastDownload, canSubmit, viewState, actionStatus, actionError, error,
  } = useSelector(selectExportCentre);

  const [composerOpen, setComposerOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    dispatch(fetchExportJobs());
  }, [dispatch, query]);

  useEffect(() => {
    dispatch(fetchExportDatasets());
  }, [dispatch]);

  // Handlers.
  const handleSubmit = async () => {
    const result = await dispatch(submitExportRequest({ ...draft, filters: {} }));
    if (!result.error) setComposerOpen(false);
  };

  const handleCancel = async () => {
    const result = await dispatch(cancelExport(cancelling.id));
    if (!result.error) setCancelling(null);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    dispatch(resetExportDraft());
  };

  const errorFor = (code) => (code ? t(`platform.exportError.${code}`) : null);

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('platform.eyebrow')}
        title={t('platform.exportsTitle')}
        subtitle={t('platform.exportsSubtitle')}
        actions={
          <Button iconLeft={Plus} onClick={() => setComposerOpen(true)}>
            {t('platform.newExport')}
          </Button>
        }
      />

      {retentionDays ? (
        <p className="text-sm text-charcoal-light">
          {t('platform.retention', { days: formatNumber(retentionDays) })}
        </p>
      ) : null}

      {lastDownload ? (
        <div className="flex items-center gap-3 rounded-md border border-accent bg-warning-surface px-4 py-2.5">
          <span className="text-base font-medium text-charcoal">{t('platform.downloadReady')}</span>
          <Button size="sm" variant="ghost" onClick={() => dispatch(dismissDownload())}>
            {t('common.close')}
          </Button>
        </div>
      ) : null}

      <ExportFilters query={query} facets={facets} dispatch={dispatch} />

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setExportPage(page))}
            onPageSizeChange={(size) => dispatch(setExportPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('platform.column.job')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.dataset')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.requestedBy')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('platform.column.requested')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('platform.column.rows')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            jobs.map((job) => (
              <TableShell.Row key={job.id}>
                <TableShell.Cell className="font-mono text-xs">{job.id}</TableShell.Cell>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">
                    {t(`platform.datasetLabel.${job.datasetId}`)}
                  </span>
                  {/* Named on the row rather than in the detail, because who
                      pulled member data is the question this queue exists to
                      answer. */}
                  {job.containsPersonalData ? (
                    <StatusPill tone="warning" size="sm" className="mt-1">
                      {t('platform.personalData')}
                    </StatusPill>
                  ) : null}
                </TableShell.Cell>
                <TableShell.Cell>{job.requestedByName}</TableShell.Cell>
                <TableShell.Cell>
                  {formatDateTime(job.requestedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(job.requestedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatNumber(job.rowCount)}</TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATUS_TONES[job.status]}>
                    {t(`platform.exportStatus.${job.status}`)}
                  </StatusPill>
                  {job.status === 'expired' ? (
                    <span className="block text-xs text-charcoal-light">{t('platform.lapsed')}</span>
                  ) : null}
                  {job.failureCode ? (
                    <span className="block text-xs text-charcoal-light">
                      {errorFor(job.failureCode)}
                    </span>
                  ) : null}
                  {job.expiresAt && job.status === 'succeeded' ? (
                    <span className="block text-xs text-charcoal-light">
                      {t('platform.expiresOn', { date: formatRelativeTime(job.expiresAt) })}
                    </span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.ActionsCell>
                  {job.status === 'succeeded' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft={Download}
                      onClick={() => dispatch(requestExportDownload(job.id))}
                    >
                      {t('common.download')}
                    </Button>
                  ) : null}
                  {['failed', 'expired', 'cancelled'].includes(job.status) ? (
                    <Button size="sm" variant="ghost" iconLeft={RotateCcw} onClick={() => dispatch(retryExport(job.id))}>
                      {t('common.retry')}
                    </Button>
                  ) : null}
                  {['queued', 'running'].includes(job.status) ? (
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(job)}>
                      {t('platform.cancelExport')}
                    </Button>
                  ) : null}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchExportJobs())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearExportFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  title={t('platform.exportsEmptyTitle')}
                  body={t('platform.exportsEmptyBody')}
                  actionLabel={t('platform.newExport')}
                  onAction={() => setComposerOpen(true)}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <Modal
        open={composerOpen}
        onClose={closeComposer}
        title={t('platform.newExportTitle')}
        description={t('platform.newExportDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={closeComposer}>{t('common.cancel')}</Button>
            <Button disabled={!canSubmit} loading={actionStatus === 'loading'} onClick={handleSubmit}>
              {t('platform.requestExport')}
            </Button>
          </>
        }
      >
        <ExportComposer
          datasets={datasets}
          draft={draft}
          dataset={selectedDataset}
          error={actionError}
          onChange={(patch) => dispatch(setExportDraft(patch))}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={handleCancel}
        loading={actionStatus === 'loading'}
        title={t('platform.cancelExportTitle')}
        body={t('platform.cancelExportBody')}
        confirmLabel={t('platform.cancelExport')}
      />
    </div>
  );
}

function ExportFilters({ query, facets, dispatch }) {
  const handleFilter = (field) => (event) =>
    dispatch(setExportFilters({ ...query.filters, [field]: event.target.value }));

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Input
        id="search"
        className="w-80"
        iconLeft={Search}
        placeholder={t('platform.exportsSearchPlaceholder')}
        value={query.search}
        onChange={(event) => dispatch(setExportSearch(event.target.value))}
      />
      <Select
        id="dataset" className="w-52" placeholder={t('common.all')}
        value={query.filters.datasetId} onChange={handleFilter('datasetId')}
        options={(facets?.datasetId ?? []).map(({ value }) => ({
          value,
          label: t(`platform.datasetLabel.${value}`),
        }))}
      />
      <Select
        id="status" className="w-40" placeholder={t('common.all')}
        value={query.filters.status} onChange={handleFilter('status')}
        options={(facets?.status ?? []).map(({ value }) => ({
          value,
          label: t(`platform.exportStatus.${value}`),
        }))}
      />
      <Select
        id="requester" className="w-48" placeholder={t('common.all')}
        value={query.filters.requestedById} onChange={handleFilter('requestedById')}
        options={facets?.requestedById ?? []}
      />
      <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearExportFilters())}>
        {t('common.clearFilters')}
      </Button>
    </div>
  );
}

function ExportComposer({ datasets, draft, dataset, error, onChange }) {
  const periodOptions = (dataset?.supportsPeriod ? PERIOD_VALUES : []).map((value) => ({
    value,
    label: t(`reports.period.${value}`),
  }));

  return (
    <div className="flex flex-col gap-field">
      <Select
        id="export-dataset"
        label={t('platform.dataset')}
        required
        placeholder={t('platform.chooseDataset')}
        value={draft.datasetId}
        onChange={(event) => onChange({ datasetId: event.target.value, period: '' })}
        options={datasets.map((row) => ({ value: row.id, label: t(`platform.datasetLabel.${row.id}`) }))}
        help={dataset ? t('platform.columnsIncluded', { columns: dataset.columns.join(', ') }) : undefined}
      />

      {/* A dataset that supports a period requires one. An unbounded pull of
          the order book is how an export times out at three in the morning. */}
      {dataset?.supportsPeriod ? (
        <Select
          id="export-period"
          label={t('reports.period.label')}
          required
          placeholder={t('common.all')}
          value={draft.period}
          onChange={(event) => onChange({ period: event.target.value })}
          options={periodOptions}
        />
      ) : null}

      <Select
        id="export-format"
        label={t('platform.format')}
        value={draft.format}
        onChange={(event) => onChange({ format: event.target.value })}
        options={FORMAT_OPTIONS}
      />

      {dataset?.containsPersonalData ? (
        <p className="flex items-start gap-2 rounded border border-warning/25 bg-warning-surface p-3 text-sm text-warning">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t('platform.personalDataHelp')}
        </p>
      ) : null}

      {dataset ? (
        <p className="text-xs text-charcoal-light">
          {t('platform.rowLimit', { rows: formatNumber(dataset.maxRows) })}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-danger">
          {t(`platform.exportError.${error.code}`)}
        </p>
      ) : null}
    </div>
  );
}

function RowSkeleton({ rows = 10 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
