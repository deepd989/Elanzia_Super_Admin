// ADM-091
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Clock, Inbox, RefreshCw, Smile } from 'lucide-react';
import { Card, EmptyState, PageHeader, Tabs } from '@/components/primitives';
import {
  ChartCard, MetricTile, TableShell,
  chartAxisProps, chartColors, chartGridProps, chartTooltipProps,
} from '@/components';
import {
  fetchSupportPerformance, selectSupportPerformance, setPerformanceRange,
} from '@/store/slices/supportSlice';
import { formatDate, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const RANGES = ['7d', '30d', '90d'];

export default function SupportPerformance() {
  const dispatch = useDispatch();

  // Data.
  const {
    range, metrics, volumeSeries, responseSeries, categoryMix, csatMix, agentLoad,
    chartStatus, viewState,
  } = useSelector(selectSupportPerformance);

  useEffect(() => {
    dispatch(fetchSupportPerformance());
  }, [dispatch, range]);

  // Handlers.
  const handleRetry = () => dispatch(fetchSupportPerformance());

  const volumeChart = volumeSeries.map((row) => ({ ...row, label: formatDate(row.date) }));
  const responseChart = responseSeries.map((row) => ({ ...row, label: formatDate(row.date) }));
  const categoryChart = categoryMix.map((row) => ({
    ...row, label: t(`support.ticketCategory.${row.category}`),
  }));
  const csatChart = csatMix.map((row) => ({ ...row, label: `${row.score}` }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('support.eyebrow')}
        title={t('support.performanceTitle')}
        subtitle={t('support.performanceSubtitle')}
      />

      <Tabs
        activeId={range}
        onChange={(next) => dispatch(setPerformanceRange(next))}
        tabs={RANGES.map((id) => ({ id, label: t(`support.range.${id}`) }))}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('support.tilePerformanceOpen')}
          value={formatNumber(metrics?.openCount ?? 0)}
          icon={Inbox}
          loading={!metrics}
        />
        <MetricTile
          label={t('support.tileFirstResponse')}
          value={`${formatNumber(metrics?.medianFirstResponseMins ?? 0)}m`}
          caption={t('support.attainment', { percent: formatPercent(metrics?.firstResponseAttainmentPercent ?? 0) })}
          icon={Clock}
          loading={!metrics}
        />
        <MetricTile
          label={t('support.tileResolution')}
          value={`${formatNumber(metrics?.medianResolutionHours ?? 0)}h`}
          caption={t('support.attainment', { percent: formatPercent(metrics?.resolutionAttainmentPercent ?? 0) })}
          loading={!metrics}
        />
        <MetricTile
          label={t('support.tileCsat')}
          value={metrics?.csatAverage ?? '-'}
          caption={t('support.tileReopenRate')}
          icon={Smile}
          loading={!metrics}
        />
      </div>

      {/* Closing fast and closing properly are different things, so the reopen
          rate sits beside the resolution time rather than three screens away. */}
      <Card title={t('support.tileReopenRate')} description={t('support.reopenRateHelp')}>
        <p className="font-display text-3xl text-primary">
          {formatPercent(metrics?.reopenRatePercent ?? 0)}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('support.chartVolume')}
          description={t('support.chartVolumeHelp')}
          status={chartStatus}
          onRetry={handleRetry}
          legend={[
            { label: t('support.seriesRaised'), color: chartColors[0] },
            { label: t('support.seriesResolved'), color: chartColors[1] },
          ]}
        >
          <BarChart data={volumeChart}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} interval="preserveStartEnd" />
            <YAxis {...chartAxisProps} width={40} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="raised" name={t('support.seriesRaised')} fill={chartColors[0]} radius={[4, 4, 0, 0]} />
            <Bar dataKey="resolved" name={t('support.seriesResolved')} fill={chartColors[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title={t('support.chartResponse')}
          description={t('support.chartResponseHelp')}
          status={chartStatus}
          onRetry={handleRetry}
          legend={[
            { label: t('support.seriesFirstResponse'), color: chartColors[2] },
            { label: t('support.seriesResolutionHours'), color: chartColors[3] },
          ]}
        >
          <LineChart data={responseChart}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} interval="preserveStartEnd" />
            <YAxis {...chartAxisProps} width={40} />
            <Tooltip {...chartTooltipProps} />
            <Line type="monotone" dataKey="medianFirstResponseMins" name={t('support.seriesFirstResponse')} stroke={chartColors[2]} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="medianResolutionHours" name={t('support.seriesResolutionHours')} stroke={chartColors[3]} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title={t('support.chartCategory')} status={chartStatus} onRetry={handleRetry}>
          <BarChart data={categoryChart} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid {...chartGridProps} />
            <XAxis type="number" {...chartAxisProps} />
            <YAxis type="category" dataKey="label" {...chartAxisProps} width={110} />
            <Tooltip {...chartTooltipProps} />
            <Legend />
            <Bar dataKey="raised" name={t('support.seriesRaised')} fill={chartColors[0]} radius={[0, 4, 4, 0]} />
            <Bar dataKey="breached" name={t('support.seriesBreached')} fill={chartColors[4]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title={t('support.chartCsat')} status={chartStatus} onRetry={handleRetry}>
          <BarChart data={csatChart}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={40} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="count" name={t('support.tileCsat')} fill={chartColors[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <Card title={t('support.agentLoadTitle')} padded={false}>
        {viewState === 'empty' ? (
          <EmptyState
            icon={RefreshCw}
            title={t('support.performanceEmptyTitle')}
            body={t('support.performanceEmptyBody')}
          />
        ) : (
          <TableShell>
            <TableShell.Head>
              <TableShell.HeadCell>{t('support.columnAgent')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('support.columnOpen')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('support.columnBreached')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('support.columnResolved')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('support.columnMedianResponse')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('support.columnCsat')}</TableShell.HeadCell>
            </TableShell.Head>
            <TableShell.Body>
              {agentLoad.map((agent) => (
                <TableShell.Row key={agent.agentId}>
                  <TableShell.Cell>
                    <span className="font-medium text-charcoal">{agent.agentName}</span>
                    <span className="block text-xs text-charcoal-light">{agent.city}</span>
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatNumber(agent.openTickets)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric className={agent.breached > 0 ? 'text-danger' : undefined}>
                    {formatNumber(agent.breached)}
                  </TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatNumber(agent.resolvedLast30Days)}</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{formatNumber(agent.medianFirstResponseMins)}m</TableShell.Cell>
                  <TableShell.Cell align="right" numeric>{agent.csatAverage ?? '-'}</TableShell.Cell>
                </TableShell.Row>
              ))}
            </TableShell.Body>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
