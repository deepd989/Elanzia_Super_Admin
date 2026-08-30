// ADM-036
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Clock, RadioTower, TriangleAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
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
  fetchFeedIncidents,
  fetchRateFeeds,
  fetchRateHistory,
  selectFeedHealth,
  setHistoryQuery,
  setIncidentPage,
  setIncidentPageSize,
  testFeed,
} from '@/store/slices/pricingSlice';
import { formatDateTime, formatINR, formatNumber, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = { healthy: 'success', degraded: 'warning', down: 'danger' };

const RANGE_OPTIONS = [
  { value: '7d', label: t('pricing.range7d') },
  { value: '30d', label: t('pricing.range30d') },
  { value: '90d', label: t('pricing.range90d') },
  { value: '180d', label: t('pricing.range180d') },
];

const SERIES_OPTIONS = [
  { value: 'gold:24', label: 'Gold 24K' },
  { value: 'gold:22', label: 'Gold 22K' },
  { value: 'gold:18', label: 'Gold 18K' },
  { value: 'gold:14', label: 'Gold 14K' },
  { value: 'silver:999', label: 'Silver 999' },
  { value: 'silver:925', label: 'Silver 925' },
];

const COLUMN_COUNT = 6;

export default function RateFeedHealth() {
  const dispatch = useDispatch();

  // Data.
  const {
    feeds,
    primary,
    history,
    historySummary,
    historyQuery,
    historyViewState,
    incidents,
    incidentsTotal,
    incidentsQuery,
    incidentsViewState,
    testStatus,
    viewState,
    error,
  } = useSelector(selectFeedHealth);

  useEffect(() => {
    dispatch(fetchRateFeeds());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchRateHistory());
  }, [dispatch, historyQuery]);

  useEffect(() => {
    dispatch(fetchFeedIncidents());
  }, [dispatch, incidentsQuery]);

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.feedsTitle')}
        subtitle={t('pricing.feedsSubtitle')}
        meta={
          primary ? (
            <StatusPill tone={STATUS_TONES[primary.status]} dot>
              {primary.name}
            </StatusPill>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('pricing.uptime7d')}
          value={primary ? formatPercent(primary.uptime7d) : '-'}
          icon={Activity}
          loading={viewState === 'loading'}
        />
        <MetricTile
          label={t('pricing.lastSync')}
          value={primary ? formatRelativeTime(primary.lastSyncAt) : '-'}
          caption={primary ? formatDateTime(primary.lastSyncAt) : undefined}
          icon={Clock}
          loading={viewState === 'loading'}
        />
        <MetricTile
          label={t('pricing.quotesToday')}
          value={
            primary ? `${formatNumber(primary.quotesReceivedToday)} / ${formatNumber(primary.quotesPerDay)}` : '-'
          }
          icon={RadioTower}
          loading={viewState === 'loading'}
        />
        {/* A rising incident count is bad, so the tile is told which way is up. */}
        <MetricTile
          label={t('pricing.openIncidents')}
          value={formatNumber(incidents.filter((incident) => !incident.endedAt).length)}
          icon={TriangleAlert}
          invertTrend
          loading={incidentsViewState === 'loading'}
        />
      </div>

      {viewState === 'error' ? (
        <ErrorState detail={error?.message} onRetry={() => dispatch(fetchRateFeeds())} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {feeds.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              testing={testStatus === 'loading'}
              onTest={() => dispatch(testFeed(feed.id))}
            />
          ))}
        </div>
      )}

      <ChartCard
        title={t('pricing.historyTitle')}
        description={t('pricing.historySubtitle', {
          metal: historyQuery.metal,
          purity: historyQuery.purity,
          range: historyQuery.range,
        })}
        status={historyViewState === 'populated' ? 'succeeded' : historyViewState}
        onRetry={() => dispatch(fetchRateHistory())}
        action={
          <div className="flex gap-2">
            <Select
              id="series"
              className="w-36"
              value={`${historyQuery.metal}:${historyQuery.purity}`}
              onChange={(event) => {
                const [metal, purity] = event.target.value.split(':');
                dispatch(setHistoryQuery({ metal, purity: Number(purity) }));
              }}
              options={SERIES_OPTIONS}
            />
            <Select
              id="range"
              className="w-32"
              value={historyQuery.range}
              onChange={(event) => dispatch(setHistoryQuery({ range: event.target.value }))}
              options={RANGE_OPTIONS}
            />
          </div>
        }
      >
        <AreaChart data={history}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="date" {...chartAxisProps} minTickGap={40} />
          <YAxis {...chartAxisProps} width={70} domain={['auto', 'auto']} />
          <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
          <Area
            type="monotone"
            dataKey="ratePerGram"
            stroke={chartColors[0]}
            fill={chartColors[0]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartCard>

      {historySummary ? <HistorySummary summary={historySummary} /> : null}

      <Card
        title={t('pricing.incidentsTitle')}
        description={t('pricing.incidentsSubtitle')}
        padded={false}
      >
        <TableShell
          className="rounded-none border-0 shadow-none"
          footer={
            <TableShell.Pagination
              page={incidentsQuery.page}
              pageSize={incidentsQuery.pageSize}
              total={incidentsTotal}
              onPageChange={(page) => dispatch(setIncidentPage(page))}
              onPageSizeChange={(size) => dispatch(setIncidentPageSize(size))}
            />
          }
        >
          <TableShell.Head>
            <TableShell.HeadCell>{t('pricing.columnFeed')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.columnCause')}</TableShell.HeadCell>
            <TableShell.HeadCell>{t('pricing.columnStarted')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">{t('pricing.columnDuration')}</TableShell.HeadCell>
            <TableShell.HeadCell align="right">
              {t('pricing.columnQuotesMissed')}
            </TableShell.HeadCell>
            <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          </TableShell.Head>

          <TableShell.Body>
            {incidentsViewState === 'populated' ? (
              incidents.map((incident) => (
                <TableShell.Row key={incident.id}>
                  <TableShell.Cell>{incident.feedName}</TableShell.Cell>
                  <TableShell.Cell className="text-charcoal-light">
                    {incident.causeLabel}
                  </TableShell.Cell>
                  <TableShell.Cell>
                    {formatDateTime(incident.startedAt)}
                    <span className="block text-xs text-charcoal-light">
                      {formatRelativeTime(incident.startedAt)}
                    </span>
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {incident.durationMinutes
                      ? t('pricing.minutes', { count: incident.durationMinutes })
                      : '-'}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>
                    {formatNumber(incident.quotesMissed)}
                  </TableShell.Cell>
                  <TableShell.Cell>
                    {!incident.endedAt ? (
                      <StatusPill tone="danger" dot>
                        {t('pricing.stillOpen')}
                      </StatusPill>
                    ) : (
                      <Badge tone="outline">
                        {incident.overrideApplied
                          ? t('pricing.overrideWasApplied')
                          : t('pricing.rodeItOut')}
                      </Badge>
                    )}
                  </TableShell.Cell>
                </TableShell.Row>
              ))
            ) : (
              <TableShell.StateRow colSpan={COLUMN_COUNT}>
                {incidentsViewState === 'loading' ? <IncidentSkeleton /> : null}
                {incidentsViewState === 'error' ? (
                  <ErrorState onRetry={() => dispatch(fetchFeedIncidents())} />
                ) : null}
                {incidentsViewState.startsWith('empty') ? <EmptyState /> : null}
              </TableShell.StateRow>
            )}
          </TableShell.Body>
        </TableShell>
      </Card>
    </div>
  );
}

function FeedCard({ feed, testing, onTest }) {
  return (
    <Card
      title={feed.name}
      description={feed.provider}
      action={
        <Button size="sm" variant="secondary" loading={testing} onClick={onTest}>
          {t('pricing.testFeed')}
        </Button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusPill tone={STATUS_TONES[feed.status]} dot label={feed.status} />
        <Badge tone={feed.isPrimary ? 'accent' : 'outline'}>
          {feed.isPrimary ? t('pricing.primaryFeed') : t('pricing.standbyFeed')}
        </Badge>
        {feed.consecutiveFailures > 0 ? (
          <span className="text-xs text-warning">
            {t('pricing.consecutiveFailures', { count: feed.consecutiveFailures })}
          </span>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Stat label={t('pricing.uptime7d')} value={formatPercent(feed.uptime7d)} />
        <Stat label={t('pricing.uptime24h')} value={formatPercent(feed.successRate24h)} />
        <Stat label={t('pricing.latency')} value={`${formatNumber(feed.latencyMs)} ms`} />
        <Stat label={t('pricing.lastSync')} value={formatRelativeTime(feed.lastSyncAt)} />
      </dl>

      <p className="mt-3 text-sm text-charcoal-light">{feed.message}</p>
      {feed.impact && feed.impact !== 'None.' ? (
        <p className="mt-1 text-sm text-warning">{feed.impact}</p>
      ) : null}
    </Card>
  );
}

function HistorySummary({ summary }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-md border border-lightGray-dark bg-white px-4 py-3">
      <Stat label={t('pricing.high')} value={formatINR(summary.high)} />
      <Stat label={t('pricing.low')} value={formatINR(summary.low)} />
      <Stat
        label={t('pricing.periodChange')}
        value={`${summary.changePercent >= 0 ? '+' : ''}${formatPercent(summary.changePercent, { decimals: 2 })}`}
      />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-charcoal-light">{label}</dt>
      <dd className="text-base text-charcoal num">{value}</dd>
    </div>
  );
}

function IncidentSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
