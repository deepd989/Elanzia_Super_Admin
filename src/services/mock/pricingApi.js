// Mock API for Pricing control - ADM-035 to ADM-041.
//
// ENTITY SHAPES referenced by the contracts below:
//
// MetalRate: { id, metal, metalLabel, purity, purityLabel, isReference,
//              ratePerGram, previousRatePerGram, changePercent,
//              source: 'IBJA'|'derived'|'manual_override',
//              derivedFrom: MetalRate.id|null, factorApplied: number|null,
//              nominalFactor, nominalRate, deviationPercent,
//              beyondTolerance: boolean, overrideId: string|null }
//   `source` says where the number came from. A quoted purity is a fact off
//   the feed; a derived one is the reference purity times the configured
//   factor; an overridden one is a human decision and names the override.
//
// RateFeed: { id, name, provider, category, metals: string[], isPrimary,
//             status: 'healthy'|'degraded'|'down', lastSyncAt, latencyMs,
//             successRate24h, uptime7d, uptime30d, consecutiveFailures,
//             pollIntervalMinutes, staleAfterMinutes, quotesPerDay,
//             quotesReceivedToday, message, impact }
//
// RateHistoryPoint: { date, metal, purity, ratePerGram, source }
//
// FeedIncident: { id, feedId, feedName, cause, causeLabel, startedAt,
//                 endedAt: ISO|null, durationMinutes: number|null,
//                 quotesMissed, overrideApplied, resolvedBy: AdminUser.id|null }
//
// RateOverride: { id, metal, purity, ratePerGram, feedRateAtOverride,
//                 deviationPercent, reason, createdAt, createdBy,
//                 createdByName, effectiveFrom, expiresAt, endedAt, endedBy,
//                 endNote, state: 'active'|'expired'|'ended', linkedIncidentId }
//
// PurityFactor: { metal, metalLabel, purity, purityLabel, factor,
//                 nominalFactor, deviationPercent, isCustom, quoted,
//                 resultingRatePerGram, updatedAt, updatedBy }
//
// ChargeRule: { id, label, wastageMinPercent, wastageMaxPercent,
//               makingMinPerGram, makingMaxPerGram, commissionPercent,
//               gstPercent, updatedAt, updatedBy }
// CategoryChargeRule: ChargeRule + { category, listingCount }
//
// ListingViolation: { productId, sku, title, category, manufacturerId,
//                     manufacturerName, field, value, min, max }
//
// TreasuryPolicy: { quotationLockMinutes, cartLockMinutes,
//                   orderConfirmationLockMinutes, toleranceBandPercent,
//                   breachAction, reconfirmationWindowHours,
//                   autoCancelAfterHours, overridePermission,
//                   updatedAt, updatedBy }
//
// BulkRefreshPreview: { productsInScope, productsChanged, unchanged,
//                       avgChangePercent, maxIncreasePercent,
//                       maxDecreasePercent, biggestMovers: PriceMove[],
//                       confirmedOrdersExcluded, estimatedSeconds }
// PriceMove: { productId, sku, title, oldTotal, newTotal, changePercent }
//
// RefreshJob: { id, scope, status: 'queued'|'running'|'completed'|'failed'
//               |'cancelled', progress, productsInScope, productsProcessed,
//               productsChanged, ordersRepriced, triggerRatePerGram,
//               startedAt, completedAt, startedBy, startedByName, error }
//
// OrderImpact: { orderId, jewellerName, lockedRatePerGram, newRatePerGram,
//                movePercent, withinBand, oldTotal, newTotal }

import { MockApiError, mockRequest, queryCollection } from './_client';
import {
  METALS,
  adminUsers,
  manufacturerById,
  metalRates,
  metalRateHistory,
  orders,
  products,
  purityFactors as corePurityFactors,
  rateSnapshotMeta,
  ratesForFactors,
} from '@/data/core';
import {
  MAX_OVERRIDE_DEVIATION_PERCENT,
  LOCK_MINUTE_LIMITS,
  TOLERANCE_BAND_LIMITS,
  bulkRefreshJobs,
  categoryChargeRules,
  chargeRuleDefaults,
  feedIncidents,
  rateFeeds,
  rateOverrides,
  treasuryPolicy,
} from '@/data/pricingFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A refresh resets them, which is correct for a
// prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let feedRecords = rateFeeds.map((feed) => ({ ...feed }));
let overrideRecords = rateOverrides.map((row) => ({ ...row }));
let factorRecords = corePurityFactors.map((row) => ({ ...row }));
let defaultsRecord = { ...chargeRuleDefaults };
let categoryRuleRecords = categoryChargeRules.map((row) => ({ ...row }));
let policyRecord = { ...treasuryPolicy };
let jobRecords = bulkRefreshJobs.map((job) => ({ ...job }));
let snapshotMeta = { ...rateSnapshotMeta };

