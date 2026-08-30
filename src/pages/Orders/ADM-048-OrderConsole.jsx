// ADM-048
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Banknote, Download, IndianRupee, Package, Search, TriangleAlert } from 'lucide-react';
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
  clearOrderFilters,
  exportOrders,
  fetchOrderSummary,
  fetchOrders,
  selectOrderConsole,
  setOrderFilters,
  setOrderPage,
  setOrderPageSize,
  setOrderSearch,
  setOrderSort,
} from '@/store/slices/ordersSlice';
import { formatDate, formatINR, formatINRCompact, formatNumber, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  placed: 'info',
  confirmed: 'info',
  in_production: 'info',
  ready_to_dispatch: 'info',
  dispatched: 'accent',
  delivered: 'success',
  returned: 'warning',
  refunded: 'neutral',
  disputed: 'danger',
  cancelled: 'neutral',
  payment_failed: 'danger',
};

const PAYMENT_TONES = { captured: 'success', pending: 'warning', failed: 'danger', refunded: 'neutral' };
const SETTLEMENT_TONES = { not_due: 'neutral', pending: 'warning', settled: 'success' };
const INVOICE_TONES = { none: 'neutral', partial: 'warning', registered: 'success', failed: 'danger' };

const STATUS_OPTIONS = [
  'placed',
  'confirmed',
  'in_production',
  'ready_to_dispatch',
  'dispatched',
  'delivered',
  'returned',
  'refunded',
  'disputed',
  'cancelled',
  'payment_failed',
].map((value) => ({ value, label: t(`orders.status.${value}`) }));

const PAYMENT_OPTIONS = ['captured', 'pending', 'failed', 'refunded'].map((value) => ({
  value,
  label: t(`orders.paymentStatus.${value}`),
}));

const SETTLEMENT_OPTIONS = ['not_due', 'pending', 'settled'].map((value) => ({
  value,
  label: t(`orders.settlementStatus.${value}`),
}));

const VALUE_OPTIONS = ['under_1l', '1l_5l', '5l_20l', 'above_20l'].map((value) => ({
  value,
  label: t(`orders.value.${value}`),
}));

const COLUMN_COUNT = 9;

