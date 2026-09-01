// ADM-090
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Ban, CheckCheck, RotateCcw, Search, TriangleAlert } from 'lucide-react';
import {
  Button, Card, ConfirmDialog, EmptyState, ErrorState, Input,
  PageHeader, Select, StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearDeliveryFilters, dismissDeliveryAction, fetchDeliveries, fetchDeliveryHealth,
  retryDelivery, selectDeliveryLog, setDeliveryFilters, setDeliveryPage,
  setDeliveryPageSize, setDeliverySearch,
} from '@/store/slices/communicationsSlice';
import { formatDateTime, formatNumber, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  queued: 'neutral',
  sent: 'info',
  delivered: 'success',
  opened: 'success',
  bounced: 'warning',
  failed: 'danger',
  suppressed: 'neutral',
};

const COLUMN_COUNT = 7;

export default function DeliveryLog() {
  const dispatch = useDispatch();

  // Data.
  const {
    deliveries, total, query, facets, health, channelHealth, topFailures,
    viewState, healthViewState, actionStatus, actionError, error,
  } = useSelector(selectDeliveryLog);

  const [retrying, setRetrying] = useState(null);

  useEffect(() => {
    dispatch(fetchDeliveries());
    dispatch(fetchDeliveryHealth());
  }, [dispatch, query]);

  // Handlers.
  const handleRetry = async () => {
    const result = await dispatch(retryDelivery({ deliveryId: retrying.id }));
    if (!result.error) {
      setRetrying(null);
      dispatch(fetchDeliveryHealth());
    }
  };

  const attempted = channelHealth.reduce((sum, row) => sum + row.attempted, 0);
  const delivered = channelHealth.reduce((sum, row) => sum + row.delivered, 0);
  const failed = channelHealth.reduce((sum, row) => sum + row.failed, 0);

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('communications.eyebrow')}
        title={t('communications.deliveriesTitle')}
        subtitle={t('communications.deliveriesSubtitle')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('communications.tileDeliveryRate')}
          value={formatPercent(attempted === 0 ? 0 : (delivered / attempted) * 100)}
          icon={CheckCheck}
          loading={!health}
        />
        <MetricTile label={t('communications.tileFailed')} value={formatNumber(failed)} icon={TriangleAlert} invertTrend loading={!health} />
        <MetricTile
          label={t('communications.tileSuppressed')} value={formatNumber(health?.suppressedCount ?? 0)}
          caption={t('communications.notRetryableHelp')} icon={Ban} loading={!health}
        />
        <MetricTile label={t('communications.tileRetryable')} value={formatNumber(health?.retryableCount ?? 0)} icon={RotateCcw} loading={!health} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={t('communications.channelHealth')} description={t('communications.channelHealthHelp')} padded={false}>
          {healthViewState === 'error' ? (
            <ErrorState detail={error?.message} onRetry={() => dispatch(fetchDeliveryHealth())} />
          ) : (
            <ul className="divide-y divide-lightGray">
              {channelHealth.map((row) => (
                <li key={row.channel} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-24 shrink-0 text-base text-charcoal">
                    {t(`communications.channel.${row.channel}`)}
                  </span>
                  <span className="flex-1 text-xs text-charcoal-light">
                    {t('communications.channelAttempted')} {formatNumber(row.attempted)} ·{' '}
                    {t('communications.channelFailed')} {formatNumber(row.failed)} ·{' '}
                    {t('communications.channelSuppressed')} {formatNumber(row.suppressed)}
                  </span>
                  <span className="shrink-0 font-body text-base font-medium tabular-nums text-charcoal">
                    {formatPercent(row.deliveryRate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('communications.topFailures')} padded={false}>
          <ul className="divide-y divide-lightGray">
            {topFailures.map((row) => (
              <li key={row.failureCode} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 text-base text-charcoal">
                  {t(`communications.failureCode.${row.failureCode}`)}
                </span>
                {/* A suppression is not a gateway problem. Saying so on the row
                    stops the desk chasing a channel that is working. */}
                {row.retryable ? null : (
                  <StatusPill tone="neutral" size="sm">{t('communications.notRetryable')}</StatusPill>
                )}
                <span className="shrink-0 tabular-nums text-base text-charcoal">{formatNumber(row.count)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('communications.deliverySearchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setDeliverySearch(event.target.value))}
        />
        <Select
          id="channel" className="w-40" placeholder={t('common.all')}
          value={query.filters.channel}
          onChange={(event) => dispatch(setDeliveryFilters({ ...query.filters, channel: event.target.value }))}
          options={(facets?.channels ?? []).map(({ value }) => ({ value, label: t(`communications.channel.${value}`) }))}
        />
        <Select
          id="status" className="w-40" placeholder={t('common.all')}
          value={query.filters.status}
          onChange={(event) => dispatch(setDeliveryFilters({ ...query.filters, status: event.target.value }))}
          options={(facets?.statuses ?? []).map(({ value }) => ({ value, label: t(`communications.deliveryStatus.${value}`) }))}
        />
        <Select
          id="failure" className="w-56" placeholder={t('common.all')}
          value={query.filters.failureCode}
          onChange={(event) => dispatch(setDeliveryFilters({ ...query.filters, failureCode: event.target.value }))}
          options={(facets?.failureCodes ?? []).map(({ value }) => ({ value, label: t(`communications.failureCode.${value}`) }))}
        />
        <Select
          id="source" className="w-40" placeholder={t('common.all')}
          value={query.filters.sourceType}
          onChange={(event) => dispatch(setDeliveryFilters({ ...query.filters, sourceType: event.target.value }))}
          options={(facets?.sourceTypes ?? []).map(({ value }) => ({ value, label: t(`communications.sourceType.${value}`) }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearDeliveryFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setDeliveryPage(page))}
            onPageSizeChange={(size) => dispatch(setDeliveryPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('communications.columnMessage')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnRecipient')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnChannels')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnDestination')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('communications.columnAttempted')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            deliveries.map((delivery) => (
              <TableShell.Row key={delivery.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{delivery.sourceLabel}</span>
                  <span className="block font-mono text-xs text-charcoal-light">
                    {t(`communications.sourceType.${delivery.sourceType}`)} · {delivery.sourceId}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {delivery.recipientName}
                  <span className="block text-xs text-charcoal-light">{delivery.recipientCity}</span>
                </TableShell.Cell>
                <TableShell.Cell>{t(`communications.channel.${delivery.channel}`)}</TableShell.Cell>
                <TableShell.Cell className="font-mono text-xs">{delivery.destination}</TableShell.Cell>
                <TableShell.Cell>
                  {formatDateTime(delivery.attemptedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(delivery.attemptedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATUS_TONES[delivery.status]}>
                    {t(`communications.deliveryStatus.${delivery.status}`)}
                  </StatusPill>
                  {delivery.failureCode ? (
                    <span className="block text-xs text-charcoal-light">
                      {t(`communications.failureCode.${delivery.failureCode}`)}
                    </span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.ActionsCell>
                  {/* Only a transient failure is offered a retry. A registry
                      refusal is shown as un-retryable rather than as a button
                      that will be refused. */}
                  {delivery.retryable ? (
                    <Button size="sm" variant="ghost" iconLeft={RotateCcw} onClick={() => setRetrying(delivery)}>
                      {t('communications.retryDelivery')}
                    </Button>
                  ) : delivery.failureCode ? (
                    <span className="text-xs text-charcoal-lighter">{t('communications.notRetryable')}</span>
                  ) : null}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchDeliveries())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearDeliveryFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  title={t('communications.deliveriesEmptyTitle')}
                  body={t('communications.deliveriesEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ConfirmDialog
        open={Boolean(retrying)}
        onClose={() => { setRetrying(null); dispatch(dismissDeliveryAction()); }}
        onConfirm={handleRetry}
        loading={actionStatus === 'loading'}
        tone="primary"
        title={t('communications.retryTitle')}
        body={t('communications.retryBody', {
          destination: retrying?.destination ?? '',
          channel: retrying ? t(`communications.channel.${retrying.channel}`) : '',
        })}
        confirmLabel={t('communications.retryDelivery')}
      >
        {actionError ? <p className="mt-2 text-sm text-danger">{actionError.message}</p> : null}
      </ConfirmDialog>
    </div>
  );
}

function RowSkeleton({ rows = 10 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
