// ADM-049
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Lock } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatusPill,
  Tabs,
  Textarea,
} from '@/components/primitives';
import { PriceBreakup } from '@/components';
import {
  cancelOrder,
  escalateOrder,
  fetchOrder,
  recordAdjustment,
  selectOrderDetail,
} from '@/store/slices/ordersSlice';
import {
  formatDate,
  formatDateTime,
  formatGrams,
  formatINR,
  formatNumber,
  formatPercent,
  formatPurity,
} from '@/utils/format';
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

const CANCEL_OPTIONS = [
  { value: 'jeweller_withdrew', label: t('orders.cancel.reasonSourced') },
  { value: 'manufacturer_cannot_supply', label: t('orders.cancel.reasonCannotSupply') },
  { value: 'payment_never_cleared', label: t('orders.cancel.reasonPayment') },
  { value: 'duplicate_order', label: t('orders.cancel.reasonDuplicate') },
  { value: 'suspected_fraud', label: t('orders.cancel.reasonFraud') },
];

const ADJUST_OPTIONS = [
  { value: 'goodwill_credit', label: t('orders.adjust.kindGoodwill') },
  { value: 'shipping_waiver', label: t('orders.adjust.kindShipping') },
  { value: 'insurance_waiver', label: t('orders.adjust.kindInsurance') },
];

const QUEUE_OPTIONS = [
  { value: 'finance', label: t('orders.escalate.queueFinance') },
  { value: 'logistics', label: t('orders.escalate.queueLogistics') },
  { value: 'catalogue', label: t('orders.escalate.queueCatalogue') },
  { value: 'founder', label: t('orders.escalate.queueFounder') },
];

const SEVERITY_OPTIONS = [
  { value: 'normal', label: t('orders.escalate.severityNormal') },
  { value: 'high', label: t('orders.escalate.severityHigh') },
];

