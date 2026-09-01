// ADM-072
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, UserPlus } from 'lucide-react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  clearInvitationFilters,
  closeAttribution,
  fetchAttribution,
  fetchInvitationCounts,
  fetchInvitations,
  graduateBuyer,
  resendInvitation,
  revokeInvitation,
  selectInvitationOversight,
  setInvitationFilters,
  setInvitationPage,
  setInvitationSearch,
  setInvitationSort,
} from '@/store/slices/growthSlice';
import { formatDate, formatINR, formatNumber, formatPercent, formatRelativeTime } from '@/utils/format';
import { t } from '@/i18n/en';

const STATUS_TONES = {
  sent: 'info',
  opened: 'info',
  accepted: 'success',
  expired: 'neutral',
  revoked: 'danger',
  declined: 'danger',
};

const MODE_TONES = { direct: 'neutral', linked: 'warning', graduated: 'success' };
const FEE_TONES = { earning: 'success', window_closed: 'neutral', not_earning: 'neutral' };

const STATUS_OPTIONS = ['sent', 'opened', 'accepted', 'expired', 'revoked', 'declined'].map(
  (value) => ({ value, label: t(`growth.invitationStatus.${value}`) }),
);

const MODE_OPTIONS = ['linked', 'graduated'].map((value) => ({
  value,
  label: t(`growth.mode.${value}`),
}));

const FEE_OPTIONS = ['earning', 'window_closed', 'not_earning'].map((value) => ({
  value,
  label: t(`growth.feeState.${value}`),
}));

const COLUMN_COUNT = 7;

