// Mock API for Operations overview - ADM-010, ADM-011, ADM-012.
//
// ENTITY SHAPES referenced by the contracts below:
//
// DashboardMetrics: { gmvToday, gmvSevenDay, ordersToday, ordersSevenDay,
//                     openExceptions, criticalExceptions, pendingVerifications,
//                     awaitingModeration, ordersNeedingIntervention, failedIrns,
//                     failedPayouts, openDisputes }
//   Every count is of OPEN alerts. See the note on getOperationsSummary.
//
// WorkQueue: { id, category, count, tone: 'neutral'|'info'|'warning'|'danger',
//              targetPath, oldestRaisedAt: ISO|null, slaBreachedCount }
//
// GmvPoint: { date: 'YYYY-MM-DD', label, gmv, orders }
//
// ActivityEntry: { id, at: ISO, actorId, actorName, module, summary,
//                  entityType, entityId, targetPath }
//
// GoldRateSnapshot: { source, capturedAt: ISO, nextRefreshAt: ISO,
//                     stale: boolean,
//                     rates: [{ purity: 24|22|18|14, ratePerGram,
//                               previousRatePerGram, changePercent }] }
//
// FeedStatus: { id, name,
//               category: 'pricing'|'payments'|'logistics'|'tax'|'identity'
//                         |'messaging',
//               status: 'healthy'|'degraded'|'down', lastSyncAt: ISO,
//               latencyMs: number|null, successRate24h, message, impact }
//
// SearchResult: { id, entityType: 'manufacturer'|'jeweller'|'order'|'product'
//                                 |'ticket',
//                 title, subtitle, identifier, status, visibility: string|null,
//                 meta: [{ label, value }], amount: number|null, at: ISO|null,
//                 targetPath, score }
//
// SearchGroup: { entityType, total, results: SearchResult[] }
//
// Alert: { id, category, severity: 'critical'|'high'|'medium'|'low',
//          status: 'open'|'acknowledged'|'snoozed'|'resolved', title, detail,
//          entityType: 'manufacturer'|'jeweller'|'order'|'product'|'ticket'
//                      |'feed',
//          entityId, entityLabel, targetPath, amount: number|null,
//          raisedAt: ISO, ageHours, slaHours, slaBreached,
//          assigneeId: AdminUser.id|null, assigneeName: string|null,
//          acknowledgedAt: ISO|null, acknowledgedBy: AdminUser.id|null,
//          snoozedUntil: ISO|null, resolvedAt: ISO|null,
//          resolutionNote: string|null }
//   category: 'verification_ageing'|'listing_moderation'|'order_intervention'
//           |'payment_failed'|'payout_failed'|'irn_failed'|'dispute_open'
//           |'return_pending_verification'|'feed_degraded'
//           |'catalogue_integrity'|'ticket_sla_breach'
//
// AlertCounts: { total, open, acknowledged, snoozed, resolved, slaBreached,
//                bySeverity: { critical, high, medium, low },
//                byCategory: { <category>: number } }

import { MockApiError, applyFilters, applySearch, mockRequest, paginate } from './_client';
import { adminUsers, jewellerById, manufacturerById, orders, products } from '@/data/core';
import {
  OPERATIONS_NOW,
  SEVERITY_RANK,
  dailyGmvSeries,
  goldRateSnapshot,
  operationalAlerts,
  platformFeeds,
  recentActivity,
  supportTickets,
} from '@/data/operationsFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let alertRecords = operationalAlerts.map((alert) => ({ ...alert }));
let feedRecords = platformFeeds.map((feed) => ({ ...feed }));

const NOW_MS = Date.parse(OPERATIONS_NOW);
const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEFAULT_LIMIT = 50;

// Rejects after the same latency a success would take, so the loading state is
// exercised on the failure path too.
function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Operations overview - ADM-010
// ---------------------------------------------------------------------------

const WORK_QUEUE_DEFINITIONS = [
  { id: 'pending-verifications', category: 'verification_ageing', tone: 'warning', targetPath: '/onboarding/applications' },
  { id: 'awaiting-moderation', category: 'listing_moderation', tone: 'warning', targetPath: '/catalogue/moderation' },
  { id: 'orders-intervention', category: 'order_intervention', tone: 'warning', targetPath: '/orders' },
  { id: 'failed-irns', category: 'irn_failed', tone: 'danger', targetPath: '/orders/invoices' },
  { id: 'failed-payouts', category: 'payout_failed', tone: 'danger', targetPath: '/payments/settlements' },
  { id: 'open-disputes', category: 'dispute_open', tone: 'danger', targetPath: '/returns/disputes' },
];

