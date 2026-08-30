// ADM-085
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { CalendarClock, Megaphone, Plus, Search, Send, TriangleAlert } from 'lucide-react';
import {
  Button, ConfirmDialog, EmptyState, ErrorState, Input,
  PageHeader, Select, StatusPill, Tabs, Textarea,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  cancelBroadcast, clearBroadcastFilters, fetchBroadcastSummary, fetchBroadcasts,
  selectBroadcastConsole, setBroadcastFilters, setBroadcastPage, setBroadcastPageSize,
  setBroadcastSearch,
} from '@/store/slices/communicationsSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDateTime, formatNumber, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  draft: 'neutral',
  scheduled: 'info',
  sending: 'info',
  sent: 'success',
  partially_failed: 'warning',
  cancelled: 'neutral',
  failed: 'danger',
};

const TAB_STATUSES = ['draft', 'scheduled', 'sent', 'partially_failed', 'cancelled'];

const COLUMN_COUNT = 7;

export default function BroadcastConsole() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data.
  const {
    broadcasts, total, query, summary, facets, viewState, actionStatus, actionError, error,
  } = useSelector(selectBroadcastConsole);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canSend = grantedPermissions.includes('communications.broadcast.send');

  const [callBack, setCallBack] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchBroadcasts());
    dispatch(fetchBroadcastSummary());
  }, [dispatch, query]);

  // Handlers.
  const handleCallBack = async () => {
    const result = await dispatch(cancelBroadcast({ broadcastId: callBack.id, reason }));
    if (!result.error) {
      setCallBack(null);
      setReason('');
      dispatch(fetchBroadcastSummary());
    }
  };

  const statusTabs = [
    { id: '', label: t('common.all'), count: total },
    ...TAB_STATUSES.map((status) => ({
      id: status,
      label: t(`communications.broadcastStatus.${status}`),
      count: summary?.byStatus?.[status] ?? 0,
    })),
  ];

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('communications.eyebrow')}
        title={t('communications.broadcastsTitle')}
        subtitle={t('communications.broadcastsSubtitle')}
        actions={canSend ? (
          <Button iconLeft={Plus} onClick={() => navigate('/communications/broadcasts/new')}>
            {t('communications.newBroadcast')}
          </Button>
        ) : null}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('communications.tileScheduled')} value={formatNumber(summary?.scheduled ?? 0)} icon={CalendarClock} loading={!summary} />
        <MetricTile label={t('communications.tileSentThisMonth')} value={formatNumber(summary?.sentThisMonth ?? 0)} icon={Send} loading={!summary} />
        <MetricTile label={t('communications.tileReached')} value={formatNumber(summary?.recipientsReached ?? 0)} icon={Megaphone} loading={!summary} />
        <MetricTile
          label={t('communications.tileFailureRate')}
          value={formatPercent(summary?.failureRate ?? 0, { decimals: 2 })}
          caption={t('communications.failureRateHelp')}
          icon={TriangleAlert}
          invertTrend
          loading={!summary}
        />
      </div>

      <Tabs
        activeId={query.filters.status}
        onChange={(status) => dispatch(setBroadcastFilters({ ...query.filters, status }))}
        tabs={statusTabs}
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('communications.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setBroadcastSearch(event.target.value))}
        />
        <Select
          id="category" className="w-48" placeholder={t('common.all')}
          value={query.filters.category}
          onChange={(event) => dispatch(setBroadcastFilters({ ...query.filters, category: event.target.value }))}
          options={(facets?.categories ?? []).map(({ value }) => ({ value, label: t(`communications.category.${value}`) }))}
        />
        <Select
          id="segment" className="w-48" placeholder={t('common.all')}
          value={query.filters.segment}
          onChange={(event) => dispatch(setBroadcastFilters({ ...query.filters, segment: event.target.value }))}
          options={(facets?.segments ?? []).map(({ value }) => ({ value, label: t(`communications.segment.${value}`) }))}
        />
        <Select
          id="channel" className="w-40" placeholder={t('common.all')}
          value={query.filters.channel}
          onChange={(event) => dispatch(setBroadcastFilters({ ...query.filters, channel: event.target.value }))}
          options={(facets?.channels ?? []).map(({ value }) => ({ value, label: t(`communications.channel.${value}`) }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearBroadcastFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setBroadcastPage(page))}
            onPageSizeChange={(size) => dispatch(setBroadcastPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('communications.columnAnnouncement')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnAudience')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnChannels')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnScheduled')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('communications.columnDelivered')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            broadcasts.map((broadcast) => (
              <TableShell.Row
                key={broadcast.id}
                onClick={() => navigate(`/communications/broadcasts/${broadcast.id}/edit`)}
              >
                <TableShell.Cell>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-charcoal">{broadcast.title}</span>
                    <StatusPill tone="neutral" size="sm">
                      {t(`communications.category.${broadcast.category}`)}
                    </StatusPill>
                  </span>
                  <span className="block font-mono text-xs text-charcoal-light">
                    {broadcast.id} · {broadcast.createdByName}
                  </span>
                </TableShell.Cell>

                {/* A draft can exist before anybody has picked an audience,
                    which is a real row rather than a broken one. */}
                <TableShell.Cell>
                  {broadcast.audience.segment
                    ? t(`communications.segment.${broadcast.audience.segment}`)
                    : <span className="text-xs text-charcoal-light">{t('common.none')}</span>}
                  <span className="block text-xs text-charcoal-light">
                    {t('communications.recipients', { count: formatNumber(broadcast.audience.recipientCount) })}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell className="text-xs">
                  {broadcast.channels.map((channel) => t(`communications.channel.${channel}`)).join(', ')}
                </TableShell.Cell>

                {/* Absolute time on top, relative underneath - a scheduled
                    announcement has to be obvious without doing arithmetic. */}
                <TableShell.Cell>
                  {broadcast.scheduledFor || broadcast.sentAt ? (
                    <>
                      {formatDateTime(broadcast.scheduledFor ?? broadcast.sentAt)}
                      <span className="block text-xs text-charcoal-light">
                        {formatRelativeTime(broadcast.scheduledFor ?? broadcast.sentAt)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-charcoal-light">{t('communications.notScheduled')}</span>
                  )}
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatNumber(broadcast.stats.delivered)}
                  {broadcast.requiresAcknowledgement ? (
                    <span className="block text-xs text-charcoal-light">
                      {t('communications.acknowledgedOf', {
                        acknowledged: formatNumber(broadcast.acknowledgedCount),
                        delivered: formatNumber(broadcast.stats.delivered),
                      })}
                    </span>
                  ) : null}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill tone={STATUS_TONES[broadcast.status]}>
                    {t(`communications.broadcastStatus.${broadcast.status}`)}
                  </StatusPill>
                </TableShell.Cell>

                <TableShell.ActionsCell>
                  {broadcast.cancellable && canSend ? (
                    <Button size="sm" variant="ghost" onClick={() => setCallBack(broadcast)}>
                      {t('communications.cancelBroadcast')}
                    </Button>
                  ) : null}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchBroadcasts())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearBroadcastFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={Megaphone}
                  title={t('communications.emptyTitle')} body={t('communications.emptyBody')}
                  actionLabel={canSend ? t('communications.newBroadcast') : undefined}
                  onAction={canSend ? () => navigate('/communications/broadcasts/new') : undefined}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      {/* Calling an announcement back is irreversible in the direction that
          matters: it will never go out, and the reason is all the log keeps. */}
      <ConfirmDialog
        open={Boolean(callBack)}
        onClose={() => { setCallBack(null); setReason(''); }}
        onConfirm={handleCallBack}
        loading={actionStatus === 'loading'}
        title={t('communications.cancelTitle')}
        body={t('communications.cancelBody', {
          count: formatNumber(callBack?.audience.recipientCount ?? 0),
        })}
        confirmLabel={t('communications.cancelBroadcast')}
      >
        <Textarea
          id="call-back-reason"
          rows={3}
          className="mt-4"
          label={t('communications.cancelReason')}
          required
          value={reason}
          error={actionError?.message}
          onChange={(event) => setReason(event.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-64 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