export default function OrderDetail() {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [dialog, setDialog] = useState(null);

  // Data. ONE selector - this is the seam.
  const state = useSelector(selectOrderDetail);
  const { order, viewState, canCancel, canAdjust, actionStatus, actionError } = state;

  useEffect(() => {
    dispatch(fetchOrder(orderId));
  }, [dispatch, orderId]);

  if (viewState === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (viewState === 'error') {
    return <ErrorState detail={state.error?.message} onRetry={() => dispatch(fetchOrder(orderId))} />;
  }
  if (!order) {
    return (
      <EmptyState
        title={t('orders.notFoundTitle')}
        body={t('orders.notFoundBody')}
        actionLabel={t('common.back')}
        onAction={() => navigate('/orders')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        eyebrow={t('orders.eyebrow')}
        title={t('orders.detailTitle', { orderId: order.id })}
        subtitle={`${order.jewellerName} · ${t('orders.placedOn', { date: formatDate(order.placedAt) })}`}
        meta={<StatusPill tone={STATUS_TONES[order.status]} label={t(`orders.status.${order.status}`)} />}
        actions={
          <>
            <Button variant="secondary" iconLeft={ArrowLeft} onClick={() => navigate('/orders')}>
              {t('common.back')}
            </Button>
            <Button variant="secondary" disabled={!canAdjust} onClick={() => setDialog('adjust')}>
              {t('orders.action.adjust')}
            </Button>
            <Button variant="secondary" onClick={() => setDialog('escalate')}>
              {t('orders.action.escalate')}
            </Button>
            <Button variant="danger" disabled={!canCancel} onClick={() => setDialog('cancel')}>
              {t('orders.action.cancel')}
            </Button>
          </>
        }
      />

      <Tabs
        activeId={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: t('orders.tabOverview') },
          { id: 'lines', label: t('orders.tabLines'), count: state.lines.length },
          { id: 'money', label: t('orders.tabMoney'), count: state.settlementLines.length },
          { id: 'timeline', label: t('orders.tabTimeline'), count: state.timeline.length },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {tab === 'overview' ? <OverviewTab state={state} /> : null}
          {tab === 'lines' ? <LinesTab lines={state.lines} /> : null}
          {tab === 'money' ? <MoneyTab state={state} /> : null}
          {tab === 'timeline' ? <TimelineTab timeline={state.timeline} /> : null}
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card title={t('common.details')}>
            <dl className="flex flex-col gap-3">
              <MetaRow label={t('orders.meta.jeweller')} value={state.jeweller?.businessName} />
              <MetaRow label={t('orders.meta.gstin')} value={state.jeweller?.gstin} mono />
              <MetaRow label={t('orders.meta.creditLimit')} value={formatINR(state.jeweller?.creditLimit)} />
              <MetaRow
                label={t('orders.meta.terms')}
                value={t('orders.meta.termsDays', { count: state.jeweller?.paymentTermsDays ?? 0 })}
              />
              <MetaRow label={t('orders.meta.shippingTo')} value={order.shippingCity} />
              <MetaRow label={t('orders.meta.awb')} value={order.awb} mono />
              <MetaRow label={t('orders.meta.paymentRef')} value={order.paymentReference} mono />
              <MetaRow
                label={t('orders.meta.manufacturers')}
                value={formatNumber(state.manufacturers.length)}
              />
            </dl>
          </Card>
        </aside>
      </div>

      <CancelDialog
        open={dialog === 'cancel'}
        order={order}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => setDialog(null)}
      />
      <AdjustModal
        open={dialog === 'adjust'}
        order={order}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => setDialog(null)}
      />
      <EscalateModal
        open={dialog === 'escalate'}
        order={order}
        actionStatus={actionStatus}
        actionError={actionError}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}

// Local sub-components, same file.

function OverviewTab({ state }) {
  const { order, adjustmentTotal, interventions, permanentTotal, netOfAdjustments } = state;
  const adjustments = interventions.filter((row) => row.kind === 'adjustment');

  return (
    <>
      <Card
        title={t('orders.priceTitle')}
        description={
          order.confirmedAt
            ? t('orders.priceLocked', { date: formatDate(order.confirmedAt) })
            : t('orders.priceNotLocked')
        }
        action={order.confirmedAt ? <Lock size={16} className="text-charcoal-light" aria-hidden="true" /> : null}
      >
        <dl className="flex flex-col gap-2">
          <MetaRow label={t('orders.goodsValue')} value={formatINR(order.goodsValue)} />
          <MetaRow label={t('orders.shipping')} value={formatINR(order.shipping)} />
          <MetaRow label={t('orders.insurance')} value={formatINR(order.insurance)} />
          <div className="border-t border-lightGray-dark pt-2">
            <MetaRow label={t('orders.orderTotal')} value={formatINR(permanentTotal)} emphasis />
          </div>
          <MetaRow
            label={t('orders.commissionRetained')}
            value={`${formatINR(order.commission)} (${formatPercent(order.commissionPercent)})`}
          />
          <MetaRow
            label={t('orders.payoutToManufacturers')}
            value={formatINR(order.manufacturerPayout)}
          />
        </dl>
      </Card>

      {/* The two numbers are kept apart on purpose. A single "adjusted total"
          would read as though the order had been repriced, and it never is. */}
      <Card title={t('orders.adjustmentsTitle')} description={t('orders.adjustmentsCaption')}>
        {adjustments.length === 0 ? (
          <p className="text-base text-charcoal-light">{t('orders.noAdjustments')}</p>
        ) : (
          <>
            <ul className="mb-4 flex flex-col gap-3">
              {adjustments.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-4">
                  <span className="min-w-0">
                    <span className="text-base text-charcoal">
                      {t(`orders.adjust.kind${row.adjustmentKind === 'goodwill_credit' ? 'Goodwill' : row.adjustmentKind === 'shipping_waiver' ? 'Shipping' : 'Insurance'}`)}
                    </span>
                    <span className="block text-xs text-charcoal-light">
                      {row.reason} · {row.actorName} · {formatDate(row.at)}
                    </span>
                  </span>
                  <span className="shrink-0 text-base tabular-nums text-charcoal">
                    {formatINR(row.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-2 border-t border-lightGray-dark pt-3">
              <MetaRow label={t('orders.adjustmentTotal')} value={formatINR(adjustmentTotal)} />
              <MetaRow label={t('orders.netOfAdjustments')} value={formatINR(netOfAdjustments)} emphasis />
            </dl>
          </>
        )}
      </Card>
    </>
  );
}

function LinesTab({ lines }) {
  return (
    <>
      {lines.map((line) => (
        <Card
          key={line.id}
          title={line.title}
          description={`${line.sku} · ${formatPurity(line.purity)} · ${formatGrams(line.netWeight)}`}
          action={
            <Badge tone="neutral">
              {t('orders.lineOf', { quantity: line.quantity, unitPrice: formatINR(line.unitPrice) })}
            </Badge>
          }
        >
          {/* The breakup as it was struck, not as it would price today. */}
          <PriceBreakup breakup={line.breakup} />
          <p className="mt-3 text-xs text-charcoal-light">
            {t('orders.rateAtConfirmation', { rate: formatINR(line.metalRateAtConfirmation) })}
          </p>
        </Card>
      ))}
    </>
  );
}

function MoneyTab({ state }) {
  const nameOf = (manufacturerId) =>
    state.manufacturers.find((row) => row.id === manufacturerId)?.businessName ?? manufacturerId;

  return (
    <>
      <Card title={t('orders.settlementTitle')} description={t('orders.settlementCaption')} padded={false}>
        <ul className="divide-y divide-lightGray">
          {state.settlementLines.map((line) => (
            <MoneyRow
              key={line.id}
              title={nameOf(line.manufacturerId)}
              detail={`${formatINR(line.goodsValue)} · ${t('orders.column.commission')} ${formatINR(line.commission)} (${formatPercent(line.commissionPercent)})`}
              amount={line.payout}
              tone={line.status === 'settled' ? 'success' : line.status === 'pending' ? 'warning' : 'neutral'}
              label={t(`orders.settlementStatus.${line.status}`)}
            />
          ))}
        </ul>
      </Card>

      <Card title={t('orders.invoicesTitle')} description={t('orders.invoicesCaption')} padded={false}>
        <ul className="divide-y divide-lightGray">
          {state.invoices.map((invoice) => (
            <MoneyRow
              key={invoice.id}
              title={invoice.documentNumber}
              mono
              detail={`${invoice.manufacturerName} · ${invoice.irn ?? invoice.failureReason ?? '-'}`}
              amount={invoice.invoiceValue}
              tone={invoice.status === 'generated' ? 'success' : invoice.status === 'failed' ? 'danger' : 'warning'}
              label={invoice.status}
            />
          ))}
        </ul>
      </Card>

      <Card title={t('orders.payoutsTitle')} description={t('orders.payoutsCaption')} padded={false}>
        {state.payouts.length === 0 ? (
          <p className="px-5 py-4 text-base text-charcoal-light">{t('orders.noPayouts')}</p>
        ) : (
          <ul className="divide-y divide-lightGray">
            {state.payouts.map((payout) => (
              <MoneyRow
                key={payout.id}
                title={`${payout.manufacturerName} · ${payout.rail}`}
                detail={payout.utr ?? payout.failureReason ?? payout.nodalReference}
                amount={payout.amount}
                tone={payout.status === 'succeeded' ? 'success' : payout.status === 'failed' ? 'danger' : 'neutral'}
                label={payout.status}
              />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

// The three money panels differ in their words, not their shape: something on
// the left, an amount and a state on the right.
function MoneyRow({ title, detail, amount, tone, label, mono = false }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <span className="min-w-0">
        <span className={mono ? 'font-mono text-sm text-charcoal' : 'text-base text-charcoal'}>{title}</span>
        <span className="block text-xs text-charcoal-light">{detail}</span>
      </span>
      <span className="flex items-center gap-3">
        <span className="text-base tabular-nums text-charcoal">{formatINR(amount)}</span>
        <StatusPill tone={tone} label={label} />
      </span>
    </li>
  );
}

function TimelineTab({ timeline }) {
  return (
    <Card title={t('orders.timelineTitle')} padded={false}>
      <ul className="divide-y divide-lightGray">
        {timeline.map((event) => (
          <li key={event.id} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-base text-charcoal">{event.summary}</p>
              <p className="text-xs text-charcoal-light">
                {t(`orders.event.${event.kind}`)}
                {event.reference ? ` · ${event.reference}` : ''}
                {event.actorName ? ` · ${event.actorName}` : ''}
              </p>
            </div>
            <span className="shrink-0 text-right text-xs text-charcoal-light">
              {formatDateTime(event.at)}
              {event.amount ? (
                <span className="block tabular-nums text-charcoal">{formatINR(event.amount)}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CancelDialog({ open, order, actionStatus, actionError, onClose }) {
  const dispatch = useDispatch();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const handleConfirm = async () => {
    const result = await dispatch(cancelOrder({ orderId: order.id, reason, note }));
    if (!result.error) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('orders.cancel.title')}
      description={t('orders.cancel.body')}
      footer={
        <DialogFooter actionError={actionError} onClose={onClose}>
          <Button variant="danger" disabled={!reason} loading={actionStatus === 'loading'} onClick={handleConfirm}>
            {t('orders.cancel.confirm')}
          </Button>
        </DialogFooter>
      }
    >
      <div className="flex flex-col gap-field">
        <Select
          id="cancel-reason"
          label={t('orders.cancel.reason')}
          required
          placeholder={t('common.all')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          options={CANCEL_OPTIONS}
        />
        <Textarea
          id="cancel-note"
          rows={3}
          label={t('orders.cancel.note')}
          help={t('orders.cancel.noteHelp')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function AdjustModal({ open, order, actionStatus, actionError, onClose }) {
  const dispatch = useDispatch();
  const [kind, setKind] = useState('goodwill_credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    const result = await dispatch(
      recordAdjustment({ orderId: order.id, kind, amount: Number(amount), reason }),
    );
    if (!result.error) {
      setAmount('');
      setReason('');
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('orders.adjust.title')}
      description={t('orders.adjust.description')}
      footer={
        <DialogFooter actionError={actionError} onClose={onClose}>
          <Button
            disabled={!amount || reason.trim().length === 0}
            loading={actionStatus === 'loading'}
            onClick={handleSubmit}
          >
            {t('orders.adjust.submit')}
          </Button>
        </DialogFooter>
      }
    >
      <div className="flex flex-col gap-field">
        <Select
          id="adjust-kind"
          label={t('orders.adjust.kind')}
          required
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          options={ADJUST_OPTIONS}
        />
        <Input
          id="adjust-amount"
          type="number"
          label={t('orders.adjust.amount')}
          required
          help={t('orders.adjust.amountHelp', {
            shipping: formatINR(order.shipping),
            insurance: formatINR(order.insurance),
          })}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <Textarea
          id="adjust-reason"
          rows={3}
          label={t('orders.adjust.reason')}
          required
          help={t('orders.adjust.reasonHelp')}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
    </Modal>
  );
}

function EscalateModal({ open, order, actionStatus, actionError, onClose }) {
  const dispatch = useDispatch();
  const [queue, setQueue] = useState('finance');
  const [severity, setSeverity] = useState('normal');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    const result = await dispatch(escalateOrder({ orderId: order.id, queue, severity, note }));
    if (!result.error) {
      setNote('');
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('orders.escalate.title')}
      description={t('orders.escalate.description')}
      footer={
        <DialogFooter actionError={actionError} onClose={onClose}>
          <Button disabled={note.trim().length === 0} loading={actionStatus === 'loading'} onClick={handleSubmit}>
            {t('orders.escalate.submit')}
          </Button>
        </DialogFooter>
      }
    >
      <div className="flex flex-col gap-field">
        <Select
          id="escalate-queue"
          label={t('orders.escalate.queue')}
          required
          value={queue}
          onChange={(event) => setQueue(event.target.value)}
          options={QUEUE_OPTIONS}
        />
        <Select
          id="escalate-severity"
          label={t('orders.escalate.severity')}
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
          options={SEVERITY_OPTIONS}
        />
        <Textarea
          id="escalate-note"
          rows={4}
          label={t('orders.escalate.note')}
          required
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
    </Modal>
  );
}

// Error on the left, cancel then the primary on the right, in that order on
// every dialog, so muscle memory works across all 99 screens.
function DialogFooter({ actionError, onClose, children }) {
  return (
    <>
      {actionError ? <p className="mr-auto text-sm text-danger">{actionError.message}</p> : null}
      <Button variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      {children}
    </>
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
          emphasis ? 'font-semibold text-charcoal' : 'text-charcoal',
        ].join(' ')}
      >
        {value ?? '-'}
      </dd>
    </div>
  );
}
