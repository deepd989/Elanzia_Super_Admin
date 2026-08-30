// ADM-050
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCheck, IndianRupee, Landmark, Percent, Search } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearBatchFilters,
  fetchBatch,
  fetchBatches,
  fetchReconciliationSummary,
  openBatch,
  selectReconciliation,
  setBatchFilters,
  setBatchPage,
  setBatchPageSize,
  setBatchSearch,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatDateTime, formatINR, formatINRCompact, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const BATCH_TONES = { reconciled: 'success', part_matched: 'warning' };

const STATUS_OPTIONS = ['reconciled', 'part_matched'].map((value) => ({
  value,
  label: t(`payments.batchStatus.${value}`),
}));

const COLUMN_COUNT = 8;

export default function ReconciliationConsole() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { batches, total, query, viewState, summary, openBatchId, batch, batchState, unreconciledGap } =
    useSelector(selectReconciliation);

  useEffect(() => {
    dispatch(fetchBatches());
    dispatch(fetchReconciliationSummary());
  }, [dispatch, query]);

  useEffect(() => {
    if (openBatchId) dispatch(fetchBatch(openBatchId));
  }, [dispatch, openBatchId]);

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.reconciliationTitle')}
        subtitle={t('payments.reconciliationSubtitle')}
        meta={
          summary ? (
            <StatusPill
              tone={unreconciledGap === 0 ? 'success' : 'warning'}
              label={t('payments.matchRate') + ' ' + formatPercent(summary.matchRate)}
            />
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('payments.captured')}
          value={formatINRCompact(summary?.capturedValue ?? 0)}
          caption={t('payments.capturedCaption')}
          icon={IndianRupee}
          loading={!summary}
        />
        <MetricTile
          label={t('payments.credited')}
          value={formatINRCompact(summary?.creditedValue ?? 0)}
          caption={t('payments.creditedCaption')}
          icon={Landmark}
          loading={!summary}
        />
        <MetricTile
          label={t('payments.feesRetained')}
          value={formatINRCompact(summary?.feesRetained ?? 0)}
          icon={Percent}
          invertTrend
          loading={!summary}
        />
        <MetricTile
          label={t('payments.matchRate')}
          value={formatPercent(summary?.matchRate ?? 0)}
          caption={t('payments.exceptionsTitle')}
          icon={CheckCheck}
          loading={!summary}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* The gap between what was taken and what was credited, less the fee.
            It should be zero, and saying so out loud is the point of the card:
            a number that is normally zero is one people notice when it is not. */}
        <Card title={t('payments.unreconciledGap')}>
          <p className="text-2xl font-semibold tabular-nums text-primary">{formatINR(unreconciledGap)}</p>
          <p className="mt-2 text-base text-charcoal-light">
            {unreconciledGap === 0
              ? t('payments.gapClean')
              : t('payments.gapOpen', { value: formatINR(unreconciledGap) })}
          </p>
        </Card>

        <Card title={t('payments.nodalTitle')} description={t('payments.nodalCaption')}>
          <dl className="flex flex-col gap-2">
            <MetaRow label={t('payments.nodalBalance')} value={formatINR(summary?.nodal?.balance)} emphasis />
            <MetaRow label={t('payments.nodalDue')} value={formatINR(summary?.nodal?.dueToRelease)} />
            <MetaRow label={t('payments.nodalCommission')} value={formatINR(summary?.nodal?.commissionRetained)} />
          </dl>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('payments.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setBatchSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={(event) => dispatch(setBatchFilters({ ...query.filters, status: event.target.value }))}
          options={STATUS_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearBatchFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setBatchPage(page))}
            onPageSizeChange={(size) => dispatch(setBatchPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('payments.column.batch')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.settledOn')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.transactions')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.gross')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.fee')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.netCredited')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.matched')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            batches.map((row) => (
              <TableShell.Row key={row.id} onClick={() => dispatch(openBatch(row.id))}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.id}</span>
                  <span className="block font-mono text-xs text-charcoal-light">{row.utr}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDate(row.settledOn)}
                  <span className="block text-xs text-charcoal-light">{formatDateTime(row.creditedAt)}</span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatNumber(row.transactionCount)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.grossAmount)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.fee + row.gstOnFee)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.netCredited)}
                </TableShell.Cell>
                <TableShell.Cell>
                  {row.unmatchedCount > 0 ? (
                    <Badge tone="warning">
                      {t('orders.ofCount', { done: row.matchedCount, total: row.transactionCount })}
                    </Badge>
                  ) : (
                    <Badge tone="success">{formatNumber(row.matchedCount)}</Badge>
                  )}
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={BATCH_TONES[row.status]} label={t(`payments.batchStatus.${row.status}`)} />
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchBatches())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearBatchFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Landmark}
                  title={t('payments.batchEmptyTitle')}
                  body={t('payments.batchEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <Modal
        open={openBatchId !== null}
        onClose={() => dispatch(openBatch(null))}
        size="xl"
        title={batch ? t('payments.batchTitle', { id: batch.batch.id }) : t('payments.batchesTitle')}
        description={batch ? formatDate(batch.batch.settledOn) : undefined}
        footer={
          <Button variant="secondary" onClick={() => dispatch(openBatch(null))}>
            {t('common.close')}
          </Button>
        }
      >
        {batchState === 'loading' ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : null}
        {batchState === 'error' ? <ErrorState onRetry={() => dispatch(fetchBatch(openBatchId))} /> : null}
        {batchState === 'populated' ? (
          <ul className="divide-y divide-lightGray">
            {batch.transactions.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="text-base text-charcoal">
                    {row.orderId} · {row.jewellerName}
                  </span>
                  <span className="block text-xs text-charcoal-light">
                    {row.method} · {row.gatewayReference}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-base tabular-nums text-charcoal">{formatINR(row.netAmount)}</span>
                  <StatusPill
                    tone={row.matchStatus === 'matched' ? 'success' : 'danger'}
                    label={row.matchStatus}
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Modal>
    </div>
  );
}

function MetaRow({ label, value, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd
        className={
          emphasis
            ? 'text-right text-lg font-semibold tabular-nums text-primary'
            : 'text-right text-base tabular-nums text-charcoal'
        }
      >
        {value ?? '-'}
      </dd>
    </div>
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