export default function InvitationOversight() {
  const dispatch = useDispatch();

  // Data. ONE selector - this is the seam.
  const {
    invitationRows,
    total,
    query,
    counts,
    attribution,
    attributionState,
    viewState,
    error,
    actionStatus,
    actionError,
  } = useSelector(selectInvitationOversight);

  const [confirming, setConfirming] = useState(null); // { row, action }
  const [reason, setReason] = useState('');

  useEffect(() => {
    dispatch(fetchInvitations());
    dispatch(fetchInvitationCounts());
  }, [dispatch, query]);

  // Handlers.
  const setFilter = (field) => (event) =>
    dispatch(setInvitationFilters({ ...query.filters, [field]: event.target.value }));

  const handleSort = (sortBy) =>
    dispatch(
      setInvitationSort({
        sortBy,
        sortDir: query.sortBy === sortBy && query.sortDir === 'desc' ? 'asc' : 'desc',
      }),
    );

  const handleConfirm = async () => {
    const { row, action } = confirming;
    const result =
      action === 'revoke'
        ? await dispatch(revokeInvitation({ invitationId: row.id, reason }))
        : await dispatch(graduateBuyer({ jewellerId: row.jewellerId, reason }));

    if (result.error) return;
    setConfirming(null);
    setReason('');
    dispatch(fetchInvitations());
    dispatch(fetchInvitationCounts());
  };

  // Markup.
  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('growth.eyebrow')}
        title={t('growth.invitationsTitle')}
        subtitle={t('growth.invitationsSubtitle')}
        meta={
          counts ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill tone="success">
                {t('growth.acceptedCount', { count: counts.accepted })}
              </StatusPill>
              <StatusPill tone="info">
                {t('growth.acceptanceRate', { percent: formatPercent(counts.acceptanceRatePercent) })}
              </StatusPill>
              <StatusPill tone="accent">
                {t('growth.feeEarnedTotal', { amount: formatINR(counts.feeEarnedToDate) })}
              </StatusPill>
            </span>
          ) : null
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Input
          id="search"
          className="w-72"
          iconLeft={Search}
          placeholder={t('growth.invitationsSearchPlaceholder')}
          value={query.search}
          onChange={(event) => dispatch(setInvitationSearch(event.target.value))}
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
          id="mode"
          className="w-44"
          placeholder={t('common.all')}
          value={query.filters.mode}
          onChange={setFilter('mode')}
          options={MODE_OPTIONS}
        />
        <Select
          id="feeState"
          className="w-48"
          placeholder={t('common.all')}
          value={query.filters.feeState}
          onChange={setFilter('feeState')}
          options={FEE_OPTIONS}
        />
        <Button variant="ghost" className="ml-auto" onClick={() => dispatch(clearInvitationFilters())}>
          {t('common.clearFilters')}
        </Button>
      </div>

      {actionError ? <p className="text-sm text-danger">{actionError.message}</p> : null}

      <TableShell
        footer={
          <TableShell.Pagination
            page={query.page}
            pageSize={query.pageSize}
            total={total}
            onPageChange={(page) => dispatch(setInvitationPage(page))}
            onPageSizeChange={() => {}}
          />
        }
      >
        <TableShell.Head>
          <TableShell.HeadCell>{t('growth.columnInvitee')}</TableShell.HeadCell>
          <TableShell.HeadCell>{t('growth.columnIntroducer')}</TableShell.HeadCell>
          <TableShell.SortableHeadCell
            direction={query.sortBy === 'sentAt' ? query.sortDir : null}
            onSort={() => handleSort('sentAt')}
          >
            {t('growth.columnSent')}
          </TableShell.SortableHeadCell>
          <TableShell.HeadCell>{t('growth.columnMode')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('growth.columnOrders')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('growth.columnFee')}</TableShell.HeadCell>
          <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
        </TableShell.Head>

        <TableShell.Body>
          {viewState === 'populated' ? (
            invitationRows.map((row) => (
              <InvitationRow
                key={row.id}
                row={row}
                busy={actionStatus === 'loading'}
                onOpen={() => dispatch(fetchAttribution(row.jewellerId))}
                onResend={() => dispatch(resendInvitation({ invitationId: row.id }))}
                onRevoke={() => setConfirming({ row, action: 'revoke' })}
                onGraduate={() => setConfirming({ row, action: 'graduate' })}
              />
            ))
          ) : (
            <TableShell.StateRow colSpan={COLUMN_COUNT}>
              {viewState === 'loading' ? <InvitationSkeleton /> : null}
              {viewState === 'error' ? (
                <ErrorState detail={error?.message} onRetry={() => dispatch(fetchInvitations())} />
              ) : null}
              {viewState === 'empty-filtered' ? (
                <EmptyState
                  title={t('states.emptyFilteredTitle')}
                  body={t('states.emptyFilteredBody')}
                  actionLabel={t('common.clearFilters')}
                  onAction={() => dispatch(clearInvitationFilters())}
                />
              ) : null}
              {viewState === 'empty' ? (
                <EmptyState
                  icon={UserPlus}
                  title={t('growth.invitationsEmptyTitle')}
                  body={t('growth.invitationsEmptyBody')}
                />
              ) : null}
            </TableShell.StateRow>
          )}
        </TableShell.Body>
      </TableShell>

      <AttributionModal
        attribution={attribution}
        state={attributionState}
        onClose={() => dispatch(closeAttribution())}
      />

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={handleConfirm}
        loading={actionStatus === 'loading'}
        tone={confirming?.action === 'revoke' ? 'danger' : 'primary'}
        title={
          confirming?.action === 'revoke'
            ? t('growth.revokeTitle', { name: confirming?.row.inviteeBusinessName ?? '' })
            : t('growth.graduateTitle', { name: confirming?.row.inviteeBusinessName ?? '' })
        }
        body={confirming?.action === 'revoke' ? t('growth.revokeBody') : t('growth.graduateBody')}
        confirmLabel={confirming?.action === 'revoke' ? t('growth.revoke') : t('growth.graduate')}
      >
        <Textarea
          id="reason"
          className="mt-4"
          rows={3}
          required
          label={confirming?.action === 'revoke' ? t('growth.revokeReason') : t('growth.graduateReason')}
          error={actionError?.code === 'reason_required' ? actionError.message : undefined}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}

function InvitationRow({ row, busy, onOpen, onResend, onRevoke, onGraduate }) {
  const joined = row.status === 'accepted';

  return (
    <TableShell.Row onClick={joined ? onOpen : undefined}>
      <TableShell.Cell>
        <span className="font-medium text-charcoal">{row.inviteeBusinessName}</span>
        <span className="block text-xs text-charcoal-light">{row.inviteeEmail}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        {row.introducerName}
        <span className="block text-xs text-charcoal-light">{row.introducerCity}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        {formatDate(row.sentAt)}
        <span className="block text-xs text-charcoal-light">{formatRelativeTime(row.sentAt)}</span>
      </TableShell.Cell>

      <TableShell.Cell>
        <StatusPill tone={STATUS_TONES[row.status]}>
          {t(`growth.invitationStatus.${row.status}`)}
        </StatusPill>
        {row.acquisitionMode ? (
          <Badge tone={row.acquisitionMode === 'graduated' ? 'accent' : 'outline'} className="ml-1">
            {t(`growth.mode.${row.acquisitionMode}`)}
          </Badge>
        ) : null}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {joined ? formatNumber(row.ordersPlaced) : '-'}
      </TableShell.Cell>

      <TableShell.Cell align="right" numeric>
        {joined ? formatINR(row.feeEarnedToDate) : '-'}
        {joined ? (
          <span className="block text-xs">
            <StatusPill size="sm" tone={FEE_TONES[row.feeState]}>
              {t(`growth.feeState.${row.feeState}`)}
            </StatusPill>
          </span>
        ) : null}
      </TableShell.Cell>

      <TableShell.ActionsCell>
        {/* An accepted invitation cannot be withdrawn - the buyer has already
            joined, and revoking would only delete the attribution record. */}
        {!joined && !['revoked', 'declined'].includes(row.status) ? (
          <>
            <Button size="sm" variant="ghost" loading={busy} onClick={onResend}>
              {t('growth.resend')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onRevoke}>
              {t('growth.revoke')}
            </Button>
          </>
        ) : null}
        {row.acquisitionMode === 'linked' ? (
          <Button size="sm" variant="ghost" onClick={onGraduate}>
            {t('growth.graduate')}
          </Button>
        ) : null}
        {joined ? (
          <Button size="sm" variant="ghost" onClick={onOpen}>
            {t('common.view')}
          </Button>
        ) : null}
      </TableShell.ActionsCell>
    </TableShell.Row>
  );
}

