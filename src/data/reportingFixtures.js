// Feature fixtures for reporting, exports, privacy and platform settings -
// ADM-092 to ADM-099.
//
// This area aggregates rather than owns. Almost no number here is new: GMV,
// conversion, dispute rate and payout ageing already exist in Orders,
// Marketplace, Trust and Logistics, so this file reads them from where they
// already live rather than re-deriving them. A reporting fixture that invented
// its own enquiry count would make ADM-045 and ADM-093 disagree about the same
// August, which is the exact failure the layering exists to prevent - the same
// argument src/data/core/metalRates.js makes for the gold rate.
//
// Everything references src/data/core by id. No manufacturer, jeweller,
// product or order is invented here. Rows are derived by index maths off a
// fixed anchor rather than Math.random(), so a report run twice gives the same
// answer.

import {
  adminUsers,
  einvoices,
  jewellers,
  manufacturers,
  orders,
  payoutAttempts,
  products,
  roleById,
  settlementLines,
} from '@/data/core';
import { COMMISSION_GST_PERCENT } from '@/data/taxFixtures';
import { enquiries } from '@/data/marketplaceFixtures';
import { disputeById, disputes, resolutions } from '@/data/trustFixtures';
import { returns } from '@/data/logisticsFixtures';

export const REPORTING_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(REPORTING_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const pad = (value, width) => String(value).padStart(width, '0');
const pick = (list, index) => list[((index % list.length) + list.length) % list.length];
const isoDaysAgo = (days) => new Date(NOW_MS - days * DAY_MS).toISOString();
const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const monthOf = (iso) => (iso ? iso.slice(0, 7) : null);
const round1 = (value) => Math.round(value * 10) / 10;
const percentOf = (part, whole) => (whole === 0 ? 0 : round1((part / whole) * 100));

const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? round1((sorted[middle - 1] + sorted[middle]) / 2)
    : round1(sorted[middle]);
};

// ---------------------------------------------------------------------------
// Domain constants
// ---------------------------------------------------------------------------

// The DPDP Act gives a data fiduciary a fixed window to answer a data
// principal. Elanzia counts it from the day the request lands, not from the day
// identity is verified, because a fiduciary must not be able to extend its own
// statutory clock by being slow to ask for a document.
export const DPDP_RESPONSE_DAYS = 30;

// A finished export is a file of member data sitting on a bucket, so it lapses
// rather than living forever. Expired is a distinct state from failed because
// the fix differs: re-run it, versus find out what broke.
export const EXPORT_RETENTION_DAYS = 7;

// Seven years, matching how long settlement and tax records are kept. An audit
// trail that outlives less than the money it describes cannot answer for it.
export const AUDIT_RETENTION_MONTHS = 84;

// What a manufacturer must hold to keep the verified badge. Declared once here
// because the badge on a microsite, on a profile and in this report must mean
// the same thing, and a buyer who finds out they do not has been misled by the
// marketplace rather than by a manufacturer.
export const VERIFIED_BADGE_THRESHOLDS = {
  // Below this there is not enough trading to judge, so no badge either way.
  minimumOrders: 5,
  onTimeDispatchPercent: 75,
  rating: 4,
  // A ceiling, not a floor - above this the badge comes off. It counts only
  // disputes upheld against the manufacturer, not disputes raised.
  disputeRatePercent: 10,
  responseRatePercent: 70,
  // Response rate off two enquiries is a coin toss, not a track record, so it
  // is reported either way but only held against a manufacturer who has had
  // enough enquiries for the number to mean something.
  minimumEnquiriesToJudgeResponse: 5,
};

export const REPORT_PERIODS = [
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'last_12_months',
  'financial_ytd',
];

export const EXPORT_FORMATS = ['csv', 'xlsx'];

export const DATA_REQUEST_TYPES = ['access', 'correction', 'erasure', 'nomination', 'grievance'];

export const CONSENT_PURPOSES = [
  'marketing_email',
  'whatsapp_updates',
  'catalogue_analytics',
  'partner_sharing',
];

export const AUDIT_MODULES = [
  'access',
  'onboarding',
  'catalogue',
  'marketplace',
  'orders',
  'payments',
  'returns',
  'pricing',
  'communications',
  'platform',
];

// ---------------------------------------------------------------------------
// The month spine every series shares - ADM-092, ADM-093, ADM-094
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_COUNT = 12;

// Twelve months back from the anchor. The first confirmed order on the platform
// was in January 2026, so the earliest months are genuinely flat - that is a
// marketplace that had not opened yet, not a hole in the data, and the charts
// should say so rather than starting the axis where the story gets good.
const anchorDate = new Date(NOW_MS);

export const reportingMonths = Array.from({ length: MONTH_COUNT }).map((_, index) => {
  const offset = MONTH_COUNT - 1 - index;
  const date = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth() - offset, 1));
  return {
    month: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1, 2)}`,
    label: `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
  };
});

// GMV counts confirmed orders only, valued at the price fixed at confirmation.
// This is deliberately the same predicate and the same field ADM-010 uses: if
// the operations overview and the financial report disagree about August, one
// of them is lying and nobody can tell which.
const confirmedOrders = orders.filter((order) => Boolean(order.confirmedAt));

const confirmedInMonth = (month) =>
  confirmedOrders.filter((order) => monthOf(order.confirmedAt) === month);

// ---------------------------------------------------------------------------
// Marketplace series - ADM-092, ADM-093
// ---------------------------------------------------------------------------

export const marketplaceSeries = reportingMonths.map(({ month, label }) => {
  const confirmed = confirmedInMonth(month);
  const opened = enquiries.filter((enquiry) => monthOf(enquiry.openedAt) === month);
  const converted = opened.filter((enquiry) => enquiry.convertedOrderId !== null);

  // Listings are cumulative - a piece listed in March is still live in August.
  const live = products.filter(
    (product) => product.status === 'live' && monthOf(product.listedAt) <= month,
  );

  return {
    month,
    label,
    gmv: confirmed.reduce((sum, order) => sum + order.total, 0),
    orders: confirmed.length,
    enquiries: opened.length,
    convertedEnquiries: converted.length,
    conversionPercent: percentOf(converted.length, opened.length),
    activeManufacturers: new Set(confirmed.flatMap((order) => order.manufacturerIds)).size,
    activeJewellers: new Set(confirmed.map((order) => order.jewellerId)).size,
    liveListings: live.length,
  };
});