// The catalogue prices bulk refresh rewrites. Cloned so a refresh is visible
// to anything reading through this module without mutating the core fixture.
let pricedProducts = products.map((product) => ({ ...product, price: { ...product.price } }));

let actingAdminId = 'STF-001';

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the mock's audit trail names a real person, and it goes
// away with the mock layer. Do not build a route for it.
export function setActingAdmin(adminId) {
  if (adminId) actingAdminId = adminId;
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

// Rejects after the same latency a success would take, so the loading state is
// exercised on the failure path too. mockRequest cannot carry a thrown error
// out of its data callback, so the throw goes in a .then instead.
function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

// Redux freezes whatever it stores. These rows are this module's own mutable
// records, so handing out the live objects would freeze them and make the next
// mutation throw. Every list endpoint returns copies instead.
function queryRows(rows, options) {
  const result = queryCollection(rows, options);
  return { ...result, items: result.items.map((row) => ({ ...row })) };
}

const nowIso = () => new Date().toISOString();
const round = (value, dp = 2) => Number(Number(value).toFixed(dp));
const pad = (n, w) => String(n).padStart(w, '0');
const precisionFor = (metal) => (metal === 'silver' ? 2 : 0);
const adminName = (id) => adminUsers.find((user) => user.id === id)?.name ?? null;

function isOverrideLive(override, at = Date.now()) {
  if (override.state !== 'active') return false;
  if (override.endedAt) return false;
  return Date.parse(override.expiresAt) > at;
}

function liveOverrides() {
  const at = Date.now();
  return overrideRecords.filter((override) => isOverrideLive(override, at));
}

// The board. Feed and factor rates from core, with any live override laid over
// the top. An override supersedes the feed until it expires, and the row says
// so rather than passing a human decision off as a market quote.
function effectiveRates() {
  const derived = ratesForFactors(factorRecords);
  const live = liveOverrides();

  return derived.map((rate) => {
    const override = live.find(
      (row) => row.metal === rate.metal && row.purity === rate.purity,
    );
    if (!override) return { ...rate, overrideId: null };

    const previous = rate.previousRatePerGram;
    return {
      ...rate,
      ratePerGram: override.ratePerGram,
      changePercent: round(((override.ratePerGram - previous) / previous) * 100, 2),
      source: 'manual_override',
      derivedFrom: null,
      factorApplied: null,
      deviationPercent: round(
        ((override.ratePerGram - rate.nominalRate) / rate.nominalRate) * 100,
        3,
      ),
      overrideId: override.id,
    };
  });
}

const rateFor = (metal, purity) =>
  effectiveRates().find((rate) => rate.metal === metal && rate.purity === purity) ?? null;

// Price = (metal rate x net weight) + wastage + making charges + stone value
// + GST. Wastage is ADDED, not deducted - trade convention.
function repriceAt(product, ratePerGram) {
  const price = product.price;
  const metalValue = Math.round(ratePerGram * price.netWeight);
  const wastageValue = Math.round((metalValue * price.wastagePercent) / 100);
  const makingCharges = Math.round(price.makingChargesPerGram * price.netWeight);
  const stoneValue = price.stoneValue;
  const subtotal = metalValue + wastageValue + makingCharges + stoneValue;
  const gstValue = Math.round((subtotal * price.gstPercent) / 100);

  return {
    ...price,
    metalRatePerGram: ratePerGram,
    metalValue,
    wastageValue,
    makingCharges,
    subtotal,
    gstValue,
    total: subtotal + gstValue,
  };
}

// Live and out-of-stock listings carry an indicative price. Drafts, rejected
// and archived ones do not, so a refresh has no reason to touch them.
const REPRICEABLE = new Set(['live', 'out_of_stock']);

function productsInScope(scope = {}) {
  return pricedProducts.filter((product) => {
    if (!REPRICEABLE.has(product.status)) return false;
    if (scope.type === 'category') return product.category === scope.category;
    if (scope.type === 'manufacturer') return product.manufacturerId === scope.manufacturerId;
    if (scope.type === 'purity') return String(product.purity) === String(scope.purity);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Rate board - ADM-035
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/pricing/rates
// Returns: { items: MetalRate[], source, capturedAt, nextRefreshAt,
//            refreshIntervalMinutes, stale, activeOverrideCount }
// Notes: one row per metal and purity, reference purity first within each
//        metal. `stale` is true when capturedAt is older than the feed's
//        refresh interval. A stale rate only affects listings nobody has
//        ordered yet - a confirmed order's price is permanent.
export function listMetalRates() {
  return mockRequest(() => ({
    items: effectiveRates(),
    ...snapshotMeta,
    activeOverrideCount: liveOverrides().length,
  }));
}

// BACKEND CONTRACT
// POST /admin/pricing/rates/refresh
// Returns: the same envelope as GET /admin/pricing/rates
// Errors: 502 feed_unreachable
// Notes: a manual re-sync of the primary feed. A feed that is down stays down
//        and returns 502 - the button exists to clear a degraded feed that has
//        already recovered upstream, not to will a dead integration back to
//        life. Live overrides are NOT cleared by a successful refresh; the desk
//        ends them deliberately in ADM-037.
export function refreshRatesFromFeed() {
  const primary = feedRecords.find((feed) => feed.isPrimary);

  if (!primary || primary.status === 'down') {
    return mockError('feed_unreachable', `${primary?.name ?? 'The rate feed'} did not respond`, 502);
  }

  primary.status = 'healthy';
  primary.lastSyncAt = nowIso();
  primary.consecutiveFailures = 0;
  primary.message = 'Re-synced manually and quoting normally.';
  primary.impact = 'None.';

  snapshotMeta = {
    ...snapshotMeta,
    capturedAt: nowIso(),
    nextRefreshAt: new Date(Date.now() + snapshotMeta.refreshIntervalMinutes * 60000).toISOString(),
    stale: false,
  };

  return mockRequest(() => ({
    items: effectiveRates(),
    ...snapshotMeta,
    activeOverrideCount: liveOverrides().length,
  }));
}

// ---------------------------------------------------------------------------
// Feed health and history - ADM-036
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/pricing/feeds
// Returns: { items: RateFeed[] }
// Notes: rate feeds only. The platform-wide integration list belongs to
//        ADM-010 and is a different endpoint. Ordered worst-first, and the
//        primary feed sorts ahead of a standby at equal health.
export function listRateFeeds() {
  const rank = { down: 0, degraded: 1, healthy: 2 };
  return mockRequest(() => ({
    items: [...feedRecords]
      .sort((a, b) => rank[a.status] - rank[b.status] || Number(b.isPrimary) - Number(a.isPrimary))
      .map((feed) => ({ ...feed })),
  }));
}

// BACKEND CONTRACT
// POST /admin/pricing/feeds/:feedId/test
// Returns: RateFeed
// Errors: 404 feed_not_found, 502 feed_unreachable
// Notes: a single probe. It does not change the rate on the board - use
//        POST /admin/pricing/rates/refresh for that.
export function testRateFeed(feedId) {
  const feed = feedRecords.find((row) => row.id === feedId);
  if (!feed) return mockError('feed_not_found', 'That feed is not registered', 404);
  if (feed.status === 'down') {
    return mockError('feed_unreachable', `${feed.name} did not respond to the probe`, 502);
  }

  feed.lastSyncAt = nowIso();
  feed.latencyMs = feed.isPrimary ? 6100 : 380;
  return mockRequest({ ...feed });
}

// BACKEND CONTRACT
// GET /admin/pricing/rates/history
// Query: { metal, purity, range: '7d'|'30d'|'90d'|'180d' }
// Returns: { items: RateHistoryPoint[], metal, purity, range, high, low,
//            first, last, changePercent }
// Errors: 404 series_not_found
// Notes: oldest first, one point per trading session, so the series can be
//        charted without sorting. high and low are over the requested range.
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90, '180d': 180 };

export function getRateHistory({ metal = 'gold', purity = 24, range = '30d' } = {}) {
  const days = RANGE_DAYS[range] ?? 30;
  const series = metalRateHistory.filter(
    (point) => point.metal === metal && String(point.purity) === String(purity),
  );

  if (series.length === 0) {
    return mockError('series_not_found', 'No history for that metal and purity', 404);
  }

  const items = series.slice(-days);
  const values = items.map((point) => point.ratePerGram);
  const first = values[0];
  const last = values[values.length - 1];

  return mockRequest(() => ({
    items,
    metal,
    purity: Number(purity),
    range,
    high: Math.max(...values),
    low: Math.min(...values),
    first,
    last,
    changePercent: round(((last - first) / first) * 100, 2),
  }));
}

// BACKEND CONTRACT
// GET /admin/pricing/feeds/incidents
// Query: { feedId, cause, page, pageSize, sortBy, sortDir }
// Returns: { items: FeedIncident[], total, page, pageSize }
// Notes: sorted by startedAt descending by default. An incident with a null
//        endedAt is still open. `quotesMissed` is how many polls the platform
//        never received, which is the window listings were priced off an
//        older number.
export function listFeedIncidents({ filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryRows(feedIncidents, {
      filters: { feedId: filters.feedId, cause: filters.cause },
      sortBy: sortBy ?? 'startedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// ---------------------------------------------------------------------------
// Manual rate override - ADM-037
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/pricing/overrides
// Query: { search, metal, state: 'active'|'expired'|'ended', page, pageSize,
//          sortBy, sortDir }
// Returns: { items: RateOverride[], total, page, pageSize }
// Notes: the audit trail. Rows are appended, never deleted - this list is the
//        answer to "who set that price and why", and a gap in it is worse than
//        no list at all. Sorted by createdAt descending by default. `state` is
//        computed at read time: an active override whose expiresAt has passed
//        reads as expired without anything having to run.
export function listRateOverrides({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const at = Date.now();
  const rows = overrideRecords.map((override) => ({
    ...override,
    state: override.endedAt
      ? 'ended'
      : Date.parse(override.expiresAt) <= at
        ? 'expired'
        : override.state,
    createdByName: override.createdByName ?? adminName(override.createdBy),
  }));

  return mockRequest(() =>
    queryRows(rows, {
      search,
      searchFields: ['id', 'reason', 'createdByName', 'metal'],
      filters: { metal: filters.metal, state: filters.state },
      sortBy: sortBy ?? 'createdAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// POST /admin/pricing/overrides
// Body: { metal, purity, ratePerGram, reason, expiresInHours }
// Returns: RateOverride
// Errors: 422 reason_required, 422 expiry_required, 422 rate_invalid,
//         422 deviation_too_large, 409 override_already_active,
//         404 rate_not_found
// Notes: reason and expiry are both mandatory. An override with no expiry is a
//        permanent silent lie about the market, so the platform will not store
//        one. The rate may not sit more than MAX_OVERRIDE_DEVIATION_PERCENT
//        from the last good feed number; a bigger move has to be argued for
//        rather than typed in. The new override supersedes the feed for that
//        metal and purity the moment it is written.
export function createRateOverride({ metal, purity, ratePerGram, reason, expiresInHours }) {
  const target = rateFor(metal, Number(purity));
  if (!target) return mockError('rate_not_found', 'That metal and purity is not priced', 404);

  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'A reason is required and is logged against your name', 422);
  }
  if (!expiresInHours || Number(expiresInHours) <= 0) {
    return mockError('expiry_required', 'An override must expire. Set how long it applies for', 422);
  }
  const rate = Number(ratePerGram);
  if (!Number.isFinite(rate) || rate <= 0) {
    return mockError('rate_invalid', 'Enter a rate greater than zero', 422);
  }
  if (liveOverrides().some((row) => row.metal === metal && row.purity === Number(purity))) {
    return mockError('override_already_active', 'An override is already in force for that purity', 409);
  }

  const feedRate = target.overrideId ? target.nominalRate : target.ratePerGram;
  const deviationPercent = round(((rate - feedRate) / feedRate) * 100, 2);
  if (Math.abs(deviationPercent) > MAX_OVERRIDE_DEVIATION_PERCENT) {
    return mockError(
      'deviation_too_large',
      `That is ${Math.abs(deviationPercent)}% from the last feed rate. The limit is ${MAX_OVERRIDE_DEVIATION_PERCENT}%`,
      422,
    );
  }

  const created = {
    id: `OVR-${pad(overrideRecords.length + 1, 4)}`,
    metal,
    purity: Number(purity),
    ratePerGram: round(rate, precisionFor(metal)),
    feedRateAtOverride: feedRate,
    deviationPercent,
    reason,
    createdAt: nowIso(),
    createdBy: actingAdminId,
    createdByName: adminName(actingAdminId),
    effectiveFrom: nowIso(),
    expiresAt: new Date(Date.now() + Number(expiresInHours) * 3600000).toISOString(),
    endedAt: null,
    endedBy: null,
    endNote: null,
    state: 'active',
    linkedIncidentId: null,
  };

  overrideRecords = [created, ...overrideRecords];
  return mockRequest({ ...created });
}

// BACKEND CONTRACT
// POST /admin/pricing/overrides/:overrideId/end
// Body: { note }
// Returns: RateOverride with endedAt set
// Errors: 404 override_not_found, 409 already_ended
// Notes: ending an override hands the purity straight back to the feed. The
//        row stays in the audit trail with who ended it and why.
export function endRateOverride({ overrideId, note }) {
  const override = overrideRecords.find((row) => row.id === overrideId);
  if (!override) return mockError('override_not_found', 'That override no longer exists', 404);
  if (override.endedAt || override.state !== 'active') {
    return mockError('already_ended', 'That override is no longer in force', 409);
  }

  override.endedAt = nowIso();
  override.endedBy = actingAdminId;
  override.endNote = note ?? null;
  override.state = 'ended';
  return mockRequest({ ...override });
}

// ---------------------------------------------------------------------------
// Purity conversion factors - ADM-038
// ---------------------------------------------------------------------------

function factorRows() {
  const rates = effectiveRates();

  return METALS.flatMap((metal) =>
    metal.purities
      .filter((purityRow) => purityRow.purity !== metal.referencePurity)
      .map((purityRow) => {
        const stored = factorRecords.find(
          (row) => row.metal === metal.id && row.purity === purityRow.purity,
        );
        const factor = stored?.factor ?? purityRow.nominalFactor;
        const rate = rates.find(
          (row) => row.metal === metal.id && row.purity === purityRow.purity,
        );

        return {
          metal: metal.id,
          metalLabel: metal.label,
          purity: purityRow.purity,
          purityLabel: purityRow.label,
          factor: round(factor, 6),
          nominalFactor: round(purityRow.nominalFactor, 6),
          deviationPercent: round(
            ((factor - purityRow.nominalFactor) / purityRow.nominalFactor) * 100,
            3,
          ),
          isCustom: round(factor, 6) !== round(purityRow.nominalFactor, 6),
          // A quoted purity takes its rate off the feed, so its factor audits
          // the quote rather than producing it. An unquoted purity has no
          // other source, so editing its factor moves a real price.
          quoted: purityRow.quoted,
          resultingRatePerGram: rate?.ratePerGram ?? null,
          updatedAt: stored?.updatedAt ?? null,
          updatedBy: stored?.updatedBy ?? null,
        };
      }),
  );
}

// BACKEND CONTRACT
// GET /admin/pricing/purity-factors
// Returns: { items: PurityFactor[], referenceRates: MetalRate[] }
// Notes: the reference purity of each metal is excluded - it is the thing
//        every other purity is measured against and has no factor of its own.
//        `quoted` says whether the factor produces that purity's rate or only
//        audits the rate the feed already published.
export function listPurityFactors() {
  return mockRequest(() => ({
    items: factorRows(),
    referenceRates: effectiveRates().filter((rate) => rate.isReference),
  }));
}

// BACKEND CONTRACT
// PUT /admin/pricing/purity-factors
// Body: { factors: [{ metal, purity, factor }] }
// Returns: { items: PurityFactor[], ratesPreview: MetalRate[] }
// Errors: 422 factor_out_of_range, 404 factor_not_found
// Notes: a factor must be greater than zero and no more than 1 - a purity
//        cannot be worth more per gram than the pure metal it is alloyed
//        from. Changing a factor for an unquoted purity moves every price on
//        the platform that uses it, which is why ratesPreview comes back with
//        the response rather than the client guessing.
export function updatePurityFactors({ factors = [] }) {
  for (const incoming of factors) {
    const value = Number(incoming.factor);
    if (!Number.isFinite(value) || value <= 0 || value > 1) {
      return mockError(
        'factor_out_of_range',
        'A conversion factor must be greater than 0 and no more than 1',
        422,
      );
    }
    const exists = factorRecords.some(
      (row) => row.metal === incoming.metal && row.purity === Number(incoming.purity),
    );
    if (!exists) return mockError('factor_not_found', 'That purity has no factor to set', 404);
  }

  factorRecords = factorRecords.map((row) => {
    const incoming = factors.find(
      (candidate) => candidate.metal === row.metal && Number(candidate.purity) === row.purity,
    );
    return incoming
      ? { ...row, factor: Number(incoming.factor), updatedAt: nowIso(), updatedBy: actingAdminId }
      : row;
  });

  return mockRequest(() => ({ items: factorRows(), ratesPreview: effectiveRates() }));
}

// ---------------------------------------------------------------------------
// Making charge and commission rules - ADM-039
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/pricing/charge-rules
// Returns: { defaults: ChargeRule, categories: CategoryChargeRule[] }
// Notes: defaults are the platform floor and ceiling; a category rule narrows
//        them, it never widens them. gstPercent is statutory and is returned
//        read-only. listingCount is live, so a category with no listings is
//        visibly safe to retune.
export function getChargeRules() {
  return mockRequest(() => ({
    defaults: { ...defaultsRecord },
    categories: categoryRuleRecords.map((rule) => ({
      ...rule,
      listingCount: pricedProducts.filter(
        (product) => product.category === rule.category && REPRICEABLE.has(product.status),
      ).length,
    })),
  }));
}

// BACKEND CONTRACT
// PUT /admin/pricing/charge-rules
// Body: { defaults: ChargeRule, categories: CategoryChargeRule[] }
// Returns: the same shape as GET
// Errors: 422 band_inverted, 422 commission_out_of_range,
//         422 category_outside_defaults
// Notes: a minimum above its maximum is rejected rather than silently swapped.
//        A category band outside the platform defaults is rejected too - the
//        defaults are a floor and a ceiling, and a category that escapes them
//        makes them meaningless. GST is statutory and is ignored if sent.
export function updateChargeRules({ defaults, categories = [] }) {
  const nextDefaults = { ...defaultsRecord, ...defaults, gstPercent: defaultsRecord.gstPercent };

  const inverted = (row) =>
    Number(row.wastageMinPercent) > Number(row.wastageMaxPercent) ||
    Number(row.makingMinPerGram) > Number(row.makingMaxPerGram);

  if (inverted(nextDefaults)) {
    return mockError('band_inverted', 'A minimum cannot be above its maximum', 422);
  }
  if (Number(nextDefaults.commissionPercent) < 0 || Number(nextDefaults.commissionPercent) > 25) {
    return mockError('commission_out_of_range', 'Commission must be between 0 and 25 percent', 422);
  }

  for (const category of categories) {
    if (inverted(category)) {
      return mockError('band_inverted', `${category.category}: a minimum cannot be above its maximum`, 422);
    }
    if (Number(category.commissionPercent) < 0 || Number(category.commissionPercent) > 25) {
      return mockError('commission_out_of_range', 'Commission must be between 0 and 25 percent', 422);
    }
    if (
      Number(category.wastageMinPercent) < Number(nextDefaults.wastageMinPercent) ||
      Number(category.wastageMaxPercent) > Number(nextDefaults.wastageMaxPercent) ||
      Number(category.makingMinPerGram) < Number(nextDefaults.makingMinPerGram) ||
      Number(category.makingMaxPerGram) > Number(nextDefaults.makingMaxPerGram)
    ) {
      return mockError(
        'category_outside_defaults',
        `${category.category} sits outside the platform default band`,
        422,
      );
    }
  }

  defaultsRecord = { ...nextDefaults, updatedAt: nowIso(), updatedBy: actingAdminId };
  categoryRuleRecords = categoryRuleRecords.map((rule) => {
    const incoming = categories.find((row) => row.category === rule.category);
    return incoming
      ? { ...rule, ...incoming, updatedAt: nowIso(), updatedBy: actingAdminId }
      : rule;
  });

  return getChargeRules();
}

// BACKEND CONTRACT
// GET /admin/pricing/charge-rules/violations
// Query: { category }
// Returns: { items: ListingViolation[], total }
// Notes: listings already outside the band that governs them. Tightening a
//        rule does not retire a listing, so this is the list somebody has to
//        work through afterwards. One row per breached field, so a listing
//        outside both its wastage and its making band appears twice.
export function listRuleViolations({ category } = {}) {
  const rulesByCategory = Object.fromEntries(
    categoryRuleRecords.map((rule) => [rule.category, rule]),
  );

  const items = pricedProducts
    .filter((product) => REPRICEABLE.has(product.status))
    .filter((product) => !category || product.category === category)
    .flatMap((product) => {
      const rule = rulesByCategory[product.category];
      if (!rule) return [];

      const checks = [
        {
          field: 'wastagePercent',
          value: product.price.wastagePercent,
          min: rule.wastageMinPercent,
          max: rule.wastageMaxPercent,
        },
        {
          field: 'makingChargesPerGram',
          value: product.price.makingChargesPerGram,
          min: rule.makingMinPerGram,
          max: rule.makingMaxPerGram,
        },
      ];

      return checks
        .filter((check) => check.value < check.min || check.value > check.max)
        .map((check) => ({
          productId: product.id,
          sku: product.sku,
          title: product.title,
          category: product.category,
          manufacturerId: product.manufacturerId,
          manufacturerName: manufacturerById[product.manufacturerId]?.businessName ?? null,
          ...check,
        }));
    });

  return mockRequest(() => ({ items, total: items.length }));
}

// ---------------------------------------------------------------------------
// Rate lock and tolerance - ADM-040
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/pricing/treasury-policy
// Returns: TreasuryPolicy
// Notes: one record for the whole platform. breachAction is currently always
//        'hold_for_reconfirmation'.
export function getTreasuryPolicy() {
  return mockRequest({ ...policyRecord });
}

// BACKEND CONTRACT
// PUT /admin/pricing/treasury-policy
// Body: partial TreasuryPolicy
// Returns: TreasuryPolicy
// Errors: 422 tolerance_out_of_range, 422 lock_out_of_range,
//         422 window_shorter_than_lock, 422 cancel_before_reconfirmation
// Notes: the re-confirmation window cannot be shorter than the longest lock,
//        or an order could be held for a decision the jeweller has no time to
//        make. Auto-cancel cannot come before the window closes, for the same
//        reason.
export function updateTreasuryPolicy(patch = {}) {
  const next = { ...policyRecord, ...patch };

  const tolerance = Number(next.toleranceBandPercent);
  if (tolerance < TOLERANCE_BAND_LIMITS.min || tolerance > TOLERANCE_BAND_LIMITS.max) {
    return mockError(
      'tolerance_out_of_range',
      `The tolerance band must be between ${TOLERANCE_BAND_LIMITS.min} and ${TOLERANCE_BAND_LIMITS.max} percent`,
      422,
    );
  }

  const locks = [next.quotationLockMinutes, next.cartLockMinutes, next.orderConfirmationLockMinutes];
  if (locks.some((v) => Number(v) < LOCK_MINUTE_LIMITS.min || Number(v) > LOCK_MINUTE_LIMITS.max)) {
    return mockError(
      'lock_out_of_range',
      `A lock must be between ${LOCK_MINUTE_LIMITS.min} and ${LOCK_MINUTE_LIMITS.max} minutes`,
      422,
    );
  }

  const longestLockHours = Math.max(...locks.map(Number)) / 60;
  if (Number(next.reconfirmationWindowHours) < longestLockHours) {
    return mockError(
      'window_shorter_than_lock',
      'The re-confirmation window cannot be shorter than the longest rate lock',
      422,
    );
  }
  if (Number(next.autoCancelAfterHours) < Number(next.reconfirmationWindowHours)) {
    return mockError(
      'cancel_before_reconfirmation',
      'Auto-cancel cannot come before the re-confirmation window closes',
      422,
    );
  }

  policyRecord = { ...next, updatedAt: nowIso(), updatedBy: actingAdminId };
  return mockRequest({ ...policyRecord });
}

// BACKEND CONTRACT
// POST /admin/pricing/treasury-policy/simulate
// Body: { movePercent }
// Returns: { movePercent, toleranceBandPercent, ordersInWindow, withinBand,
//            breached, breachedValue, examples: OrderImpact[] }
// Errors: 422 move_out_of_range
// Notes: read-only. Grades the orders currently inside a rate lock against a
//        hypothetical move so the desk can see what a band change would have
//        cost before committing to it. Nothing is written and no order is
//        touched.
export function simulateRateMove({ movePercent } = {}) {
  const move = Number(movePercent);
  if (!Number.isFinite(move) || Math.abs(move) > 25) {
    return mockError('move_out_of_range', 'Simulate a move between -25 and 25 percent', 422);
  }

  const band = Number(policyRecord.toleranceBandPercent);
  // Orders locked but not yet dispatched are the ones a move can still reach.
  const inWindow = orders.filter((order) =>
    ['placed', 'confirmed', 'in_production', 'ready_to_dispatch'].includes(order.status),
  );

  const examples = inWindow.map((order) => {
    const locked = order.lines[0]?.metalRateAtConfirmation ?? 0;
    const next = round(locked * (1 + move / 100), 0);
    const newTotal = Math.round(order.total * (1 + move / 100));

    return {
      orderId: order.id,
      jewellerId: order.jewellerId,
      lockedRatePerGram: locked,
      newRatePerGram: next,
      movePercent: move,
      withinBand: Math.abs(move) <= band,
      oldTotal: order.total,
      newTotal,
      delta: newTotal - order.total,
    };
  });

  const breached = examples.filter((row) => !row.withinBand);

  return mockRequest(() => ({
    movePercent: move,
    toleranceBandPercent: band,
    breachAction: policyRecord.breachAction,
    ordersInWindow: examples.length,
    withinBand: examples.length - breached.length,
    breached: breached.length,
    breachedValue: breached.reduce((sum, row) => sum + Math.abs(row.delta), 0),
    examples: examples.slice(0, 8),
  }));
}

// ---------------------------------------------------------------------------
// Bulk price refresh - ADM-041
// ---------------------------------------------------------------------------

function movesFor(scope) {
  return productsInScope(scope)
    .map((product) => {
      // Every listing in the catalogue is gold. When silver listings arrive
      // this reads the metal off the product instead.
      const rate = rateFor('gold', product.purity);
      if (!rate) return null;

      const nextPrice = repriceAt(product, rate.ratePerGram);
      return {
        productId: product.id,
        sku: product.sku,
        title: product.title,
        oldTotal: product.price.total,
        newTotal: nextPrice.total,
        changePercent: round(((nextPrice.total - product.price.total) / product.price.total) * 100, 2),
        nextPrice,
      };
    })
    .filter(Boolean);
}

// BACKEND CONTRACT
// POST /admin/pricing/bulk-refresh/preview
// Body: { type: 'all'|'category'|'manufacturer'|'purity', category,
//         manufacturerId, purity }
// Returns: BulkRefreshPreview
// Notes: read-only. `confirmedOrdersExcluded` is the count of orders the job
//        will NOT touch, stated positively because that is the guarantee the
//        operator is relying on: a confirmed order's price is permanent and
//        nothing here reprices it. Only live and out-of-stock listings carry
//        an indicative price, so drafts and archived rows are out of scope.
export function previewBulkRefresh(scope = {}) {
  const moves = movesFor(scope);
  const changed = moves.filter((move) => move.newTotal !== move.oldTotal);
  const percents = changed.map((move) => move.changePercent);

  return mockRequest(() => ({
    scope,
    productsInScope: moves.length,
    productsChanged: changed.length,
    unchanged: moves.length - changed.length,
    avgChangePercent: percents.length
      ? round(percents.reduce((sum, value) => sum + value, 0) / percents.length, 2)
      : 0,
    maxIncreasePercent: percents.length ? round(Math.max(...percents), 2) : 0,
    maxDecreasePercent: percents.length ? round(Math.min(...percents), 2) : 0,
    biggestMovers: [...changed]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 5)
      .map(({ nextPrice, ...move }) => move),
    confirmedOrdersExcluded: orders.filter((order) => order.confirmedAt).length,
    estimatedSeconds: Math.max(1, Math.round(moves.length / 12)),
  }));
}

// BACKEND CONTRACT
// POST /admin/pricing/bulk-refresh
// Body: the same scope object as the preview
// Returns: RefreshJob with status 'running'
// Errors: 409 job_already_running, 409 rates_stale, 422 empty_scope
// Notes: refused while the rates are stale. Repricing the whole catalogue off
//        a four-hour-old quote is worse than leaving it alone, so the operator
//        is sent to refresh the feed first. The job rewrites INDICATIVE
//        listing prices only. Confirmed orders keep the price they were
//        confirmed at, permanently, and this endpoint has no code path that
//        could change one.
let runningJob = null;

export function startBulkRefresh(scope = {}) {
  if (runningJob && runningJob.status === 'running') {
    return mockError('job_already_running', 'A refresh is already running', 409);
  }
  if (snapshotMeta.stale) {
    return mockError(
      'rates_stale',
      'The metal rate is stale. Refresh the feed before repricing the catalogue',
      409,
    );
  }

  const moves = movesFor(scope);
  if (moves.length === 0) {
    return mockError('empty_scope', 'No listings match that scope', 422);
  }

  const changed = moves.filter((move) => move.newTotal !== move.oldTotal);

  // Write the new indicative prices. Orders are not in this data path at all.
  const byId = Object.fromEntries(moves.map((move) => [move.productId, move.nextPrice]));
  pricedProducts = pricedProducts.map((product) =>
    byId[product.id] ? { ...product, price: byId[product.id] } : product,
  );

  runningJob = {
    id: `JOB-${pad(jobRecords.length + 1, 4)}`,
    scope,
    status: 'running',
    progress: 0,
    productsInScope: moves.length,
    productsProcessed: 0,
    productsChanged: changed.length,
    ordersRepriced: 0,
    triggerRatePerGram: rateFor('gold', 22)?.ratePerGram ?? null,
    startedAt: nowIso(),
    completedAt: null,
    startedBy: actingAdminId,
    startedByName: adminName(actingAdminId),
    error: null,
    // The prices above are already written; this is a wall-clock target so
    // polling shows movement the way it will against a real worker queue.
    _finishesAt: Date.now() + Math.max(2000, moves.length * 60),
  };

  jobRecords = [runningJob, ...jobRecords];
  return mockRequest({ ...runningJob });
}

// BACKEND CONTRACT
// GET /admin/pricing/bulk-refresh/:jobId
// Returns: RefreshJob
// Errors: 404 job_not_found
// Notes: poll this while status is 'queued' or 'running'. progress is 0 to 100.
export function getBulkRefreshJob(jobId) {
  const job = jobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('job_not_found', 'That job no longer exists', 404);

  if (job.status === 'running') {
    const total = job._finishesAt - Date.parse(job.startedAt);
    const elapsed = Date.now() - Date.parse(job.startedAt);
    const progress = Math.min(100, Math.round((elapsed / total) * 100));

    job.progress = progress;
    job.productsProcessed = Math.round((progress / 100) * job.productsInScope);
    if (progress >= 100) {
      job.status = 'completed';
      job.completedAt = nowIso();
      job.productsProcessed = job.productsInScope;
      runningJob = null;
    }
  }

  const { _finishesAt, ...rest } = job;
  return mockRequest({ ...rest });
}

// BACKEND CONTRACT
// GET /admin/pricing/bulk-refresh
// Query: { status, page, pageSize, sortBy, sortDir }
// Returns: { items: RefreshJob[], total, page, pageSize }
// Notes: sorted by startedAt descending by default. ordersRepriced is always
//        zero and is returned so an auditor can see it is always zero.
export function listBulkRefreshJobs({ filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const rows = jobRecords.map(({ _finishesAt, ...job }) => job);

  return mockRequest(() =>
    queryRows(rows, {
      filters: { status: filters.status },
      sortBy: sortBy ?? 'startedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// POST /admin/pricing/bulk-refresh/:jobId/cancel
// Returns: RefreshJob with status 'cancelled'
// Errors: 404 job_not_found, 409 not_cancellable
// Notes: cancelling stops the remaining listings being rewritten. It does NOT
//        roll back the ones already done - they hold a correct price computed
//        off a current rate, and undoing that would leave the catalogue in a
//        worse state than the cancellation was meant to avoid.
export function cancelBulkRefresh(jobId) {
  const job = jobRecords.find((row) => row.id === jobId);
  if (!job) return mockError('job_not_found', 'That job no longer exists', 404);
  if (job.status !== 'running' && job.status !== 'queued') {
    return mockError('not_cancellable', 'That job has already finished', 409);
  }

  job.status = 'cancelled';
  job.completedAt = nowIso();
  runningJob = null;

  const { _finishesAt, ...rest } = job;
  return mockRequest({ ...rest });
}

// BACKEND CONTRACT
// GET /admin/catalogue/products/prices
// Returns: { items: Product[], total }
// Notes: the indicative prices as they stand after any bulk refresh. The
//        catalogue area owns the full product endpoint; this one exists so a
//        caller can read prices without pulling media and moderation state
//        with them. A confirmed order does not read from here - it carries the
//        price it was confirmed at.
export function listPricedProducts() {
  return mockRequest(() => ({ items: pricedProducts, total: pricedProducts.length }));
}