function AttributionModal({ attribution, state, onClose }) {
  return (
    <Modal
      open={state !== 'idle'}
      onClose={onClose}
      size="lg"
      title={t('growth.attributionTitle')}
      description={attribution ? `${attribution.jewellerName} · ${attribution.jewellerCity}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {state === 'loading' || !attribution ? (
        <div className="h-48 animate-pulse rounded-md bg-lightGray-dark" />
      ) : (
        <div className="flex flex-col gap-field">
          {/* The record and the fee are different things, and the screen says
              so rather than leaving an introducer to guess which one ended. */}
          <div className="rounded border border-lightGray-dark bg-lightGray p-3">
            <p className="text-sm font-medium text-charcoal">{t('growth.attributionPermanent')}</p>
            <p className="text-xs text-charcoal-light">{t('growth.attributionPermanentHelp')}</p>
          </div>

          <dl className="flex flex-col gap-2">
            <Fact label={t('growth.columnIntroducer')} value={attribution.introducerName} />
            <Fact label={t('growth.columnSent')} value={formatDate(attribution.introducedAt)} />
            <Fact
              label={t('growth.columnMode')}
              value={t(`growth.mode.${attribution.acquisitionMode}`)}
            />
            <Fact
              label={t('growth.attributionWindow')}
              value={`${formatDate(attribution.windowEndsAt)} · ${
                attribution.windowOpen
                  ? t('growth.monthsRemaining', { count: attribution.monthsRemaining })
                  : t('growth.windowClosed')
              }`}
            />
            <Fact
              label={t('growth.attributionRate')}
              value={formatPercent(attribution.ratePercent, { decimals: 0 })}
            />
            <Fact label={t('growth.attributionEarned')} value={formatINR(attribution.feeEarnedToDate)} emphasis />
          </dl>

          <p className="text-xs text-charcoal-light">{t('growth.attributionRateHelp')}</p>

          <div>
            <h4 className="mb-2 font-heading text-base text-charcoal">
              {t('growth.attributionLedger')}
            </h4>
            {attribution.ledger.length === 0 ? (
              <p className="text-sm text-charcoal-light">{t('states.emptyBody')}</p>
            ) : (
              <ul className="divide-y divide-lightGray rounded border border-lightGray-dark">
                {attribution.ledger.map((entry) => (
                  <li key={entry.orderId} className="flex items-center gap-3 px-3 py-2">
                    <span className="font-mono text-xs text-charcoal">{entry.orderId}</span>
                    <span className="text-xs text-charcoal-light">
                      {formatDate(entry.confirmedAt)}
                    </span>
                    {/* An order outside the window is shown, and pays nothing.
                        A gap in the list answers no questions. */}
                    <StatusPill size="sm" tone={entry.inWindow ? 'success' : 'neutral'}>
                      {entry.inWindow ? t('growth.inWindow') : t('growth.outOfWindow')}
                    </StatusPill>
                    <span className="ml-auto text-sm tabular-nums text-charcoal">
                      {formatINR(entry.fee)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Fact({ label, value, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd className={`text-right text-base ${emphasis ? 'font-semibold text-charcoal' : 'text-charcoal'}`}>
        {value}
      </dd>
    </div>
  );
}

function InvitationSkeleton({ rows = 8 }) {
  return (
    <div className="divide-y divide-lightGray-dark">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-rowHeight items-center gap-cell px-cell">
          <div className="h-3 w-56 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-40 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="h-3 w-24 animate-pulse rounded-sm bg-lightGray-dark" />
          <div className="ml-auto h-5 w-20 animate-pulse rounded-full bg-lightGray-dark" />
          <div className="h-3 w-16 animate-pulse rounded-sm bg-lightGray-dark" />
        </div>
      ))}
    </div>
  );
}