export default function OrderConsole() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Data. ONE selector - this is the seam.
  const { orders, total, query, viewState, summary, facets, exportStatus } =
    useSelector(selectOrderConsole);

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchOrderSummary());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setOrderFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setOrderSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('orders.eyebrow')}
        title={t('orders.consoleTitle')}
        subtitle={t('orders.consoleSubtitle')}
        meta={
          summary && summary.needsIntervention > 0 ? (
            <StatusPill
              tone="danger"
              label={t('orders.interventionCount', { count: summary.needsIntervention })}
            />
          ) : null
        }
        actions={
          <Button
            variant="secondary"
            iconLeft={Download}
            loading={exportStatus === 'loading'}
            onClick={() => dispatch(exportOrders())}
          >
            {t('common.export')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('orders.metricOrders')}
          value={formatNumber(summary?.orderCount ?? 0)}
          icon={Package}
          loading={!summary}
        />
        {/* Confirmed value only. A placed but unconfirmed order is not revenue,
            and a past order's contribution never restates. */}
        <MetricTile
          label={t('orders.metricGmv')}
          value={formatINRCompact(summary?.gmv ?? 0)}
          caption={
            summary ? t('orders.averageOrderValue', { value: formatINR(summary.averageOrderValue) }) : undefined
          }
          icon={IndianRupee}
          loading={!summary}
        />
        <MetricTile
          label={t('orders.metricAwaitingSettlement')}
          value={formatNumber(summary?.awaitingSettlement ?? 0)}
          icon={Banknote}
          loading={!summary}
        />
        <MetricTile
          label={t('orders.metricIntervention')}
          value={formatNumber(summary?.needsIntervention ?? 0)}
          icon={TriangleAlert}
          invertTrend
          loading={!summary}
        />
      </div>

      {/* Filter row. Search first and widest, then the narrow selects, then
          the clear action pushed right. Same order on every queue. */}
      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('orders.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setOrderSearch(event.target.value))}
        />
        <Select
          id="status"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.status}
          onChange={setFilter('status')}
          options={STATUS_OPTIONS}
        />
        <Select
          id="payment"
          className="w-40"
          placeholder={t('orders.filter.payment')}
          value={query.filters.paymentStatus}
          onChange={setFilter('paymentStatus')}
          options={PAYMENT_OPTIONS}
        />
        <Select
          id="settlement"
          className="w-40"
          placeholder={t('orders.filter.settlement')}
          value={query.filters.settlementStatus}
          onChange={setFilter('settlementStatus')}
          options={SETTLEMENT_OPTIONS}
        />
        <Select
          id="manufacturer"
          className="w-52"
          placeholder={t('orders.filter.manufacturer')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Select
          id="value"
          className="w-40"
          placeholder={t('orders.filter.value')}
          value={query.filters.valueBand}
          onChange={setFilter('valueBand')}
          options={VALUE_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearOrderFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setOrderPage(page))}
            onPageSizeChange={(size) => dispatch(setOrderPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('orders.column.order')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('orders.column.jeweller')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('orders.column.manufacturer')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'placedAt' ? query.sortDir : null}
            onSort={() => handleSort('placedAt')}
          >
            {t('orders.column.placed')}
          </TableShell.SortableHeadCell>
          <TableShell.SortableHeadCell
            align="right"
            direction={query.sortBy === 'total' ? query.sortDir : null}
            onSort={() => handleSort('total')}
          >
            {t('orders.column.value')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('orders.column.payment')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('orders.column.settlement')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('orders.column.invoice')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            orders.map((order) => (
              <TableShell.Row key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{order.id}</span>
                  <span className="block text-xs text-charcoal-light">
                    {t('orders.column.lines')}: {formatNumber(order.lineCount)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell>
                  {order.jewellerName}
                  <span className="block text-xs text-charcoal-light">{order.shippingCity}</span>
                </TableShell.Cell>

                {/* A cell cannot hold three names, so it holds the first and a
                    count. The full list is on the detail screen. */}
                <TableShell.Cell>
                  {order.manufacturerName}
                  {order.manufacturerCount > 1 ? (
                    <span className="block text-xs text-charcoal-light">
                      {t('orders.plusMore', { count: order.manufacturerCount - 1 })}
                    </span>
                  ) : null}
                </TableShell.Cell>

                {/* Absolute date on top, relative underneath - an ageing queue
                    item has to be obvious without doing arithmetic. */}
                <TableShell.Cell>
                  {formatDate(order.placedAt)}
                  <span className="block text-xs text-charcoal-light">
                    {formatRelativeTime(order.placedAt)}
                  </span>
                </TableShell.Cell>

                <TableShell.Cell align="right" numeric>
                  {formatINR(order.total)}
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={PAYMENT_TONES[order.paymentStatus]}
                    label={t(`orders.paymentStatus.${order.paymentStatus}`)}
                  />
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill
                    tone={SETTLEMENT_TONES[order.settlementStatus]}
                    label={t(`orders.settlementStatus.${order.settlementStatus}`)}
                  />
                </TableShell.Cell>

                <TableShell.Cell>
                  <Badge tone={INVOICE_TONES[order.invoiceState]}>
                    {order.invoiceState === 'partial'
                      ? t('orders.ofCount', { done: order.invoicesRegistered, total: order.invoiceCount })
                      : t(`orders.invoiceState.${order.invoiceState}`)}
                  </Badge>
                </TableShell.Cell>

                <TableShell.Cell>
                  <StatusPill tone={STATUS_TONES[order.status]} label={t(`orders.status.${order.status}`)} />
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchOrders())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearOrderFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState icon={Package} title={t('orders.emptyTitle')} body={t('orders.emptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>
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
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
