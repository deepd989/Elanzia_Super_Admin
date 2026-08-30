// Feature fixtures for the order console and order detail - ADM-048, ADM-049.
//
// Everything here references src/data/core by id. No order, jeweller,
// manufacturer, product, settlement line, invoice or payout is invented in this
// file - the money records were promoted to core precisely so that this area and
// Operations could not describe them differently.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so the console shows the same rows on every reload and a
// screenshot taken today still matches the code tomorrow.
//
// THE RULE THIS FILE EXISTS UNDER
//
// A confirmed order's price is permanent. Nothing in this area reprices one.
// An intervention can put money back beside the order - a goodwill credit, a
// waived delivery charge - but the goods value, the line prices and the metal
// rate they were struck at are settled history. That is why `orderAdjustments`
// carries its own amounts alongside the order rather than editing it, and why
// there is no fixture here that mutates a line.

import {
  adminUsers,
  einvoicesByOrderId,
  jewellerById,
  manufacturerById,
  orders,
  payoutAttemptsByLineId,
  productById,
  settlementLinesByOrderId,
} from '@/data/core';

// The anchor. Matches operationsFixtures.js, pricingFixtures.js and
// core/metalRates.js so every area agrees about "now".
export const MONEY_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(MONEY_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const pad = (value, width) => String(value).padStart(width, '0');

// Staff who can own an intervention. Deactivated accounts are excluded -
// attributing a cancellation to somebody who cannot sign in makes the audit
// trail useless, which is the one thing an audit trail cannot be.
const orderDeskStaff = adminUsers.filter((user) => user.status === 'active');

// ---------------------------------------------------------------------------
// The console row - ADM-048
// ---------------------------------------------------------------------------

// The order statuses that mean somebody at Elanzia has to do something. Used
// for the console's intervention count and its default sort emphasis.
export const INTERVENTION_STATUSES = ['payment_failed', 'disputed', 'returned'];

// Statuses past which an order can no longer be cancelled. Once goods are with
// a courier, cancelling is a return, and calling it a cancellation loses the
// fact that a parcel is in transit.
export const UNCANCELLABLE_STATUSES = ['dispatched', 'delivered', 'returned', 'refunded', 'cancelled'];

/**
 * The order as a console row: core's order joined to the names and counts a
 * queue has to show, and nothing else. Every money figure is read straight off
 * core rather than recomputed, so this projection cannot restate a price.
 */
export function toOrderRow(order) {
  const jeweller = jewellerById[order.jewellerId];
  const settlementLines = settlementLinesByOrderId[order.id] ?? [];
  const invoices = einvoicesByOrderId[order.id] ?? [];
  const manufacturerNames = [...new Set(order.lines.map((line) => line.manufacturerId))].map(
    (id) => manufacturerById[id].businessName,
  );

  return {
    id: order.id,
    status: order.status,
    placedAt: order.placedAt,
    confirmedAt: order.confirmedAt,
    dispatchedAt: order.dispatchedAt,
    deliveredAt: order.deliveredAt,

    jewellerId: order.jewellerId,
    jewellerName: jeweller.businessName,
    jewellerCity: jeweller.city,
    shippingCity: order.shippingCity,

    // A queue cannot show three manufacturer names in one cell, so it shows the
    // first and how many more. The full list is on the detail screen.
    manufacturerIds: [...new Set(order.lines.map((line) => line.manufacturerId))],
    manufacturerName: manufacturerNames[0],
    manufacturerCount: manufacturerNames.length,
    manufacturerNames,

    lineCount: order.lines.length,
    totalNetWeight: order.totalNetWeight,
    goodsValue: order.goodsValue,
    shipping: order.shipping,
    insurance: order.insurance,
    total: order.total,
    commission: order.commission,
    commissionPercent: order.commissionPercent,

    paymentStatus: order.payment.status,
    paymentMethod: order.payment.method,
    paymentReference: order.payment.reference,
    settlementStatus: order.settlement.status,
    manufacturerPayout: order.settlement.manufacturerPayout,

    // One invoice per supplier, so an order is only fully invoiced when every
    // one of them has registered. Anything else is "partly", and the console
    // says so rather than showing a green tick over a missing document.
    invoiceCount: invoices.length,
    invoicesRegistered: invoices.filter((row) => row.status === 'generated').length,
    invoiceState:
      invoices.length === 0
        ? 'none'
        : invoices.every((row) => row.status === 'generated')
          ? 'registered'
          : invoices.some((row) => row.status === 'failed')
            ? 'failed'
            : 'partial',

    settlementLineCount: settlementLines.length,
    payoutsFailed: settlementLines.filter((line) =>
      (payoutAttemptsByLineId[line.id] ?? []).slice(-1)[0]?.status === 'failed',
    ).length,

    returnStatus: order.return?.refundStatus ?? null,
    disputeReason: order.disputeReason,
    cancellationReason: order.cancellationReason,
    awb: order.awb,
    ageDays: Math.max(0, Math.floor((NOW_MS - Date.parse(order.placedAt)) / DAY_MS)),
    needsIntervention:
      INTERVENTION_STATUSES.includes(order.status) || order.payment.status === 'failed',
  };
}

export const orderRows = orders.map(toOrderRow);

export const orderRowById = Object.fromEntries(orderRows.map((row) => [row.id, row]));

// ---------------------------------------------------------------------------
// The timeline - ADM-049
// ---------------------------------------------------------------------------

// What happened to an order, in one list, assembled from the records that each
// hold a piece of it. A reviewer asking "why is this order stuck" should not
// have to read four tables and hold the ordering in their head.
export function timelineFor(orderId) {
  const order = orders.find((row) => row.id === orderId);
  if (!order) return [];

  const events = [
    { at: order.placedAt, kind: 'placed', summary: 'Order placed by the jeweller' },
  ];

  if (order.payment.capturedAt) {
    events.push({
      at: order.payment.capturedAt,
      kind: 'payment_captured',
      summary: `Payment captured by ${order.payment.method}`,
      reference: order.payment.reference,
      amount: order.total,
    });
  }
  if (order.payment.status === 'failed') {
    events.push({
      at: order.placedAt,
      kind: 'payment_failed',
      summary: order.payment.failureReason ?? 'Payment could not be captured',
      reference: order.payment.reference,
      amount: order.total,
    });
  }
  if (order.confirmedAt) {
    events.push({ at: order.confirmedAt, kind: 'confirmed', summary: 'Order confirmed, price fixed' });
  }

  (einvoicesByOrderId[orderId] ?? []).forEach((invoice) => {
    events.push({
      at: invoice.generatedAt ?? invoice.attemptedAt ?? order.confirmedAt,
      kind: invoice.status === 'generated' ? 'invoice_registered' : 'invoice_failed',
      summary:
        invoice.status === 'generated'
          ? `Tax invoice ${invoice.documentNumber} registered for ${invoice.manufacturerName}`
          : `IRN rejected for ${invoice.manufacturerName}: ${invoice.failureReason ?? 'not yet attempted'}`,
      reference: invoice.irn,
      amount: invoice.invoiceValue,
    });
  });

  if (order.dispatchedAt) {
    events.push({
      at: order.dispatchedAt,
      kind: 'dispatched',
      summary: 'Consignment handed to the courier',
      reference: order.awb,
    });
  }
  if (order.deliveredAt) {
    events.push({ at: order.deliveredAt, kind: 'delivered', summary: 'Delivered to the jeweller' });
  }
  if (order.return) {
    events.push({
      at: order.return.raisedAt,
      kind: 'return_raised',
      summary: `Return raised: ${order.return.reason}`,
    });
    if (order.return.verifiedAt) {
      events.push({ at: order.return.verifiedAt, kind: 'return_verified', summary: 'Return verified on assay' });
    }
  }

  (settlementLinesByOrderId[orderId] ?? []).forEach((line) => {
    (payoutAttemptsByLineId[line.id] ?? []).forEach((attempt) => {
      if (attempt.status === 'queued') return;
      events.push({
        at: attempt.attemptedAt,
        kind: attempt.status === 'succeeded' ? 'payout_succeeded' : 'payout_failed',
        summary:
          attempt.status === 'succeeded'
            ? `Payout released to ${attempt.manufacturerName}`
            : `Payout to ${attempt.manufacturerName} returned: ${attempt.failureReason}`,
        reference: attempt.utr ?? attempt.nodalReference,
        amount: attempt.amount,
      });
    });
  });

  orderInterventions
    .filter((row) => row.orderId === orderId)
    .forEach((row) => {
      events.push({
        at: row.at,
        kind: `intervention_${row.kind}`,
        summary: row.summary,
        actorName: row.actorName,
        amount: row.amount,
      });
    });

  return events
    .filter((event) => Boolean(event.at))
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
    .map((event, index) => ({ id: `${orderId}-EVT-${pad(index + 1, 2)}`, orderId, ...event }));
}

// ---------------------------------------------------------------------------
// Interventions and adjustments - ADM-049
// ---------------------------------------------------------------------------

export const CANCELLATION_REASONS = [
  'jeweller_withdrew',
  'manufacturer_cannot_supply',
  'payment_never_cleared',
  'duplicate_order',
  'suspected_fraud',
];

// What an adjustment is allowed to be. There is deliberately no kind that
// touches goods value: the price a jeweller agreed is not Elanzia's to edit
// after the fact, so money is put back beside the order instead of taken out
// of it. The mock API refuses anything else.
export const ADJUSTMENT_KINDS = ['goodwill_credit', 'shipping_waiver', 'insurance_waiver'];

export const ESCALATION_QUEUES = ['finance', 'logistics', 'catalogue', 'founder'];

const ADJUSTMENT_REASONS = [
  'Delivery ran four days past the promise and the counter lost the sale window.',
  'Parcel arrived with the hallmark certificate missing and had to be re-couriered.',
  'Jeweller was charged insurance twice on a single consignment.',
  'Goodwill on a first order after a poor delivery experience.',
  'Courier damaged the packaging and the pieces needed re-polishing.',
];

const ESCALATION_NOTES = [
  'Manufacturer unreachable for six days; jeweller threatening to cancel.',
  'Payment captured but the aggregator webhook never arrived.',
  'Assay dispute on net weight; needs a finance view before the refund.',
  'Consignment held at the checkpost on an expired e-way bill.',
];

// Interventions are seeded onto the orders that plausibly attracted one: the
// ones that failed, came back, were disputed, or ran late. An order that went
// through cleanly has an empty intervention list, and that emptiness is
// information.
const interventionCandidates = orders.filter(
  (order) =>
    INTERVENTION_STATUSES.includes(order.status) ||
    order.status === 'cancelled' ||
    order.status === 'refunded' ||
    (order.deliveredAt && Date.parse(order.deliveredAt) - Date.parse(order.placedAt) > 12 * DAY_MS),
);

export const orderInterventions = interventionCandidates.flatMap((order, index) => {
  const actor = orderDeskStaff[index % orderDeskStaff.length];
  const rows = [];

  if (order.status === 'cancelled') {
    rows.push({
      kind: 'cancel',
      summary: `Order cancelled: ${(order.cancellationReason ?? 'reason not recorded').toLowerCase()}`,
      reason: CANCELLATION_REASONS[index % CANCELLATION_REASONS.length],
      amount: null,
      hoursAgo: 30 + index * 11,
    });
  }

  // Every second candidate carries a goodwill or waiver adjustment. A waiver can
  // only ever reach as far as the ancillary charge it waives, which is why the
  // amount is read off the order rather than invented.
  if (index % 2 === 0) {
    const kind = ADJUSTMENT_KINDS[index % ADJUSTMENT_KINDS.length];
    const amount =
      kind === 'shipping_waiver'
        ? order.shipping
        : kind === 'insurance_waiver'
          ? order.insurance
          : 2500 + (index % 7) * 1500;
    rows.push({
      kind: 'adjustment',
      adjustmentKind: kind,
      summary: `${kind.replace(/_/g, ' ')} of ${amount} recorded against the order`,
      reason: ADJUSTMENT_REASONS[index % ADJUSTMENT_REASONS.length],
      amount,
      hoursAgo: 18 + index * 9,
    });
  }

  if (index % 3 === 1) {
    rows.push({
      kind: 'escalation',
      queue: ESCALATION_QUEUES[index % ESCALATION_QUEUES.length],
      severity: index % 4 === 1 ? 'high' : 'normal',
      summary: `Escalated to the ${ESCALATION_QUEUES[index % ESCALATION_QUEUES.length]} desk`,
      reason: ESCALATION_NOTES[index % ESCALATION_NOTES.length],
      amount: null,
      hoursAgo: 12 + index * 7,
    });
  }

  return rows.map((row, rowIndex) => ({
    id: `INT-${pad(index + 1, 3)}-${rowIndex + 1}`,
    orderId: order.id,
    actorId: actor.id,
    actorName: actor.name,
    at: isoHoursAgo(row.hoursAgo),
    ...row,
  }));
});

export const orderInterventionsByOrderId = orderInterventions.reduce((map, row) => {
  (map[row.orderId] ??= []).push(row);
  return map;
}, {});

// The adjustments on their own, because the detail screen totals them next to
// the permanent price to show what was put back without touching it.
export const orderAdjustments = orderInterventions.filter((row) => row.kind === 'adjustment');

/**
 * An order line with the price breakup it was committed at.
 *
 * The composition comes from the product, but the metal rate is taken from the
 * ORDER line. Today those two agree for all 117 lines, because the catalogue
 * prices in core were computed from exactly these rates - so the override reads
 * as a no-op. It is not decorative. The moment the rate feed moves, the product
 * carries the new number and the order must keep the old one, because a
 * confirmed order's price is permanent. Taking the rate from the line is what
 * stops a future rate move leaking into a price a jeweller already agreed to.
 */
export function lineBreakupFor(line) {
  const product = productById[line.productId];
  return { ...product.price, metalRatePerGram: line.metalRateAtConfirmation };
}
