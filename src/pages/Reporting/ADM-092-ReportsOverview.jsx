// ADM-092
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Boxes, Gauge, IndianRupee, Package, ShieldAlert, Users } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, PageHeader, Select } from '@/components/primitives';
import {
  ChartCard,
  MetricTile,
  chartAxisProps,
  chartColors,
  chartGridProps,
  chartTooltipProps,
} from '@/components';
import {
  fetchOverview,
  selectReportsOverview,
  setOverviewPeriod,
} from '@/store/slices/reportingSlice';
import {
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/utils/format';
import { t } from '@/i18n/en';

const PERIOD_OPTIONS = [
  { value: 'last_7_days', label: t('reports.period.last_7_days') },
  { value: 'last_30_days', label: t('reports.period.last_30_days') },
  { value: 'last_90_days', label: t('reports.period.last_90_days') },
  { value: 'last_12_months', label: t('reports.period.last_12_months') },
  { value: 'financial_ytd', label: t('reports.period.financial_ytd') },
];

const ATTENTION_ICONS = {
  dpdp_breach: ShieldAlert,
  payout_failed: IndianRupee,
  settlement_pending: Package,
  export_failed: Boxes,
};

export default function ReportsOverview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    period, headline, gmvSeries, funnel, attentionNeeded, savedReports,
    refreshedAt, viewState, error,
  } = useSelector(selectReportsOverview);

  useEffect(() => {
    dispatch(fetchOverview());
  }, [dispatch, period]);

  // Handlers.
  const handlePeriod = (event) => dispatch(setOverviewPeriod(event.target.value));
  const handleRetry = () => dispatch(fetchOverview());

  const loading = viewState === 'loading';

  // Markup.
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={handleRetry} />;
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('reports.eyebrow')}
        title={t('reports.overviewTitle')}
        subtitle={t('reports.overviewSubtitle')}
        actions={
          <Select
            id="period"
            className="w-52"
            value={period}
            onChange={handlePeriod}
            options={PERIOD_OPTIONS}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('reports.gmv')}
          value={formatINRCompact(headline?.gmv)}
          icon={IndianRupee}
          trend={trendFor(headline?.gmvChangePercent)}
          caption={headline?.gmvChangePercent === null ? t('reports.noPriorPeriod') : undefined}
          loading={loading}
          onClick={() => navigate('/reports/financial')}
        />
        <MetricTile
          label={t('reports.ordersMetric')}
          value={formatNumber(headline?.orders)}
          icon={Package}
          trend={trendFor(headline?.ordersChangePercent)}
          loading={loading}
        />
        <MetricTile
          label={t('reports.activeJewellers')}
          value={formatNumber(headline?.activeJewellers)}
          icon={Users}
          trend={trendFor(headline?.jewellerChangePercent)}
          loading={loading}
          onClick={() => navigate('/reports/marketplace')}
        />
        <MetricTile
          label={t('reports.conversion')}
          value={formatPercent(headline?.enquiryToOrderPercent)}
          icon={Gauge}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('reports.gmvChartTitle')}
          description={t('reports.gmvChartDescription')}
          status={loading ? 'loading' : 'succeeded'}
          onRetry={handleRetry}
          legend={[{ label: t('reports.gmvLegend'), color: chartColors[0] }]}
        >
          <BarChart data={gmvSeries}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={70} tickFormatter={formatINRCompact} />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
            <Bar dataKey="gmv" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <FunnelPanel funnel={funnel} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AttentionPanel items={attentionNeeded} onOpen={navigate} />
        <SavedReportsPanel reports={savedReports} onOpen={navigate} />
      </div>

      {refreshedAt ? (
        <p className="text-xs text-charcoal-light">
          {t('reports.refreshedAt', { time: formatRelativeTime(refreshedAt) })}
        </p>
      ) : null}
    </div>
  );
}

// A rise from nothing is not a percentage, so a null change renders no arrow
// at all rather than a zero that looks measured.
function trendFor(changePercent) {
  if (changePercent === null || changePercent === undefined) return undefined;
  return {
    direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat',
    value: changePercent,
    label: t('reports.vsPrevious'),
  };
}

// Bars rather than a chart. The interesting number is how much falls out
// between two stages, and a reader should not have to measure that off an axis.
function FunnelPanel({ funnel, loading }) {
  const top = funnel[0]?.count ?? 0;

  return (
    <Card title={t('reports.funnelTitle')} description={t('reports.funnelDescription')} padded={false}>
      <ul className="divide-y divide-lightGray">
        {loading || funnel.length === 0
          ? null
          : funnel.map((stage) => (
              <li key={stage.id} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-base text-charcoal">
                    {t(`reports.funnelStage.${stage.id}`)}
                  </span>
                  <span className="shrink-0 font-body text-base font-medium tabular-nums text-primary">
                    {formatNumber(stage.count)}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-lightGray">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${top === 0 ? 0 : (stage.count / top) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-charcoal-light">
                  {t('reports.funnelFromTop', {
                    percent: formatPercent(stage.conversionFromTopPercent),
                  })}
                </p>
              </li>
            ))}
      </ul>
    </Card>
  );
}

// Only the queues with something in them. A row reading zero is noise on a
// landing screen, and noise is how a real breach gets scrolled past.
function AttentionPanel({ items, onOpen }) {
  return (
    <Card title={t('reports.attentionTitle')} padded={items.length === 0}>
      {items.length === 0 ? (
        <EmptyState
          title={t('reports.attentionEmptyTitle')}
          body={t('reports.attentionEmptyBody')}
        />
      ) : (
        <ul className="divide-y divide-lightGray">
          {items.map((item) => {
            const Icon = ATTENTION_ICONS[item.kind];
            return (
              <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                <Icon size={16} className="shrink-0 text-charcoal-lighter" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-base text-charcoal">{t(`reports.attention.${item.kind}`)}</p>
                  {item.amount ? (
                    <p className="text-xs text-charcoal-light">{formatINR(item.amount)}</p>
                  ) : null}
                </div>
                <span className="shrink-0 tabular-nums text-base font-medium text-charcoal">
                  {formatNumber(item.count)}
                </span>
                <Button size="sm" variant="ghost" onClick={() => onOpen(item.path)}>
                  {t('common.view')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function SavedReportsPanel({ reports, onOpen }) {
  return (
    <Card title={t('reports.savedReportsTitle')} padded={false}>
      <ul className="divide-y divide-lightGray">
        {reports.map((report) => (
          <li key={report.id} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-base text-charcoal">{report.name}</p>
              <p className="text-xs text-charcoal-light">
                {report.ownerName} · {t('reports.lastRun', { time: formatRelativeTime(report.lastRunAt) })}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onOpen(report.path)}>
              {t('common.view')}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
