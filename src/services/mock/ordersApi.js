// Mock API for the order console and order detail - ADM-048, ADM-049.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Order: { id, status: 'placed'|'confirmed'|'in_production'|'ready_to_dispatch'
//                      |'dispatched'|'delivered'|'returned'|'refunded'
//                      |'disputed'|'cancelled'|'payment_failed',
//          placedAt: ISO, confirmedAt: ISO|null, dispatchedAt: ISO|null,
//          deliveredAt: ISO|null,
//          jewellerId, jewellerName, jewellerCity, shippingCity,
//          manufacturerIds: Manufacturer.id[], manufacturerName,
//          manufacturerCount, manufacturerNames: string[],
//          lineCount, totalNetWeight, goodsValue, shipping, insurance, total,
//          commission, commissionPercent,
//          paymentStatus: 'captured'|'pending'|'failed'|'refunded',
//          paymentMethod: 'RTGS'|'NEFT'|'UPI'|'Net Banking',
//          paymentReference,
//          settlementStatus: 'not_due'|'pending'|'settled',
//          manufacturerPayout,
//          invoiceCount, invoicesRegistered,
//          invoiceState: 'none'|'partial'|'registered'|'failed',
//          settlementLineCount, payoutsFailed,
//          returnStatus: 'awaiting_verification'|'processed'|null,
//          disputeReason: string|null, cancellationReason: string|null,
//          awb: string|null, ageDays, needsIntervention: boolean,
//          ageBucket: 'today'|'week'|'fortnight'|'older',
//          valueBand: 'under_1l'|'1l_5l'|'5l_20l'|'above_20l' }
//   ageBucket and valueBand are server-side buckets so every client agrees
//   where the boundaries fall.
//
// OrderLine: { id, productId, manufacturerId, title, sku, purity, netWeight,
//              quantity, unitPrice, lineTotal, metalRateAtConfirmation,
//              breakup: PriceBreakup }
//   unitPrice is GST inclusive - it is the product's price.total.
//
// PriceBreakup: { purity, netWeight, grossWeight, metalRatePerGram, metalValue,
//                 wastagePercent, wastageValue, makingChargesPerGram,
//                 makingCharges, stoneValue, subtotal, gstPercent, gstValue,
//                 total }
//
// TimelineEvent: { id, orderId, at: ISO,
//                  kind: 'placed'|'payment_captured'|'payment_failed'
//                        |'confirmed'|'invoice_registered'|'invoice_failed'
//                        |'dispatched'|'delivered'|'return_raised'
//                        |'return_verified'|'payout_succeeded'|'payout_failed'
//                        |'intervention_cancel'|'intervention_adjustment'
//                        |'intervention_escalation',
//                  summary, reference: string|null, amount: number|null,
//                  actorName: string|null }
//
// Intervention: { id, orderId, kind: 'cancel'|'adjustment'|'escalation',
//                 actorId: AdminUser.id, actorName, at: ISO, summary, reason,
//                 amount: number|null,
//                 adjustmentKind?: 'goodwill_credit'|'shipping_waiver'
//                                  |'insurance_waiver',
//                 queue?: 'finance'|'logistics'|'catalogue'|'founder',
//                 severity?: 'normal'|'high' }
//
// SettlementLine: { id, orderId, jewellerId, manufacturerId, lineIds: string[],
//                   lineCount, netWeight, goodsValue, commission,
//                   commissionPercent, payout,
//                   status: 'not_due'|'pending'|'settled', dueAt: ISO|null,
//                   settledAt: ISO|null, nodalReference: string|null }

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import {
  einvoicesByOrderId,
  jewellerById,
  manufacturerById,
  orderById,
  payoutAttemptsByLineId,
  settlementLinesByOrderId,
} from '@/data/core';
import {
  ADJUSTMENT_KINDS,
  CANCELLATION_REASONS,
  ESCALATION_QUEUES,
  MONEY_NOW,
  UNCANCELLABLE_STATUSES,
  lineBreakupFor,
  orderInterventions,
  orderRows,
  timelineFor,
} from '@/data/ordersFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let orderRecords = orderRows.map((row) => ({ ...row }));
let interventionRecords = orderInterventions.map((row) => ({ ...row }));

