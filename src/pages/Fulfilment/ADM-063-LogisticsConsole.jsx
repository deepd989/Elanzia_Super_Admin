// ADM-063
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Package, PackageCheck, RefreshCw, Search, ShieldAlert, TriangleAlert } from 'lucide-react';
import {
  Badge, Button, Checkbox, EmptyState, ErrorState, Input, Modal,
  PageHeader, Select, Spinner, StatusPill,
} from '@/components/primitives';
import { MetricTile, TableShell } from '@/components';
import {
  clearShipmentFilters, closeShipmentDetail, fetchShipment, fetchShipmentCounts,
  fetchShipments, refreshTracking, selectShipmentConsole, setShipmentFilters,
  setShipmentPage, setShipmentPageSize, setShipmentSearch, setShipmentSort,
} from '@/store/slices/logisticsSlice';
import { formatDate, formatDateTime, formatGrams, formatINR, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = { in_transit: 'info', delivered: 'success', exception: 'danger', returned: 'warning' };

const STATUS_OPTIONS = [
  { value: 'in_transit', label: t('logistics.inTransit') },
  { value: 'delivered', label: t('logistics.delivered') },
];

const COLUMN_COUNT = 7;

export default function LogisticsConsole() {
  const dispatch = useDispatch();

  // Data.
  const {
    shipments, total, query, counts, detail, carrierOptions, viewState, error,
  } = useSelector(selectShipmentConsole);

  useEffect(() => {
    dispatch(fetchShipments());
    dispatch(fetchShipmentCounts());
  }, [dispatch, query]);

  // Handlers.
  const handleSort = (sortBy) =>
    dispatch(setShipmentSort({
      sortBy,
      sortDir: query.sortBy === sortBy && query.sortDir === 'asc' ? 'desc' : 'asc',
    }));

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('logistics.eyebrow')}
        title={t('logistics.shipmentsTitle')}
        subtitle={t('logistics.shipmentsSubtitle')}
        meta={<StatusPill tone="neutral">{t('logistics.consignmentNote')}</StatusPill>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label={t('logistics.tileInTransit')} value={formatNumber(counts?.byStatus?.in_transit ?? 0)} icon={Package} loading={!counts} />
        <MetricTile label={t('logistics.tileHighValue')} value={formatNumber(counts?.highValueInTransit ?? 0)} icon={ShieldAlert} loading={!counts} />
        <MetricTile label={t('logistics.tileExceptions')} value={formatNumber(counts?.withOpenExceptions ?? 0)} icon={TriangleAlert} invertTrend loading={!counts} />
        <MetricTile label={t('logistics.tileBreached')} value={formatNumber(counts?.slaBreached ?? 0)} icon={PackageCheck} invertTrend loading={!counts} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search}
          placeholder={t('logistics.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setShipmentSearch(event.target.value))}
        />
        <Select
          id="status" className="w-44" placeholder={t('common.all')}
          value={query.filters.status}
          onChange={(event) => dispatch(setShipmentFilters({ ...query.filters, status: event.target.value }))}
          options={STATUS_OPTIONS}
        />
        <Select
          id="carrier" className="w-52" placeholder={t('common.all')}
          value={query.filters.carrierId}
          onChange={(event) => dispatch(setShipmentFilters({ ...query.filters, carrierId: event.target.value }))}
          options={carrierOptions}
        />
        <Checkbox
          id="exceptions-only" className="pb-2.5"
          label={t('logistics.exceptionsOnly')}
          checked={Boolean(query.filters.exceptionsOnly)}
          onChange={(event) => dispatch(setShipmentFilters({ ...query.filters, exceptionsOnly: event.target.checked ? 'yes' : '' }))}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearShipmentFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setShipmentPage(page))}
            onPageSizeChange={(size) => dispatch(setShipmentPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('logistics.columnAwb')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnConsignment')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnRoute')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'dispatchedAt' ? query.sortDir : null}
            onSort={() => handleSort('dispatchedAt')}
          >
            {t('logistics.columnDispatched')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnWeight')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnValue')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            shipments.map((shipment) => (
              <TableShell.Row key={shipment.id} onClick={() => dispatch(fetchShipment(shipment.id))}>
                <TableShell.Cell className="font-mono text-xs">
                  {shipment.awb}
                  <span className="block text-charcoal-light">{shipment.carrierName}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{shipment.manufacturerName}</span>
                  <span className="block text-xs text-charcoal-light">
                    {shipment.orderId} · {shipment.jewellerName}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {shipment.originCity}
                  <span className="block text-xs text-charcoal-light">{shipment.destinationCity}</span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {formatDate(shipment.dispatchedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(shipment.dispatchedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>{formatGrams(shipment.netWeight)}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(shipment.declaredValue)}
                  <span className={`block text-xs ${shipment.insuredValue > 0 ? 'text-charcoal-light' : 'text-warning'}`}>
                    {shipment.insuredValue > 0 ? t('logistics.insured') : t('logistics.uninsured')}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusPill tone={STATUS_TONES[shipment.status]}>
                      {shipment.status === 'delivered' ? t('logistics.delivered') : t('logistics.inTransit')}
                    </StatusPill>
                    {shipment.isHighValue ? <Badge tone="accent">{t('logistics.highValue')}</Badge> : null}
                    {shipment.hasOpenException ? <Badge tone="danger">!</Badge> : null}
                  </span>
                  {shipment.slaBreached ? (
                    <span className="block text-xs text-danger">{t('logistics.slaBreached')}</span>
                  ) : null}
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchShipments())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearShipmentFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <TrackingModal
        detail={detail}
        onClose={() => dispatch(closeShipmentDetail())}
        onRefresh={() => dispatch(refreshTracking(detail.shipment.id))}
      />
    </div>
  );
}

function TrackingModal({ detail, onClose, onRefresh }) {
  const shipment = detail.shipment;

  return (
    <Modal
      open={detail.status !== 'idle'}
      onClose={onClose}
      size="lg"
      title={shipment ? t('logistics.trackingTitle', { awb: shipment.awb }) : t('common.loading')}
      description={shipment ? t('logistics.trackingSubtitle', {
        origin: shipment.originCity, destination: shipment.destinationCity, carrier: shipment.carrierName,
      }) : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
          {shipment ? (
            <Button iconLeft={RefreshCw} loading={detail.status === 'loading'} onClick={onRefresh}>
              {t('logistics.refreshTracking')}
            </Button>
          ) : null}
        </>
      }
    >
      {detail.status === 'loading' && !shipment ? (
        <div className="flex h-40 items-center justify-center"><Spinner size="lg" /></div>
      ) : detail.status === 'failed' ? (
        <ErrorState detail={detail.error?.message} onRetry={onRefresh} />
      ) : detail.events.length === 0 ? (
        <EmptyState title={t('logistics.noScans')} body="" />
      ) : (
        <ol className="flex flex-col gap-0">
          {detail.events.map((event, index) => (
            <li key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${index === detail.events.length - 1 ? 'bg-accent' : 'bg-lightGray-darker'}`} />
                {index < detail.events.length - 1 ? <span className="w-px flex-1 bg-lightGray-dark" /> : null}
              </div>
              <div className="min-w-0 flex-1 pb-5">
                <p className="text-base text-charcoal">{event.label}</p>
                <p className="text-xs text-charcoal-light">
                  {event.location} · {formatDateTime(event.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-28 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-48 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
