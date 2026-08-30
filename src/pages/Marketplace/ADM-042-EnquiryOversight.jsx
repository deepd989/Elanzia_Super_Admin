// ADM-042
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, Download, IndianRupee, MessagesSquare, Paperclip, Search, Timer } from 'lucide-react';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
} from '@/components/primitives';
import { MetricTile, PriceBreakup, TableShell } from '@/components';
import {
  clearEnquiryFilters,
  closeEnquiryPanel,
  fetchEnquiries,
  fetchEnquiryOverview,
  fetchEnquiryThread,
  nudgeEnquiries,
  openEnquiry,
  selectEnquiryOversight,
  setEnquiryFilters,
  setEnquiryPage,
  setEnquiryPageSize,
  setEnquirySearch,
  setEnquirySort,
} from '@/store/slices/marketplaceSlice';
import {
  formatDate,
  formatDateTime,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  awaiting_manufacturer: 'warning',
  quoted: 'info',
  negotiating: 'info',
  accepted: 'success',
  declined: 'danger',
  expired: 'neutral',
  closed: 'neutral',
};

const STATUS_OPTIONS = [
  'awaiting_manufacturer',
  'quoted',
  'negotiating',
  'accepted',
  'declined',
  'expired',
  'closed',
].map((value) => ({ value, label: t(`marketplace.status.${value}`) }));

const AGE_OPTIONS = ['today', 'week', 'fortnight', 'older'].map((value) => ({
  value,
  label: t(`marketplace.age.${value}`),
}));

const VALUE_OPTIONS = ['unquoted', 'under_1l', '1l_5l', '5l_20l', 'above_20l'].map((value) => ({
  value,
  label: t(`marketplace.value.${value}`),
}));

const COLUMN_COUNT = 8;

