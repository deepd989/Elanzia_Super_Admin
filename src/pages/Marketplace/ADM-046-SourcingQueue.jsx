// ADM-046
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Inbox, Search, Send, Timer } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearSourcingFilters,
  fetchSourcingRequests,
  fetchSourcingSummary,
  selectSourcingQueue,
  setSourcingFilters,
  setSourcingPage,
  setSourcingPageSize,
  setSourcingSearch,
  setSourcingSort,
} from '@/store/slices/marketplaceSlice';
import { formatDate, formatINR, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  new: 'warning',
  routed: 'info',
  responses_in: 'info',
  matched: 'success',
  no_match: 'danger',
  withdrawn: 'neutral',
  expired: 'neutral',
};

const STATUS_OPTIONS = ['new', 'routed', 'responses_in', 'matched', 'no_match', 'withdrawn', 'expired'].map(
  (value) => ({ value, label: t(`marketplace.sourcingStatus.${value}`) }),
);

const SLA_OPTIONS = [
  { value: 'true', label: t('marketplace.slaBreachedOnly') },
  { value: 'false', label: t('marketplace.slaWithinOnly') },
];

const COLUMN_COUNT = 8;

export default function SourcingQueue() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const { requests, total, query, viewState, summary, facets } = useSelector(selectSourcingQueue);

  useEffect(() => {
    dispatch(fetchSourcingRequests());
  }, [dispatch, query]);

  useEffect(() => {
    dispatch(fetchSourcingSummary());
  }, [dispatch]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setSourcingFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setSourcingSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('marketplace.eyebrow')}
        title={t('marketplace.sourcingTitle')}
        subtitle={t('marketplace.sourcingSubtitle')}
        meta={
          summary ? (
            <StatusPill tone="warning" label={t('marketplace.unroutedCount', { count: summary.unrouted })} />
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Unrouted comes first because it is the desk's own backlog rather
            than the trade's, and it is the only one Elanzia alone can fix. */}
        <MetricTile
          label={t('marketplace.unrouted')}
          value={formatNumber(summary?.unrouted ?? 0)}
          icon={Send}
          loading={!summary}
        />
        <MetricTile
          label={t('marketplace.awaitingResponses')}
          value={formatNumber(summary?.awaitingResponses ?? 0)}
          icon={Inbox}
          loading={!summary}
        />
        <MetricTile
          label={t('marketplace.medianRouteTime')}
          value={summary?.medianRouteHours ?? '-'}
          caption={t('marketplace.routeSlaCaption', { hours: summary?.routeSlaHours ?? 12 })}
          icon={Timer}
          loading={!summary}
        />
        <MetricTile
          label={t('marketplace.matchedThisMonth')}
          value={formatNumber(summary?.matchedThisMonth ?? 0)}
          caption={t('marketplace.noMatchCount', { count: summary?.noMatchThisMonth ?? 0 })}
          icon={Search}
          loading={!summary}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('marketplace.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setSourcingSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
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
          id="owner"
          className="w-52"
          placeholder={t('marketplace.filter.owner')}
          value={query.filters.ownerId}
          onChange={setFilter('ownerId')}
          options={facets.owners}
        />
        <Select
          id="sla"
          className="w-44"
          placeholder={t('marketplace.filter.sla')}
          value={query.filters.slaBreached}
          onChange={setFilter('slaBreached')}
          options={SLA_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearSourcingFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setSourcingPage(page))}
            onPageSizeChange={(size) => dispatch(setSourcingPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('marketplace.column.brief')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.jeweller')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'postedAt' ? query.sortDir : null}
            onSort={() => handleSort('postedAt')}
          >
            {t('marketplace.column.posted')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('marketplace.column.needed')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.responses')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('marketplace.column.bestQuote')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.owner')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            requests.map((request) => (
              <TableShell.Row
                key={request.id}
                onClick={() => navigate(`/marketplace/sourcing/${request.id}`)}
              >
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{request.title}</span>
                  <span className="block text-xs text-charcoal-light">
                    {request.originSearchTerm
                      ? t('marketplace.fromSearch', { term: request.originSearchTerm })
                      : `${request.id} · ${request.category}`}
                  </span>
                </TableShell.Cell>

                {/* A brief raised off a search gap has no single jeweller
                    behind it: it stands for everyone who typed that term. */}
                <TableShell.Cell>
                  {request.jewellerName ?? (
                    <span className="text-charcoal-light">{t('marketplace.aggregateDemand')}</span>
                  )}
                  <span className="block text-xs text-charcoal-light">{request.jewellerCity}</span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {formatDate(request.postedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(request.postedAt)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>{formatDate(request.neededBy)}</TableShell.Cell>

                <TableShell.Cell>
                  {request.routedCount === 0 ? (
                    <Badge tone="warning">{t('marketplace.noneRouted')}</Badge>
                  ) : (
                    t('marketplace.responseCount', {
                      responded: request.responseCount,
                      routed: request.routedCount,
                    })
                  )}
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatINR(request.bestQuotedValue)}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={STATUS_TONES[request.status]}
                    label={t(`marketplace.sourcingStatus.${request.status}`)}
                  />
                </TableShell.Cell>

                <TableShell.Cell>{request.ownerName ?? '-'}</TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState onRetry={() => dispatch(fetchSourcingRequests())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearSourcingFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Inbox}
                  title={t('marketplace.sourcingEmptyTitle')}
                  body={t('marketplace.sourcingEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-20 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