// Enquiry to order, stage by stage.
//
// This is a funnel rather than a monthly line because every enquiry on the
// platform was opened inside the current month - the marketplace conversation
// layer is newer than the order book. A twelve point line with eleven zeroes
// would read as an outage rather than as a young feature, so the shape that
// tells the truth here is the funnel.
export const enquiryFunnel = [
  { id: 'enquiries', count: enquiries.length },
  { id: 'quoted', count: enquiries.filter((enquiry) => enquiry.quotationCount > 0).length },
  { id: 'accepted', count: enquiries.filter((enquiry) => enquiry.status === 'accepted').length },
  { id: 'ordered', count: enquiries.filter((enquiry) => enquiry.convertedOrderId !== null).length },
].map((stage, index, stages) => ({
  ...stage,
  conversionFromPreviousPercent: index === 0 ? 100 : percentOf(stage.count, stages[index - 1].count),
  conversionFromTopPercent: percentOf(stage.count, stages[0].count),
}));

export const listingCounts = {
  live: products.filter((product) => product.status === 'live').length,
  draft: products.filter((product) => product.status === 'draft').length,
  pendingReview: products.filter((product) => product.status === 'pending_review').length,
  archived: products.filter((product) => product.status === 'archived').length,
  outOfStock: products.filter((product) => product.status === 'out_of_stock').length,
  // Counted, never broken out by manufacturer or by piece. A private range must
  // not become visible through a report that nobody thought of as a surface.
  private: products.filter((product) => product.visibility === 'private').length,
};

const goodsValueByProductId = orders.reduce((map, order) => {
  if (!order.confirmedAt) return map;
  order.lines.forEach((line) => {
    map[line.productId] = (map[line.productId] ?? 0) + line.lineTotal;
  });
  return map;
}, {});

export const categoryPerformance = [...new Set(products.map((product) => product.category))]
  .map((category) => {
    const inCategory = products.filter((product) => product.category === category);
    const enquiriesFor = enquiries.filter((enquiry) => enquiry.category === category);

    return {
      category,
      listings: inCategory.filter((product) => product.status === 'live').length,
      gmv: inCategory.reduce((sum, product) => sum + (goodsValueByProductId[product.id] ?? 0), 0),
      enquiries: enquiriesFor.length,
      orders: inCategory.filter((product) => goodsValueByProductId[product.id]).length,
    };
  })
  .sort((left, right) => right.gmv - left.gmv);

export const cityPerformance = [...new Set(manufacturers.map((row) => row.city))]
  .map((city) => {
    const cityManufacturerIds = manufacturers
      .filter((row) => row.city === city)
      .map((row) => row.id);

    return {
      city,
      manufacturers: cityManufacturerIds.length,
      jewellers: jewellers.filter((row) => row.city === city).length,
      gmv: confirmedOrders
        .filter((order) => order.manufacturerIds.some((id) => cityManufacturerIds.includes(id)))
        .reduce((sum, order) => sum + order.total, 0),
    };
  })
  .sort((left, right) => right.gmv - left.gmv);

// ---------------------------------------------------------------------------
// Financial periods - ADM-094
// ---------------------------------------------------------------------------

const refundedReturns = returns.filter((row) => row.refundedAt !== null);

function failedPayoutValue(attempts) {
  const seen = new Map();
  attempts.forEach((attempt) => seen.set(attempt.settlementLineId, attempt.amount));
  return [...seen.values()].reduce((sum, amount) => sum + amount, 0);
}

export const financialPeriods = reportingMonths.map(({ month, label }) => {
  const confirmed = confirmedInMonth(month);
  const confirmedIds = confirmed.map((order) => order.id);
  const linesForMonth = settlementLines.filter((line) => confirmedIds.includes(line.orderId));
  const commission = confirmed.reduce((sum, order) => sum + order.commission, 0);

  return {
    id: `FIN-${month}`,
    month,
    label,
    gmv: confirmed.reduce((sum, order) => sum + order.total, 0),
    orders: confirmed.length,

    // Commission is the only line on this table that is Elanzia revenue.
    // Everything else is other people's money passing through.
    commission,
    gstOnCommission: Math.round((commission * COMMISSION_GST_PERCENT) / 100),

    payoutsReleased: settlementLines
      .filter((line) => line.status === 'settled' && monthOf(line.settledAt) === month)
      .reduce((sum, line) => sum + line.payout, 0),
    // Value of the payouts that failed, not of the attempts. A line retried
    // three times is one payout stuck, and summing the attempts would report
    // three times the money as at risk.
    payoutsFailed: failedPayoutValue(
      payoutAttempts.filter(
        (attempt) => attempt.status === 'failed' && monthOf(attempt.attemptedAt) === month,
      ),
    ),
    refunds: refundedReturns
      .filter((row) => monthOf(row.refundedAt) === month)
      .reduce((sum, row) => sum + row.refundAmount, 0),

    // What that month's trading left sitting in the payment aggregator's nodal
    // account. It is never Elanzia's balance and never appears as revenue; it
    // splits to the manufacturer net of commission when the return window
    // closes.
    heldInNodal: linesForMonth
      .filter((line) => line.status !== 'settled')
      .reduce((sum, line) => sum + line.payout, 0),
  };
});

const totalCommission = financialPeriods.reduce((sum, row) => sum + row.commission, 0);
const totalGmv = financialPeriods.reduce((sum, row) => sum + row.gmv, 0);

