// ADM-054
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Banknote, Landmark, PauseCircle, Search, Send } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearRunFilters,
  fetchSettlementRuns,
  fetchSettlementSummary,
  selectSettlementRuns,
  setRunFilters,
  setRunPage,
  setRunPageSize,
  setRunSearch,
  setRunSort,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatINR, formatINRCompact, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const RUN_TONES = {
  draft: 'neutral',
  ready: 'info',
  released: 'accent',
  part_failed: 'danger',
  completed: 'success',
};

const STATUS_OPTIONS = ['draft', 'ready', 'released', 'part_failed', 'completed'].map((value) => ({
  value,
  label: t(`payments.runStatus.${value}`),
}));

const COLUMN_COUNT = 8;

export default function SettlementRuns() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const { runs, total, query, viewState, summary, facets } = useSelector(selectSettlementRuns);

  useEffect(() => {
    dispatch(fetchSettlementRuns());
    dispatch(fetchSettlementSummary());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setRunFilters({ ...query.filters, [field]: event.target.value }));

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.settlementsTitle')}
        subtitle={t('payments.settlementsSubtitle')}
        meta={
          summary ? (
            <StatusPill tone="info" label={t('payments.runsReady', { count: summary.runsReady })} />
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Due to release means the return window has CLOSED. A run due next
            week is not money the desk can move today. */}
        <MetricTile
          label={t('payments.dueNow')}
          value={formatINRCompact(summary?.dueNowValue ?? 0)}
          caption={t('payments.dueNowCaption')}
          icon={Send}
          loading={!summary}
        />
        <MetricTile
          label={t('payments.nodalBalance')}
          value={formatINRCompact(summary?.nodal?.balance ?? 0)}
          caption={t('payments.nodalCaption')}
          icon={Landmark}
          loading={!summary}
        />
        <MetricTile
          label={t('payments.heldValue')}
          value={formatINRCompact(summary?.heldValue ?? 0)}
          icon={PauseCircle}
          invertTrend
          loading={!summary}
        />
        <MetricTile
          label={t('payments.releasedThisMonth')}
          value={formatINRCompact(summary?.releasedThisMonth ?? 0)}
          icon={Banknote}
          loading={!summary}
        />
      </div>

      <Card title={t('payments.nodalTitle')} description={t('payments.nodalCaption')}>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Fact label={t('payments.nodalBalance')} value={formatINR(summary?.nodal?.balance)} emphasis />
          <Fact label={t('payments.nodalDue')} value={formatINR(summary?.nodal?.dueToRelease)} />
          <Fact label={t('payments.nodalCommission')} value={formatINR(summary?.nodal?.commissionRetained)} />
        </dl>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('payments.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setRunSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="manufacturer"
          className="w-56"
          placeholder={t('payments.filter.manufacturer')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearRunFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setRunPage(page))}
            onPageSizeChange={(size) => dispatch(setRunPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('payments.column.run')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('payments.column.manufacturer')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.lines')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.goods')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.commission')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('payments.column.payout')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'dueAt' ? query.sortDir : null}
            onSort={() =>
              dispatch(setRunSort({ sortBy: 'dueAt', sortDir: query.sortDir === 'desc' ? 'asc' : 'desc' }))
            }
          >
            {t('payments.column.due')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            runs.map((run) => (
              <TableShell.Row key={run.id} onClick={() => navigate(`/payments/settlements/${run.id}`)}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{run.id}</span>
                  <span className="block font-mono text-xs text-charcoal-light">{run.nodalReference ?? '-'}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {run.manufacturerName}
                  <span className="block text-xs text-charcoal-light">{run.manufacturerCity}</span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatNumber(run.lineCount)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(run.goodsValue)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(run.commission)}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(run.payout)}
                </TableShell.Cell>
                <TableShell.Cell>
                  {run.dueAt ? formatDate(run.dueAt) : '-'}
                  {run.dueAt ? (
                    <span className="block text-xs text-charcoal-light">{formatRelativeTime(run.dueAt)}</span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.Cell>
                  <div className="flex items-center gap-1.5">
                    <StatusPill tone={RUN_TONES[run.status]} label={t(`payments.runStatus.${run.status}`)} />
                    {run.failedCount > 0 ? <Badge tone="danger">{formatNumber(run.failedCount)}</Badge> : null}
                  </div>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchSettlementRuns())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearRunFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Banknote}
                  title={t('payments.settlementsEmptyTitle')}
                  body={t('payments.settlementsEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function Fact({ label, value, emphasis = false }) {
  return (
    <div>
      <dt className="text-sm text-charcoal-light">{label}</dt>
      <dd
        className={
          emphasis
            ? 'mt-0.5 text-xl font-semibold tabular-nums text-primary'
            : 'mt-0.5 text-base tabular-nums text-charcoal'
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
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