function openAlertsIn(category) {
  return alertRecords.filter((alert) => alert.status === 'open' && alert.category === category);
}

function sumGmv(points) {
  return points.reduce((total, point) => total + point.gmv, 0);
}

function sumOrders(points) {
  return points.reduce((total, point) => total + point.orders, 0);
}

// BACKEND CONTRACT
// GET /admin/operations/summary
// Query: { gmvDays }   default 14, maximum 90
// Returns: { metrics: DashboardMetrics, workQueues: WorkQueue[],
//            gmvSeries: GmvPoint[], activity: ActivityEntry[],
//            refreshedAt: ISO }
// Notes: GMV counts confirmed orders only, valued at the price fixed at
//        confirmation. A confirmed order's price is permanent, so a past day's
//        GMV never restates however far the metal rate moves afterwards.
//        gmvToday is 0 until the first order of the day is confirmed, and that
//        zero is real - do not backfill it from yesterday.
//        Every exception count is a count of OPEN alerts from the same feed
//        that GET /admin/operations/alerts pages over. Deriving them anywhere
//        else is how a dashboard starts disagreeing with its own queue.
export function getOperationsSummary({ gmvDays = 14 } = {}) {
  const gmvSeries = dailyGmvSeries.slice(-Math.min(gmvDays, 90));
  const recentWeek = gmvSeries.slice(-7);

  const workQueues = WORK_QUEUE_DEFINITIONS.map((definition) => {
    const open = openAlertsIn(definition.category);
    const oldest = open.reduce(
      (earliest, alert) => (!earliest || alert.raisedAt < earliest ? alert.raisedAt : earliest),
      null,
    );

    return {
      id: definition.id,
      category: definition.category,
      count: open.length,
      tone: open.length === 0 ? 'neutral' : definition.tone,
      targetPath: definition.targetPath,
      oldestRaisedAt: oldest,
      slaBreachedCount: open.filter((alert) => alert.slaBreached).length,
    };
  });

  const openAlerts = alertRecords.filter((alert) => alert.status === 'open');

  const metrics = {
    gmvToday: gmvSeries[gmvSeries.length - 1]?.gmv ?? 0,
    gmvSevenDay: sumGmv(recentWeek),
    ordersToday: gmvSeries[gmvSeries.length - 1]?.orders ?? 0,
    ordersSevenDay: sumOrders(recentWeek),
    openExceptions: openAlerts.length,
    criticalExceptions: openAlerts.filter((alert) => alert.severity === 'critical').length,
    pendingVerifications: openAlertsIn('verification_ageing').length,
    awaitingModeration: openAlertsIn('listing_moderation').length,
    ordersNeedingIntervention: openAlertsIn('order_intervention').length,
    failedIrns: openAlertsIn('irn_failed').length,
    failedPayouts: openAlertsIn('payout_failed').length,
    openDisputes: openAlertsIn('dispute_open').length,
  };

  return mockRequest(() => ({
    metrics,
    workQueues,
    gmvSeries,
    activity: recentActivity,
    refreshedAt: nowIso(),
  }));
}

// BACKEND CONTRACT
// GET /admin/operations/gold-rate
// Returns: GoldRateSnapshot
// Notes: `stale` is true when capturedAt is older than the metal rate feed's
//        refresh interval. A stale rate only affects listings nobody has
//        ordered yet - a confirmed order's price is permanent - which is why
//        the dashboard renders it as a warning and not as a critical.
export function getGoldRate() {
  return mockRequest(goldRateSnapshot);
}

// BACKEND CONTRACT
// GET /admin/operations/feeds
// Returns: { items: FeedStatus[] }
// Notes: ordered worst-first, so a down feed is the first thing on the panel.
//        latencyMs is null when the feed is down and returned no response.
export function listFeedStatus() {
  const health = { down: 0, degraded: 1, healthy: 2 };
  return mockRequest(() => ({
    items: [...feedRecords].sort((a, b) => health[a.status] - health[b.status]),
  }));
}

