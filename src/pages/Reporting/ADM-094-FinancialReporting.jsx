// ADM-094
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, Landmark, Percent, Receipt } from 'lucide-react';
import { Card, ErrorState, PageHeader, Select } from '@/components/primitives';
import {
  ChartCard,
  MetricTile,
  TableShell,
  chartAxisProps,
  chartColors,
  chartGridProps,
  chartTooltipProps,
} from '@/components';
import {
  fetchFinancialReport,
  selectFinancialReport,
  setFinancialBasis,
  setFinancialPeriod,
} from '@/store/slices/reportingSlice';
import { formatINR, formatINRCompact, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const PERIOD_OPTIONS = [
  { value: 'last_90_days', label: t('reports.period.last_90_days') },
  { value: 'last_12_months', label: t('reports.period.last_12_months') },
  { value: 'financial_ytd', label: t('reports.period.financial_ytd') },
];

const BASIS_OPTIONS = [
  { value: 'accrual', label: t('reports.basis.accrual') },
  { value: 'cash', label: t('reports.basis.cash') },
];

const GST_ROWS = ['taxableValue', 'cgst', 'sgst', 'igst', 'total'];

export default function FinancialReporting() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    summary, periods, commissionByMonth, settlementAgeing, gstSummary,
    query, viewState, error,
  } = useSelector(selectFinancialReport);

  useEffect(() => {
    dispatch(fetchFinancialReport());
  }, [dispatch, query]);

  // Handlers.
  const handleRetry = () => dispatch(fetchFinancialReport());

  const loading = viewState === 'loading';

  // Markup.
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={handleRetry} />;
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('reports.eyebrow')}
        title={t('reports.financialTitle')}
        subtitle={t('reports.financialSubtitle')}
        actions={
          <>
            <Select
              id="basis"
              className="w-36"
              value={query.filters.basis}
              onChange={(event) => dispatch(setFinancialBasis(event.target.value))}
              options={BASIS_OPTIONS}
            />
            <Select
              id="period"
              className="w-52"
              value={query.period}
              onChange={(event) => dispatch(setFinancialPeriod(event.target.value))}
              options={PERIOD_OPTIONS}
            />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Commission is the only tile on this screen that is Elanzia money.
            The caption says so rather than leaving a reader to assume. */}
        <MetricTile
          label={t('reports.commissionEarned')}
          value={formatINRCompact(summary?.commissionEarned)}
          caption={t('reports.effectiveCommission', {
            percent: formatPercent(summary?.effectiveCommissionPercent ?? 0, { decimals: 2 }),
          })}
          icon={Percent}
          loading={loading}
        />
        <MetricTile
          label={t('reports.gstOnCommission')}
          value={formatINRCompact(summary?.gstOnCommission)}
          icon={Receipt}
          loading={loading}
        />
        <MetricTile
          label={t('reports.payoutsReleased')}
          value={formatINRCompact(summary?.payoutsReleased)}
          icon={Banknote}
          loading={loading}
        />
        {/* This balance is the payment aggregator's, never Elanzia's. It splits
            to the manufacturer net of commission when the return window closes,
            and reading it as revenue overstates the platform several times. */}
        <MetricTile
          label={t('reports.heldInNodal')}
          value={formatINRCompact(summary?.heldInNodal)}
          caption={t('reports.nodalNote')}
          icon={Landmark}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('reports.commissionChartTitle')}
          description={t('reports.commissionOnlyNote')}
          status={loading ? 'loading' : 'succeeded'}
          onRetry={handleRetry}
          legend={[
            { label: t('reports.gmvLegend'), color: chartColors[0] },
            { label: t('reports.commissionLegend'), color: chartColors[1] },
          ]}
        >
          <BarChart data={commissionByMonth}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={70} tickFormatter={formatINRCompact} />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
            <Bar dataKey="gmv" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="commission" fill={chartColors[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <AgeingPanel buckets={settlementAgeing} />
      </div>

      <Card title={t('reports.periodsTableTitle')} padded={false}>
        <TableShell>
          <TableShell.Head>
            <TableShell.HeadCell>{t('reports.column.month')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.orders')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.gmv')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.commission')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.gst')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.released')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.failed')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.refunds')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('reports.column.nodal')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {loading ? (
              <TableShell.StateRow colSpan={9}>
                <RowSkeleton />
              </TableShell.StateRow>
            ) : (
              periods.map((row) => (
                <TableShell.Row key={row.id}>
                  <TableShell.Cell>{row.label}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatNumber(row.orders)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatINR(row.gmv)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatINR(row.commission)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatINR(row.gstOnCommission)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatINR(row.payoutsReleased)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatINR(row.payoutsFailed)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatINR(row.refunds)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatINR(row.heldInNodal)}</TableShell.Cell>
                </TableShell.Row>
              ))
            )}
          </TableShell.Body>
        </TableShell>
      </Card>

      <GstPanel summary={gstSummary} />
    </div>
  );
}

// Ageing runs off the day each payout fell due, not off the order date. A
// payout is not late because the order is old; it is late because the return
// window closed and the money did not move.
function AgeingPanel({ buckets }) {
  const largest = Math.max(1, ...buckets.map((bucket) => bucket.amount));

  return (
    <Card
      title={t('reports.ageingTitle')}
      description={t('reports.ageingDescription')}
      padded={false}
    >
      <ul className="divide-y divide-lightGray">
        {buckets.map((bucket) => (
          <li key={bucket.bucket} className="px-5 py-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-base text-charcoal">
                {t(`reports.ageingBucket.${bucket.bucket}`)}
              </span>
              <span className="shrink-0 tabular-nums text-base font-medium text-primary">
                {formatINR(bucket.amount)}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-lightGray">
              <div
                className="h-2 rounded-full bg-accent"
                style={{ width: `${(bucket.amount / largest) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-charcoal-light">
              {formatNumber(bucket.count)} {t('reports.column.count')}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function GstPanel({ summary }) {
  if (!summary) return null;

  return (
    <Card title={t('reports.gstTitle')}>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {GST_ROWS.map((key) => (
          <div key={key}>
            <dt className="text-sm text-charcoal-light">{t(`reports.gst.${key}`)}</dt>
            <dd className="mt-1 font-display text-xl leading-none text-primary num">
              {formatINR(summary[key])}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-sm text-charcoal-light">{t('reports.gst.invoiceCount')}</dt>
          <dd className="mt-1 font-display text-xl leading-none text-primary num">
            {formatNumber(summary.invoiceCount)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
