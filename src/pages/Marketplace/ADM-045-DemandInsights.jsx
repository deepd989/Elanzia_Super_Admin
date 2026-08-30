// ADM-045
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Compass, Search, SearchX, TrendingUp } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
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
  clearTermFilters,
  fetchDemandInsights,
  fetchSearchTerms,
  raiseSourcingBrief,
  selectDemandInsights,
  setTermFilters,
  setTermPage,
  setTermPageSize,
  setTermSearch,
  setTermSort,
} from '@/store/slices/marketplaceSlice';
import { formatDate, formatINR, formatINRCompact, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const TREND_TONES = { rising: 'danger', flat: 'neutral', falling: 'info' };

const TREND_OPTIONS = ['rising', 'flat', 'falling'].map((value) => ({
  value,
  label: t(`marketplace.trend.${value}`),
}));

// Zero-result is the default because the gap list is what this screen is for.
// The other two options are here so the desk can check whether a term that
// does return listings is being ignored, which is a relevance problem instead.
const RESULT_OPTIONS = [
  { value: 'true', label: t('marketplace.onlyZeroResult') },
  { value: 'false', label: t('marketplace.onlyWithResults') },
  { value: '', label: t('marketplace.allTerms') },
];

const COLUMN_COUNT = 8;

export default function DemandInsights() {
  const dispatch = useDispatch();
  const [raiseTerm, setRaiseTerm] = useState(null);

  // Data. ONE selector - this is the seam.
  const {
    insights,
    insightsState,
    facets,
    terms,
    total,
    query,
    viewState,
    actionStatus,
    actionError,
    lastRaisedRequestId,
  } = useSelector(selectDemandInsights);

  useEffect(() => {
    dispatch(fetchDemandInsights());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchSearchTerms());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setTermFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setTermSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  const summary = insights?.summary;

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('marketplace.eyebrow')}
        title={t('marketplace.demandTitle')}
        subtitle={t('marketplace.demandSubtitle')}
        meta={
          summary ? (
            <StatusPill tone="warning" label={t('marketplace.gapTerms', { count: summary.gapTerms })} />
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('marketplace.totalSearches')}
          value={formatNumber(summary?.totalSearches ?? 0)}
          icon={Search}
          loading={!summary}
        />
        {/* Up is bad here: more searches finding nothing is a bigger gap. */}
        <MetricTile
          label={t('marketplace.zeroResultSearches')}
          value={formatNumber(summary?.zeroResultSearches ?? 0)}
          caption={summary ? t('marketplace.zeroResultRate') : undefined}
          icon={SearchX}
          invertTrend
          loading={!summary}
        />
        <MetricTile
          label={t('marketplace.zeroResultRate')}
          value={formatPercent(summary?.zeroResultRate ?? 0)}
          icon={TrendingUp}
          invertTrend
          loading={!summary}
        />
        <MetricTile
          label={t('marketplace.unmetDemand')}
          value={formatINRCompact(summary?.unmetValue ?? 0)}
          caption={t('marketplace.unmetDemandCaption')}
          icon={Compass}
          loading={!summary}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title={t('marketplace.searchVolume')}
          description={t('marketplace.searchVolumeCaption')}
          status={insightsState === 'succeeded' ? 'succeeded' : insightsState === 'failed' ? 'failed' : 'loading'}
          onRetry={() => dispatch(fetchDemandInsights())}
          legend={[
            { label: t('marketplace.totalSearches'), color: chartColors[0] },
            { label: t('marketplace.zeroResultSearches'), color: chartColors[1] },
          ]}
        >
          <LineChart data={insights?.demandSeries ?? []}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="date" {...chartAxisProps} tickFormatter={formatDate} />
            <YAxis {...chartAxisProps} width={50} />
            <Tooltip {...chartTooltipProps} labelFormatter={formatDate} />
            <Line type="monotone" dataKey="searches" stroke={chartColors[0]} strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="zeroResultSearches"
              stroke={chartColors[1]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartCard>

        <ChartCard
          title={t('marketplace.gapByCategory')}
          description={t('marketplace.gapByCategoryCaption')}
          status={insightsState === 'succeeded' ? 'succeeded' : insightsState === 'failed' ? 'failed' : 'loading'}
          onRetry={() => dispatch(fetchDemandInsights())}
          legend={[{ label: t('marketplace.gapScore'), color: chartColors[2] }]}
        >
          <BarChart data={insights?.categoryGaps ?? []}>
            <CartesianGrid {...chartGridProps} />
            <XAxis dataKey="category" {...chartAxisProps} interval={0} angle={-30} height={70} textAnchor="end" />
            <YAxis {...chartAxisProps} width={50} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="gapScore" fill={chartColors[2]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('marketplace.termsTitle')}
          value={query.search}
          onChange={(event) => dispatch(setTermSearch(event.target.value))}
        />
        <Select
          id="results"
          className="w-52"
          label={t('marketplace.filter.results')}
          value={query.filters.zeroResult}
          onChange={setFilter('zeroResult')}
          options={RESULT_OPTIONS}
        />
        <Select
          id="category"
          className="w-52"
          placeholder={t('marketplace.filter.category')}
          value={query.filters.category}
          onChange={setFilter('category')}
          options={facets.categories}
        />
        <Select
          id="trend"
          className="w-44"
          placeholder={t('marketplace.filter.trend')}
          value={query.filters.trend}
          onChange={setFilter('trend')}
          options={TREND_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearTermFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setTermPage(page))}
            onPageSizeChange={(size) => dispatch(setTermPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('marketplace.column.term')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.filter.category')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            align="right"
            direction={query.sortBy === 'searches30d' ? query.sortDir : null}
            onSort={() => handleSort('searches30d')}
          >
            {t('marketplace.column.searches')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell align="right">{t('marketplace.column.jewellersSearching')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('marketplace.column.results')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            align="right"
            direction={query.sortBy === 'unmetValue' ? query.sortDir : null}
            onSort={() => handleSort('unmetValue')}
          >
            {t('marketplace.column.unmetValue')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('marketplace.column.trend')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            terms.map((term) => (
              <TableShell.Row key={term.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{term.term}</span>
                  <span className="block text-xs text-charcoal-light">{term.topCity}</span>
                </TableShell.Cell>

                <TableShell.Cell>{term.category}</TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatNumber(term.searches30d)}
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatNumber(term.uniqueJewellers)}
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {term.zeroResult ? <Badge tone="danger">{formatNumber(0)}</Badge> : formatNumber(term.resultCount)}
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {term.zeroResult ? formatINR(term.unmetValue) : formatINR(null)}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill tone={TREND_TONES[term.trend]} label={t(`marketplace.trend.${term.trend}`)} />
                </TableShell.Cell>

                <TableShell.ActionsCell>
                  {/* A term that already carries a brief cannot raise a second
                      one, or the desk routes the same requirement twice. */}
                  {term.sourcingRequestId ? (
                    <Badge tone="neutral">{t('marketplace.briefAlready')}</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={!term.zeroResult} onClick={() => setRaiseTerm(term)}>
                      {t('marketplace.raiseBrief')}
                    </Button>
                  )}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchSearchTerms())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearTermFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={SearchX}
                  title={t('marketplace.demandEmptyTitle')}
                  body={t('marketplace.demandEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <RaiseBriefModal
        term={raiseTerm}
        actionStatus={actionStatus}
        actionError={actionError}
        raisedRequestId={lastRaisedRequestId}
        onClose={() => setRaiseTerm(null)}
      />
    </div>
  );
}

// Local sub-component, same file. Turning a gap into desk work is the seam
// between this screen and the sourcing desk.
function RaiseBriefModal({ term, actionStatus, actionError, raisedRequestId, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [note, setNote] = useState('');

  const handleRaise = async () => {
    const result = await dispatch(raiseSourcingBrief({ termId: term.id, note }));
    if (!result.error) setNote('');
  };

  return (
    <Modal
      open={term !== null}
      onClose={onClose}
      title={t('marketplace.raise.title')}
      description={t('marketplace.raise.description')}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {raisedRequestId ? (
            <Button onClick={() => navigate(`/marketplace/sourcing/${raisedRequestId}`)}>
              {t('marketplace.viewBrief')}
            </Button>
          ) : (
            <Button loading={actionStatus === 'loading'} onClick={handleRaise}>
              {t('marketplace.raise.submit')}
            </Button>
          )}
        </>
      }
    >
      {term ? (
        <div className="flex flex-col gap-field">
          <p className="text-base text-charcoal">
            <span className="font-medium">{term.term}</span>
            <span className="block text-sm text-charcoal-light">
              {t('marketplace.column.searches')}: {formatNumber(term.searches30d)} · {term.category}
            </span>
          </p>
          {raisedRequestId ? (
            <p className="text-base text-success">
              {t('marketplace.briefRaised', { requestId: raisedRequestId })}
            </p>
          ) : (
            <Textarea
              id="brief-note"
              rows={4}
              label={t('marketplace.raise.note')}
              help={t('marketplace.raise.noteHelp')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