// BACKEND CONTRACT
// POST /admin/operations/feeds/:feedId/refresh
// Returns: FeedStatus
// Errors: 404 feed_not_found, 502 feed_unreachable
// Notes: a manual re-sync. A feed that is down stays down and returns 502 -
//        the button exists to clear a degraded feed that has already
//        recovered upstream, not to will a dead integration back to life.
export function refreshFeed({ feedId } = {}) {
  const feed = feedRecords.find((candidate) => candidate.id === feedId);
  if (!feed) return mockError('feed_not_found', 'That integration is not registered', 404);

  if (feed.status === 'down') {
    return mockError('feed_unreachable', `${feed.name} did not respond to the re-sync`, 502);
  }

  const refreshed = {
    ...feed,
    status: 'healthy',
    lastSyncAt: nowIso(),
    successRate24h: Math.min(99.9, feed.successRate24h + 12),
    message: 'Re-synced manually and responding normally.',
    impact: 'None.',
  };

  feedRecords = feedRecords.map((row) => (row.id === feedId ? refreshed : row));
  return mockRequest(refreshed);
}

// ---------------------------------------------------------------------------
// Global search - ADM-011
// ---------------------------------------------------------------------------

// The order groups render in when nothing stands out. An exact identifier
// match overrides it - see the group sort in searchEverything.
const SEARCH_ENTITY_ORDER = ['manufacturer', 'jeweller', 'order', 'product', 'ticket'];

// One flat index, built once. `haystack` is everything a person might type to
// find this row: ids, names, tax numbers, SKUs, HUIDs, AWBs and payment
// references, because an operator on a phone call has whichever one the caller
// happens to be reading out.
function buildSearchIndex() {
  const entries = [];

  Object.values(manufacturerById).forEach((manufacturer) => {
    entries.push({
      id: manufacturer.id,
      entityType: 'manufacturer',
      title: manufacturer.businessName,
      subtitle: `${manufacturer.contactName} · ${manufacturer.city}`,
      identifier: manufacturer.id,
      status: manufacturer.status,
      visibility: null,
      meta: [
        { label: 'gstin', value: manufacturer.gstin },
        { label: 'categories', value: manufacturer.categories.join(', ') },
      ],
      amount: manufacturer.lifetimeGmv,
      at: manufacturer.appliedAt,
      targetPath: `/manufacturers/${manufacturer.id}`,
      haystack: [
        manufacturer.id,
        manufacturer.businessName,
        manufacturer.legalName,
        manufacturer.contactName,
        manufacturer.email,
        manufacturer.gstin,
        manufacturer.pan,
        manufacturer.bisLicence,
        manufacturer.city,
      ],
    });
  });

  Object.values(jewellerById).forEach((jeweller) => {
    entries.push({
      id: jeweller.id,
      entityType: 'jeweller',
      title: jeweller.businessName,
      subtitle: `${jeweller.contactName} · ${jeweller.city}`,
      identifier: jeweller.id,
      status: jeweller.status,
      visibility: null,
      meta: [
        { label: 'gstin', value: jeweller.gstin },
        { label: 'shopType', value: jeweller.shopType },
      ],
      amount: jeweller.lifetimeSpend,
      at: jeweller.registeredAt,
      targetPath: `/jewellers/${jeweller.id}`,
      haystack: [
        jeweller.id,
        jeweller.businessName,
        jeweller.contactName,
        jeweller.email,
        jeweller.gstin,
        jeweller.city,
      ],
    });
  });

  orders.forEach((order) => {
    const jeweller = jewellerById[order.jewellerId];
    entries.push({
      id: order.id,
      entityType: 'order',
      title: order.id,
      subtitle: `${jeweller.businessName} · ${order.shippingCity}`,
      identifier: order.id,
      status: order.status,
      visibility: null,
      meta: [
        { label: 'lines', value: String(order.lines.length) },
        { label: 'awb', value: order.awb },
      ],
      amount: order.total,
      at: order.placedAt,
      targetPath: `/orders/${order.id}`,
      haystack: [
        order.id,
        order.awb,
        order.payment.reference,
        order.settlement.nodalReference,
        jeweller.businessName,
        order.shippingCity,
        ...order.lines.map((line) => line.sku),
      ],
    });
  });

  products.forEach((product) => {
    entries.push({
      id: product.id,
      entityType: 'product',
      title: product.title,
      subtitle: `${manufacturerById[product.manufacturerId].businessName} · ${product.sku}`,
      identifier: product.sku,
      status: product.status,
      // Private pieces are returned here and marked. This is an internal
      // surface: the rule that a private piece never appears publicly is a
      // marketplace rule, and hiding it from the admin who has to answer for
      // it would be a different bug.
      visibility: product.visibility,
      meta: [
        { label: 'purity', value: product.purity },
        { label: 'netWeight', value: product.netWeight },
      ],
      amount: product.price.total,
      at: product.listedAt,
      targetPath: `/catalogue/products/${product.id}`,
      haystack: [
        product.id,
        product.sku,
        product.title,
        product.huid,
        product.category,
        manufacturerById[product.manufacturerId].businessName,
      ],
    });
  });

  supportTickets.forEach((ticket) => {
    entries.push({
      id: ticket.id,
      entityType: 'ticket',
      title: ticket.subject,
      subtitle: `${ticket.raisedByName} · ${ticket.id}`,
      identifier: ticket.id,
      status: ticket.status,
      visibility: null,
      meta: [
        { label: 'priority', value: ticket.priority },
        { label: 'orderId', value: ticket.orderId },
      ],
      amount: null,
      at: ticket.raisedAt,
      targetPath: `/support/tickets/${ticket.id}`,
      haystack: [ticket.id, ticket.subject, ticket.raisedByName, ticket.orderId],
    });
  });

  return entries;
}