const NOW_MS = Date.parse(MONEY_NOW);

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the mock's audit trail names a real person, and it goes
// away with the mock layer. Do not build a route for it.
let actingAdmin = { id: 'STF-001', name: 'Elanzia desk' };
export function setActingAdmin(admin) {
  actingAdmin = admin ?? actingAdmin;
}

function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

const nowIso = () => new Date().toISOString();

function ageBucketFor(row) {
  if (row.ageDays < 1) return 'today';
  if (row.ageDays <= 7) return 'week';
  if (row.ageDays <= 14) return 'fortnight';
  return 'older';
}

function valueBandFor(row) {
  if (row.total < 100000) return 'under_1l';
  if (row.total < 500000) return '1l_5l';
  if (row.total < 2000000) return '5l_20l';
  return 'above_20l';
}

function decorate(row) {
  return { ...row, ageBucket: ageBucketFor(row), valueBand: valueBandFor(row) };
}

// The values a filter dropdown offers, returned with the data rather than read
// from a fixture by the screen. A screen that imports a fixture to build its
// own dropdown has quietly bypassed the whole data layer.
function facetOf(rows, valueKey, labelKey) {
  const seen = new Map();
  rows.forEach((row) => {
    if (row[valueKey] && !seen.has(row[valueKey])) seen.set(row[valueKey], row[labelKey]);
  });
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label: label ?? value }))
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
}

// manufacturerIds is an array on the row, so the generic equality filter cannot
// answer "orders this manufacturer is on". Handled before the generic path.
function applyManufacturerFilter(rows, manufacturerId) {
  if (!manufacturerId) return rows;
  return rows.filter((row) => row.manufacturerIds.includes(manufacturerId));
}

