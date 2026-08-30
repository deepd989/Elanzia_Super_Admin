// ADM-060
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { CheckCircle2, Clock, Search, Truck, TriangleAlert } from 'lucide-react';
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
import { MetricTile, TableShell } from '@/components';
import {
  clearEwayFilters,
  extendBill,
  extendEwayBill,
  fetchEwayBillSummary,
  fetchEwayBills,
  selectEwayBills,
  setEwayFilters,
  setEwayPage,
  setEwayPageSize,
  setEwaySearch,
} from '@/store/slices/taxSlice';
import { formatDate, formatINR, formatINRCompact, formatNumber } from '@/utils/format';
import { t } from '@/i18n/en';

const STATE_TONES = {
  active: 'success',
  expiring: 'warning',
  expired: 'danger',
  completed: 'neutral',
  cancelled: 'neutral',
  not_required: 'neutral',
  pending: 'info',
};

const STATE_OPTIONS = ['active', 'expiring', 'expired', 'completed', 'not_required'].map((value) => ({
  value,
  label: t(`tax.ewayState.${value}`),
}));

const MODE_OPTIONS = ['road', 'air'].map((value) => ({
  value,
  label: t(`tax.transportMode.${value}`),
}));

const COLUMN_COUNT = 8;

export default function EwayBills() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const { bills, total, query, viewState, summary, facets, extendingId, actionStatus, actionError, extendableIds } =
    useSelector(selectEwayBills);

  useEffect(() => {
    dispatch(fetchEwayBills());
    dispatch(fetchEwayBillSummary());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setEwayFilters({ ...query.filters, [field]: event.target.value }));

  const extending = bills.find((row) => row.id === extendingId) ?? null;

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('tax.eyebrow')}
        title={t('tax.ewayTitle')}
        subtitle={t('tax.ewaySubtitle')}
        meta={
          summary ? (
            <StatusPill
              tone="neutral"
              label={t('tax.thresholdNote', {
                value: formatINR(summary.threshold),
                km: formatNumber(summary.kmPerDay),
              })}
            />
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t('tax.ewayActive')}
          value={formatNumber(summary?.active ?? 0)}
          icon={Truck}
          loading={!summary}
        />
        <MetricTile
          label={t('tax.ewayExpiring')}
          value={formatNumber(summary?.expiring ?? 0)}
          icon={Clock}
          invertTrend
          loading={!summary}
        />
        {/* Lapsed means goods still moving on invalid paperwork, which is a
            confiscation risk. A delivered consignment counts as completed. */}
        <MetricTile
          label={t('tax.ewayExpired')}
          value={formatNumber(summary?.expired ?? 0)}
          caption={t('tax.ewayExpiredCaption')}
          icon={TriangleAlert}
          invertTrend
          loading={!summary}
        />
        <MetricTile
          label={t('tax.consignmentValue')}
          value={formatINRCompact(summary?.consignmentValue ?? 0)}
          caption={summary ? `${t('tax.ewayCompleted')}: ${formatNumber(summary.completed)}` : undefined}
          icon={CheckCircle2}
          loading={!summary}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('tax.searchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setEwaySearch(event.target.value))}
        />
        <Select
          id="state"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.state}
          onChange={setFilter('state')}
          options={STATE_OPTIONS}
        />
        <Select
          id="mode"
          className="w-40"
          placeholder={t('tax.filter.mode')}
          value={query.filters.transportMode}
          onChange={setFilter('transportMode')}
          options={MODE_OPTIONS}
        />
        <Select
          id="supplier"
          className="w-56"
          placeholder={t('tax.filter.supplier')}
          value={query.filters.manufacturerId}
          onChange={setFilter('manufacturerId')}
          options={facets.manufacturers}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearEwayFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setEwayPage(page))}
            onPageSizeChange={(size) => dispatch(setEwayPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('tax.column.bill')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.supplier')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.route')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.vehicle')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('tax.column.value')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('tax.column.validity')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            bills.map((row) => (
              <TableShell.Row key={row.id}>
                <TableShell.Cell>
                  <span className="font-mono text-sm text-charcoal">{row.ewayBillNumber ?? '-'}</span>
                  <span className="block text-xs text-charcoal-light">{row.orderId}</span>
                </TableShell.Cell>
                <TableShell.Cell>{row.manufacturerName}</TableShell.Cell>
                <TableShell.Cell>
                  {t('tax.route', { from: row.fromCity, to: row.toCity })}
                  <span className="block text-xs text-charcoal-light">
                    {t('tax.distance', { km: formatNumber(row.distanceKm) })} ·{' '}
                    {t(`tax.transportMode.${row.transportMode}`)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell className="font-mono text-xs">{row.vehicleNumber ?? '-'}</TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(row.consignmentValue)}
                </TableShell.Cell>
                <TableShell.Cell>
                  {row.validUntil ? formatDate(row.validUntil) : '-'}
                  {row.hoursRemaining !== null ? (
                    <span className="block text-xs text-charcoal-light">
                      {row.hoursRemaining >= 0
                        ? t('tax.hoursLeft', { count: row.hoursRemaining })
                        : t('tax.hoursOver', { count: Math.abs(row.hoursRemaining) })}
                    </span>
                  ) : null}
                </TableShell.Cell>
                <TableShell.Cell>
                  <div className="flex items-center gap-1.5">
                    <StatusPill tone={STATE_TONES[row.state]} label={t(`tax.ewayState.${row.state}`)} />
                    {row.extendedCount > 0 ? (
                      <Badge tone="neutral">{t('tax.extendedTimes', { count: row.extendedCount })}</Badge>
                    ) : null}
                  </div>
                </TableShell.Cell>
                <TableShell.ActionsCell>
                  {/* Extension is only possible inside eight hours of expiry,
                      so the button appears on exactly those rows. */}
                  {extendableIds.includes(row.id) ? (
                    <Button size="sm" variant="ghost" onClick={() => dispatch(extendBill(row.id))}>
                      {t('tax.extend')}
                    </Button>
                  ) : null}
                </TableShell.ActionsCell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <QueueSkeleton /> : null}
              {viewState === 'error' ? <ErrorState onRetry={() => dispatch(fetchEwayBills())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearEwayFilters())}
                />
              ) : null}
              {/* Opens on 'expiring', so nothing here is good news. */}
              {viewState === 'empty' ? (
                <EmptyState icon={CheckCircle2} title={t('tax.ewayEmptyTitle')} body={t('tax.ewayEmptyBody')} />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <ExtendModal
        bill={extending}
        actionStatus={actionStatus}
        actionError={actionError}
        kmPerDay={summary?.kmPerDay ?? 200}
        onClose={() => dispatch(extendBill(null))}
      />
    </div>
  );
}

