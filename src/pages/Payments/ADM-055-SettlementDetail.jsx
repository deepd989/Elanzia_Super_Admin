// ADM-055
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, PauseCircle, PlayCircle, ShieldAlert } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Spinner,
  StatusPill,
  Textarea,
} from '@/components/primitives';
import { TableShell } from '@/components';
import {
  fetchSettlement,
  holdSettlementLine,
  releaseSettlementRun,
  selectSettlementDetail,
} from '@/store/slices/paymentsSlice';
import { formatDate, formatGrams, formatINR, formatNumber, formatPercent } from '@/utils/format';
import { t } from '@/i18n/en';

const RUN_TONES = {
  draft: 'neutral',
  ready: 'info',
  released: 'accent',
  part_failed: 'danger',
  completed: 'success',
};

const PAYOUT_TONES = { queued: 'neutral', failed: 'danger', succeeded: 'success' };

const COLUMN_COUNT = 7;

export default function SettlementDetail() {
  const { settlementId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [holdLine, setHoldLine] = useState(null);
  const [note, setNote] = useState('');

  // Data. ONE selector - this is the seam.
  const state = useSelector(selectSettlementDetail);
  const { run, lines, payouts, manufacturer, beneficiary, nodal, viewState, actionStatus, actionError } = state;

  useEffect(() => {
    dispatch(fetchSettlement(settlementId));
  }, [dispatch, settlementId]);

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={state.error?.message} onRetry={() => dispatch(fetchSettlement(settlementId))} />;
  }
  if (!run) {
    return (
      <EmptyState
        title={t('payments.settlementsEmptyTitle')}
        body={t('payments.settlementsEmptyBody')}
        actionLabel={t('common.back')}
        onAction={() => navigate('/payments/settlements')}
      />
    );
  }

  const blocked = state.releaseBlockedBy;
  const blockedMessage = blocked
    ? t(`payments.blocked.${blocked}`, {
        date: state.windowOpenUntil ? formatDate(state.windowOpenUntil) : '',
      })
    : null;

  const handleRelease = async () => {
    setConfirmOpen(false);
    await dispatch(releaseSettlementRun({ runId: run.id, note }));
    setNote('');
  };

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('payments.eyebrow')}
        title={t('payments.settlementDetailTitle', { id: run.id })}
        subtitle={`${run.manufacturerName} · ${formatNumber(run.lineCount)} ${t('payments.column.lines').toLowerCase()}`}
        meta={<StatusPill tone={RUN_TONES[run.status]} label={t(`payments.runStatus.${run.status}`)} />}
        actions={
          <>
            <Button variant="secondary" iconLeft={ArrowLeft} onClick={() => navigate('/payments/settlements')}>
              {t('common.back')}
            </Button>
            <Button
              iconLeft={PlayCircle}
              disabled={Boolean(blocked)}
              loading={actionStatus === 'loading'}
              onClick={() => setConfirmOpen(true)}
            >
              {t('payments.release')}
            </Button>
          </>
        }
      />

      {/* The reason a release cannot happen is on screen BEFORE anybody clicks.
          The endpoint enforces every one of these again; this is so the desk is
          not told about it by an error. */}
      {blockedMessage ? (
        <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning-surface px-4 py-3">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-base text-charcoal">{blockedMessage}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <TableShell>
            <TableShell.Head>
              <TableShell.HeadCell>{t('payments.column.order')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('orders.column.weight')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('payments.column.goods')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('payments.column.commission')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('payments.column.payout')}</TableShell.HeadCell>
              <TableShell.HeadCell>{t('payments.column.due')}</TableShell.HeadCell>
              <TableShell.HeadCell align="right">{t('common.actions')}</TableShell.HeadCell>
            </TableShell.Head>

            <TableShell.Body>
              {lines.length > 0 ? (
                lines.map((line) => (
                  <TableShell.Row key={line.id}>
                    <TableShell.Cell>
                      <span className="font-medium text-charcoal">{line.orderId}</span>
                      <span className="block text-xs text-charcoal-light">
                        {formatNumber(line.lineCount)} · {line.id}
                      </span>
                    </TableShell.Cell>
                    <TableShell.Cell align="right" numeric>
                      {formatGrams(line.netWeight)}
                    </TableShell.Cell>
                    <TableShell.Cell align="right" numeric>
                      {formatINR(line.goodsValue)}
                    </TableShell.Cell>
                    <TableShell.Cell align="right" numeric>
                      {formatINR(line.commission)}
                      <span className="block text-xs text-charcoal-light">
                        {formatPercent(line.commissionPercent)}
                      </span>
                    </TableShell.Cell>
                    <TableShell.Cell align="right" numeric>
                      {formatINR(line.payout)}
                    </TableShell.Cell>
                    <TableShell.Cell>
                      {line.dueAt ? formatDate(line.dueAt) : '-'}
                      {line.held ? (
                        <span className="block">
                          <Badge tone="warning">{t('payments.heldLabel')}</Badge>
                        </span>
                      ) : null}
                    </TableShell.Cell>
                    <TableShell.ActionsCell>
                      {line.held ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={actionStatus === 'loading'}
                          onClick={() => dispatch(holdSettlementLine({ lineId: line.id, release: true }))}
                        >
                          {t('payments.unhold')}
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" iconLeft={PauseCircle} onClick={() => setHoldLine(line)}>
                          {t('payments.hold')}
                        </Button>
                      )}
                    </TableShell.ActionsCell>
                  </TableShell.Row>
                ))
              ) : (
                <TableShell.StateRow colSpan={COLUMN_COUNT}>
                  <EmptyState
                    title={t('payments.settlementsEmptyTitle')}
                    body={t('payments.settlementsEmptyBody')}
                  />
                </TableShell.StateRow>
              )}
            </TableShell.Body>
          </TableShell>

          <Card title={t('payments.payoutsTitle')} description={t('payments.payoutsSubtitle')} padded={false}>
            {payouts.length === 0 ? (
              <p className="px-5 py-4 text-base text-charcoal-light">{t('orders.noPayouts')}</p>
            ) : (
              <ul className="divide-y divide-lightGray">
                {payouts.map((payout) => (
                  <li key={payout.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <span className="min-w-0">
                      <span className="text-base text-charcoal">
                        {t('payments.attemptNumber', { number: payout.attemptNumber })} · {payout.rail}
                      </span>
                      <span className="block text-xs text-charcoal-light">
                        {payout.utr ??
                          (payout.failureCode ? t(`payments.failureCode.${payout.failureCode}`) : payout.nodalReference)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-base tabular-nums text-charcoal">{formatINR(payout.amount)}</span>
                      <StatusPill
                        tone={PAYOUT_TONES[payout.status] ?? 'neutral'}
                        label={t(`payments.payoutStatus.${payout.status}`)}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-6">
            <Card title={t('payments.beneficiaryTitle')}>
              <dl className="flex flex-col gap-3">
                <MetaRow label={t('payments.column.manufacturer')} value={manufacturer?.businessName} />
                <MetaRow label={t('orders.meta.gstin')} value={manufacturer?.gstin} mono />
                <MetaRow label={t('payments.bank.accountHolder')} value={beneficiary?.accountHolder} />
                <MetaRow
                  label={t('payments.bank.accountNumber')}
                  value={
                    beneficiary ? t('payments.accountEnding', { last4: beneficiary.accountNumberLast4 }) : null
                  }
                />
                <MetaRow label={t('payments.bank.ifsc')} value={beneficiary?.ifsc} mono />
                <div className="pt-1">
                  <StatusPill
                    tone={beneficiary?.verified ? 'success' : 'danger'}
                    label={beneficiary?.verified ? t('payments.verified') : t('payments.unverified')}
                  />
                </div>
              </dl>
            </Card>

            <Card title={t('payments.nodalTitle')} description={t('payments.nodalCaption')}>
              <dl className="flex flex-col gap-3">
                <MetaRow label={t('payments.nodalBalance')} value={formatINR(nodal?.balance)} />
                <MetaRow label={t('payments.releasableValue')} value={formatINR(state.releasableValue)} emphasis />
                {state.heldCount > 0 ? (
                  <MetaRow label={t('payments.heldValue')} value={t('payments.heldCount', { count: state.heldCount })} />
                ) : null}
              </dl>
            </Card>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRelease}
        loading={actionStatus === 'loading'}
        title={t('payments.releaseTitle')}
        body={t('payments.releaseBody', {
          value: formatINR(state.releasableValue),
          manufacturer: run.manufacturerName,
        })}
        confirmLabel={t('payments.release')}
      />

      <HoldModal
        line={holdLine}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => setHoldLine(null)}
      />
    </div>
  );
}

// Local sub-component, same file.
function HoldModal({ line, actionStatus, actionError, onClose }) {
  const dispatch = useDispatch();
  const [reason, setReason] = useState('');

  const handleHold = async () => {
    const result = await dispatch(holdSettlementLine({ lineId: line.id, reason }));
    if (!result.error) {
      setReason('');
      onClose();
    }
  };

  return (
    <Modal
      open={line !== null}
      onClose={onClose}
      title={t('payments.holdTitle')}
      description={t('payments.holdBody')}
      footer={
        <>
          {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            disabled={reason.trim().length === 0}
            loading={actionStatus === 'loading'}
            onClick={handleHold}
          >
            {t('payments.hold')}
          </Button>
        </>
      }
    >
      {line ? (
        <div className="flex flex-col gap-field">
          <p className="text-base text-charcoal">
            {line.orderId} · {formatINR(line.payout)}
          </p>
          <Textarea
            id="hold-reason"
            rows={3}
            label={t('payments.holdReasonLabel')}
            required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
      ) : null}
    </Modal>
  );
}

function MetaRow({ label, value, mono = false, emphasis = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-charcoal-light">{label}</dt>
      <dd
        className={[
          'text-right tabular-nums',
          mono ? 'font-mono text-xs' : 'text-base',
          emphasis ? 'font-semibold text-primary' : 'text-charcoal',
        ].join(' ')}
      >
        {value ?? '-'}
      </dd>
    </div>
  );
}