const searchIndex = buildSearchIndex();

// An exact id beats a prefix beats a substring. Typing a full order number must
// put that order first even when forty product titles also contain the digits.
function scoreEntry(entry, needle) {
  const identifier = String(entry.identifier ?? '').toLowerCase();
  const title = String(entry.title ?? '').toLowerCase();

  if (identifier === needle || String(entry.id).toLowerCase() === needle) return 100;
  if (identifier.startsWith(needle)) return 80;
  if (title.startsWith(needle)) return 65;
  if (title.includes(needle)) return 50;

  const matched = entry.haystack.some((field) =>
    String(field ?? '').toLowerCase().includes(needle),
  );
  return matched ? 35 : 0;
}

// BACKEND CONTRACT
// GET /admin/search
// Query: { q, entityType, limit }
//        entityType: 'all'|'manufacturer'|'jeweller'|'order'|'product'|'ticket'
//        limit defaults to 50 and caps at 200
// Returns: { term, groups: SearchGroup[], countsByType, total, truncated }
//          countsByType: { all, manufacturer, jeweller, order, product, ticket }
// Errors: 422 search_term_too_short  (minimum 2 characters)
// Notes: matches id, business name, legal name, contact name, email, GSTIN,
//        PAN, BIS licence, SKU, HUID, AWB, payment reference, nodal reference
//        and ticket subject. Ranked exact identifier, then prefix, then
//        substring, then most recent.
//        countsByType is computed BEFORE the entityType filter, so the tab
//        counts do not collapse to one number the moment a tab is chosen.
//        Groups are ordered by their best-scoring member so an exact
//        identifier match leads, then by the fixed entity order above.
//        Private catalogue pieces are returned and carry visibility 'private'.
//        The caller must render that marker.
export function searchEverything({ term, entityType = 'all', limit = SEARCH_DEFAULT_LIMIT } = {}) {
  const needle = String(term ?? '').trim().toLowerCase();

  if (needle.length < SEARCH_MIN_LENGTH) {
    return mockError(
      'search_term_too_short',
      `Enter at least ${SEARCH_MIN_LENGTH} characters to search`,
      422,
    );
  }

  const matched = searchIndex
    .map((entry) => ({ entry, score: scoreEntry(entry, needle) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.entry.at ?? 0) - Date.parse(a.entry.at ?? 0));

  const countsByType = SEARCH_ENTITY_ORDER.reduce(
    (counts, type) => ({
      ...counts,
      [type]: matched.filter((row) => row.entry.entityType === type).length,
    }),
    { all: matched.length },
  );

  const scoped =
    entityType === 'all' ? matched : matched.filter((row) => row.entry.entityType === entityType);
  const capped = scoped.slice(0, Math.min(limit, 200));

  const groups = SEARCH_ENTITY_ORDER.map((type, order) => {
    const results = capped
      .filter((row) => row.entry.entityType === type)
      // haystack is an index detail. It never crosses the wire.
      .map(({ entry, score }) => {
        const { haystack, ...result } = entry;
        return { ...result, score };
      });

    return {
      entityType: type,
      total: results.length,
      results,
      topScore: results[0]?.score ?? 0,
      order,
    };
  })
    .filter((group) => group.results.length > 0)
    // Typing a full SKU has to put that piece first, not leave it below the two
    // orders that happen to contain the same line. Groups therefore lead with
    // their best match, and fall back to the fixed order when scores tie.
    .sort((a, b) => b.topScore - a.topScore || a.order - b.order)
    .map(({ topScore, order, ...group }) => group);

  return mockRequest(() => ({
    term: String(term ?? '').trim(),
    groups,
    countsByType,
    total: scoped.length,
    truncated: scoped.length > capped.length,
  }));
}

// ---------------------------------------------------------------------------
// Alerts and exceptions - ADM-012
// ---------------------------------------------------------------------------

const ALERT_SEARCH_FIELDS = ['id', 'title', 'detail', 'entityLabel', 'entityId', 'assigneeName'];

// Everything except status, which the counts deliberately ignore. See
// getAlertCounts.
function narrowAlerts({ search, filters = {} }) {
  const searched = applySearch(alertRecords, search, ALERT_SEARCH_FIELDS);
  const scoped = applyFilters(searched, {
    severity: filters.severity,
    category: filters.category,
  });

  // 'unassigned' is a real choice in the owner filter, not an absent one, so it
  // cannot go through applyFilters - a null assigneeId would never equal it.
  if (filters.assigneeId === 'unassigned') {
    return scoped.filter((alert) => !alert.assigneeId);
  }

  return applyFilters(scoped, { assigneeId: filters.assigneeId });
}

function sortAlerts(rows, sortBy, sortDir) {
  const direction = sortDir === 'asc' ? 1 : -1;

  // Severity is an ordered vocabulary, not a word. Sorting it alphabetically
  // would put critical after high on the one column an operator sorts by most.
  if (sortBy === 'severity') {
    return [...rows].sort(
      (a, b) => (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) * -direction,
    );
  }

  return [...rows].sort((a, b) => {
    const left = a[sortBy] ?? '';
    const right = b[sortBy] ?? '';
    if (left === right) return 0;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
    return String(left).localeCompare(String(right)) * direction;
  });
}

// BACKEND CONTRACT
// GET /admin/operations/alerts
// Query: { search, severity, category, status, assigneeId, page, pageSize,
//          sortBy, sortDir }
//        severity: 'critical'|'high'|'medium'|'low'
//        category: see the Alert shape at the head of this file
//        status:   'open'|'acknowledged'|'snoozed'|'resolved'
//        assigneeId: AdminUser.id, or 'unassigned' for the unowned rows
// Returns: { items: Alert[], total, page, pageSize }
// Notes: default sort raisedAt desc. sortBy 'severity' ranks
//        critical > high > medium > low, never alphabetically.
//        Resolved alerts are returned, not hidden - an operator has to be able
//        to see what was closed and on what grounds.
export function listAlerts({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const byStatus = applyFilters(narrowAlerts({ search, filters }), {
      status: filters.status,
    });
    const sorted = sortAlerts(byStatus, sortBy ?? 'raisedAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/operations/alerts/counts
// Query: { search, severity, category, assigneeId }
// Returns: AlertCounts
// Notes: unpaginated, and computed WITHOUT the status filter. The strip exists
//        to tell an operator how much is still open versus already handled, so
//        applying the status filter to it would make it echo the choice they
//        just made and answer nothing.
export function getAlertCounts({ search, filters = {} } = {}) {
  return mockRequest(() => {
    const scoped = narrowAlerts({ search, filters });

    const countBy = (key) =>
      scoped.reduce((counts, alert) => {
        counts[alert[key]] = (counts[alert[key]] ?? 0) + 1;
        return counts;
      }, {});

    const byStatus = countBy('status');
    const bySeverity = countBy('severity');

    return {
      total: scoped.length,
      open: byStatus.open ?? 0,
      acknowledged: byStatus.acknowledged ?? 0,
      snoozed: byStatus.snoozed ?? 0,
      resolved: byStatus.resolved ?? 0,
      slaBreached: scoped.filter((alert) => alert.slaBreached && alert.status !== 'resolved').length,
      bySeverity: {
        critical: bySeverity.critical ?? 0,
        high: bySeverity.high ?? 0,
        medium: bySeverity.medium ?? 0,
        low: bySeverity.low ?? 0,
      },
      byCategory: countBy('category'),
    };
  });
}

// Shared by the three bulk mutations. Returns a MockApiError promise on the
// first problem, or null when every id is safe to write.
function guardAlertIds(alertIds) {
  if (!Array.isArray(alertIds) || alertIds.length === 0) {
    return mockError('validation_failed', 'Select at least one exception', 422);
  }

  const missing = alertIds.find((id) => !alertRecords.some((alert) => alert.id === id));
  if (missing) return mockError('alert_not_found', `${missing} no longer exists`, 404);

  const closed = alertIds.find((id) =>
    alertRecords.some((alert) => alert.id === id && alert.status === 'resolved'),
  );
  if (closed) return mockError('alert_already_resolved', `${closed} is already resolved`, 409);

  return null;
}

function writeAlerts(alertIds, patch) {
  const updated = [];

  alertRecords = alertRecords.map((alert) => {
    if (!alertIds.includes(alert.id)) return alert;
    const next = { ...alert, ...patch };
    updated.push(next);
    return next;
  });

  return updated;
}

// BACKEND CONTRACT
// POST /admin/operations/alerts/acknowledge
// Body: { alertIds: string[], note }
// Returns: { updated: Alert[] }
// Errors: 404 alert_not_found, 409 alert_already_resolved,
//         422 validation_failed
// Notes: acknowledging says a human has seen it, not that it is fixed. The row
//        stays in the feed and keeps ageing against its SLA.
export function acknowledgeAlerts({ alertIds, note } = {}) {
  const rejection = guardAlertIds(alertIds);
  if (rejection) return rejection;

  const updated = writeAlerts(alertIds, {
    status: 'acknowledged',
    acknowledgedAt: nowIso(),
    resolutionNote: note?.trim() || null,
  });

  return mockRequest({ updated });
}

// BACKEND CONTRACT
// POST /admin/operations/alerts/snooze
// Body: { alertIds: string[], untilAt: ISO, note }
// Returns: { updated: Alert[] }
// Errors: 404 alert_not_found, 409 alert_already_resolved,
//         422 validation_failed, 422 snooze_in_past
// Notes: a snoozed alert leaves the open queue and returns to it at untilAt.
//        It is not resolved, and its SLA clock does not stop.
export function snoozeAlerts({ alertIds, untilAt, note } = {}) {
  const rejection = guardAlertIds(alertIds);
  if (rejection) return rejection;

  if (!untilAt || Date.parse(untilAt) <= NOW_MS) {
    return mockError('snooze_in_past', 'Choose a time in the future', 422);
  }

  const updated = writeAlerts(alertIds, {
    status: 'snoozed',
    snoozedUntil: untilAt,
    acknowledgedAt: nowIso(),
    resolutionNote: note?.trim() || null,
  });

  return mockRequest({ updated });
}

// BACKEND CONTRACT
// POST /admin/operations/alerts/resolve
// Body: { alertIds: string[], note }
// Returns: { updated: Alert[] }
// Errors: 404 alert_not_found, 409 alert_already_resolved,
//         422 validation_failed, 422 resolution_note_required
// Notes: the note is mandatory and the server must enforce it. An exception
//        closed without a written reason is indistinguishable from one that was
//        quietly ignored, and the next operator has no way to tell which it
//        was.
export function resolveAlerts({ alertIds, note } = {}) {
  const rejection = guardAlertIds(alertIds);
  if (rejection) return rejection;

  if (!String(note ?? '').trim()) {
    return mockError('resolution_note_required', 'Say how this was resolved', 422);
  }

  const updated = writeAlerts(alertIds, {
    status: 'resolved',
    resolvedAt: nowIso(),
    resolutionNote: String(note).trim(),
  });

  return mockRequest({ updated });
}

// BACKEND CONTRACT
// POST /admin/operations/alerts/:alertId/assign
// Body: { assigneeId: AdminUser.id|null }
// Returns: Alert
// Errors: 404 alert_not_found, 404 admin_not_found,
//         409 alert_already_resolved
// Notes: a null assigneeId returns the row to the unowned pool. Only active
//        admin accounts may be assigned - work parked on someone who cannot
//        sign in is how a queue silently stops moving.
export function assignAlert({ alertId, assigneeId } = {}) {
  const alert = alertRecords.find((candidate) => candidate.id === alertId);
  if (!alert) return mockError('alert_not_found', `${alertId} no longer exists`, 404);
  if (alert.status === 'resolved') {
    return mockError('alert_already_resolved', `${alertId} is already resolved`, 409);
  }

  const assignee = assigneeId
    ? adminUsers.find((user) => user.id === assigneeId && user.status === 'active')
    : null;
  if (assigneeId && !assignee) {
    return mockError('admin_not_found', 'That account cannot take work', 404);
  }

  const [updated] = writeAlerts([alertId], {
    assigneeId: assignee?.id ?? null,
    assigneeName: assignee?.name ?? null,
  });

  return mockRequest(updated);
}