// Local sub-component, same file.
function ExtendModal({ bill, actionStatus, actionError, kmPerDay, onClose }) {
  const dispatch = useDispatch();
  const [reason, setReason] = useState('');
  const [distance, setDistance] = useState('');

  const handleExtend = async () => {
    const result = await dispatch(
      extendEwayBill({ ewayBillId: bill.id, reason, additionalDistanceKm: Number(distance) || 0 }),
    );
    if (!result.error) {
      setReason('');
      setDistance('');
      onClose();
    }
  };

  return (
    <Modal
      open={bill !== null}
      onClose={onClose}
      title={t('tax.extendDialog.title')}
      description={t('tax.extendDialog.description')}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={reason.trim().length === 0}
            loading={actionStatus === 'loading'}
            onClick={handleExtend}
          >
            {t('tax.extendDialog.submit')}
          </Button>
        </>
      }
    >
      {bill ? (
        <div className="flex flex-col gap-field">
          <p className="text-base text-charcoal">
            {bill.ewayBillNumber} · {t('tax.route', { from: bill.fromCity, to: bill.toCity })}
          </p>
          <Textarea
            id="extend-reason"
            rows={3}
            label={t('tax.extendDialog.reason')}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Input
            id="extend-distance"
            type="number"
            label={t('tax.extendDialog.distance')}
            help={t('tax.extendDialog.distanceHelp', { km: formatNumber(kmPerDay) })}
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
          />
        </div>
      ) : null}
    </Modal>
  );
}

function QueueSkeleton({ rows = 6 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-36 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
