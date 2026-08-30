// ADM-068
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Search } from 'lucide-react';
import {
  Button, EmptyState, ErrorState, Input, Modal, PageHeader,
  Select, StatusPill, Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import { INSURERS } from '@/data/logisticsFixtures';
import {
  clearClaimFilters, fetchClaims, fetchShipments, raiseClaim, resetClaimDraft,
  selectShipmentConsole,
  selectInsuranceClaims, setClaimDraftField, setClaimFilters,
  setClaimPage, setClaimPageSize, setClaimSearch,
} from '@/store/slices/logisticsSlice';
import { selectShellSession } from '@/store/slices/accessSlice';
import { formatDate, formatINR, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  submitted: 'info', under_assessment: 'info', surveyor_appointed: 'info',
  documents_requested: 'warning', approved: 'success', settled: 'success',
  rejected: 'danger', withdrawn: 'neutral',
};

const STATUS_OPTIONS = [
  'submitted', 'under_assessment', 'surveyor_appointed', 'documents_requested',
  'approved', 'settled', 'rejected', 'withdrawn',
].map((value) => ({ value, label: t(`logistics.claimStatus.${value}`) }));

const LOSS_OPTIONS = [
  { value: 'partial_loss', label: 'Partial loss' },
  { value: 'total_loss', label: 'Total loss' },
  { value: 'damage', label: 'Damage in transit' },
  { value: 'theft', label: 'Theft' },
  { value: 'shortage', label: 'Weight shortage on arrival' },
];

const INSURER_OPTIONS = INSURERS.map((insurer) => ({ value: insurer.id, label: insurer.name }));

const COLUMN_COUNT = 7;

export default function InsuranceClaimsConsole() {
  const dispatch = useDispatch();

  // Data.
  const {
    claims, total, query, draft, viewState, actionStatus, actionError, error,
  } = useSelector(selectInsuranceClaims);
  const { shipments } = useSelector(selectShipmentConsole);
  const { grantedPermissions } = useSelector(selectShellSession);
  const canRaise = grantedPermissions.includes('logistics.edit');

  const [raising, setRaising] = useState(false);

  useEffect(() => {
    dispatch(fetchClaims());
  }, [dispatch, query]);

  // Only insured consignments can support a claim, so the picker never offers
  // one that the API would refuse.
  useEffect(() => {
    if (raising && shipments.length === 0) dispatch(fetchShipments());
  }, [dispatch, raising, shipments.length]);

  const insurableOptions = shipments
    .filter((shipment) => shipment.insuredValue > 0)
    .map((shipment) => ({
      value: shipment.id,
      label: `${shipment.awb} · ${shipment.manufacturerName} · ${formatINR(shipment.insuredValue)}`,
    }));
  const selectedShipment = shipments.find((shipment) => shipment.id === draft.shipmentId) ?? null;

  // Handlers.
  const handleRaise = async () => {
    const result = await dispatch(raiseClaim({
      shipmentId: draft.shipmentId,
      lossType: draft.lossType,
      claimedValue: draft.claimedValue,
      note: draft.note,
    }));
    if (!result.error) { setRaising(false); dispatch(fetchClaims()); }
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('logistics.eyebrow')}
        title={t('logistics.claimsTitle')}
        subtitle={t('logistics.claimsSubtitle')}
        actions={
          canRaise ? (
            <Button iconLeft={Plus} onClick={() => { dispatch(resetClaimDraft()); setRaising(true); }}>
              {t('logistics.raiseClaim')}
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search" className="w-80" iconLeft={Search} placeholder={t('logistics.searchPlaceholder')}
          value={query.search} onChange={(event) => dispatch(setClaimSearch(event.target.value))}
        />
        <Select
          id="status" className="w-52" placeholder={t('common.all')}
          value={query.filters.status}
          onChange={(event) => dispatch(setClaimFilters({ ...query.filters, status: event.target.value }))}
          options={STATUS_OPTIONS}
        />
        <Select
          id="insurer" className="w-52" placeholder={t('common.all')}
          value={query.filters.insurerId}
          onChange={(event) => dispatch(setClaimFilters({ ...query.filters, insurerId: event.target.value }))}
          options={INSURER_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearClaimFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page} pageSize={query.pageSize} total={total}
            onPageChange={(page) => dispatch(setClaimPage(page))}
            onPageSizeChange={(size) => dispatch(setClaimPageSize(size))}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('logistics.columnClaim')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnInsurer')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnLossType')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('logistics.columnRaised')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnClaimed')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('logistics.columnSettled')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('common.status')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            claims.map((claim) => (
              <TableShell.Row key={claim.id}>
                <TableShell.Cell>
                  <span className="font-medium text-charcoal">{claim.id}</span>
                  <span className="block font-mono text-xs text-charcoal-light">
                    {claim.awb} · {claim.orderId}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell>
                  {claim.insurerName}
                  <span className="block font-mono text-xs text-charcoal-light">{claim.policyNumber}</span>
                </TableShell.Cell>
                <TableShell.Cell>{claim.lossTypeLabel}</TableShell.Cell>
                <TableShell.Cell>
                  {formatDate(claim.raisedAt)}
                  <span className={`block text-xs ${claim.slaBreached ? 'text-danger' : 'text-charcoal-light'}`}>
                    {formatRelativeTime(claim.raisedAt)}
                  </span>
                </TableShell.Cell>
                <TableShell.Cell align="right" numeric>
                  {formatINR(claim.claimedValue)}
                  <span className="block text-xs text-charcoal-light">
                    {t('logistics.sumInsured')} {formatINR(claim.insuredValue)}
                  </span>
                </TableShell.Cell>
                {/* null means not settled yet; 0 means the insurer refused.
                    Two different facts, shown differently. */}
                <TableShell.Cell align="right" numeric>
                  {claim.settledValue === null ? (
                    <span className="text-charcoal-lighter">{t('logistics.notSettledYet')}</span>
                  ) : (
                    <>
                      {formatINR(claim.settledValue)}
                      {claim.settledValue > 0 ? (
                        <span className="block text-xs text-charcoal-light">
                          {t('logistics.settlementShortfall', {
                            percent: formatPercent((claim.settledValue / claim.claimedValue) * 100, { decimals: 0 }),
                          })}
                        </span>
                      ) : null}
                    </>
                  )}
                </TableShell.Cell>
                <TableShell.Cell>
                  <StatusPill tone={STATUS_TONES[claim.status]}>
                    {t(`logistics.claimStatus.${claim.status}`)}
                  </StatusPill>
                  {claim.rejectionReason ? (
                    <span className="block max-w-xs text-xs text-danger">{claim.rejectionReason}</span>
                  ) : null}
                </TableShell.Cell>
              </TableShell.Row>
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <RowSkeleton /> : null}
              {viewState === 'error' ? <ErrorState detail={error?.message} onRetry={() => dispatch(fetchClaims())} /> : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')} body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')} onAction={() => dispatch(clearClaimFilters())}
                />
              ) : null}
              {viewState === 'empty' ? <EmptyState /> : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <Modal
        open={raising}
        onClose={() => setRaising(false)}
        title={t('logistics.raiseClaimTitle')}
        description={t('logistics.raiseClaimDescription')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRaising(false)}>{t('common.cancel')}</Button>
            <Button loading={actionStatus === 'loading'} onClick={handleRaise}>
              {t('logistics.submitClaim')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-field">
          <Select
            id="claim-shipment" label={t('logistics.consignment')} required
            placeholder={t('common.none')}
            value={draft.shipmentId}
            onChange={(event) => dispatch(setClaimDraftField({ field: 'shipmentId', value: event.target.value }))}
            options={insurableOptions}
          />
          {selectedShipment ? (
            <p className="text-sm text-charcoal-light">
              {t('logistics.sumInsured')}{' '}
              <span className="num font-medium text-charcoal">{formatINR(selectedShipment.insuredValue)}</span>
            </p>
          ) : null}
          <Select
            id="claim-loss" label={t('logistics.lossType')} required
            placeholder={t('common.none')}
            value={draft.lossType}
            onChange={(event) => dispatch(setClaimDraftField({ field: 'lossType', value: event.target.value }))}
            options={LOSS_OPTIONS}
          />
          <Input
            id="claim-value" type="number" label={t('logistics.claimedValue')} required
            value={draft.claimedValue}
            onChange={(event) => dispatch(setClaimDraftField({ field: 'claimedValue', value: event.target.value }))}
          />
          <Textarea
            id="claim-note" rows={3} required label={t('logistics.claimNote')}
            value={draft.note}
            onChange={(event) => dispatch(setClaimDraftField({ field: 'note', value: event.target.value }))}
          />
          {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}
        </div>
      </Modal>
    </div>
  );
}

function RowSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-32 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-44 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