export const financialSummary = {
  gmv: totalGmv,
  orders: financialPeriods.reduce((sum, row) => sum + row.orders, 0),
  commissionEarned: totalCommission,
  effectiveCommissionPercent: totalGmv === 0 ? 0 : Number(((totalCommission / totalGmv) * 100).toFixed(2)),
  gstOnCommission: financialPeriods.reduce((sum, row) => sum + row.gstOnCommission, 0),
  payoutsReleased: financialPeriods.reduce((sum, row) => sum + row.payoutsReleased, 0),
  payoutsPending: settlementLines
    .filter((line) => line.status === 'pending')
    .reduce((sum, line) => sum + line.payout, 0),
  payoutsFailed: failedPayoutValue(payoutAttempts.filter((attempt) => attempt.status === 'failed')),
  refunds: financialPeriods.reduce((sum, row) => sum + row.refunds, 0),
  heldInNodal: settlementLines
    .filter((line) => line.status !== 'settled')
    .reduce((sum, line) => sum + line.payout, 0),
};

const AGEING_BUCKETS = [
  // Money that is simply not payable yet. Without this bucket every unsettled
  // line looks late, and a return window that has not closed reads as a
  // failure to pay.
  { id: 'not_due', label: 'Not yet due', from: -Infinity, to: -1 },
  { id: '0-3', label: '0 to 3 days', from: 0, to: 3 },
  { id: '4-7', label: '4 to 7 days', from: 4, to: 7 },
  { id: '8-14', label: '8 to 14 days', from: 8, to: 14 },
  { id: '15+', label: '15 days and over', from: 15, to: Infinity },
];

// Ageing runs off dueAt, not off the order date. A payout is not late because
// the order is old; it is late because the return window closed and the money
// still has not moved.
export const settlementAgeing = AGEING_BUCKETS.map((bucket) => {
  const inBucket = settlementLines.filter((line) => {
    if (line.status === 'settled' || !line.dueAt) return false;
    const days = Math.floor((NOW_MS - Date.parse(line.dueAt)) / DAY_MS);
    return days >= bucket.from && days <= bucket.to;
  });

  return {
    bucket: bucket.id,
    label: bucket.label,
    count: inBucket.length,
    amount: inBucket.reduce((sum, line) => sum + line.payout, 0),
  };
});

