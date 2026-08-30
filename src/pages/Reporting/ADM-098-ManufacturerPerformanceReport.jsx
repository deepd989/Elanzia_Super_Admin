// ADM-098
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertTriangle, BadgeCheck, Clock, Search, ShieldOff } from 'lucide-react';
import {
  Button, EmptyState, ErrorState, Input, PageHeader, Select, StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearPerformanceFilters,
  fetchManufacturerPerformance,
  fetchPerformanceSummary,
  selectManufacturerPerformance,
  setPerformanceFilters,
  setPerformancePage,
  setPerformancePageSize,
  setPerformanceSearch,
  setPerformanceSort,
} from '@/store/slices/reportingSlice';
import { formatINR, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const BADGE_TONES = {
  verified: 'success',
  at_risk: 'warning',
  not_eligible: 'neutral',
  suspended: 'danger',
};

const COLUMN_COUNT = 8;

export default function ManufacturerPerformanceReport() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { rows, total, query, facets, thresholds, summary, viewState, error } =
    useSelector(selectManufacturerPerformance);

  useEffect(() => {
    dispatch(fetchManufacturerPerformance());
    dispatch(fetchPerformanceSummary());
  }, [dispatch, query]);

  // Handlers.
  const handleFilter = (field) => (event) =>
    dispatch(setPerformanceFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setPerformanceSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  const sortDirFor = (sortBy) => (query.sortBy === sortBy ? query.sortDir : null);

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('reports.eyebrow')}
        title={t('reports.manufacturersTitle')}
        subtitle={t('reports.manufacturersSubtitle')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('reports.verifiedCount')}
          value={formatNumber(summary?.verified)}
          icon={BadgeCheck}
          loading={!summary}
        />
        <MetricTile
          label={t('reports.atRiskCount')}
          value={formatNumber(summary?.atRisk)}
          icon={AlertTriangle}
          loading={!summary}
        />
        <MetricTile
          label={t('reports.medianResponse')}
          value={
            summary?.medianResponseHours === null
              ? t('common.notAvailable')
              : t('reports.hoursShort', { hours: formatNumber(summary?.medianResponseHours) })
          }
          icon={Clock}
          loading={!summary}
        />
        <MetricTile
          label={t('reports.medianFulfilment')}
          value={formatPercent(summary?.medianFulfilmentPercent)}
          icon={ShieldOff}
          loading={!summary}
        />
      </div>

      {/* The rule the badge column applied, stated rather than assumed. A
          report that grades somebody without publishing the bar is not a
          report, it is a verdict. */}
      {thresholds ? (
        <p className="text-sm text-charcoal-light">
          {t('reports.thresholdNote', {
            dispatch: formatPercent(thresholds.onTimeDispatchPercent),
            rating: formatNumber(thresholds.rating),
            dispute: formatPercent(thresholds.disputeRatePercent),
            orders: formatNumber(thresholds.minimumOrders),
          })}{' '}
          {t('reports.disputeNote')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-80"
          iconLeft={Search}
          placeholder={t('reports.manufacturerSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setPerformanceSearch(event.target.value))}
        />
        <Select
          id="city"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.city}
          onChange={handleFilter('city')}
          options={facets?.city ?? []}
        />
        <Select
          id="badge"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.badgeState}
          onChange={handleFilter('badgeState')}
          options={(facets?.badgeState ?? []).map(({ value }) => ({
            value,
            label: t(`reports.badge.${value}`),
          }))}
        />
        <Select
          id="band"
          className="w-40"
          placeholder={t('common.all')}
          value={query.filters.gmvBand}
          onChange={handleFilter('gmvBand')}
          options={(facets?.gmvBand ?? []).map(({ value }) => ({
            value,
            label: t(`reports.band.${value}`),
          }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearPerformanceFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setPerformancePage(page))}
            onPageSizeChange={(size) => dispatch(setPerformancePageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('reports.column.business')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell align="right" direction={sortDirFor('gmv')} onSort={() => handleSort('gmv')}>
            {t('reports.column.gmv')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.orders')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell align="right" direction={sortDirFor('responseRatePercent')} onSort={() => handleSort('responseRatePercent')}>
            {t('reports.column.responseRate')}
          </TableShell.SortableHeadCell>
          <TableShell.SortableHeadCell align="right" direction={sortDirFor('fulfilmentRatePercent')} onSort={() => handleSort('fulfilmentRatePercent')}>
            {t('reports.column.fulfilment')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.onTime')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell align="right" direction={sortDirFor('disputeRatePercent')} onSort={() => handleSort('disputeRatePercent')}>
            {t('reports.column.disputes')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('reports.column.badge')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            rows.map((row) => (
              <TableShell.Row key={row.manufacturerId}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{row.businessName}</span>
                  <span className="block text-xs text-charcoal-light">
                    {row.city} · {row.speciality}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatINR(row.gmv)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatNumber(row.orders)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatPercent(row.responseRatePercent)}
                  {/* A rate off two enquiries is a coin toss, not a track
                      record, and the badge does not hold it against them. */}
                  {row.enquiries < 5 ? (
                    <span className="block text-xs text-charcoal-lighter">
                      {t('reports.responseSmallSample')}
                    </span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatPercent(row.fulfilmentRatePercent)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatPercent(row.onTimeDispatchPercent)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatPercent(row.disputeRatePercent)}</TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={BADGE_TONES[row.badgeState]}>
                    {t(`reports.badge.${row.badgeState}`)}
                  </StatusPill>
                  {/* The report says why, so a manufacturer asking what to fix
                      gets an answer rather than a colour. */}
                  {row.badgeBlockers.length > 0 ? (
                    <span className="block text-xs text-charcoal-light">
                      {row.badgeBlockers.map((blocker) => t(`reports.blocker.${blocker}`)).join(', ')}
                    </span>
                  ) : null}
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchManufacturerPerformance())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearPerformanceFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  title={t('reports.manufacturersEmptyTitle')}
                  body={t('reports.manufacturersEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function RowSkeleton({ rows = 10 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-52 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
