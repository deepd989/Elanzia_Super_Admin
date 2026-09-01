// ADM-087
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Clock, Inbox, PauseCircle, Search, TriangleAlert, UserPlus } from 'lucide-react';
import {
  Button, Checkbox, EmptyState, ErrorState, Input,
  PageHeader, Select, StatusPill, Tabs,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  assignTickets, clearTicketFilters, fetchAgents, fetchTicketSummary, fetchTickets,
  selectTicketQueue, setTicketFilters, setTicketPage, setTicketPageSize,
  setTicketSearch, setTicketSelection, toggleTicketSelection,
} from '@/store/slices/supportSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  new: 'info',
  open: 'info',
  awaiting_member: 'neutral',
  escalated: 'warning',
  resolved: 'success',
  closed: 'neutral',
  reopened: 'warning',
};

const PRIORITY_TONES = { low: 'neutral', normal: 'neutral', high: 'warning', urgent: 'danger' };

const TAB_STATUSES = ['new', 'open', 'awaiting_member', 'escalated', 'resolved'];

const COLUMN_COUNT = 7;

export default function TicketQueue() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data.
  const {
    tickets, total, query, summary, facets, selectedIds, agentOptions, assignableIds,
    viewState, actionStatus, actionError, lastAssignment, error,
  } = useSelector(selectTicketQueue);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canRespond = grantedPermissions.includes('support.respond');

  const [assignee, setAssignee] = useState('');

  useEffect(() => {
    dispatch(fetchTickets());
    dispatch(fetchTicketSummary());
    dispatch(fetchAgents());
  }, [dispatch, query]);

  // Handlers.
  const handleAssign = async () => {
    const result = await dispatch(assignTickets({ ticketIds: assignableIds, assigneeId: assignee }));
    if (!result.error) {
      setAssignee('');
      dispatch(fetchTicketSummary());
    }
  };

  const statusTabs = [
    { id: '', label: t('common.all'), count: total },
    ...TAB_STATUSES.map((status) => ({
      id: status,
      label: t(`support.ticketStatus.${status}`),
      count: summary?.byStatus?.[status] ?? 0,
    })),
  ];

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('support.eyebrow')}
        title={t('support.ticketsTitle')}
        subtitle={t('support.ticketsSubtitle')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('support.tileOpen')} value={formatNumber(summary?.openCount ?? 0)} icon={Inbox} loading={!summary} />
        <MetricTile label={t('support.tileUnassigned')} value={formatNumber(summary?.unassigned ?? 0)} icon={UserPlus} invertTrend loading={!summary} />
        <MetricTile label={t('support.tileBreached')} value={formatNumber(summary?.breached ?? 0)} icon={TriangleAlert} invertTrend loading={!summary} />
        {/* Reported separately from the breach tile on purpose. These have a
            stopped clock and counting them as breaches is the false alarm the
            whole rule exists to prevent. */}
        <MetricTile
          label={t('support.tileAwaitingMember')}
          value={formatNumber(summary?.awaitingMember ?? 0)}
          caption={t('support.awaitingMemberHelp')}
          icon={PauseCircle}
          loading={!summary}
        />
      </div>

      <Tabs
        activeId={query.filters.status}
        onChange={(status) => dispatch(setTicketFilters({ ...query.filters, status }))}
        tabs={statusTabs}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('support.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setTicketSearch(event.target.value))}
        />
        <Select
          id="category" className="w-44" placeholder={t('common.all')}
          value={query.filters.category}
          onChange={(event) => dispatch(setTicketFilters({ ...query.filters, category: event.target.value }))}
          options={(facets?.categories ?? []).map(({ value }) => ({ value, label: t(`support.ticketCategory.${value}`) }))}
        />
        <Select
          id="priority" className="w-36" placeholder={t('common.all')}
          value={query.filters.priority}
          onChange={(event) => dispatch(setTicketFilters({ ...query.filters, priority: event.target.value }))}
          options={(facets?.priorities ?? []).map(({ value }) => ({ value, label: t(`support.priority.${value}`) }))}
        />
        <Select
          id="assignee" className="w-48" placeholder={t('common.all')}
          value={query.filters.assigneeId}
          onChange={(event) => dispatch(setTicketFilters({ ...query.filters, assigneeId: event.target.value }))}
          options={facets?.assignees ?? []}
        />
        <Checkbox
          id="breached-only" className="pb-2.5"
          label={t('support.breachedOnly')}
          checked={Boolean(query.filters.breachedOnly)}
          onChange={(event) => dispatch(setTicketFilters({ ...query.filters, breachedOnly: event.target.checked ? 'true' : '' }))}
        />
        <Checkbox
          id="unassigned-only" className="pb-2.5"
          label={t('support.unassignedOnly')}
          checked={Boolean(query.filters.unassignedOnly)}
          onChange={(event) => dispatch(setTicketFilters({ ...query.filters, unassignedOnly: event.target.checked ? 'true' : '' }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearTicketFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {selectedIds.length > 0 && canRespond ? (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-accent bg-warning-surface px-4 py-3">
          <span className="pb-2.5 text-base font-medium text-charcoal">
            {t('common.selectedCount', { count: selectedIds.length })}
          </span>
          <Select
            id="bulk-assignee" className="w-56" placeholder={t('support.assignTo')}
            value={assignee} onChange={(event) => setAssignee(event.target.value)} options={agentOptions}
          />
          <Button disabled={!assignee || assignableIds.length === 0} loading={actionStatus === 'loading'} onClick={handleAssign}>
            {t('support.assignSelected', { count: assignableIds.length })}
          </Button>
          <Button variant="ghost" onClick={() => dispatch(setTicketSelection([]))}>{t('common.cancel')}</Button>
          {actionError ? <p className="w-full text-sm text-danger">{actionError.message}</p> : null}
          {lastAssignment?.skipped.length > 0 ? (
            <p className="w-full text-sm text-charcoal-light">
              {t('support.assignSkipped', { count: lastAssignment.skipped.length })}
            </p>
          ) : null}
        </div>
      ) : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setTicketPage(page))}
            onPageSizeChange={(size) => dispatch(setTicketPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.SelectCell header>
            <Checkbox
              id="select-all"
              checked={selectedIds.length === tickets.length && tickets.length > 0}
              indeterminate={selectedIds.length > 0 && selectedIds.length < tickets.length}
              onChange={() => dispatch(setTicketSelection(
                selectedIds.length === tickets.length ? [] : tickets.map((row) => row.id),
              ))}
            />
          </TableShell.SelectCell>
          <TableShell.HeadCell>{t('support.columnTicket')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('support.columnMember')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('support.columnCategory')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('support.columnAssignee')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('support.columnSla')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            tickets.map((ticket) => (
              <TableShell.Row
                key={ticket.id}
                selected={selectedIds.includes(ticket.id)}
                onClick={() => navigate(`/support/tickets/${ticket.id}`)}
              >
                <TableShell.SelectCell>
                  <Checkbox
                    id={`select-${ticket.id}`}
                    checked={selectedIds.includes(ticket.id)}
                    onChange={() => dispatch(toggleTicketSelection(ticket.id))}
                  />
                </TableShell.SelectCell>

                <TableShell.Cell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-charcoal">{ticket.subject}</span>
                    <StatusPill tone={PRIORITY_TONES[ticket.priority]} size="sm">
                      {t(`support.priority.${ticket.priority}`)}
                    </StatusPill>
                  </span>
                  <span className="block font-mono text-xs text-charcoal-light">
                    {ticket.id}
                    {ticket.linkedOrderId ? ` · ${ticket.linkedOrderId}` : ''}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {ticket.memberName}
                  <span className="block text-xs text-charcoal-light">
                    {t(`support.memberType.${ticket.memberType}`)} · {ticket.memberCity}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {t(`support.ticketCategory.${ticket.category}`)}
                  <span className="block text-xs text-charcoal-light">
                    {t(`support.ticketChannel.${ticket.channel}`)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {ticket.assigneeName ?? <span className="text-xs text-warning">{t('support.unassigned')}</span>}
                </TableShell.Cell>

                {/* A stopped clock is said in words rather than left to read as
                    a very overdue ticket. */}
                <TableShell.Cell>
                  {formatDateTime(ticket.slaDueAt)}
                  <SlaLine ticket={ticket} />
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill tone={STATUS_TONES[ticket.status]}>
                    {t(`support.ticketStatus.${ticket.status}`)}
                  </StatusPill>
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT + 1}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchTickets())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearTicketFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState icon={Inbox} title={t('support.emptyTitle')} body={t('support.emptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
    </div>
  );
}

// The one line under the due date. A parked ticket says so; only a running
// clock is allowed to read as a breach.
function SlaLine({ ticket }) {
  if (!ticket.clockRunning && ticket.status === 'awaiting_member') {
    return (
      <span className="flex items-center gap-1 text-xs text-charcoal-light" title={t('support.clockStoppedHelp')}>
        <PauseCircle size={11} aria-hidden="true" />
        {t('support.clockStopped')}
      </span>
    );
  }
  if (ticket.clockRunning && (ticket.firstResponseBreached || ticket.resolutionBreached)) {
    return (
      <span className="flex items-center gap-1 text-xs text-danger">
        <Clock size={11} aria-hidden="true" />
        {ticket.firstResponseBreached && !ticket.firstResponseAt
          ? t('support.breachedFirstResponse')
          : t('support.breached')}
      </span>
    );
  }
  return <span className="block text-xs text-charcoal-light">{formatRelativeTime(ticket.slaDueAt)}</span>;
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-4 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-64 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
