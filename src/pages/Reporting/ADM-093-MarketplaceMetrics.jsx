// ADM-093
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Gauge, IndianRupee, Store, Users } from 'lucide-react';
import { Button, Card, ErrorState, PageHeader, Select } from '@/components/primitives';
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
  clearMarketplaceFilters,
  fetchMarketplaceMetrics,
  selectMarketplaceMetrics,
  setMarketplaceFilters,
  setMarketplacePeriod,
} from '@/store/slices/reportingSlice';
import {
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
} from '@/utils/format';
import { t } from '@/i18n/en';

const PERIOD_OPTIONS = [
  { value: 'last_30_days', label: t('reports.period.last_30_days') },
  { value: 'last_90_days', label: t('reports.period.last_90_days') },
  { value: 'last_12_months', label: t('reports.period.last_12_months') },
  { value: 'financial_ytd', label: t('reports.period.financial_ytd') },
];

const LISTING_KEYS = ['live', 'draft', 'pendingReview', 'archived', 'outOfStock', 'private'];

export default function MarketplaceMetrics() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    metrics, gmvByMonth, listingCounts, topCategories, cityBreakdown,
    facets, query, viewState, error,
  } = useSelector(selectMarketplaceMetrics);

  useEffect(() => {
    dispatch(fetchMarketplaceMetrics());
  }, [dispatch, query]);

  // Handlers.
  const handleFilter = (field) => (event) =>
    dispatch(setMarketplaceFilters({ ...query.filters, [field]: event.target.value }));
  const handleRetry = () => dispatch(fetchMarketplaceMetrics());

  const loading = viewState === 'loading';

  // Markup.
  if (viewState === 'error') {
    return <ErrorState detail={error?.message} onRetry={handleRetry} />;
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('reports.eyebrow')}
        title={t('reports.marketplaceTitle')}
        subtitle={t('reports.marketplaceSubtitle')}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Select
          id="period"
          className="w-52"
          label={t('reports.period.label')}
          value={query.period}
          onChange={(event) => dispatch(setMarketplacePeriod(event.target.value))}
          options={PERIOD_OPTIONS}
        />
        <Select
          id="city"
          className="w-48"
          label={t('reports.cityFilter')}
          placeholder={t('common.all')}
          value={query.filters.city}
          onChange={handleFilter('city')}
          options={facets?.city ?? []}
        />
        <Select
          id="category"
          className="w-52"
          label={t('reports.categoryFilter')}
          placeholder={t('common.all')}
          value={query.filters.category}
          onChange={handleFilter('category')}
          options={facets?.category ?? []}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearMarketplaceFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('reports.gmv')}
          value={formatINRCompact(metrics?.gmv)}
          icon={IndianRupee}
          loading={loading}
        />
        <MetricTile
          label={t('reports.activeManufacturers')}
          value={formatNumber(metrics?.activeManufacturers)}
          icon={Store}
          loading={loading}
        />
        <MetricTile
          label={t('reports.activeJewellers')}
          value={formatNumber(metrics?.activeJewellers)}
          icon={Users}
          loading={loading}
        />
        <MetricTile
          label={t('reports.conversion')}
          value={formatPercent(metrics?.enquiryToOrderPercent)}
          caption={t('reports.avgOrderValue') + ' ' + formatINRCompact(metrics?.avgOrderValue)}
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
          <BarChart data={gmvByMonth}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={70} tickFormatter={formatINRCompact} />
            <Tooltip {...chartTooltipProps} formatter={(value) => formatINR(value)} />
            <Bar dataKey="gmv" fill={chartColors[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title={t('reports.ordersMetric')}
          status={loading ? 'loading' : 'succeeded'}
          onRetry={handleRetry}
          legend={[{ label: t('reports.ordersLegend'), color: chartColors[1] }]}
        >
          <LineChart data={gmvByMonth}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="label" {...chartAxisProps} />
            <YAxis {...chartAxisProps} width={40} />
            <Tooltip {...chartTooltipProps} />
            <Line type="monotone" dataKey="orders" stroke={chartColors[1]} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
      </div>

      <ListingMixPanel counts={listingCounts} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CategoryPanel rows={topCategories} />
        <CityPanel rows={cityBreakdown} />
      </div>
    </div>
  );
}

// Private pieces are counted here and nowhere else on this screen. A private
// range must not become visible through a report that nobody thought of as a
// public surface, so there is no drill-down from this tile.
function ListingMixPanel({ counts }) {
  if (!counts) return null;

  return (
    <Card
      title={t('reports.listingMixTitle')}
      description={t('reports.listingMixDescription')}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {LISTING_KEYS.map((key) => (
          <div key={key}>
            <p className="font-display text-xl leading-none text-primary num">
              {formatNumber(counts[key])}
            </p>
            <p className="mt-1 text-sm text-charcoal-light">{t(`reports.listing.${key}`)}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-charcoal-light">{t('reports.privateNote')}</p>
    </Card>
  );
}

// No pagination on either panel below. There are eleven categories and seven
// trading centres, and a footer offering page two of one page is furniture.
function CategoryPanel({ rows }) {
  return (
    <Card title={t('reports.topCategoriesTitle')} padded={false}>
      <TableShell>
        <TableShell.Head>
          <TableShell.HeadCell>{t('reports.column.category')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.listings')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.enquiries')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.gmv')}</TableShell.HeadCell>
        </TableShell.Head>
        <TableShell.Body>
          {rows.map((row) => (
            <TableShell.Row key={row.category}>
              <TableShell.Cell>{row.category}</TableShell.Cell>
              <TableShell.Cell align="right" numeric>{formatNumber(row.listings)}</TableShell.Cell>
              <TableShell.Cell align="right" numeric>{formatNumber(row.enquiries)}</TableShell.Cell>
              <TableShell.Cell align="right" numeric>{formatINR(row.gmv)}</TableShell.Cell>
            </TableShell.Row>
          ))}
        </TableShell.Body>
      </TableShell>
    </Card>
  );
}

function CityPanel({ rows }) {
  return (
    <Card title={t('reports.cityTitle')} padded={false}>
      <TableShell>
        <TableShell.Head>
          <TableShell.HeadCell>{t('reports.column.city')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.manufacturers')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.jewellers')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('reports.column.gmv')}</TableShell.HeadCell>
        </TableShell.Head>
        <TableShell.Body>
          {rows.map((row) => (
            <TableShell.Row key={row.city}>
              <TableShell.Cell>{row.city}</TableShell.Cell>
              <TableShell.Cell align="right" numeric>{formatNumber(row.manufacturers)}</TableShell.Cell>
              <TableShell.Cell align="right" numeric>{formatNumber(row.jewellers)}</TableShell.Cell>
              <TableShell.Cell align="right" numeric>{formatINR(row.gmv)}</TableShell.Cell>
            </TableShell.Row>
          ))}
        </TableShell.Body>
      </TableShell>
    </Card>
  );
}