export default function EnquiryOversight() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    enquiries,
    total,
    query,
    viewState,
    overview,
    facets,
    openId,
    thread,
    threadState,
    actionStatus,
    actionError,
  } = useSelector(selectEnquiryOversight);

  useEffect(() => {
    dispatch(fetchEnquiries());
    dispatch(fetchEnquiryOverview());
  }, [dispatch, query]);

  useEffect(() => {
    if (openId) dispatch(fetchEnquiryThread(openId));
  }, [dispatch, openId]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setEnquiryFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setEnquirySort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('marketplace.eyebrow')}
        title={t('marketplace.enquiriesTitle')}
        subtitle={t('marketplace.enquiriesSubtitle')}
        meta={
          overview ? (
            <StatusPill tone="warning" label={t('marketplace.stalledCount', { count: overview.stalledCount })} />
          ) : null
        }
        actions={
          <Button variant="secondary" iconLeft={Download}>
            {t('common.export')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('marketplace.openConversations')}
          value={formatNumber(overview?.openCount ?? 0)}
          caption={
            overview ? t('marketplace.conversionRate', { value: formatPercent(overview.conversionRate) }) : undefined
          }
          icon={MessagesSquare}
          loading={!overview}
        />
        <MetricTile
          label={t('marketplace.awaitingFirstResponse')}
          value={formatNumber(overview?.awaitingFirstResponse ?? 0)}
          caption={
            overview ? t('marketplace.breachedCount', { count: overview.firstResponseBreachedCount }) : undefined
          }
          icon={Clock}
          loading={!overview}
        />
        <MetricTile
          label={t('marketplace.quotedOnTheTable')}
          value={formatINRCompact(overview?.quotedValueTotal ?? 0)}
          icon={IndianRupee}
          loading={!overview}
        />
        <MetricTile
          label={t('marketplace.medianFirstResponse')}
          value={overview?.medianFirstResponseHours ?? '-'}
          caption={t('marketplace.withinHours', { hours: overview?.slaHours ?? 24 })}
          icon={Timer}
          loading={!overview}
        />
      </div>

      {/* Filter row. Search first and widest, then the narrow selects, then
          the clear action pushed right. Same order on every queue. */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('marketplace.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setEnquirySearch(event.target.value))}
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
          id="manufacturer"
          className="w-52"
          placeholder={t('marketplace.filter.manufacturer')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Select
          id="jeweller"
          className="w-52"
          placeholder={t('marketplace.filter.jeweller')}
          value={query.filters.jewellerId}
          onChange={setFilter('jewellerId')}
          options={facets.jewellers}
        />
        <Select
          id="age"
          className="w-44"
          placeholder={t('marketplace.filter.age')}
          value={query.filters.ageBucket}
          onChange={setFilter('ageBucket')}
          options={AGE_OPTIONS}
        />
        <Select
          id="value"
          className="w-44"
          placeholder={t('marketplace.filter.value')}
          value={query.filters.valueBand}
          onChange={setFilter('valueBand')}
          options={VALUE_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearEnquiryFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setEnquiryPage(page))}
            onPageSizeChange={(size) => dispatch(setEnquiryPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('marketplace.column.enquiry')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.jeweller')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('marketplace.column.manufacturer')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'openedAt' ? query.sortDir : null}
            onSort={() => handleSort('openedAt')}
          >
            {t('marketplace.column.opened')}
          </TableShell.SortableHeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'lastMessageAt' ? query.sortDir : null}
            onSort={() => handleSort('lastMessageAt')}
          >
            {t('marketplace.column.lastActivity')}
          </TableShell.SortableHeadCell>
          <TableShell.SortableHeadCell
            align="right"
            direction={query.sortBy === 'latestQuotedValue' ? query.sortDir : null}
            onSort={() => handleSort('latestQuotedValue')}
          >
            {t('marketplace.column.quotedValue')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            enquiries.map((enquiry) => (
              <TableShell.Row key={enquiry.id} onClick={() => dispatch(openEnquiry(enquiry.id))}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{enquiry.subject}</span>
                  <span className="block text-xs text-charcoal-light">
                    {enquiry.id} · {enquiry.category}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {enquiry.jewellerName}
                  <span className="block text-xs text-charcoal-light">{enquiry.jewellerCity}</span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {enquiry.manufacturerName}
                  <span className="block text-xs text-charcoal-light">{enquiry.manufacturerCity}</span>
                </TableShell.Cell>

                {/* Absolute date on top, relative underneath - an ageing queue
                    item has to be obvious without doing arithmetic. */}
                <TableShell.Cell>
                  {formatDate(enquiry.openedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(enquiry.openedAt)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {formatRelativeTime(enquiry.lastMessageAt)}
                  <span className="block text-xs text-charcoal-light">
                    {enquiry.stalled ? t(`marketplace.reason.${enquiry.stalledReason}`) : enquiry.jewellerCity}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatINR(enquiry.latestQuotedValue)}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={STATUS_TONES[enquiry.status]}
                    label={t(`marketplace.status.${enquiry.status}`)}
                  />
                </TableShell.Cell>

                <TableShell.ActionsCell>
                  <Button size="sm" variant="ghost" onClick={() => dispatch(openEnquiry(enquiry.id))}>
                    {t('marketplace.openThread')}
                  </Button>
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchEnquiries())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearEnquiryFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={MessagesSquare}
                  title={t('marketplace.emptyTitle')}
                  body={t('marketplace.emptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ThreadModal
        openId={openId}
        thread={thread}
        threadState={threadState}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => dispatch(closeEnquiryPanel())}
        onRetry={() => dispatch(fetchEnquiryThread(openId))}
        onNudge={() => dispatch(nudgeEnquiries({ enquiryIds: [openId], channel: 'email', note: '' }))}
      />
    </div>
  );
}

// Local sub-components, same file. The thread is read-only oversight: Elanzia
// watches the conversation and can nudge it, but never negotiates inside it.
function ThreadModal({ openId, thread, threadState, actionStatus, actionError, onClose, onRetry, onNudge }) {
  const enquiry = thread?.enquiry;

  return (
    <Modal
      open={openId !== null}
      onClose={onClose}
      size="xl"
      title={enquiry ? enquiry.subject : t('marketplace.thread.title')}
      description={
        enquiry
          ? t('marketplace.thread.subtitle', {
              jeweller: enquiry.jewellerName,
              manufacturer: enquiry.manufacturerName,
            })
          : undefined
      }
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button
            loading={actionStatus === 'loading'}
            disabled={!enquiry || Boolean(enquiry.closedAt)}
            onClick={onNudge}
          >
            {t('marketplace.thread.nudge')}
          </Button>
        </>
      }
    >
      {threadState === 'loading' ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : null}
      {threadState === 'error' ? <ErrorState onRetry={onRetry} /> : null}
      {threadState === 'populated' ? <ThreadBody thread={thread} /> : null}
    </Modal>
  );
}

function ThreadBody({ thread }) {
  const { enquiry, messages, quotations } = thread;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-sm text-charcoal-light">
          {enquiry.productTitle
            ? t('marketplace.thread.quotedAgainst', { title: enquiry.productTitle })
            : t('marketplace.thread.freeText')}
        </p>

        {/* A quote arrived as a message, so it is rendered inside one. Every
            revision stays on screen including the superseded ones: the
            concession history IS the negotiation, and a dispute turns on it. */}
        <ul className="flex flex-col gap-3">
          {messages.map((message) => (
            <li key={message.id} className="rounded-md border border-lightGray-dark bg-lightGray p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-charcoal">
                  {message.author === 'elanzia' ? t('marketplace.thread.byElanzia') : message.authorName}
                </span>
                <span className="text-xs text-charcoal-light">{formatDateTime(message.at)}</span>
              </div>
              <p className="mt-1.5 text-base text-charcoal">{message.body}</p>
              {message.attachmentCount > 0 ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-charcoal-light">
                  <Paperclip size={12} aria-hidden="true" />
                  {t('marketplace.thread.attachments', { count: message.attachmentCount })}
                </p>
              ) : null}
              <Quotation quotation={quotations.find((row) => row.id === message.quotationId)} />
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col gap-3 rounded-md border border-lightGray-dark bg-lightGray p-4">
        <MetaRow label={t('common.status')} value={t(`marketplace.status.${enquiry.status}`)} />
        <MetaRow label={t('marketplace.column.opened')} value={formatDate(enquiry.openedAt)} />
        <MetaRow
          label={t('marketplace.awaitingFirstResponse')}
          value={
            enquiry.firstResponseHours === null
              ? t('marketplace.thread.noFirstResponse')
              : t('marketplace.thread.firstResponse', { hours: enquiry.firstResponseHours })
          }
        />
        <MetaRow label={t('marketplace.column.quotedValue')} value={formatINR(enquiry.latestQuotedValue)} />
        <MetaRow label={t('marketplace.column.nudges')} value={formatNumber(enquiry.nudgeCount)} />
        {enquiry.convertedOrderId ? (
          <MetaRow
            label={t('common.details')}
            value={t('marketplace.thread.convertedTo', { orderId: enquiry.convertedOrderId })}
          />
        ) : null}
      </aside>
    </div>
  );
}

function Quotation({ quotation }) {
  if (!quotation) return null;

  return (
    <div className="mt-3 rounded border border-lightGray-dark bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-charcoal">
          {t('marketplace.thread.revision', { number: quotation.revision })}
        </span>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{t('marketplace.thread.leadTime', { days: quotation.leadTimeDays })}</Badge>
          <StatusPill tone={quotation.status === 'accepted' ? 'success' : 'neutral'} label={quotation.status} />
        </div>
      </div>
      <PriceBreakup breakup={quotation.price} dense />
      <p className="mt-2 text-xs text-charcoal-light">
        {t('marketplace.thread.validUntil', { date: formatDate(quotation.validUntil) })}
      </p>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd className="text-right text-base text-charcoal">{value}</dd>
    </div>
  );
}

// Bars at the row height the real rows will occupy, so the table does not jump
// when the data lands.
function QueueSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