export const gstSummary = einvoices
  .filter((invoice) => invoice.status === 'generated')
  .reduce(
    (totals, invoice) => ({
      invoiceCount: totals.invoiceCount + 1,
      taxableValue: totals.taxableValue + invoice.taxableValue,
      cgst: totals.cgst + invoice.cgst,
      sgst: totals.sgst + invoice.sgst,
      igst: totals.igst + invoice.igst,
      total: totals.total + invoice.gstValue,
    }),
    { invoiceCount: 0, taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );

// ---------------------------------------------------------------------------
// Manufacturer performance - ADM-098
// ---------------------------------------------------------------------------

// An order still in production has not failed to be fulfilled, so every rate
// below is measured against orders that actually reached an end state.
// Counting work in progress as a miss punishes a workshop for having a full
// bench.
const TERMINAL_ORDER_STATUSES = ['delivered', 'returned', 'refunded', 'disputed'];

// A raised dispute is an allegation. The badge counts only the ones a reviewer
// upheld against the manufacturer, because a marketplace that penalises a
// workshop for being complained about rewards the loudest buyer rather than
// the best supplier.
const upheldDisputes = resolutions
  .filter((resolution) => resolution.liableParty === 'manufacturer')
  .map((resolution) => disputeById[resolution.disputeId])
  .filter(Boolean);

/**
 * Which badge a manufacturer holds, and what is holding it back.
 *
 * Computed rather than stored because every input moves on its own: a dispute
 * upheld this morning must cost the badge this morning, not at the next time
 * something remembers to recalculate. The blockers are returned alongside so
 * the report can say why rather than leaving a manufacturer to guess.
 */
export function badgeStateOf(row, memberStatus) {
  if (memberStatus === 'suspended') return { badgeState: 'suspended', badgeBlockers: ['suspended'] };
  if (memberStatus !== 'approved') {
    return { badgeState: 'not_eligible', badgeBlockers: ['not_approved'] };
  }
  if (row.orders < VERIFIED_BADGE_THRESHOLDS.minimumOrders) {
    return { badgeState: 'not_eligible', badgeBlockers: ['insufficient_orders'] };
  }

  const blockers = [];
  if (row.onTimeDispatchPercent < VERIFIED_BADGE_THRESHOLDS.onTimeDispatchPercent) {
    blockers.push('on_time_dispatch');
  }
  if (row.rating < VERIFIED_BADGE_THRESHOLDS.rating) blockers.push('rating');
  if (row.disputeRatePercent > VERIFIED_BADGE_THRESHOLDS.disputeRatePercent) {
    blockers.push('dispute_rate');
  }
  if (
    row.enquiries >= VERIFIED_BADGE_THRESHOLDS.minimumEnquiriesToJudgeResponse &&
    row.responseRatePercent < VERIFIED_BADGE_THRESHOLDS.responseRatePercent
  ) {
    blockers.push('response_rate');
  }

  if (blockers.length === 0) return { badgeState: 'verified', badgeBlockers: [] };
  // One slipped metric is a warning a manufacturer can still trade out of.
  // Two at once is not a badge.
  if (blockers.length === 1) return { badgeState: 'at_risk', badgeBlockers: blockers };
  return { badgeState: 'not_eligible', badgeBlockers: blockers };
}

export const manufacturerPerformance = manufacturers.map((manufacturer) => {
  const theirOrders = confirmedOrders.filter((order) =>
    order.manufacturerIds.includes(manufacturer.id),
  );
  const settled = theirOrders.filter((order) => TERMINAL_ORDER_STATUSES.includes(order.status));
  const delivered = theirOrders.filter((order) => order.status === 'delivered');
  const theirEnquiries = enquiries.filter((enquiry) => enquiry.manufacturerId === manufacturer.id);
  const answered = theirEnquiries.filter((enquiry) => enquiry.firstResponseHours !== null);
  const theirUpheld = upheldDisputes.filter((row) => row.manufacturerId === manufacturer.id);
  const theirReturns = returns.filter((row) => row.manufacturerId === manufacturer.id);

  const base = {
    manufacturerId: manufacturer.id,
    businessName: manufacturer.businessName,
    city: manufacturer.city,
    speciality: manufacturer.speciality,
    liveListings: products.filter(
      (product) => product.manufacturerId === manufacturer.id && product.status === 'live',
    ).length,
    orders: theirOrders.length,
    completedOrders: settled.length,
    gmv: settlementLines
      .filter((line) => line.manufacturerId === manufacturer.id)
      .reduce((sum, line) => sum + line.goodsValue, 0),

    enquiries: theirEnquiries.length,
    responseRatePercent: percentOf(answered.length, theirEnquiries.length),
    medianResponseHours: median(answered.map((enquiry) => enquiry.firstResponseHours)),

    fulfilmentRatePercent: percentOf(delivered.length, settled.length),
    onTimeDispatchPercent: manufacturer.onTimeDispatchPercent,
    disputeRatePercent: percentOf(theirUpheld.length, settled.length),
    returnRatePercent: percentOf(theirReturns.length, settled.length),
    rating: manufacturer.rating,
    memberStatus: manufacturer.status,
  };

  return { ...base, ...badgeStateOf(base, manufacturer.status) };
});

export const manufacturerPerformanceById = Object.fromEntries(
  manufacturerPerformance.map((row) => [row.manufacturerId, row]),
);

// ---------------------------------------------------------------------------
// Export centre - ADM-095
// ---------------------------------------------------------------------------

const activeStaff = adminUsers.filter((user) => user.status === 'active');

// The catalogue of what can be pulled out of the platform. Each dataset names
// the permission the caller must hold, so an operator who cannot read
// settlements cannot export them either - a report is not a side door.
export const exportDatasets = [
  {
    id: 'orders',
    module: 'orders',
    permission: 'orders.export',
    columns: ['id', 'placedAt', 'jewellerName', 'status', 'goodsValue', 'commission', 'total'],
    supportsPeriod: true,
    maxRows: 50000,
    containsPersonalData: true,
  },
  {
    id: 'order_lines',
    module: 'orders',
    permission: 'orders.export',
    columns: ['orderId', 'sku', 'title', 'purity', 'netWeight', 'quantity', 'unitPrice', 'lineTotal'],
    supportsPeriod: true,
    maxRows: 200000,
    containsPersonalData: false,
  },
  {
    id: 'settlements',
    module: 'payments',
    permission: 'payments.export',
    columns: ['id', 'orderId', 'manufacturerName', 'goodsValue', 'commission', 'payout', 'status', 'settledAt'],
    supportsPeriod: true,
    maxRows: 50000,
    containsPersonalData: false,
  },
  {
    id: 'payouts',
    module: 'payments',
    permission: 'payments.export',
    columns: ['id', 'manufacturerName', 'amount', 'rail', 'status', 'utr', 'failureCode', 'attemptedAt'],
    supportsPeriod: true,
    maxRows: 50000,
    containsPersonalData: false,
  },
  {
    id: 'commission',
    module: 'payments',
    permission: 'reports.export',
    columns: ['month', 'gmv', 'orders', 'commission', 'gstOnCommission', 'effectivePercent'],
    supportsPeriod: true,
    maxRows: 240,
    containsPersonalData: false,
  },
  {
    id: 'gst_invoices',
    module: 'payments',
    permission: 'payments.export',
    columns: ['documentNumber', 'irn', 'documentDate', 'supplierGstin', 'recipientGstin', 'taxableValue', 'gstValue'],
    supportsPeriod: true,
    maxRows: 50000,
    containsPersonalData: false,
  },
  {
    id: 'manufacturers',
    module: 'manufacturers',
    permission: 'reports.export',
    columns: ['id', 'businessName', 'city', 'gstin', 'status', 'productCount', 'lifetimeGmv'],
    supportsPeriod: false,
    maxRows: 5000,
    containsPersonalData: true,
  },
  {
    id: 'manufacturer_performance',
    module: 'manufacturers',
    permission: 'reports.export',
    columns: ['businessName', 'orders', 'gmv', 'responseRatePercent', 'fulfilmentRatePercent', 'disputeRatePercent', 'badgeState'],
    supportsPeriod: true,
    maxRows: 5000,
    containsPersonalData: false,
  },
  {
    id: 'jewellers',
    module: 'jewellers',
    permission: 'reports.export',
    columns: ['id', 'businessName', 'city', 'gstin', 'status', 'creditLimit', 'lifetimeSpend'],
    supportsPeriod: false,
    maxRows: 5000,
    containsPersonalData: true,
  },
  {
    id: 'catalogue',
    module: 'catalogue',
    permission: 'reports.export',
    // Private pieces are excluded at the query, not filtered out afterwards.
    columns: ['sku', 'title', 'category', 'purity', 'netWeight', 'status', 'listedAt'],
    supportsPeriod: false,
    maxRows: 100000,
    containsPersonalData: false,
  },
  {
    id: 'enquiries',
    module: 'marketplace',
    permission: 'reports.export',
    columns: ['id', 'jewellerName', 'manufacturerName', 'category', 'status', 'openedAt', 'firstResponseHours'],
    supportsPeriod: true,
    maxRows: 50000,
    containsPersonalData: true,
  },
  {
    id: 'disputes',
    module: 'returns',
    permission: 'reports.export',
    columns: ['id', 'orderId', 'type', 'severity', 'status', 'claimValue', 'raisedAt', 'slaBreached'],
    supportsPeriod: true,
    maxRows: 20000,
    containsPersonalData: true,
  },
  {
    id: 'audit_log',
    module: 'platform',
    permission: 'platform.audit.view',
    columns: ['id', 'at', 'actorName', 'module', 'action', 'severity', 'entityId', 'summary'],
    supportsPeriod: true,
    maxRows: 200000,
    containsPersonalData: true,
  },
  {
    id: 'consent_ledger',
    module: 'platform',
    permission: 'platform.privacy.view',
    columns: ['subjectName', 'purpose', 'state', 'capturedAt', 'withdrawnAt', 'source', 'policyVersion'],
    supportsPeriod: false,
    maxRows: 50000,
    containsPersonalData: true,
  },
];

export const exportDatasetById = Object.fromEntries(
  exportDatasets.map((dataset) => [dataset.id, dataset]),
);

const EXPORT_FAILURES = [
  { code: 'row_limit_exceeded', reason: 'The period selected returns more rows than the dataset allows.' },
  { code: 'source_timeout', reason: 'The settlement ledger did not answer inside the build window.' },
  { code: 'storage_unavailable', reason: 'The export bucket rejected the upload.' },
];

// Every fourth job is old enough to have lapsed, so the queue always has an
// expired row to prove that state renders differently from a failure.
const EXPORT_STATUS_PLAN = [
  'succeeded', 'succeeded', 'succeeded', 'expired',
  'succeeded', 'failed', 'succeeded', 'running',
  'succeeded', 'expired', 'queued', 'failed',
];

export const exportJobs = Array.from({ length: 44 }).map((_, index) => {
  const dataset = pick(exportDatasets, index * 3);
  const requester = pick(activeStaff, index);
  const status = pick(EXPORT_STATUS_PLAN, index);
  const requestedDaysAgo = round1(0.2 + index * 0.9);
  const requestedAt = isoDaysAgo(requestedDaysAgo);
  const finished = ['succeeded', 'expired'].includes(status);
  const failure = status === 'failed' ? pick(EXPORT_FAILURES, index) : null;
  const completedAt = finished || status === 'failed' ? isoDaysAgo(requestedDaysAgo - 0.01) : null;

  return {
    id: `EXP-${pad(index + 1, 4)}`,
    datasetId: dataset.id,
    requestedById: requester.id,
    requestedByName: requester.name,
    requestedAt,
    period: dataset.supportsPeriod ? pick(reportingMonths, index).month : null,
    filters: index % 3 === 0 ? { status: 'delivered' } : {},
    format: index % 5 === 0 ? 'xlsx' : 'csv',
    status,
    rowCount: finished ? 120 + index * 137 : null,
    fileSizeBytes: finished ? (120 + index * 137) * 210 : null,
    startedAt: status === 'queued' ? null : isoDaysAgo(requestedDaysAgo - 0.005),
    completedAt,
    // An expired job's file is gone. The row survives so the audit trail can
    // still show that somebody pulled this data on that morning.
    expiresAt: completedAt
      ? new Date(Date.parse(completedAt) + EXPORT_RETENTION_DAYS * DAY_MS).toISOString()
      : null,
    failureCode: failure?.code ?? null,
    failureReason: failure?.reason ?? null,
    containsPersonalData: dataset.containsPersonalData,
  };
});

export const exportJobById = Object.fromEntries(exportJobs.map((job) => [job.id, job]));

// The reports an operator pinned rather than rebuilt. They are a shortcut into
// ADM-093 and ADM-094, not a separate report engine.
export const savedReports = [
  { id: 'SVR-0001', name: 'Monthly GMV and commission', datasetId: 'commission', period: 'last_12_months', path: '/reports/financial' },
  { id: 'SVR-0002', name: 'Verified badge watchlist', datasetId: 'manufacturer_performance', period: 'last_90_days', path: '/reports/manufacturers' },
  { id: 'SVR-0003', name: 'Enquiry conversion by category', datasetId: 'enquiries', period: 'last_90_days', path: '/reports/marketplace' },
  { id: 'SVR-0004', name: 'Payout failures this quarter', datasetId: 'payouts', period: 'last_90_days', path: '/reports/financial' },
].map((report, index) => ({
  ...report,
  ownerId: pick(activeStaff, index).id,
  ownerName: pick(activeStaff, index).name,
  lastRunAt: isoDaysAgo(0.4 + index * 2.6),
}));

// ---------------------------------------------------------------------------
// Consent and data requests - ADM-096
// ---------------------------------------------------------------------------

/**
 * Where a request sits against its statutory deadline.
 *
 * Computed at read time, never stored. A request that ran out of time at
 * midnight has to read as breached the next morning without anything having
 * had to run, because the deadline is the law's and not the portal's.
 */
export function slaStateOf(request, now = NOW_MS) {
  if (['fulfilled', 'rejected', 'withdrawn'].includes(request.status)) return 'closed';
  const daysLeft = (Date.parse(request.dueAt) - now) / DAY_MS;
  if (daysLeft < 0) return 'breached';
  if (daysLeft <= 7) return 'due_soon';
  return 'on_track';
}

const DATA_REQUEST_STATUS_PLAN = [
  'in_progress', 'fulfilled', 'received', 'fulfilled',
  'identity_pending', 'fulfilled', 'in_progress', 'rejected',
  'fulfilled', 'received', 'withdrawn', 'in_progress',
];

const REQUEST_CHANNELS = ['portal', 'email', 'support_desk'];

const REJECTION_REASONS = {
  erasure:
    'Refused in part. The transaction record cannot be erased while it is inside the statutory retention window.',
  correction: 'Refused. The GSTIN on file matches the certificate issued by the department.',
  access: 'Refused. Identity could not be established after two requests for a document.',
  nomination: 'Refused. The nominee named is not a registered contact on the account.',
  grievance: 'Closed. The order was delivered and the jeweller confirmed receipt.',
};

// What an erasure request cannot take away. A confirmed order, its tax invoice
// and its settlement record are held under statutory obligation, so the portal
// refuses that part of the request and says exactly which records it kept and
// why - a refusal a data principal cannot see the shape of is not an answer.
function retainedRecordsFor(subjectType, subjectId) {
  if (subjectType === 'admin') {
    return [{ kind: 'audit_entries', count: 0, reason: 'statutory_audit_retention' }];
  }

  const key = subjectType === 'jeweller' ? 'jewellerId' : 'manufacturerId';
  const theirOrders = confirmedOrders.filter((order) =>
    key === 'jewellerId' ? order.jewellerId === subjectId : order.manufacturerIds.includes(subjectId),
  );
  const theirInvoices = einvoices.filter((invoice) => invoice[key] === subjectId);
  const theirLines = settlementLines.filter((line) => line[key] === subjectId);

  return [
    { kind: 'confirmed_orders', count: theirOrders.length, reason: 'statutory_transaction_retention' },
    { kind: 'tax_invoices', count: theirInvoices.length, reason: 'statutory_gst_retention' },
    { kind: 'settlement_records', count: theirLines.length, reason: 'statutory_financial_retention' },
  ];
}

const requestSubjects = [
  ...jewellers.map((row) => ({ subjectType: 'jeweller', id: row.id, name: row.businessName })),
  ...manufacturers.map((row) => ({ subjectType: 'manufacturer', id: row.id, name: row.businessName })),
  ...adminUsers.map((row) => ({ subjectType: 'admin', id: row.id, name: row.name })),
];

export const dataRequests = Array.from({ length: 46 }).map((_, index) => {
  const subject = pick(requestSubjects, index * 5);
  const type = pick(DATA_REQUEST_TYPES, index);
  const status = pick(DATA_REQUEST_STATUS_PLAN, index);
  const handler = pick(activeStaff, index * 3);
  const raisedDaysAgo = round1(0.5 + index * 1.15);
  const raisedAt = isoDaysAgo(raisedDaysAgo);
  const closed = ['fulfilled', 'rejected', 'withdrawn'].includes(status);

  const row = {
    id: `DPR-${pad(index + 1, 4)}`,
    subjectType: subject.subjectType,
    subjectId: subject.id,
    subjectName: subject.name,
    type,
    channel: pick(REQUEST_CHANNELS, index),
    raisedAt,
    dueAt: new Date(Date.parse(raisedAt) + DPDP_RESPONSE_DAYS * DAY_MS).toISOString(),
    respondedAt: closed ? isoDaysAgo(Math.max(0.1, raisedDaysAgo - 4 - (index % 9))) : null,
    status,

    // Identity is proved before anything is handed over. Sending a member's
    // trading history to whoever asked for it is the failure this queue exists
    // to prevent, and it cannot be undone afterwards.
    identityVerified: !['received', 'identity_pending'].includes(status),

    outcome: status === 'fulfilled' ? 'fulfilled' : status === 'rejected' ? 'rejected' : null,
    rejectionReason: status === 'rejected' ? REJECTION_REASONS[type] : null,
    handledById: status === 'received' ? null : handler.id,
    handledByName: status === 'received' ? null : handler.name,
    note:
      status === 'received'
        ? null
        : `Logged from ${pick(REQUEST_CHANNELS, index)} and matched to the account on file.`,
    retainedRecords: type === 'erasure' ? retainedRecordsFor(subject.subjectType, subject.id) : [],
  };

  return { ...row, slaState: slaStateOf(row) };
});

export const dataRequestById = Object.fromEntries(dataRequests.map((row) => [row.id, row]));

const CONSENT_SOURCES = ['signup', 'settings', 'support_desk', 'broadcast_unsubscribe'];
const CONSENT_STATE_PLAN = [
  'granted', 'granted', 'withdrawn', 'granted',
  'never_given', 'granted', 'withdrawn', 'granted',
  'granted', 'never_given',
];

export const consentRecords = Array.from({ length: 58 }).map((_, index) => {
  const subject = pick(requestSubjects, index * 3);
  const purpose = pick(CONSENT_PURPOSES, index);
  const state = pick(CONSENT_STATE_PLAN, index + (purpose === 'partner_sharing' ? 2 : 0));
  const capturedDaysAgo = 12 + index * 4.3;

  return {
    id: `CNS-${pad(index + 1, 4)}`,
    subjectType: subject.subjectType,
    subjectId: subject.id,
    subjectName: subject.name,
    purpose,
    state,
    // A consent never given has no capture date. Backfilling one would invent
    // a permission the member never gave.
    capturedAt: state === 'never_given' ? null : isoDaysAgo(capturedDaysAgo),
    withdrawnAt: state === 'withdrawn' ? isoDaysAgo(Math.max(0.5, capturedDaysAgo - 30)) : null,
    source: state === 'never_given' ? 'signup' : pick(CONSENT_SOURCES, index),
    policyVersion: capturedDaysAgo > 200 ? 'v1.2' : 'v1.4',
  };
});

// ---------------------------------------------------------------------------
// Audit log - ADM-099
// ---------------------------------------------------------------------------

// severity is not about how loud the entry is. 'sensitive' marks the entries
// that moved money, changed who can do what, or reached member data - the ones
// a reviewer filters to first when something has gone wrong.
const AUDIT_TEMPLATES = [
  { module: 'access', action: 'role.permissions_changed', severity: 'sensitive', entityType: 'role' },
  { module: 'access', action: 'staff.deactivated', severity: 'sensitive', entityType: 'admin_user' },
  { module: 'access', action: 'impersonation.started', severity: 'sensitive', entityType: 'jeweller' },
  { module: 'onboarding', action: 'manufacturer.approved', severity: 'notable', entityType: 'manufacturer' },
  { module: 'onboarding', action: 'manufacturer.rejected', severity: 'notable', entityType: 'manufacturer' },
  { module: 'catalogue', action: 'product.published', severity: 'info', entityType: 'product' },
  { module: 'catalogue', action: 'product.private_unsealed', severity: 'sensitive', entityType: 'product' },
  { module: 'marketplace', action: 'enquiry.nudged', severity: 'info', entityType: 'enquiry' },
  { module: 'orders', action: 'order.cancelled', severity: 'sensitive', entityType: 'order' },
  { module: 'payments', action: 'settlement.released', severity: 'sensitive', entityType: 'order' },
  { module: 'payments', action: 'commission.rule_changed', severity: 'sensitive', entityType: 'manufacturer' },
  { module: 'returns', action: 'return.verified', severity: 'notable', entityType: 'order' },
  { module: 'pricing', action: 'rate.override_applied', severity: 'sensitive', entityType: 'metal_rate' },
  { module: 'communications', action: 'broadcast.sent', severity: 'notable', entityType: 'broadcast' },
  { module: 'platform', action: 'settings.updated', severity: 'sensitive', entityType: 'setting' },
  { module: 'platform', action: 'export.downloaded', severity: 'sensitive', entityType: 'export_job' },
];

function auditSubject(template, index) {
  const order = pick(orders, index * 7);
  const manufacturer = pick(manufacturers, index * 3);
  const product = pick(products, index * 11);
  const jeweller = pick(jewellers, index * 5);

  switch (template.entityType) {
    case 'order':
      return { entityId: order.id, entityLabel: order.id, path: `/orders/${order.id}` };
    case 'manufacturer':
      return { entityId: manufacturer.id, entityLabel: manufacturer.businessName, path: null };
    case 'product':
      return { entityId: product.id, entityLabel: product.title, path: `/catalogue/products/${product.id}` };
    case 'jeweller':
      return { entityId: jeweller.id, entityLabel: jeweller.businessName, path: null };
    case 'role':
      return { entityId: 'settlement_approver', entityLabel: 'Settlement approver', path: '/access/roles' };
    case 'admin_user': {
      const staff = pick(adminUsers, index * 2);
      return { entityId: staff.id, entityLabel: staff.name, path: '/access/users' };
    }
    case 'enquiry':
      return { entityId: `ENQ-${pad((index % 48) + 1, 3)}`, entityLabel: `ENQ-${pad((index % 48) + 1, 3)}`, path: null };
    case 'metal_rate':
      return { entityId: 'gold-22', entityLabel: '22K gold', path: '/pricing/rates' };
    case 'broadcast':
      return { entityId: `BRD-${pad((index % 20) + 1, 4)}`, entityLabel: `BRD-${pad((index % 20) + 1, 4)}`, path: null };
    case 'export_job':
      return { entityId: pick(exportJobs, index).id, entityLabel: pick(exportJobs, index).id, path: '/platform/exports' };
    default:
      return { entityId: `SET-${pad(index, 4)}`, entityLabel: 'Platform settings', path: '/platform/settings' };
  }
}

function auditChanges(template, index) {
  switch (template.action) {
    case 'role.permissions_changed':
      return [{ field: 'permissions', before: 'payments.settle, reports.financial.view', after: 'payments.settle, reports.financial.view, payments.export' }];
    case 'staff.deactivated':
      return [{ field: 'status', before: 'active', after: 'deactivated' }];
    case 'manufacturer.approved':
      return [{ field: 'status', before: 'under_review', after: 'approved' }];
    case 'manufacturer.rejected':
      return [{ field: 'status', before: 'under_review', after: 'rejected' }];
    case 'product.published':
      return [{ field: 'status', before: 'pending_review', after: 'live' }];
    case 'order.cancelled':
      return [{ field: 'status', before: 'confirmed', after: 'cancelled' }];
    case 'settlement.released':
      return [{ field: 'settlement.status', before: 'pending', after: 'settled' }];
    case 'commission.rule_changed':
      return [{ field: 'commissionPercent', before: '4.50', after: '3.90' }];
    case 'return.verified':
      return [{ field: 'return.refundStatus', before: 'awaiting_verification', after: 'approved' }];
    case 'rate.override_applied':
      return [{ field: 'ratePerGram', before: '7,251', after: '7,310' }];
    case 'settings.updated':
      return [{ field: 'trading.returnWindowDays', before: '7', after: '10' }];
    // A read is still a change of who has seen what, so the entry records the
    // reason given rather than a before and after that does not exist.
    case 'product.private_unsealed':
    case 'export.downloaded':
    case 'impersonation.started':
      return [{ field: 'reason', before: null, after: pick(['Member raised a support ticket', 'Finance reconciliation query', 'Regulator information request'], index) }];
    default:
      return [];
  }
}

const auditRows = Array.from({ length: 72 }).map((_, index) => {
  const template = pick(AUDIT_TEMPLATES, index);
  const actor = pick(activeStaff, index * 3);
  const role = roleById[actor.roleId];
  const subject = auditSubject(template, index);
  const impersonating = template.action === 'impersonation.started';
  const onBehalfOf = impersonating ? pick(jewellers, index * 5) : null;

  return {
    id: `AUD-${pad(10000 + index, 5)}`,
    at: isoHoursAgo(round1(0.3 + index * 2.7)),
    actorId: actor.id,
    actorName: actor.name,
    actorRoleId: actor.roleId,
    actorRoleName: role.name,
    module: template.module,
    action: template.action,
    severity: template.severity,
    entityType: template.entityType,
    entityId: subject.entityId,
    entityLabel: subject.entityLabel,
    entityPath: subject.path,
    summary: `${actor.name} performed ${template.action} on ${subject.entityLabel}`,
    ipAddress: `103.${21 + (index % 40)}.${8 + (index % 90)}.${2 + (index % 200)}`,
    userAgent: pick(['Chrome 141 on macOS', 'Chrome 141 on Windows', 'Safari 19 on macOS'], index),
    // Populated only for actions taken inside an ADM-008 impersonation session.
    // It is the first thing a reviewer looks for, because an action taken as
    // somebody else is the one an actor is least likely to own up to.
    onBehalfOfId: onBehalfOf?.id ?? null,
    onBehalfOfName: onBehalfOf?.businessName ?? null,
    requestId: `REQ-${pad(index * 37 + 4001, 6)}`,
    changes: auditChanges(template, index),
  };
});

// The summary row a queue renders. The change diff is fetched separately, so a
// twenty-field before and after never rides along in a list payload.
export const auditEntries = auditRows.map(({ changes, ...summary }) => summary);

export const auditEntryById = Object.fromEntries(auditRows.map((row) => [row.id, row]));

// ---------------------------------------------------------------------------
// System settings - ADM-097
// ---------------------------------------------------------------------------

// Groups and values are separate on purpose. The shape of the form belongs to
// the server, so adding a setting is a backend change and not a screen change.
//
// hasHelp says whether a <key>Help string exists for the field. The screen asks
// the data rather than probing the i18n map for a key that may not be there,
// which would warn once per field on every render in development.
export const settingGroups = [
  {
    id: 'platform',
    settings: [
      { key: 'platform.displayName', kind: 'text', sensitive: false, restartRequired: false },
      { key: 'platform.supportEmail', kind: 'text', sensitive: false, restartRequired: false },
      { key: 'platform.supportPhone', kind: 'text', sensitive: false, restartRequired: false },
      { key: 'platform.defaultLocale', kind: 'select', sensitive: false, restartRequired: false, options: ['en', 'hi', 'gu', 'ta'] },
      { key: 'platform.maintenanceMode', kind: 'toggle', sensitive: true, restartRequired: false, hasHelp: true },
    ],
  },
  {
    id: 'trading',
    settings: [
      { key: 'trading.minimumOrderValue', kind: 'number', unit: 'INR', min: 0, max: 1000000, sensitive: false, restartRequired: false },
      { key: 'trading.quoteValidityDays', kind: 'number', unit: 'days', min: 1, max: 30, sensitive: false, restartRequired: false },
      { key: 'trading.returnWindowDays', kind: 'number', unit: 'days', min: 1, max: 30, sensitive: true, restartRequired: false, hasHelp: true },
      { key: 'trading.rateLockMinutes', kind: 'number', unit: 'minutes', min: 5, max: 240, sensitive: true, restartRequired: false, hasHelp: true },
      { key: 'trading.enquiryFirstResponseHours', kind: 'number', unit: 'hours', min: 1, max: 168, sensitive: false, restartRequired: false },
    ],
  },
  {
    id: 'money',
    settings: [
      { key: 'money.defaultCommissionPercent', kind: 'number', unit: '%', min: 0, max: 25, sensitive: true, restartRequired: false, hasHelp: true },
      { key: 'money.commissionGstPercent', kind: 'number', unit: '%', min: 0, max: 28, sensitive: true, restartRequired: false },
      { key: 'money.payoutSlaHours', kind: 'number', unit: 'hours', min: 24, max: 336, sensitive: true, restartRequired: false },
      { key: 'money.nodalPartner', kind: 'select', sensitive: true, restartRequired: true, options: ['razorpay', 'cashfree', 'icici_nodal'], hasHelp: true },
      { key: 'money.autoReleaseSettlements', kind: 'toggle', sensitive: true, restartRequired: false },
    ],
  },
  {
    id: 'notifications',
    settings: [
      { key: 'notifications.broadcastDailyCap', kind: 'number', unit: 'messages', min: 0, max: 50000, sensitive: false, restartRequired: false },
      { key: 'notifications.escalationEmail', kind: 'text', sensitive: false, restartRequired: false },
      { key: 'notifications.slaWarningHours', kind: 'number', unit: 'hours', min: 1, max: 72, sensitive: false, restartRequired: false },
      { key: 'notifications.whatsappEnabled', kind: 'toggle', sensitive: false, restartRequired: false },
    ],
  },
  {
    id: 'privacy',
    settings: [
      { key: 'privacy.dpdpResponseDays', kind: 'number', unit: 'days', min: 1, max: 30, sensitive: true, restartRequired: false, hasHelp: true },
      { key: 'privacy.exportRetentionDays', kind: 'number', unit: 'days', min: 1, max: 30, sensitive: true, restartRequired: false },
      { key: 'privacy.auditRetentionMonths', kind: 'number', unit: 'months', min: 12, max: 120, sensitive: true, restartRequired: false },
      { key: 'privacy.grievanceOfficerEmail', kind: 'text', sensitive: false, restartRequired: false },
    ],
  },
  {
    id: 'security',
    settings: [
      { key: 'security.sessionTimeoutMinutes', kind: 'number', unit: 'minutes', min: 5, max: 480, sensitive: true, restartRequired: false },
      { key: 'security.twoFactorMandatory', kind: 'toggle', sensitive: true, restartRequired: false, hasHelp: true },
      { key: 'security.passwordRotationDays', kind: 'number', unit: 'days', min: 30, max: 365, sensitive: true, restartRequired: false },
      { key: 'security.impersonationMaxMinutes', kind: 'number', unit: 'minutes', min: 5, max: 120, sensitive: true, restartRequired: false },
    ],
  },
];

export const settingValues = {
  'platform.displayName': 'Elanzia Trade',
  'platform.supportEmail': 'desk@elanzia.com',
  'platform.supportPhone': '9820014477',
  'platform.defaultLocale': 'en',
  'platform.maintenanceMode': false,

  'trading.minimumOrderValue': 25000,
  'trading.quoteValidityDays': 7,
  'trading.returnWindowDays': 7,
  'trading.rateLockMinutes': 30,
  'trading.enquiryFirstResponseHours': 24,

  'money.defaultCommissionPercent': 4.5,
  'money.commissionGstPercent': COMMISSION_GST_PERCENT,
  'money.payoutSlaHours': 72,
  'money.nodalPartner': 'razorpay',
  'money.autoReleaseSettlements': true,

  'notifications.broadcastDailyCap': 5000,
  'notifications.escalationEmail': 'escalations@elanzia.com',
  'notifications.slaWarningHours': 12,
  'notifications.whatsappEnabled': true,

  'privacy.dpdpResponseDays': DPDP_RESPONSE_DAYS,
  'privacy.exportRetentionDays': EXPORT_RETENTION_DAYS,
  'privacy.auditRetentionMonths': AUDIT_RETENTION_MONTHS,
  'privacy.grievanceOfficerEmail': 'grievance@elanzia.com',

  'security.sessionTimeoutMinutes': 45,
  'security.twoFactorMandatory': true,
  'security.passwordRotationDays': 90,
  'security.impersonationMaxMinutes': 30,
};

export const settingsMeta = {
  updatedAt: isoDaysAgo(6.4),
  updatedById: adminUsers[0].id,
  updatedByName: adminUsers[0].name,
};