// BACKEND CONTRACT
// GET /admin/orders
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, paymentStatus, settlementStatus, jewellerId,
//                     manufacturerId, valueBand, ageBucket } }
// Returns: { items: Order[], total, page, pageSize }
// Notes: sorted by placedAt descending by default - an order desk reads newest
//        first, and the ones needing intervention are found by filter rather
//        than by a special sort, so the ordering stays predictable.
//        search matches the order id, the jeweller name and the AWB.
//        manufacturerId matches any manufacturer ON the order, not just the
//        first - most orders in this marketplace have two or three, and a
//        manufacturer asking "show me my orders" means all of them.
export function listOrders(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;
  const { manufacturerId, ...rest } = filters;

  return mockRequest(() => {
    let rows = applySearch(orderRecords.map(decorate), search, ['id', 'jewellerName', 'awb']);
    rows = applyManufacturerFilter(rows, manufacturerId);
    rows = applyFilters(rows, rest);
    rows = applySort(rows, sortBy ?? 'placedAt', sortBy ? sortDir : 'desc');
    return paginate(rows, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/orders/summary
// Query: { filters: { status, paymentStatus, settlementStatus, jewellerId,
//                     manufacturerId, valueBand, ageBucket } }
// Returns: { orderCount, gmv, awaitingPayment, awaitingSettlement,
//            needsIntervention, averageOrderValue, byStatus: {...},
//            facets: { jewellers: Option[], manufacturers: Option[] } }
//   Option: { value, label }
// Notes: the SAME filters the list endpoint takes are applied here, so the
//        tiles and the table can never describe two different populations.
//        gmv counts CONFIRMED orders only, valued at the price fixed at
//        confirmation. A placed-but-unconfirmed order is not revenue, and a
//        past order's contribution never restates however far the metal rate
//        moves afterwards.
//        facets are built from every order, not the filtered set, so narrowing
//        to one jeweller does not empty the dropdown that got you there.
export function getOrderSummary({ filters = {} } = {}) {
  const { manufacturerId, ...rest } = filters;

  return mockRequest(() => {
    let rows = applyManufacturerFilter(orderRecords.map(decorate), manufacturerId);
    rows = applyFilters(rows, rest);

    const confirmed = rows.filter((row) => Boolean(row.confirmedAt));
    const gmv = confirmed.reduce((sum, row) => sum + row.total, 0);

    return {
      orderCount: rows.length,
      gmv,
      averageOrderValue: confirmed.length === 0 ? 0 : Math.round(gmv / confirmed.length),
      awaitingPayment: rows.filter((row) => row.paymentStatus !== 'captured').length,
      awaitingSettlement: rows.filter((row) => row.settlementStatus === 'pending').length,
      needsIntervention: rows.filter((row) => row.needsIntervention).length,
      byStatus: rows.reduce((counts, row) => {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
        return counts;
      }, {}),
      facets: {
        jewellers: facetOf(orderRecords, 'jewellerId', 'jewellerName'),
        manufacturers: facetOf(
          orderRecords.flatMap((row) =>
            row.manufacturerIds.map((id) => ({ id, name: manufacturerById[id].businessName })),
          ),
          'id',
          'name',
        ),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/orders/:orderId
// Returns: { order: Order, lines: OrderLine[], settlementLines: SettlementLine[],
//            timeline: TimelineEvent[], interventions: Intervention[],
//            invoices: Einvoice[], payouts: PayoutAttempt[],
//            adjustmentTotal: number,
//            jeweller: { id, businessName, contactName, city, state, gstin,
//                        phone, email, creditLimit, creditUsed,
//                        paymentTermsDays },
//            manufacturers: [{ id, businessName, city, state, gstin,
//                              commissionPercent }] }
// Errors: 404 order_not_found
// Notes: every line carries the price breakup it was COMMITTED at, taken from
//        the order's own metalRateAtConfirmation rather than from today's rate.
//        This is the screen that has to be able to answer "what did the
//        jeweller actually agree to", months later, after the market has moved.
//        adjustmentTotal is what has been put back BESIDE the order - goodwill
//        credits and waived ancillary charges. It is reported separately and is
//        never netted off goodsValue, because the price is permanent.
//        timeline is ascending; interventions are descending, newest first.
export function getOrder(orderId) {
  const source = orderById[orderId];
  const row = orderRecords.find((record) => record.id === orderId);
  if (!source || !row) return mockError('order_not_found', 'That order no longer exists', 404);

  return mockRequest(() => {
    const jeweller = jewellerById[source.jewellerId];
    const settlementLines = settlementLinesByOrderId[orderId] ?? [];
    const interventions = interventionRecords
      .filter((record) => record.orderId === orderId)
      .sort((left, right) => Date.parse(right.at) - Date.parse(left.at));

    return {
      order: decorate(row),
      lines: source.lines.map((line) => ({ ...line, breakup: lineBreakupFor(line) })),
      settlementLines,
      timeline: timelineFor(orderId),
      interventions,
      invoices: einvoicesByOrderId[orderId] ?? [],
      payouts: settlementLines.flatMap((line) => payoutAttemptsByLineId[line.id] ?? []),
      adjustmentTotal: interventions
        .filter((record) => record.kind === 'adjustment')
        .reduce((sum, record) => sum + (record.amount ?? 0), 0),
      jeweller: {
        id: jeweller.id,
        businessName: jeweller.businessName,
        contactName: jeweller.contactName,
        city: jeweller.city,
        state: jeweller.state,
        gstin: jeweller.gstin,
        phone: jeweller.phone,
        email: jeweller.email,
        creditLimit: jeweller.creditLimit,
        creditUsed: jeweller.creditUsed,
        paymentTermsDays: jeweller.paymentTermsDays,
      },
      manufacturers: row.manufacturerIds.map((id) => {
        const manufacturer = manufacturerById[id];
        return {
          id: manufacturer.id,
          businessName: manufacturer.businessName,
          city: manufacturer.city,
          state: manufacturer.state,
          gstin: manufacturer.gstin,
          commissionPercent: manufacturer.commissionPercent,
        };
      }),
    };
  });
}

// BACKEND CONTRACT
// POST /admin/orders/:orderId/cancel
// Body: { reason: 'jeweller_withdrew'|'manufacturer_cannot_supply'
//                 |'payment_never_cleared'|'duplicate_order'|'suspected_fraud',
//         note: string }
// Returns: { order: Order, intervention: Intervention }
// Errors: 404 order_not_found, 422 cancel_reason_required,
//         409 order_already_dispatched, 409 order_already_closed
// Notes: cancellation stops at dispatch. Once a consignment is with a courier
//        the remedy is a return, not a cancellation, and recording it as a
//        cancellation loses the fact that a parcel is in transit and insured.
//        Cancelling does NOT issue the refund. It marks the order, and the
//        money comes back through POST /admin/payments/refunds, which will not
//        release it before the goods are verified.
export function cancelOrder({ orderId, reason, note = '' } = {}) {
  const row = orderRecords.find((record) => record.id === orderId);
  if (!row) return mockError('order_not_found', 'That order no longer exists', 404);
  if (!reason) return mockError('cancel_reason_required', 'Choose why this order is being cancelled', 422);
  if (row.status === 'dispatched' || row.status === 'delivered') {
    return mockError(
      'order_already_dispatched',
      'This consignment has already left the workshop. Raise a return instead.',
      409,
    );
  }
  if (UNCANCELLABLE_STATUSES.includes(row.status)) {
    return mockError('order_already_closed', 'That order is already closed', 409);
  }

  return mockRequest(() => {
    const at = nowIso();
    const intervention = {
      id: `INT-${orderId.slice(4)}-C${interventionRecords.length + 1}`,
      orderId,
      kind: 'cancel',
      actorId: actingAdmin.id,
      actorName: actingAdmin.name,
      at,
      summary: `Order cancelled: ${reason.replace(/_/g, ' ')}`,
      reason,
      note: note.trim() || null,
      amount: null,
    };

    const updated = { ...row, status: 'cancelled', cancellationReason: reason, needsIntervention: false };
    orderRecords = orderRecords.map((record) => (record.id === orderId ? updated : record));
    interventionRecords = [...interventionRecords, intervention];

    return { order: decorate(updated), intervention };
  });
}

// BACKEND CONTRACT
// POST /admin/orders/:orderId/adjustments
// Body: { kind: 'goodwill_credit'|'shipping_waiver'|'insurance_waiver',
//         amount: number, reason: string, note: string }
// Returns: { order: Order, intervention: Intervention, adjustmentTotal }
// Errors: 404 order_not_found, 422 adjustment_reason_required,
//         422 adjustment_amount_invalid, 409 order_price_permanent,
//         409 adjustment_exceeds_ancillary, 409 order_not_confirmed
// Notes: THE RULE THIS ENDPOINT EXISTS TO ENFORCE. A confirmed order's price is
//        permanent. There is no adjustment kind that reaches the goods value,
//        the line prices or the metal rate, and asking for one is refused with
//        order_price_permanent rather than quietly ignored. Money is put back
//        BESIDE the order and reported separately.
//        A waiver cannot exceed the ancillary charge it waives: you cannot
//        refund more delivery than was charged, and an amount above it is a
//        typo, not a decision.
//        A goodwill credit is issued as a credit note, so it appears on the
//        jeweller's account rather than reversing the original capture.
export function recordAdjustment({ orderId, kind, amount, reason, note = '' } = {}) {
  const row = orderRecords.find((record) => record.id === orderId);
  if (!row) return mockError('order_not_found', 'That order no longer exists', 404);

  if (!ADJUSTMENT_KINDS.includes(kind)) {
    return mockError(
      'order_price_permanent',
      'A confirmed order\'s price is permanent. Record a goodwill credit or waive an ancillary charge instead.',
      409,
    );
  }
  if (!reason || reason.trim().length === 0) {
    return mockError('adjustment_reason_required', 'Say why this adjustment is being made', 422);
  }
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return mockError('adjustment_amount_invalid', 'Enter an amount greater than zero', 422);
  }
  if (!row.confirmedAt) {
    return mockError('order_not_confirmed', 'Nothing has been charged on this order yet', 409);
  }

  const ceiling = kind === 'shipping_waiver' ? row.shipping : kind === 'insurance_waiver' ? row.insurance : null;
  if (ceiling !== null && value > ceiling) {
    return mockError(
      'adjustment_exceeds_ancillary',
      `Only ${ceiling} was charged for that. A waiver cannot exceed it.`,
      409,
    );
  }

  return mockRequest(() => {
    const intervention = {
      id: `INT-${orderId.slice(4)}-A${interventionRecords.length + 1}`,
      orderId,
      kind: 'adjustment',
      adjustmentKind: kind,
      actorId: actingAdmin.id,
      actorName: actingAdmin.name,
      at: nowIso(),
      summary: `${kind.replace(/_/g, ' ')} of ${value} recorded against the order`,
      reason: reason.trim(),
      note: note.trim() || null,
      amount: value,
    };
    interventionRecords = [...interventionRecords, intervention];

    return {
      order: decorate(row),
      intervention,
      adjustmentTotal: interventionRecords
        .filter((record) => record.orderId === orderId && record.kind === 'adjustment')
        .reduce((sum, record) => sum + (record.amount ?? 0), 0),
    };
  });
}

// BACKEND CONTRACT
// POST /admin/orders/:orderId/escalate
// Body: { queue: 'finance'|'logistics'|'catalogue'|'founder',
//         severity: 'normal'|'high', note: string }
// Returns: { order: Order, intervention: Intervention }
// Errors: 404 order_not_found, 422 escalation_queue_required,
//         422 escalation_note_required
// Notes: the note is mandatory. An escalation with no note is a queue entry the
//        receiving desk has to reconstruct from the order, which is the work
//        the escalation was supposed to save them.
export function escalateOrder({ orderId, queue, severity = 'normal', note = '' } = {}) {
  const row = orderRecords.find((record) => record.id === orderId);
  if (!row) return mockError('order_not_found', 'That order no longer exists', 404);
  if (!ESCALATION_QUEUES.includes(queue)) {
    return mockError('escalation_queue_required', 'Choose which desk this goes to', 422);
  }
  if (note.trim().length === 0) {
    return mockError('escalation_note_required', 'Say what the receiving desk needs to do', 422);
  }

  return mockRequest(() => {
    const intervention = {
      id: `INT-${orderId.slice(4)}-E${interventionRecords.length + 1}`,
      orderId,
      kind: 'escalation',
      queue,
      severity,
      actorId: actingAdmin.id,
      actorName: actingAdmin.name,
      at: nowIso(),
      summary: `Escalated to the ${queue} desk`,
      reason: note.trim(),
      note: note.trim(),
      amount: null,
    };

    const updated = { ...row, needsIntervention: true };
    orderRecords = orderRecords.map((record) => (record.id === orderId ? updated : record));
    interventionRecords = [...interventionRecords, intervention];

    return { order: decorate(updated), intervention };
  });
}

// BACKEND CONTRACT
// GET /admin/orders/export
// Query: same filters as GET /admin/orders
// Returns: { fileName, rowCount, generatedAt: ISO }
// Notes: exports the FILTERED set, not the page. Exporting twenty rows when the
//        filter matched four hundred is the export bug every admin portal ships
//        at least once.
export function exportOrders(query = {}) {
  const { search, filters = {} } = query;
  const { manufacturerId, ...rest } = filters;

  return mockRequest(() => {
    let rows = applySearch(orderRecords.map(decorate), search, ['id', 'jewellerName', 'awb']);
    rows = applyManufacturerFilter(rows, manufacturerId);
    rows = applyFilters(rows, rest);

    return {
      fileName: `elanzia-orders-${new Date(NOW_MS).toISOString().slice(0, 10)}.csv`,
      rowCount: rows.length,
      generatedAt: nowIso(),
    };
  });
}

// Re-exported so a screen can build its filter options without importing a
// fixture. These are platform vocabulary, not data.
export { ADJUSTMENT_KINDS, CANCELLATION_REASONS, ESCALATION_QUEUES };
