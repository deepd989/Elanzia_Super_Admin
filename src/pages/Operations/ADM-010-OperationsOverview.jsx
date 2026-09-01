// ADM-010
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, IndianRupee, Package, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button, Card, ErrorState, PageHeader, StatusPill } from '@/components/primitives';
import {
  ChartCard,
  MetricTile,
  chartAxisProps,
  chartColors,
  chartGridProps,
  chartTooltipProps,
} from '@/components';
import {
  fetchDashboard,
  fetchFeeds,
  fetchGoldRate,
  refreshFeed,
  selectOperationsDashboard,
} from '@/store/slices/operationsSlice';
import {
  formatDateTime,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/utils/format';
import { t } from '@/i18n/en';

const FEED_TONES = { healthy: 'success', degraded: 'warning', down: 'danger' };

// StatusPill runs `label` through humanise(), which is meant for raw status
// vocabulary. Copy that has already been through t() goes in as children so it
// keeps its sentence casing.

const HEALTH_LABELS = {
  healthy: 'operations.platformHealthy',
  degraded: 'operations.platformDegraded',
  down: 'operations.platformDown',
};

export default function OperationsOverview() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const {
    metrics,
    workQueues,
    gmvSeries,
    activity,
    refreshedAt,
    viewState,
    error,
    goldRate,
    goldRateState,
    feeds,
    feedsState,
    feedHealth,
    refreshingFeedId,
    feedActionError,
  } = useSelector(selectOperationsDashboard);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchGoldRate());
    dispatch(fetchFeeds());
  }, [dispatch]);

  // Handlers.
  const handleRefresh = () => {
    dispatch(fetchDashboard());
    dispatch(fetchGoldRate());
    dispatch(fetchFeeds());
  };

  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={handleRefresh} />;
  }

  const loading = viewState === 'loading';

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('operations.eyebrow')}
        title={t('operations.overviewTitle')}
        subtitle={t('operations.overviewSubtitle')}
        meta={
          <StatusPill tone={FEED_TONES[feedHealth]} dot>
            {t(HEALTH_LABELS[feedHealth])}
          </StatusPill>
        }
        actions={
          <span className="flex items-center gap-3">
            {refreshedAt ? (
              <span className="text-xs text-charcoal-light">
                {t('operations.refreshedAt', { time: formatRelativeTime(refreshedAt) })}
              </span>
            ) : null}
            <Button variant="secondary" iconLeft={RefreshCw} onClick={handleRefresh}>
              {t('common.refresh')}
            </Button>
          </span>
        }
      />

      {/* Four tiles. None of them carries a trend: comparing a day that is four
          hours old against a finished one is a comparison that reads as a
          collapse every morning and means nothing. The caption carries the
          seven day figure instead, which is the number that does compare. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('operations.gmvToday')}
          value={formatINRCompact(metrics?.gmvToday ?? 0)}
          caption={
            metrics?.gmvToday === 0
              ? t('operations.gmvTodayNone')
              : t('operations.gmvTodayCaption', { amount: formatINRCompact(metrics?.gmvSevenDay) })
          }
          icon={IndianRupee}
          loading={loading}
        />
        <MetricTile
          label={t('operations.ordersToday')}
          value={formatNumber(metrics?.ordersToday ?? 0)}
          caption={t('operations.ordersTodayCaption', { count: metrics?.ordersSevenDay ?? 0 })}
          icon={Package}
          loading={loading}
        />
        <MetricTile
          label={t('operations.openExceptions')}
          value={formatNumber(metrics?.openExceptions ?? 0)}
          caption={t('operations.openExceptionsCaption', { count: metrics?.criticalExceptions ?? 0 })}
          icon={AlertTriangle}
          loading={loading}
          onClick={() => navigate('/operations/alerts')}
        />
        <MetricTile
          label={t('operations.pendingVerificationsTile')}
          value={formatNumber(metrics?.pendingVerifications ?? 0)}
          caption={t('operations.pendingVerificationsCaption', {
            count: workQueues.find((queue) => queue.id === 'pending-verifications')?.slaBreachedCount ?? 0,
          })}
          icon={ShieldCheck}
          loading={loading}
          onClick={() => navigate('/operations/alerts?category=verification_ageing')}
        />
      </div>

      <WorkQueueStrip queues={workQueues} loading={loading} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('operations.gmvChartTitle')}
          description={t('operations.gmvChartDescription')}
          status={loading ? 'loading' : 'succeeded'}
          onRetry={handleRefresh}
          legend={[{ label: t('operations.gmvLegend'), color: chartColors[0] }]}
        >
          <BarChart data={gmvSeries}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={70} tickFormatter={formatINRCompact} />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
            <Bar dataKey="gmv" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title={t('operations.ordersChartTitle')}
          status={loading ? 'loading' : 'succeeded'}
          onRetry={handleRefresh}
          legend={[{ label: t('operations.ordersLegend'), color: chartColors[1] }]}
        >
          <LineChart data={gmvSeries}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={40} allowDecimals={false} />
            <Tooltip {...chartTooltipProps} />
            <Line
              type="monotone"
              dataKey="orders"
              stroke={chartColors[1]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <GoldRatePanel rate={goldRate} state={goldRateState} onRetry={() => dispatch(fetchGoldRate())} />
        <FeedPanel
          feeds={feeds}
          state={feedsState}
          refreshingId={refreshingFeedId}
          actionError={feedActionError}
          onRetry={() => dispatch(fetchFeeds())}
          onRefreshFeed={(feedId) => dispatch(refreshFeed({ feedId }))}
        />
      </div>

      <ActivityPanel activity={activity} loading={loading} />
    </div>
  );
}

// The six counts that mean a person has to do something. Each opens the alerts
// feed already filtered, so the number on the tile and the rows behind it are
// the same rows.
function WorkQueueStrip({ queues, loading }) {
  return (
    <Card title={t('operations.workQueuesTitle')} description={t('operations.workQueuesDescription')}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-md bg-lightGray-dark" />
            ))
          : queues.map((queue) => (
              // A Link, not a button with a handler: these are the most clicked
              // things on the desk, and an operator opening three queues in
              // three tabs is the normal way this screen gets used.
              <Link
                key={queue.id}
                to={`/operations/alerts?category=${queue.category}`}
                className="flex flex-col items-start gap-1 rounded-md border border-lightGray-dark bg-white px-4 py-3 text-left transition hover:border-accent"
              >
                <span className="text-sm text-charcoal-light">
                  {t(`operations.category.${queue.category}`)}
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="text-2xl font-medium text-charcoal">
                    {formatNumber(queue.count)}
                  </span>
                  {queue.slaBreachedCount > 0 ? (
                    <StatusPill size="sm" tone="danger">
                      {t('operations.workQueueBreached', { count: queue.slaBreachedCount })}
                    </StatusPill>
                  ) : null}
                </span>
                <span className="text-xs text-charcoal-light">
                  {queue.oldestRaisedAt
                    ? t('operations.workQueueOldest', {
                        age: formatRelativeTime(queue.oldestRaisedAt),
                      })
                    : t('operations.workQueueClear')}
                </span>
              </Link>
            ))}
      </div>
    </Card>
  );
}

function GoldRatePanel({ rate, state, onRetry }) {
  return (
    <Card
      title={t('operations.goldRateTitle')}
      description={rate ? t('operations.goldRateSource', { source: rate.source }) : undefined}
      action={
        rate?.stale ? <StatusPill tone="warning">{t('operations.goldRateStale')}</StatusPill> : null
      }
    >
      {state === 'failed' ? <ErrorState onRetry={onRetry} /> : null}
      {state === 'loading' || !rate ? (
        <div className="h-32 animate-pulse rounded-md bg-lightGray-dark" />
      ) : null}

      {rate && state !== 'failed' ? (
        <div className="flex flex-col gap-3">
          <dl className="flex flex-col gap-2">
            {rate.rates.map((row) => (
              <div key={row.purity} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-charcoal-light">{`${row.purity}K`}</dt>
                <dd className="flex items-baseline gap-3">
                  <span className="text-base tabular-nums text-charcoal">
                    {formatINR(row.ratePerGram)}
                  </span>
                  <span
                    className={`w-16 text-right text-xs tabular-nums ${
                      row.changePercent >= 0 ? 'text-success' : 'text-danger'
                    }`}
                  >
                    {formatPercent(row.changePercent, { decimals: 2 })}
                  </span>
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-xs text-charcoal-light">
            {t('operations.goldRateCaptured', { time: formatDateTime(rate.capturedAt) })}
          </p>
          {/* Worth spelling out: a stale rate does not put a single confirmed
              order at risk, and an operator should not escalate as if it does. */}
          {rate.stale ? (
            <p className="rounded border border-warning bg-warning-surface px-3 py-2 text-xs text-charcoal">
              {t('operations.goldRateStaleHelp')}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function FeedPanel({ feeds, state, refreshingId, actionError, onRetry, onRefreshFeed }) {
  return (
    <Card
      title={t('operations.feedsTitle')}
      description={t('operations.feedsDescription')}
      padded={false}
    >
      {state === 'failed' ? (
        <div className="p-5">
          <ErrorState onRetry={onRetry} />
        </div>
      ) : null}

      {state === 'loading' && feeds.length === 0 ? (
        <div className="m-5 h-32 animate-pulse rounded-md bg-lightGray-dark" />
      ) : null}

      {actionError ? (
        <p className="px-5 pt-4 text-sm text-danger">{actionError.message}</p>
      ) : null}

      <ul className="divide-y divide-lightGray">
        {feeds.map((feed) => (
          <li key={feed.id} className="flex items-start gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-base text-charcoal">
                {feed.name}
                <StatusPill size="sm" tone={FEED_TONES[feed.status]}>
                  {t(`operations.feedStatus.${feed.status}`)}
                </StatusPill>
              </p>
              <p className="text-xs text-charcoal-light">{feed.message}</p>
              <p className="text-xs text-charcoal-lighter">
                {t('operations.feedLastSync', { time: formatRelativeTime(feed.lastSyncAt) })}
                {' · '}
                {t('operations.feedSuccessRate', { percent: formatPercent(feed.successRate24h) })}
              </p>
            </div>
            {feed.status !== 'healthy' ? (
              <Button
                size="sm"
                variant="ghost"
                loading={refreshingId === feed.id}
                onClick={() => onRefreshFeed(feed.id)}
              >
                {t('operations.feedRefresh')}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Not a table - there is nothing to sort or paginate.
function ActivityPanel({ activity, loading }) {
  if (loading) {
    return (
      <Card title={t('operations.activityTitle')}>
        <div className="h-40 animate-pulse rounded-md bg-lightGray-dark" />
      </Card>
    );
  }

  return (
    <Card title={t('operations.activityTitle')} padded={false}>
      <ul className="divide-y divide-lightGray">
        {activity.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <Link to={entry.targetPath} className="min-w-0 flex-1">
              <p className="text-base text-charcoal">{entry.summary}</p>
              <p className="text-xs text-charcoal-light">{entry.actorName}</p>
            </Link>
            <span className="shrink-0 text-xs text-charcoal-light">
              {formatRelativeTime(entry.at)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
