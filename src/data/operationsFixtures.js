// Feature fixtures for Operations overview - ADM-010, ADM-011, ADM-012.
// Everything here references src/data/core by id. No manufacturer, jeweller,
// product or order is invented in this file.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so the dashboard shows the same numbers on every reload and a
// screenshot taken today still matches the code tomorrow.

import {
  adminUsers,
  einvoiceRecords,
  outstandingPayouts,
  PAYOUT_SLA_HOURS,
  metalRateHistory,
  metalRates,
  rateSnapshotMeta,
  jewellerById,
  jewellers,
  manufacturerById,
  manufacturers,
  orders,
  products,
} from '@/data/core';
// The alert feed links at the row a reviewer has to open, and for a dispute or
// a payout that row is keyed by a dispute id and a settlement run id, not by
// the order id the alert is about. Both are read here so the link resolves.
import { settlementRuns } from '@/data/paymentsFixtures';
import { disputes } from '@/data/trustFixtures';

// The anchor. Matches accessFixtures.js so the two areas agree about "now".
export const OPERATIONS_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(OPERATIONS_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

// The service levels the ops desk is held to. They live here rather than in the
// mock API because the alert feed and the dashboard both grade against them and
// must use the same numbers.
export const VERIFICATION_SLA_HOURS = 48;
export const MODERATION_SLA_HOURS = 24;
export const DISPATCH_SLA_DAYS = 5;

function hoursSince(iso) {
  if (!iso) return null;
  return Math.max(0, Math.round((NOW_MS - Date.parse(iso)) / HOUR_MS));
}

function isoHoursAgo(hours) {
  return new Date(NOW_MS - hours * HOUR_MS).toISOString();
}

function isoDaysAhead(days) {
  return new Date(NOW_MS + days * DAY_MS).toISOString();
}

const disputeByOrderId = Object.fromEntries(disputes.map((row) => [row.orderId, row]));

const settlementRunByLineId = settlementRuns.reduce((map, run) => {
  run.settlementLineIds.forEach((lineId) => {
    map[lineId] = run;
  });
  return map;
}, {});

// Staff who can own an exception. Deactivated accounts are excluded - assigning
// work to someone who cannot sign in is how a queue silently stops moving.
const assignableStaff = adminUsers.filter((user) => user.status === 'active');

// ---------------------------------------------------------------------------
// Gold rate - ADM-010
// ---------------------------------------------------------------------------

// Both exports below are now VIEWS of src/data/core/metalRates.js, which is
// where rates live so that this dashboard and the pricing board (ADM-035)
// cannot show different numbers. The values are unchanged; only their source
// moved. Edit rates in core, never here.
//
// The `previousRatePerGram` column is still the rate src/data/core/products.js
// was priced at, so a jeweller comparing a live listing against a past order
// sees a believable move rather than two unrelated numbers.

export const goldRateSnapshot = {
  source: rateSnapshotMeta.source,
  capturedAt: rateSnapshotMeta.capturedAt,
  nextRefreshAt: rateSnapshotMeta.nextRefreshAt,
  // The metal rate feed is degraded below, so the rate on screen is behind the
  // market. This only affects listings nobody has ordered yet - a confirmed
  // order's price is permanent - which is why it is a warning, not a critical.
  stale: rateSnapshotMeta.stale,
  rates: metalRates
    .filter((rate) => rate.metal === 'gold')
    .map(({ purity, ratePerGram, previousRatePerGram, changePercent }) => ({
      purity,
      ratePerGram,
      previousRatePerGram,
      changePercent,
    })),
};

// The 14 most recent sessions of 22K and 24K, pivoted out of the core series
// so the panel and the chart always end on the same number.
export const goldRateHistory = (() => {
  const byDate = new Map();

  metalRateHistory
    .filter((row) => row.metal === 'gold' && (row.purity === 22 || row.purity === 24))
    .forEach((row) => {
      const entry = byDate.get(row.date) ?? { rate22K: null, rate24K: null };
      entry[row.purity === 22 ? 'rate22K' : 'rate24K'] = row.ratePerGram;
      byDate.set(row.date, entry);
    });

  return [...byDate.entries()]
    .slice(-14)
    .map(([date, { rate22K, rate24K }]) => ({ date, rate22K, rate24K }));
})();

// ---------------------------------------------------------------------------
// Platform feeds - ADM-010
// ---------------------------------------------------------------------------

// Everything the portal depends on that it does not itself run. `impact` is the
// sentence an operator needs before deciding whether to escalate at 9pm.
export const platformFeeds = [
  {
    id: 'FEED-metal-rate',
    name: 'IBJA metal rate',
    category: 'pricing',
    status: 'degraded',
    lastSyncAt: isoHoursAgo(4.5),
    latencyMs: 8420,
    successRate24h: 71.4,
    message: 'Upstream quote endpoint timing out on roughly one poll in three.',
    impact: 'Unordered listings are priced off a rate that is 4 hours old. Confirmed orders are unaffected.',
  },
  {
    id: 'FEED-aggregator',
    name: 'Payment aggregator webhook',
    category: 'payments',
    status: 'healthy',
    lastSyncAt: isoHoursAgo(0.05),
    latencyMs: 240,
    successRate24h: 99.8,
    message: 'Capture and refund callbacks arriving normally.',
    impact: 'None.',
  },
  {
    id: 'FEED-irp',
    name: 'GSTN e-invoice IRP',
    category: 'tax',
    status: 'down',
    lastSyncAt: isoHoursAgo(9),
    latencyMs: null,
    successRate24h: 0,
    message: 'IRP returning gateway timeouts on every generate request.',
    impact: 'No IRN can be generated. Dispatch is blocked for every order confirmed since 01:30.',
  },
  {
    id: 'FEED-logistics',
    name: 'Logistics AWB tracking',
    category: 'logistics',
    status: 'healthy',
    lastSyncAt: isoHoursAgo(0.25),
    latencyMs: 610,
    successRate24h: 99.1,
    message: 'Scan events current across all three carriers.',
    impact: 'None.',
  },
  {
    id: 'FEED-gstin',
    name: 'GSTIN validation',
    category: 'identity',
    status: 'healthy',
    lastSyncAt: isoHoursAgo(1.5),
    latencyMs: 1180,
    successRate24h: 97.6,
    message: 'Taxpayer lookups resolving within the retry budget.',
    impact: 'None.',
  },
  {
    id: 'FEED-sms',
    name: 'SMS and OTP gateway',
    category: 'messaging',
    status: 'healthy',
    lastSyncAt: isoHoursAgo(0.1),
    latencyMs: 380,
    successRate24h: 98.9,
    message: 'Delivery receipts current.',
    impact: 'None.',
  },
];

// ---------------------------------------------------------------------------
// E-invoicing and payouts - ADM-010, ADM-012
// ---------------------------------------------------------------------------

// Both of these used to be derived here, because the areas that own them had
// not landed. They now live in src/data/core and are re-exported unchanged, so
// the dashboard tile, the alert queue, the e-invoice console (ADM-053), the IRN
// failure queue (ADM-059) and the payout failure queue (ADM-056) all count the
// same rows. Two areas deriving the same thing separately is how a dashboard
// starts disagreeing with its own queue.
//
// The shapes are richer than what this file used to build: an invoice is per
// supplier rather than per order, because each manufacturer on a multi-supplier
// order invoices the jeweller under its own GSTIN; and a payout is a log of
// attempts rather than one row per order, because "paid on the third attempt"
// is a sentence the finance desk has to be able to read.
export { einvoiceRecords, payoutAttempts, outstandingPayouts, PAYOUT_SLA_HOURS } from '@/data/core';

// ---------------------------------------------------------------------------
// Support tickets - ADM-011, ADM-012
// ---------------------------------------------------------------------------

// Tickets sit in this feature fixture rather than in src/data/core because the
// Support area (ADM-08x) has not landed yet. When it does, these move to
// src/data/core/tickets.js and both areas reference the same rows by id.

const TICKET_SUBJECTS = [
  'Net weight on delivery does not match the invoice',
  'Hallmark certificate missing from the parcel',
  'Refund not received after return pickup',
  'Cannot update the registered bank account',
  'Order stuck in production past the promised date',
  'GSTIN rejected during profile update',
  'Duplicate charge on a single order',
  'Requesting an extension of the credit limit',
];

const TICKET_CATEGORIES = ['order', 'payment', 'catalogue', 'account', 'logistics'];
const TICKET_PRIORITIES = ['urgent', 'high', 'normal', 'normal', 'low'];
const TICKET_STATUSES = ['open', 'escalated', 'awaiting_customer', 'open', 'resolved', 'closed'];

export const supportTickets = Array.from({ length: 24 }).map((_, index) => {
  const fromJeweller = index % 3 !== 2;
  const raiser = fromJeweller
    ? jewellers[(index * 5) % jewellers.length]
    : manufacturers[(index * 3) % manufacturers.length];
  const order = orders[(index * 7) % orders.length];
  const status = TICKET_STATUSES[index % TICKET_STATUSES.length];
  const raisedAt = isoHoursAgo(6 + index * 11);
  const closed = status === 'resolved' || status === 'closed';

  return {
    id: `TKT-${String(index + 1).padStart(4, '0')}`,
    subject: TICKET_SUBJECTS[index % TICKET_SUBJECTS.length],
    raisedByType: fromJeweller ? 'jeweller' : 'manufacturer',
    raisedById: raiser.id,
    raisedByName: raiser.businessName,
    // Not every ticket is about an order - an account or catalogue question has
    // nothing to attach to.
    orderId: index % 4 === 3 ? null : order.id,
    category: TICKET_CATEGORIES[index % TICKET_CATEGORIES.length],
    priority: TICKET_PRIORITIES[index % TICKET_PRIORITIES.length],
    status,
    assigneeId: index % 5 === 4 ? null : assignableStaff[index % assignableStaff.length].id,
    raisedAt,
    lastActivityAt: isoHoursAgo(index % 5 === 1 ? 2 : 4 + index * 6),
    resolvedAt: closed ? isoHoursAgo(index * 4) : null,
    firstResponseHours: index % 6,
  };
});

// ---------------------------------------------------------------------------
// The alert feed - ADM-010 and ADM-012
// ---------------------------------------------------------------------------

// THE most important derivation in this file.
//
// Every exception on the platform becomes a row here, and the dashboard's work
// queue counts are computed by counting THIS array rather than by re-querying
// each source. That is what makes the tile that says "5 failed payouts" and the
// queue filtered to payout_failed agree, permanently and without anyone
// remembering to keep them in step.

export const ALERT_SEVERITIES = ['critical', 'high', 'medium', 'low'];

export const ALERT_STATUSES = ['open', 'acknowledged', 'snoozed', 'resolved'];

export const ALERT_CATEGORIES = [
  'verification_ageing',
  'listing_moderation',
  'order_intervention',
  'payment_failed',
  'payout_failed',
  'irn_failed',
  'dispute_open',
  'return_pending_verification',
  'feed_degraded',
  'catalogue_integrity',
  'ticket_sla_breach',
];

// Sort order for severity. Alphabetical would put critical after high, which is
// wrong on the one column an operator sorts by most.
export const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

const APPLICATION_SEVERITY = {
  // Waiting on us.
  applied: 'high',
  under_review: 'medium',
  // Waiting on them. Not an Elanzia SLA breach, so it does not shout.
  info_requested: 'low',
};

const seeds = [];

// Verification queue - manufacturers and jewellers that have not been decided.
manufacturers
  .filter((row) => ['applied', 'under_review', 'info_requested'].includes(row.status))
  .forEach((manufacturer) => {
    seeds.push({
      category: 'verification_ageing',
      severity: APPLICATION_SEVERITY[manufacturer.status],
      title: `Manufacturer application ${manufacturer.status.replace(/_/g, ' ')}`,
      detail: `${manufacturer.businessName} of ${manufacturer.city} has been waiting on a verification decision.`,
      entityType: 'manufacturer',
      entityId: manufacturer.id,
      entityLabel: manufacturer.businessName,
      targetPath: `/onboarding/applications/${manufacturer.id}`,
      raisedAt: manufacturer.appliedAt,
      slaHours: VERIFICATION_SLA_HOURS,
    });
  });

jewellers
  .filter((row) => ['applied', 'under_review', 'info_requested'].includes(row.status))
  .forEach((jeweller) => {
    seeds.push({
      category: 'verification_ageing',
      severity: APPLICATION_SEVERITY[jeweller.status],
      title: `Jeweller application ${jeweller.status.replace(/_/g, ' ')}`,
      detail: `${jeweller.businessName} of ${jeweller.city} has been waiting on a KYC decision.`,
      entityType: 'jeweller',
      entityId: jeweller.id,
      entityLabel: jeweller.businessName,
      targetPath: `/onboarding/jewellers/${jeweller.id}`,
      raisedAt: jeweller.registeredAt,
      slaHours: VERIFICATION_SLA_HOURS,
    });
  });

// Catalogue moderation - nothing reaches the marketplace without a human.
products
  .filter((product) => product.status === 'pending_review' || product.status === 'draft')
  .forEach((product) => {
    const pending = product.status === 'pending_review';
    seeds.push({
      category: 'listing_moderation',
      severity: pending ? 'high' : 'low',
      title: pending ? 'Listing awaiting moderation' : 'Listing left in draft',
      detail: `${product.title} from ${manufacturerById[product.manufacturerId].businessName}, ${product.sku}.`,
      entityType: 'product',
      entityId: product.id,
      entityLabel: product.title,
      targetPath: `/catalogue/products/${product.id}`,
      raisedAt: product.listedAt,
      slaHours: MODERATION_SLA_HOURS,
    });
  });

// Orders that have stopped moving. Graded by how much of the jeweller's money
// is already committed at that stage.
const STUCK_SEVERITY = {
  placed: 'high',
  confirmed: 'high',
  in_production: 'medium',
  ready_to_dispatch: 'high',
};

orders
  .filter((order) => Object.keys(STUCK_SEVERITY).includes(order.status))
  .forEach((order) => {
    seeds.push({
      category: 'order_intervention',
      severity: STUCK_SEVERITY[order.status],
      title: `Order held at ${order.status.replace(/_/g, ' ')}`,
      detail: `${jewellerById[order.jewellerId].businessName} has had no movement past the ${DISPATCH_SLA_DAYS} day dispatch promise.`,
      entityType: 'order',
      entityId: order.id,
      entityLabel: order.id,
      targetPath: `/orders/${order.id}`,
      amount: order.total,
      raisedAt: order.placedAt,
      slaHours: DISPATCH_SLA_DAYS * 24,
    });
  });

// Payment capture failures. The jeweller believes they have ordered.
orders
  .filter((order) => order.payment.status === 'failed')
  .forEach((order) => {
    seeds.push({
      category: 'payment_failed',
      severity: 'critical',
      title: 'Payment capture failed',
      detail: `${order.payment.method} capture for ${jewellerById[order.jewellerId].businessName} failed: ${order.payment.failureReason ?? 'no reason returned by the aggregator'}.`,
      entityType: 'order',
      entityId: order.id,
      entityLabel: order.id,
      targetPath: `/orders/${order.id}`,
      amount: order.total,
      raisedAt: order.placedAt,
      slaHours: 4,
    });
  });

// Payout failures. A manufacturer is owed money that did not arrive.
//
// Seeded from the OUTSTANDING attempts only - the newest attempt per settlement
// line, and only where it did not clear. The log also holds failures that a
// later retry fixed, and paging somebody about money that has since been paid
// is how an alert queue stops being read.
outstandingPayouts
  .filter((attempt) => attempt.status === 'failed')
  .forEach((attempt) => {
    seeds.push({
      category: 'payout_failed',
      severity: 'critical',
      title: 'Manufacturer payout failed',
      detail: `${attempt.manufacturerName} was not paid for ${attempt.orderId}: ${attempt.failureReason}.`,
      entityType: 'order',
      entityId: attempt.orderId,
      entityLabel: attempt.orderId,
      targetPath: settlementRunByLineId[attempt.settlementLineId]
        ? `/payments/settlements/${settlementRunByLineId[attempt.settlementLineId].id}`
        : '/payments/payouts',
      amount: attempt.amount,
      raisedAt: attempt.attemptedAt,
      slaHours: PAYOUT_SLA_HOURS,
    });
  });

// IRN failures. No dispatch without a registered invoice.
einvoiceRecords
  .filter((record) => record.status === 'failed')
  .forEach((record) => {
    seeds.push({
      category: 'irn_failed',
      severity: 'high',
      title: `IRN generation failed (${record.failureCode})`,
      detail: `${record.orderId} cannot be dispatched until an IRN is registered. ${record.failureReason}.`,
      entityType: 'order',
      entityId: record.orderId,
      entityLabel: record.orderId,
      targetPath: `/orders/${record.orderId}`,
      amount: record.invoiceValue,
      raisedAt: record.attemptedAt,
      slaHours: 12,
    });
  });

// Open disputes.
orders
  .filter((order) => order.status === 'disputed')
  .forEach((order) => {
    seeds.push({
      category: 'dispute_open',
      severity: 'critical',
      title: 'Order disputed',
      detail: `${jewellerById[order.jewellerId].businessName}: ${order.disputeReason ?? 'reason not recorded'}.`,
      entityType: 'order',
      entityId: order.id,
      entityLabel: order.id,
      targetPath: disputeByOrderId[order.id]
        ? `/trust/disputes/${disputeByOrderId[order.id].id}`
        : '/trust/disputes',
      amount: order.total,
      raisedAt: order.placedAt,
      slaHours: 24,
    });
  });

// Returns waiting on physical verification. No refund is shown as processed
// before the goods have been checked, so this queue is what holds the money.
orders
  .filter((order) => order.return && order.return.refundStatus === 'awaiting_verification')
  .forEach((order) => {
    seeds.push({
      category: 'return_pending_verification',
      severity: 'high',
      title: 'Return awaiting verification',
      detail: `${order.return.reason}. The refund cannot be released until the piece is assayed.`,
      entityType: 'order',
      entityId: order.id,
      entityLabel: order.id,
      // ADM-069 is a queue, not a detail page. There is no per-return route
      // to deep link to yet.
      targetPath: '/returns',
      amount: order.total,
      raisedAt: order.return.raisedAt,
      slaHours: 48,
    });
  });

// Feed health. These are pinned open below - an operator acknowledging a dead
// feed does not bring it back, and it must keep shouting until it recovers.
platformFeeds
  .filter((feed) => feed.status !== 'healthy')
  .forEach((feed) => {
    seeds.push({
      category: 'feed_degraded',
      severity: feed.status === 'down' ? 'critical' : 'high',
      title: `${feed.name} is ${feed.status}`,
      detail: feed.impact,
      entityType: 'feed',
      entityId: feed.id,
      entityLabel: feed.name,
      targetPath: '/operations',
      raisedAt: feed.lastSyncAt,
      slaHours: 1,
      pinnedOpen: true,
    });
  });

// Catalogue integrity. A live piece at 22K or above with no HUID cannot legally
// be sold, so it is on the marketplace and unsellable at the same time.
products
  .filter((product) => product.status === 'live' && product.purity >= 22 && !product.hallmarked)
  .forEach((product) => {
    seeds.push({
      category: 'catalogue_integrity',
      severity: 'high',
      title: 'Live listing has no hallmark',
      detail: `${product.title} is live at ${product.purity}K with no HUID recorded. ${product.sku}.`,
      entityType: 'product',
      entityId: product.id,
      entityLabel: product.title,
      targetPath: `/catalogue/products/${product.id}`,
      raisedAt: product.listedAt,
      slaHours: MODERATION_SLA_HOURS,
    });
  });

// Tickets that have gone quiet on our side.
const TICKET_SEVERITY = { urgent: 'critical', high: 'high', normal: 'medium', low: 'low' };

supportTickets
  .filter(
    (ticket) =>
      ['open', 'escalated'].includes(ticket.status) && hoursSince(ticket.lastActivityAt) > 24,
  )
  .forEach((ticket) => {
    seeds.push({
      category: 'ticket_sla_breach',
      severity: TICKET_SEVERITY[ticket.priority],
      title: 'Ticket past first response',
      detail: `${ticket.raisedByName}: ${ticket.subject}`,
      entityType: 'ticket',
      entityId: ticket.id,
      entityLabel: ticket.id,
      targetPath: `/support/tickets/${ticket.id}`,
      raisedAt: ticket.raisedAt,
      slaHours: 24,
    });
  });

// Newest first, then given ids and a lifecycle. Sorting before numbering keeps
// ALT-0001 as the most recent row, which is what an operator expects.
const RESOLUTION_NOTES = [
  'Retried against the aggregator and the credit settled.',
  'Duplicate of an earlier exception on the same order.',
  'Manufacturer confirmed the bank details and the payout was re-queued.',
  'Listing corrected by the catalogue desk and republished.',
];

export const operationalAlerts = seeds
  .sort((a, b) => Date.parse(b.raisedAt) - Date.parse(a.raisedAt))
  .map((seed, index) => {
    const ageHours = hoursSince(seed.raisedAt);

    // A spread of lifecycle states, so the queue has acknowledged, snoozed and
    // resolved rows to render and not only the happy open path.
    let status = 'open';
    if (!seed.pinnedOpen) {
      if (index % 17 === 9) status = 'resolved';
      else if (index % 13 === 7) status = 'snoozed';
      else if (index % 11 === 4) status = 'acknowledged';
    }

    const owner = index % 5 === 3 ? null : assignableStaff[index % assignableStaff.length];

    return {
      id: `ALT-${String(index + 1).padStart(4, '0')}`,
      category: seed.category,
      severity: seed.severity,
      status,
      title: seed.title,
      detail: seed.detail,
      entityType: seed.entityType,
      entityId: seed.entityId,
      entityLabel: seed.entityLabel,
      targetPath: seed.targetPath,
      amount: seed.amount ?? null,
      raisedAt: seed.raisedAt,
      ageHours,
      slaHours: seed.slaHours,
      slaBreached: ageHours > seed.slaHours,
      assigneeId: owner?.id ?? null,
      assigneeName: owner?.name ?? null,
      acknowledgedAt: status === 'open' ? null : isoHoursAgo(Math.max(1, index % 9)),
      acknowledgedBy: status === 'open' ? null : (owner?.id ?? assignableStaff[0].id),
      snoozedUntil: status === 'snoozed' ? isoDaysAhead(1 + (index % 3)) : null,
      resolvedAt: status === 'resolved' ? isoHoursAgo(index % 7) : null,
      resolutionNote:
        status === 'resolved' ? RESOLUTION_NOTES[index % RESOLUTION_NOTES.length] : null,
    };
  });

// ---------------------------------------------------------------------------
// GMV and activity - ADM-010
// ---------------------------------------------------------------------------

// GMV counts confirmed orders only, valued at the price fixed at confirmation.
// A confirmed order's price is permanent, so a past day's GMV never restates
// however far the metal rate moves afterwards.
export const dailyGmvSeries = Array.from({ length: 14 }).map((_, index) => {
  const daysBack = 13 - index;
  const dayStart = NOW_MS - daysBack * DAY_MS;
  const date = new Date(dayStart).toISOString().slice(0, 10);

  const confirmedThatDay = orders.filter(
    (order) => order.confirmedAt && order.confirmedAt.slice(0, 10) === date,
  );

  return {
    date,
    label: new Date(dayStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    gmv: confirmedThatDay.reduce((sum, order) => sum + order.total, 0),
    orders: confirmedThatDay.length,
  };
});

const ACTIVITY_TEMPLATES = [
  { module: 'onboarding', verb: 'approved the application from' },
  { module: 'catalogue', verb: 'published the listing' },
  { module: 'orders', verb: 'cancelled' },
  { module: 'payments', verb: 'released the settlement for' },
  { module: 'returns', verb: 'verified the return on' },
  { module: 'access', verb: 'invited a new staff account after a request from' },
];

// What the desk did today, newest first. Actors are real admin accounts so the
// audit trail joins up with the staff directory in ADM-006.
export const recentActivity = Array.from({ length: 12 }).map((_, index) => {
  const actor = assignableStaff[index % assignableStaff.length];
  const template = ACTIVITY_TEMPLATES[index % ACTIVITY_TEMPLATES.length];
  const order = orders[(index * 11) % orders.length];
  const manufacturer = manufacturers[(index * 5) % manufacturers.length];
  const aboutOrder = index % 2 === 0;

  return {
    id: `ACT-${String(index + 1).padStart(4, '0')}`,
    at: isoHoursAgo(0.5 + index * 1.75),
    actorId: actor.id,
    actorName: actor.name,
    module: template.module,
    summary: aboutOrder
      ? `${actor.name} ${template.verb} ${order.id}`
      : `${actor.name} ${template.verb} ${manufacturer.businessName}`,
    entityType: aboutOrder ? 'order' : 'manufacturer',
    entityId: aboutOrder ? order.id : manufacturer.id,
    targetPath: aboutOrder ? `/orders/${order.id}` : `/manufacturers/${manufacturer.id}`,
  };
});
