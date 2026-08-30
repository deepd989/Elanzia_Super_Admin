// Feature fixtures for payments, settlements and revenue configuration -
// ADM-050, ADM-051, ADM-052, ADM-054 to ADM-058, ADM-062.
//
// Everything here references src/data/core by id. No order, jeweller,
// manufacturer, settlement line or payout attempt is invented in this file.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so the consoles show the same numbers on every reload.
//
// THE ACCOUNT THE MONEY IS IN
//
// Elanzia never holds the trade's money. A jeweller pays into the payment
// aggregator's nodal account; the aggregator credits that account net of its
// own fee; and the money splits from there to each manufacturer net of
// Elanzia's commission. Elanzia's own revenue - commission, membership fees -
// only reaches its current account when it is swept out of the nodal balance.
// Every balance in this file is a nodal balance unless it says otherwise, and
// that distinction is regulatory rather than cosmetic.

import {
  adminUsers,
  jewellerById,
  manufacturerById,
  manufacturers,
  orderById,
  orders,
  settlementLines,
  settlementLinesByManufacturerId,
} from '@/data/core';

export const PAYMENTS_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(PAYMENTS_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const isoDaysAgo = (days) => isoHoursAgo(days * 24);
const pad = (value, width) => String(value).padStart(width, '0');
const pick = (list, index) => list[((index % list.length) + list.length) % list.length];

// Whoever can own a reconciliation exception or release a run. Deactivated
// accounts are excluded: assigning money work to somebody who cannot sign in is
// how a queue silently stops moving.
const financeStaff = adminUsers.filter((user) => user.status === 'active');

// ---------------------------------------------------------------------------
// Which rail an order arrived on - ADM-050, ADM-052
// ---------------------------------------------------------------------------

// At these ticket sizes the trade pays by bank transfer. UPI and net banking go
// through the aggregator and reconcile themselves; RTGS and NEFT land in the
// bank account as a line on a statement with a UTR and a narration, and somebody
// has to tie each one to an order by hand. That is the whole reason ADM-052
// exists, and it is why this split drives both screens.
export const GATEWAY_METHODS = ['UPI', 'Net Banking'];
export const BANK_METHODS = ['RTGS', 'NEFT'];

const capturedOrders = orders.filter((order) => order.payment.status === 'captured');
const gatewayOrders = capturedOrders.filter((order) => GATEWAY_METHODS.includes(order.payment.method));
const bankOrders = capturedOrders.filter((order) => BANK_METHODS.includes(order.payment.method));

// The aggregator's cut. Card and net banking carry a percentage; UPI is free by
// mandate, which is exactly why the fee column is not a single rate.
const TDR_PERCENT = { 'Net Banking': 0.9, UPI: 0 };
const FEE_GST_PERCENT = 18;

function feeFor(order) {
  const rate = TDR_PERCENT[order.payment.method] ?? 0;
  const fee = Math.round((order.total * rate) / 100);
  const gstOnFee = Math.round((fee * FEE_GST_PERCENT) / 100);
  return { fee, gstOnFee, net: order.total - fee - gstOnFee };
}

// ---------------------------------------------------------------------------
// Gateway settlement batches - ADM-050
// ---------------------------------------------------------------------------

// The aggregator does not credit each capture separately. It sweeps a day's
// captures into one credit to the nodal account on T+1, net of its fee, and
// hands over a settlement report. Reconciliation is the act of proving that
// report against what the platform thinks it captured.
export const gatewayTransactions = gatewayOrders.map((order, index) => {
  const { fee, gstOnFee, net } = feeFor(order);
  const capturedAt = order.payment.capturedAt ?? order.placedAt;

  return {
    id: `GTX-${pad(index + 1, 4)}`,
    orderId: order.id,
    jewellerId: order.jewellerId,
    jewellerName: jewellerById[order.jewellerId].businessName,
    method: order.payment.method,
    gatewayReference: order.payment.reference,
    capturedAt,
    // The batch this capture was swept into: the day after it cleared.
    settledOn: new Date(Date.parse(capturedAt) + DAY_MS).toISOString().slice(0, 10),
    grossAmount: order.total,
    fee,
    gstOnFee,
    netAmount: net,
  };
});

const transactionsByDate = gatewayTransactions.reduce((map, transaction) => {
  (map[transaction.settledOn] ??= []).push(transaction);
  return map;
}, {});

export const gatewayBatches = Object.entries(transactionsByDate)
  .sort(([left], [right]) => right.localeCompare(left))
  .map(([settledOn, transactions], index) => {
    const grossAmount = transactions.reduce((sum, row) => sum + row.grossAmount, 0);
    const fee = transactions.reduce((sum, row) => sum + row.fee, 0);
    const gstOnFee = transactions.reduce((sum, row) => sum + row.gstOnFee, 0);

    // Roughly one batch in six does not tie out on the first pass. That is not
    // pessimism about the aggregator; it is what a reconciliation console is
    // for, and a fixture where everything matches makes the screen look like a
    // report rather than a tool.
    const clean = index % 6 !== 2;
    const unmatchedCount = clean ? 0 : 1 + (index % 2);

    return {
      id: `BAT-${pad(index + 1, 4)}`,
      settledOn,
      creditedAt: `${settledOn}T11:30:00.000Z`,
      utr: `AGG${pad(index + 1, 6)}${settledOn.replace(/-/g, '').slice(4)}`,
      transactionCount: transactions.length,
      grossAmount,
      fee,
      gstOnFee,
      // What actually landed in the nodal account.
      netCredited: grossAmount - fee - gstOnFee,
      matchedCount: transactions.length - unmatchedCount,
      unmatchedCount,
      status: unmatchedCount === 0 ? 'reconciled' : 'part_matched',
      reconciledAt: unmatchedCount === 0 ? `${settledOn}T13:00:00.000Z` : null,
      reconciledBy: unmatchedCount === 0 ? pick(financeStaff, index).id : null,
    };
  });

export const gatewayBatchById = Object.fromEntries(gatewayBatches.map((row) => [row.id, row]));

// Stamp each transaction with the batch that carried it, and mark the ones the
// batch could not tie out.
const unmatchedTransactionIds = new Set(
  gatewayBatches.flatMap((batch) =>
    (transactionsByDate[batch.settledOn] ?? []).slice(0, batch.unmatchedCount).map((row) => row.id),
  ),
);

gatewayTransactions.forEach((transaction) => {
  const batch = gatewayBatches.find((row) => row.settledOn === transaction.settledOn);
  transaction.batchId = batch?.id ?? null;
  transaction.matchStatus = unmatchedTransactionIds.has(transaction.id) ? 'mismatched' : 'matched';
});

// ---------------------------------------------------------------------------
// Manual bank receipts - ADM-052
// ---------------------------------------------------------------------------

export const BANK_ACCOUNTS = [
  { id: 'NODAL-01', label: 'Nodal collection account', bank: 'HDFC Bank', last4: '4417', ifsc: 'HDFC0000123' },
  { id: 'NODAL-02', label: 'Nodal collection account (south)', bank: 'ICICI Bank', last4: '9082', ifsc: 'ICIC0000456' },
];

// A bank transfer recorded by a person, against an order, from a statement line.
// `recordedBy` is on every row because this is the one place money enters the
// platform on somebody's say-so, and an unattributed manual entry is the shape
// every payments fraud takes.
export const manualPayments = bankOrders.map((order, index) => {
  const capturedAt = order.payment.capturedAt ?? order.placedAt;
  const staff = pick(financeStaff, index);

  return {
    id: `MAN-${pad(index + 1, 4)}`,
    orderId: order.id,
    jewellerId: order.jewellerId,
    jewellerName: jewellerById[order.jewellerId].businessName,
    method: order.payment.method,
    amount: order.total,
    utr: `${order.payment.method === 'RTGS' ? 'RTGS' : 'NEFT'}${pad(index + 1, 6)}${order.id.slice(4)}`,
    receivedAt: capturedAt,
    valueDate: capturedAt.slice(0, 10),
    bankAccountId: pick(BANK_ACCOUNTS, index).id,
    remitterName: jewellerById[order.jewellerId].businessName,
    narration: `NEFT CR ${jewellerById[order.jewellerId].businessName.toUpperCase().slice(0, 18)}`,
    recordedById: staff.id,
    recordedByName: staff.name,
    recordedAt: new Date(Date.parse(capturedAt) + 3 * HOUR_MS).toISOString(),
    note: null,
  };
});

// ---------------------------------------------------------------------------
// Reconciliation exceptions - ADM-051
// ---------------------------------------------------------------------------

export const EXCEPTION_KINDS = [
  'unmatched_receipt',
  'amount_mismatch',
  'duplicate_credit',
  'short_payment',
  'late_credit',
  'missing_capture',
];

// The narrations a bank statement actually carries. A jeweller's accountant
// puts the wrong reference on a transfer far more often than anybody expects,
// which is the single largest source of unmatched money on this desk.
const NARRATIONS = [
  'NEFT CR SHREE JEWELLERS TRADE ADVANCE',
  'RTGS CR PAYMENT AGAINST INVOICE',
  'NEFT CR PART PAYMENT ORDER',
  'RTGS CR ADVANCE FOR BRIDAL SET',
  'NEFT CR TRF FRM CURRENT AC',
];

const EXCEPTION_DETAIL = {
  unmatched_receipt: 'Credit landed in the nodal account with a narration that names no order.',
  amount_mismatch: 'Credit is short of the order total by the amount shown.',
  duplicate_credit: 'The same UTR was credited twice on consecutive days.',
  short_payment: 'Jeweller paid the goods value but not the delivery and insurance.',
  late_credit: 'Credit arrived after the aggregator batch it belonged to had closed.',
  missing_capture: 'The platform recorded a capture the aggregator never reported.',
};

// 45 rows: enough that the filters and pagination do real work, and every kind
// represented including the ones that resolve by writing money off.
export const paymentExceptions = Array.from({ length: 45 }).map((_, index) => {
  const kind = pick(EXCEPTION_KINDS, index);
  const order = pick(orders, index * 3 + 1);
  const jeweller = jewellerById[order.jewellerId];

  // An unmatched receipt has no order by definition - that is what makes it
  // unmatched. Attaching one would be answering the question the queue exists
  // to ask.
  const orphan = kind === 'unmatched_receipt' || kind === 'duplicate_credit';
  const expected = order.total;
  const shortfall = kind === 'short_payment' ? order.shipping + order.insurance : 4000 + (index % 9) * 2500;
  const received =
    kind === 'amount_mismatch' || kind === 'short_payment' ? expected - shortfall : expected;

  const raisedAt = isoHoursAgo(3 + index * 7);
  const resolved = index % 5 === 4;
  const staff = pick(financeStaff, index);

  return {
    id: `EXC-${pad(index + 1, 4)}`,
    kind,
    detail: EXCEPTION_DETAIL[kind],
    // Severity is about money at risk, not about how annoying the row is.
    severity: received > 1000000 || kind === 'duplicate_credit' ? 'high' : index % 3 === 0 ? 'medium' : 'low',
    orderId: orphan ? null : order.id,
    jewellerId: orphan ? null : jeweller.id,
    jewellerName: orphan ? null : jeweller.businessName,
    remitterName: orphan ? pick(NARRATIONS, index).split(' CR ')[1] ?? 'Unknown remitter' : jeweller.businessName,
    narration: pick(NARRATIONS, index),
    utr: `UTR${pad(index + 1, 8)}`,
    bankAccountId: pick(BANK_ACCOUNTS, index).id,
    expectedAmount: orphan ? null : expected,
    receivedAmount: received,
    varianceAmount: orphan ? received : received - expected,
    valueDate: raisedAt.slice(0, 10),
    raisedAt,
    ageHours: Math.max(0, Math.round((NOW_MS - Date.parse(raisedAt)) / HOUR_MS)),
    status: resolved ? 'resolved' : 'open',
    resolution: resolved ? pick(['matched_to_order', 'refunded_to_remitter', 'written_off'], index) : null,
    resolvedAt: resolved ? isoHoursAgo(1 + index * 3) : null,
    resolvedById: resolved ? staff.id : null,
    resolvedByName: resolved ? staff.name : null,
    resolutionNote: resolved ? 'Traced to the jeweller from the remitter account number.' : null,
  };
});

// ---------------------------------------------------------------------------
// Settlement runs - ADM-054, ADM-055
// ---------------------------------------------------------------------------

// A run is one manufacturer's due settlement lines, batched for release on one
// day. Batching by manufacturer rather than by order is what makes a single
// bank transfer possible: a manufacturer with four due orders gets one credit,
// not four, which is what they are expecting on their statement.
export const SETTLEMENT_RUN_STATUSES = ['draft', 'ready', 'released', 'part_failed', 'completed'];

const dueLines = settlementLines.filter((line) => line.status !== 'not_due');

const linesByManufacturer = dueLines.reduce((map, line) => {
  (map[line.manufacturerId] ??= []).push(line);
  return map;
}, {});

export const settlementRuns = Object.entries(linesByManufacturer)
  .flatMap(([manufacturerId, lines], index) => {
    const manufacturer = manufacturerById[manufacturerId];
    const settled = lines.filter((line) => line.status === 'settled');
    const pending = lines.filter((line) => line.status === 'pending');

    // Two runs per manufacturer at most: what has already gone out, and what is
    // waiting. Splitting them is what lets the desk release the waiting one
    // without touching history.
    const groups = [
      { lines: settled, state: 'completed' },
      { lines: pending, state: index % 4 === 1 ? 'ready' : index % 4 === 2 ? 'part_failed' : 'draft' },
    ].filter((group) => group.lines.length > 0);

    return groups.map((group, groupIndex) => {
      const payout = group.lines.reduce((sum, line) => sum + line.payout, 0);
      const commission = group.lines.reduce((sum, line) => sum + line.commission, 0);
      const goodsValue = group.lines.reduce((sum, line) => sum + line.goodsValue, 0);
      const released = group.state === 'completed';

      return {
        id: `RUN-${manufacturerId.slice(4)}-${groupIndex + 1}`,
        manufacturerId,
        manufacturerName: manufacturer.businessName,
        manufacturerCity: manufacturer.city,
        settlementLineIds: group.lines.map((line) => line.id),
        orderIds: [...new Set(group.lines.map((line) => line.orderId))],
        lineCount: group.lines.length,
        goodsValue,
        commission,
        // The commission never leaves with the payout. It is retained at the
        // nodal split and swept to Elanzia separately.
        payout,
        status: group.state,
        // The run falls due when the last of its lines does: releasing early
        // would pay for goods still inside their return window.
        dueAt: group.lines.reduce(
          (latest, line) => (!latest || (line.dueAt ?? '') > latest ? (line.dueAt ?? latest) : latest),
          null,
        ),
        releasedAt: released ? group.lines[0].settledAt : null,
        releasedById: released ? pick(financeStaff, index).id : null,
        releasedByName: released ? pick(financeStaff, index).name : null,
        nodalReference: group.lines[0].nodalReference,
        failedCount: group.state === 'part_failed' ? 1 + (index % 2) : 0,
        note: null,
      };
    });
  })
  .sort((left, right) => String(right.dueAt ?? '').localeCompare(String(left.dueAt ?? '')));

export const settlementRunById = Object.fromEntries(settlementRuns.map((row) => [row.id, row]));

// What is in the nodal account right now: everything captured that has not yet
// been paid out or swept. Derived rather than stated so it cannot drift from
// the runs it has to cover.
export const nodalPosition = {
  accountId: 'NODAL-01',
  balance: dueLines
    .filter((line) => line.status === 'pending')
    .reduce((sum, line) => sum + line.goodsValue, 0),
  dueToRelease: dueLines
    .filter((line) => line.status === 'pending')
    .reduce((sum, line) => sum + line.payout, 0),
  commissionRetained: dueLines
    .filter((line) => line.status === 'pending')
    .reduce((sum, line) => sum + line.commission, 0),
  asOf: PAYMENTS_NOW,
};

// ---------------------------------------------------------------------------
// Beneficiaries - ADM-056
// ---------------------------------------------------------------------------

const BANK_NAMES = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'];

// Where a manufacturer's payout is sent. Three carry details that no longer
// work, which is what the payout failure queue is mostly made of: money does
// not usually fail because of the money.
export const beneficiaries = manufacturers.map((manufacturer, index) => {
  const stale = index % 8 === 3;

  return {
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    accountHolder: manufacturer.legalName ?? manufacturer.businessName,
    accountNumberLast4: pad((index * 7919) % 10000, 4),
    ifsc: stale ? `OBCX000${pad(index, 4)}` : `${pick(['HDFC', 'ICIC', 'SBIN', 'UTIB', 'KKBK'], index)}0${pad(index * 13, 6)}`,
    bankName: stale ? 'Oriental Bank of Commerce (merged)' : pick(BANK_NAMES, index),
    // A merged bank's IFSC stops resolving. The manufacturer has not done
    // anything wrong and often does not know, which is why the failure queue
    // pairs the retry with a way to correct this rather than only a retry.
    verified: !stale,
    verifiedAt: stale ? null : isoDaysAgo(40 + index * 3),
    updatedAt: isoDaysAgo(10 + index * 5),
  };
});

export const beneficiaryByManufacturerId = Object.fromEntries(
  beneficiaries.map((row) => [row.manufacturerId, row]),
);

// ---------------------------------------------------------------------------
// Refunds and credit notes - ADM-057
// ---------------------------------------------------------------------------

export const REFUND_REASONS = [
  'order_cancelled',
  'return_verified',
  'payment_duplicated',
  'short_shipment',
  'quality_rejected',
];

// A refund is money going back to the jeweller. It cannot be released before
// the goods have been verified, which is the rule that makes the awaiting rows
// below the normal state of this queue rather than a backlog.
export const refunds = orders
  .filter(
    (order) =>
      order.status === 'cancelled' ||
      order.status === 'refunded' ||
      order.status === 'returned' ||
      order.payment.status === 'failed',
  )
  .map((order, index) => {
    const verified = Boolean(order.return?.verifiedAt) || order.status === 'refunded';
    const cancelled = order.status === 'cancelled';

    return {
      id: `REF-${pad(index + 1, 4)}`,
      orderId: order.id,
      jewellerId: order.jewellerId,
      jewellerName: jewellerById[order.jewellerId].businessName,
      amount: order.total,
      reason: cancelled ? 'order_cancelled' : order.return ? 'return_verified' : 'payment_duplicated',
      // A cancellation before dispatch has no goods to verify, so it can be
      // paid straight back. Anything involving goods waits for the assay.
      status: cancelled ? 'processed' : verified ? 'processed' : 'awaiting_verification',
      raisedAt: order.return?.raisedAt ?? order.placedAt,
      verifiedAt: order.return?.verifiedAt ?? (cancelled ? order.placedAt : null),
      processedAt: cancelled || verified ? isoDaysAgo(2 + index * 3) : null,
      method: order.payment.method,
      utr: cancelled || verified ? `RFD${pad(index + 1, 6)}${order.id.slice(4)}` : null,
      note: null,
    };
  });

export const CREDIT_NOTE_REASONS = [
  'commission_reversal',
  'goodwill',
  'short_weight',
  'delivery_waiver',
  'plan_adjustment',
];

// A credit note is not a refund. It reduces what is owed rather than sending
// money back, and it is how Elanzia reverses its own commission when an order
// comes back, or puts something right without touching a settled price.
export const creditNotes = Array.from({ length: 32 }).map((_, index) => {
  const line = pick(settlementLines, index * 5 + 3);
  const order = orderById[line.orderId];
  const reason = pick(CREDIT_NOTE_REASONS, index);
  const againstManufacturer = reason === 'commission_reversal' || reason === 'short_weight';

  const amount =
    reason === 'commission_reversal'
      ? line.commission
      : reason === 'delivery_waiver'
        ? order.shipping
        : 3000 + (index % 11) * 2200;

  return {
    id: `CRN-${pad(index + 1, 4)}`,
    documentNumber: `EL/CN/2627/${pad(index + 1, 4)}`,
    orderId: line.orderId,
    settlementLineId: line.id,
    // A note against a manufacturer reduces the next payout; one against a
    // jeweller reduces the next invoice. Same document, opposite direction, and
    // getting it backwards moves money the wrong way.
    partyType: againstManufacturer ? 'manufacturer' : 'jeweller',
    partyId: againstManufacturer ? line.manufacturerId : line.jewellerId,
    partyName: againstManufacturer
      ? manufacturerById[line.manufacturerId].businessName
      : jewellerById[line.jewellerId].businessName,
    reason,
    amount,
    // GST follows the supply the note corrects, at the same rate.
    taxableValue: Math.round(amount / 1.03),
    gstValue: amount - Math.round(amount / 1.03),
    status: index % 6 === 5 ? 'draft' : index % 4 === 3 ? 'applied' : 'issued',
    issuedAt: isoDaysAgo(3 + index * 2),
    appliedAt: index % 4 === 3 ? isoDaysAgo(1 + index) : null,
    issuedById: pick(financeStaff, index).id,
    issuedByName: pick(financeStaff, index).name,
    note: null,
  };
});

// ---------------------------------------------------------------------------
// Commission configuration - ADM-058
// ---------------------------------------------------------------------------

// SETTLEMENT-SIDE commission: what Elanzia actually deducts at the nodal split.
// This is a different thing from the listing-side bands in ADM-039, which
// govern what a manufacturer may quote at. A rate here changes what is deducted
// from FUTURE settlements and never restates a confirmed order, because a
// confirmed order's price and its commission are both permanent.
export const COMMISSION_EFFECTIVE_NOTICE_DAYS = 30;

export const commissionConfig = {
  defaultPercent: 4,
  // Bridal and temple work ties up more of Elanzia's handling and insurance, so
  // it carries a higher take. The categories match the catalogue's own.
  categoryRules: [
    { category: 'Bridal Sets', percent: 5.5 },
    { category: 'Temple Jewellery', percent: 5.5 },
    { category: 'Necklaces', percent: 4.5 },
    { category: 'Bangles', percent: 4 },
    { category: 'Chains', percent: 3.25 },
    { category: 'Rings', percent: 4 },
    { category: 'Earrings', percent: 4.5 },
    { category: 'Pendants', percent: 4 },
    { category: 'Mangalsutra', percent: 4.25 },
    { category: 'Bracelets', percent: 4 },
    { category: 'Anklets', percent: 3.75 },
    { category: 'Nose Pins', percent: 4.5 },
  ],
  // Volume earns a discount on the platform take, applied to the month's
  // settled value. The slabs are cumulative from the floor, not marginal.
  volumeSlabs: [
    { fromValue: 0, discountPercent: 0 },
    { fromValue: 5000000, discountPercent: 0.25 },
    { fromValue: 20000000, discountPercent: 0.5 },
    { fromValue: 50000000, discountPercent: 0.75 },
  ],
  updatedAt: isoDaysAgo(46),
  updatedById: 'STF-002',
};

// Per-manufacturer negotiated rates. These are the numbers core already holds
// on the manufacturer record - read from there rather than restated, so the
// screen and the settlement split cannot disagree about what somebody pays.
export const commissionOverrides = manufacturers
  .filter((manufacturer) => manufacturer.status === 'approved')
  .map((manufacturer, index) => ({
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    percent: manufacturer.commissionPercent,
    reason: pick(
      [
        'Launch rate held for the first year of trading.',
        'Volume commitment of 2 crore a quarter.',
        'Negotiated at onboarding against a competing marketplace.',
        'Exclusive supply of temple work in the region.',
      ],
      index,
    ),
    effectiveFrom: manufacturer.approvedAt ?? isoDaysAgo(300),
    effectiveTo: null,
    settledValue: (settlementLinesByManufacturerId[manufacturer.id] ?? [])
      .filter((line) => line.status === 'settled')
      .reduce((sum, line) => sum + line.goodsValue, 0),
  }));

// What was actually deducted, order by order. This is the answer to "why was I
// charged that", and it is read-only for the same reason a ledger is.
export const commissionAudit = settlementLines
  .filter((line) => line.status !== 'not_due')
  .map((line, index) => ({
    id: `CMA-${pad(index + 1, 4)}`,
    settlementLineId: line.id,
    orderId: line.orderId,
    manufacturerId: line.manufacturerId,
    manufacturerName: manufacturerById[line.manufacturerId].businessName,
    goodsValue: line.goodsValue,
    appliedPercent: line.commissionPercent,
    commission: line.commission,
    // Which rule produced the rate. An audit row that cannot say where its
    // number came from is not an audit row.
    source: 'manufacturer_override',
    confirmedAt: orderById[line.orderId].confirmedAt,
    settledAt: line.settledAt,
  }));

// ---------------------------------------------------------------------------
// Membership plans - ADM-062
// ---------------------------------------------------------------------------

// Elanzia's second revenue line. Plans are billed to the member's own account
// and never touch the nodal balance, which is why they are configuration here
// rather than a settlement concern.
export const membershipPlans = [
  {
    id: 'PLN-starter',
    name: 'Starter',
    audience: 'jeweller',
    monthlyPrice: 0,
    annualPrice: 0,
    listingLimit: null,
    orderLimit: 15,
    commissionDiscountPercent: 0,
    features: ['Marketplace access', 'Standard support', 'Up to 15 orders a month'],
    status: 'live',
    updatedAt: isoDaysAgo(120),
  },
  {
    id: 'PLN-trade',
    name: 'Trade',
    audience: 'jeweller',
    monthlyPrice: 4999,
    annualPrice: 49990,
    listingLimit: null,
    orderLimit: null,
    commissionDiscountPercent: 0,
    features: ['Unlimited orders', 'Priority support', 'Credit terms up to 30 days', 'Sourcing desk access'],
    status: 'live',
    updatedAt: isoDaysAgo(58),
  },
  {
    id: 'PLN-atelier',
    name: 'Atelier',
    audience: 'manufacturer',
    monthlyPrice: 7999,
    annualPrice: 79990,
    listingLimit: 250,
    orderLimit: null,
    commissionDiscountPercent: 0.25,
    features: ['Up to 250 listings', 'Public microsite', 'Quarter point off commission'],
    status: 'live',
    updatedAt: isoDaysAgo(31),
  },
  {
    id: 'PLN-atelier-plus',
    name: 'Atelier Plus',
    audience: 'manufacturer',
    monthlyPrice: 14999,
    annualPrice: 149990,
    listingLimit: null,
    orderLimit: null,
    commissionDiscountPercent: 0.5,
    features: ['Unlimited listings', 'Featured placement', 'Half a point off commission', 'Named account manager'],
    // Priced and agreed but not yet on sale. A plan nobody can buy still has to
    // be configurable, or it goes live untested.
    status: 'draft',
    updatedAt: isoDaysAgo(6),
  },
];

export const membershipPlanById = Object.fromEntries(membershipPlans.map((row) => [row.id, row]));

const SUBSCRIPTION_STATUSES = ['active', 'active', 'active', 'past_due', 'cancelled', 'trialing'];

export const planSubscriptions = [
  ...manufacturers.map((manufacturer, index) => ({
    memberType: 'manufacturer',
    memberId: manufacturer.id,
    memberName: manufacturer.businessName,
    planId: index % 3 === 0 ? 'PLN-atelier' : 'PLN-starter',
    index,
  })),
  ...Object.values(jewellerById).map((jeweller, index) => ({
    memberType: 'jeweller',
    memberId: jeweller.id,
    memberName: jeweller.businessName,
    planId: index % 4 === 0 ? 'PLN-trade' : 'PLN-starter',
    index: index + 100,
  })),
].map((row, index) => {
  const plan = membershipPlanById[row.planId];
  const cycle = index % 3 === 0 ? 'annual' : 'monthly';
  const status = plan.monthlyPrice === 0 ? 'active' : pick(SUBSCRIPTION_STATUSES, index);

  return {
    id: `SUB-${pad(index + 1, 4)}`,
    memberType: row.memberType,
    memberId: row.memberId,
    memberName: row.memberName,
    planId: row.planId,
    planName: plan.name,
    cycle,
    // A free plan bills nothing, so it has no amount rather than an amount of
    // zero. The difference matters when this column is summed.
    amount: plan.monthlyPrice === 0 ? null : cycle === 'annual' ? plan.annualPrice : plan.monthlyPrice,
    status,
    startedAt: isoDaysAgo(30 + (index % 400)),
    renewsAt: new Date(NOW_MS + (5 + (index % 25)) * DAY_MS).toISOString(),
    cancelledAt: status === 'cancelled' ? isoDaysAgo(4 + (index % 20)) : null,
  };
});
