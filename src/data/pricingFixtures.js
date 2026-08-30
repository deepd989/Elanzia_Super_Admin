// Feature fixtures for Pricing control - ADM-035 to ADM-041.
//
// Rates themselves are NOT here. They are canonical and live in
// src/data/core/metalRates.js, because Operations renders them too and the two
// areas must never disagree. This file holds the things only Pricing owns:
// feed health, the override audit, the charge bands, treasury policy and the
// refresh job log.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so the screens show the same numbers on every reload.

import { adminUsers, METALS, metalRates, products } from '@/data/core';
import { platformFeeds } from '@/data/operationsFixtures';

// The anchor. Matches operationsFixtures.js and core/metalRates.js.
export const PRICING_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(PRICING_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const isoDaysAgo = (days) => new Date(NOW_MS - days * DAY_MS).toISOString();
const pad = (n, w) => String(n).padStart(w, '0');
const round = (v, dp = 2) => Number(v.toFixed(dp));

// Staff who can act on pricing. Deactivated accounts are excluded - attributing
// an override to somebody who cannot sign in makes the audit trail useless.
const pricingStaff = adminUsers.filter(
  (user) => user.status === 'active' && ['super_admin', 'finance', 'catalogue'].includes(user.roleId),
);

// ---------------------------------------------------------------------------
// Rate feeds - ADM-036
//
// The pricing-category rows of platformFeeds, extended with the health detail
// this area needs. Imported rather than redeclared so the dashboard and this
// screen cannot report different statuses for the same integration.
// ---------------------------------------------------------------------------

const FEED_DETAIL = {
  'FEED-metal-rate': {
    provider: 'India Bullion and Jewellers Association',
    metals: ['gold', 'silver'],
    isPrimary: true,
    pollIntervalMinutes: 30,
    staleAfterMinutes: 45,
    uptime7d: 94.2,
    uptime30d: 97.8,
    consecutiveFailures: 3,
    quotesPerDay: 48,
    quotesReceivedToday: 31,
  },
};

// A standby the platform can fall back to. It is healthy and idle, which is
// the point: the primary being degraded is a choice to keep using it, not an
// absence of alternatives.
const STANDBY_FEED = {
  id: 'FEED-mcx-rate',
  name: 'MCX bullion futures',
  category: 'pricing',
  status: 'healthy',
  lastSyncAt: isoHoursAgo(0.2),
  latencyMs: 410,
  successRate24h: 99.6,
  message: 'Responding normally. Standby only, not currently priced from.',
  impact: 'None.',
  provider: 'Multi Commodity Exchange of India',
  metals: ['gold', 'silver'],
  isPrimary: false,
  pollIntervalMinutes: 15,
  staleAfterMinutes: 30,
  uptime7d: 99.4,
  uptime30d: 99.1,
  consecutiveFailures: 0,
  quotesPerDay: 96,
  quotesReceivedToday: 94,
};

export const rateFeeds = [
  ...platformFeeds
    .filter((feed) => feed.category === 'pricing')
    .map((feed) => ({ ...feed, ...(FEED_DETAIL[feed.id] ?? {}) })),
  STANDBY_FEED,
];

// ---------------------------------------------------------------------------
// Feed incidents - ADM-036
// ---------------------------------------------------------------------------

const INCIDENT_CAUSES = [
  { cause: 'upstream_timeout', label: 'Upstream quote endpoint timed out' },
  { cause: 'auth_expired', label: 'API credential expired' },
  { cause: 'malformed_payload', label: 'Quote payload failed schema validation' },
  { cause: 'rate_limited', label: 'Provider rate limit exceeded' },
  { cause: 'network', label: 'Network unreachable from the pricing worker' },
  { cause: 'scheduled_maintenance', label: 'Provider scheduled maintenance' },
];

export const feedIncidents = Array.from({ length: 46 }).map((_, index) => {
  const feed = rateFeeds[index % 2 === 0 ? 0 : 1];
  const cause = INCIDENT_CAUSES[index % INCIDENT_CAUSES.length];
  const startedHoursAgo = 4.5 + index * 11 + (index % 5) * 3;
  const durationMinutes = [18, 45, 9, 220, 62, 12, 140, 33][index % 8];
  // Still open only for the primary feed's current degradation.
  const isOpen = index === 0;

  return {
    id: `INC-${pad(index + 1, 4)}`,
    feedId: feed.id,
    feedName: feed.name,
    cause: cause.cause,
    causeLabel: cause.label,
    startedAt: isoHoursAgo(startedHoursAgo),
    endedAt: isOpen ? null : isoHoursAgo(startedHoursAgo - durationMinutes / 60),
    durationMinutes: isOpen ? null : durationMinutes,
    // Quotes the platform never received. Each one is a window in which
    // listings were priced off an older number.
    quotesMissed: Math.max(1, Math.round(durationMinutes / feed.pollIntervalMinutes)),
    // Long outages get an override; short ones ride it out on the last quote.
    overrideApplied: durationMinutes > 90,
    resolvedBy: isOpen ? null : pricingStaff[index % pricingStaff.length].id,
  };
});

// ---------------------------------------------------------------------------
// Manual rate overrides - ADM-037
// ---------------------------------------------------------------------------

const OVERRIDE_REASONS = [
  'IBJA feed down for over three hours, rate set from the morning MCX close',
  'Feed publishing a stale weekend quote on a trading day',
  'Provider returned a rate 8 percent off the market, held to the previous close',
  'Scheduled provider maintenance, desk quote applied',
  'Budget day volatility, desk fixed the rate for the afternoon session',
  'Feed credential expired overnight, manual quote until the key was rotated',
  'Malformed payload parsed silver as gold, corrected by hand',
];

const OVERRIDABLE = metalRates.map((rate) => ({ metal: rate.metal, purity: rate.purity, base: rate.ratePerGram }));

export const rateOverrides = Array.from({ length: 44 }).map((_, index) => {
  const target = OVERRIDABLE[index % OVERRIDABLE.length];
  const author = pricingStaff[index % pricingStaff.length];
  const createdHoursAgo = 6 + index * 19;
  const durationHours = [4, 6, 2, 12, 8, 3, 24][index % 7];

  // The desk rarely moves far from the last good feed number. A big deviation
  // is the exception and is what the deviation guard exists to catch.
  const deviationPercent = round(
    [(index % 7) - 3, 0.4, -0.9, 1.6, -2.1, 0.2, -0.5][index % 7] * 0.6,
    2,
  );
  const ratePerGram = round(
    target.base * (1 + deviationPercent / 100),
    target.metal === 'silver' ? 2 : 0,
  );

  const endedEarly = index % 6 === 0;
  const expiresAt = new Date(NOW_MS - createdHoursAgo * HOUR_MS + durationHours * HOUR_MS);
  // Nothing is in force at rest. An override that shipped as fixture data
  // would make this board show a different gold rate from the ADM-010
  // dashboard, which is the exact drift the promotion to core was meant to
  // stop. Supersession is demonstrated by creating one.
  const isActive = false;

  return {
    id: `OVR-${pad(index + 1, 4)}`,
    metal: target.metal,
    purity: target.purity,
    ratePerGram,
    feedRateAtOverride: target.base,
    deviationPercent,
    reason: OVERRIDE_REASONS[index % OVERRIDE_REASONS.length],
    createdAt: isoHoursAgo(createdHoursAgo),
    createdBy: author.id,
    createdByName: author.name,
    effectiveFrom: isoHoursAgo(createdHoursAgo),
    // Every override carries an expiry. One that never expires is a permanent
    // silent lie about the market, so the API refuses to create one.
    expiresAt: isActive
      ? new Date(NOW_MS + 3 * HOUR_MS).toISOString()
      : expiresAt.toISOString(),
    endedAt: isActive ? null : endedEarly ? isoHoursAgo(createdHoursAgo - durationHours / 2) : null,
    endedBy: isActive || !endedEarly ? null : pricingStaff[(index + 1) % pricingStaff.length].id,
    endNote: endedEarly ? 'Feed recovered and is quoting normally again' : null,
    state: isActive ? 'active' : endedEarly ? 'ended' : 'expired',
    linkedIncidentId: index % 3 === 0 ? `INC-${pad((index % 46) + 1, 4)}` : null,
  };
});

export const activeOverrides = rateOverrides.filter((row) => row.state === 'active');

// Nothing in force at rest, by design. See the comment above.
export const activeOverridesAtRest = activeOverrides;

// The desk cannot set a rate arbitrarily far from the last good feed number.
// Past this, the override is refused and the move has to be argued for.
export const MAX_OVERRIDE_DEVIATION_PERCENT = 5;

// ---------------------------------------------------------------------------
// Making charge and commission rules - ADM-039
// ---------------------------------------------------------------------------

const CATEGORIES = [...new Set(products.map((product) => product.category))].sort();

// The platform floor and ceiling. A manufacturer quoting outside these cannot
// list at all; the per-category rules narrow them further.
export const chargeRuleDefaults = {
  id: 'default',
  label: 'Platform default',
  wastageMinPercent: 5,
  wastageMaxPercent: 18,
  makingMinPerGram: 300,
  makingMaxPerGram: 1500,
  commissionPercent: 4,
  gstPercent: 3, // statutory on jewellery, not a business choice
  updatedAt: isoDaysAgo(96),
  updatedBy: 'STF-005',
};

// Bands per category, derived from what manufacturers actually quote so the
// numbers are plausible, then deliberately tightened on two categories so the
// band excludes the single most extreme quote at each end. Real rule tables are
// always a little out of step with the catalogue they govern, and the
// violations panel exists precisely to show which listings that strands.
const TIGHTENED = ['Bangles', 'Rings'];

export const categoryChargeRules = CATEGORIES.map((category, index) => {
  const inCategory = products.filter((product) => product.category === category);
  const wastages = inCategory.map((product) => product.price.wastagePercent);
  const makings = inCategory.map((product) => product.price.makingChargesPerGram);
  // Only worth tightening where there are enough listings for an outlier to be
  // an outlier rather than a third of the category.
  const tighten = TIGHTENED.includes(category) && inCategory.length >= 6;

  const spread = (values, side) => {
    const sorted = [...values].sort((a, b) => a - b);
    const step = tighten ? 1 : 0;
    return side === 'lo' ? sorted[step] : sorted[sorted.length - 1 - step];
  };

  return {
    id: `RULE-${pad(index + 1, 3)}`,
    category,
    wastageMinPercent: round(spread(wastages, 'lo'), 1),
    wastageMaxPercent: round(spread(wastages, 'hi'), 1),
    makingMinPerGram: Math.round(spread(makings, 'lo')),
    makingMaxPerGram: Math.round(spread(makings, 'hi')),
    // Bridal and temple work carries more handling risk and a higher take.
    commissionPercent: ['Bridal Sets', 'Temple Jewellery'].includes(category) ? 5.5 : 4,
    listingCount: inCategory.length,
    updatedAt: isoDaysAgo(12 + index * 7),
    updatedBy: pricingStaff[index % pricingStaff.length].id,
  };
});

// ---------------------------------------------------------------------------
// Rate lock and tolerance - ADM-040
//
// Elanzia's treasury policy. Every number here is a decision about who carries
// the risk of the gold price moving between a jeweller seeing a price and the
// manufacturer shipping against it.
// ---------------------------------------------------------------------------

export const treasuryPolicy = {
  // How long a price stays honoured once it has been shown.
  quotationLockMinutes: 30,
  cartLockMinutes: 15,
  orderConfirmationLockMinutes: 60,

  // How far the metal rate may move inside a lock before the platform stops
  // absorbing it. Set from the desk's view of intraday gold volatility.
  toleranceBandPercent: 1.5,

  // Beyond the band the order is HELD and the jeweller is shown the old and
  // the new price. Nobody is charged a price they did not agree to, and
  // nobody absorbs the move silently.
  breachAction: 'hold_for_reconfirmation',
  reconfirmationWindowHours: 24,
  autoCancelAfterHours: 48,

  // Who may release a held order at the original price.
  overridePermission: 'pricing.rates.edit',

  updatedAt: isoDaysAgo(41),
  updatedBy: 'STF-005',
};

export const TOLERANCE_BAND_LIMITS = { min: 0.25, max: 5 };
export const LOCK_MINUTE_LIMITS = { min: 5, max: 240 };

// ---------------------------------------------------------------------------
// Bulk price refresh - ADM-041
// ---------------------------------------------------------------------------

const SCOPE_LABELS = [
  { type: 'all', label: 'Entire catalogue' },
  { type: 'category', label: 'Necklaces' },
  { type: 'purity', label: '22K only' },
  { type: 'category', label: 'Bangles' },
  { type: 'manufacturer', label: 'MFR-002' },
];

export const bulkRefreshJobs = Array.from({ length: 42 }).map((_, index) => {
  const author = pricingStaff[index % pricingStaff.length];
  const scope = SCOPE_LABELS[index % SCOPE_LABELS.length];
  const startedHoursAgo = 9 + index * 17;
  const processed = [48, 12, 27, 6, 9][index % 5];
  const changed = Math.max(0, processed - (index % 4));

  const status =
    index % 13 === 0 ? 'failed' : index % 11 === 0 ? 'cancelled' : 'completed';

  return {
    id: `JOB-${pad(index + 1, 4)}`,
    scope: { type: scope.type, label: scope.label },
    status,
    progress: status === 'completed' ? 100 : status === 'cancelled' ? 41 : 76,
    productsInScope: processed,
    productsProcessed: status === 'completed' ? processed : Math.round(processed * 0.6),
    productsChanged: status === 'completed' ? changed : Math.round(changed * 0.5),
    // Never anything but zero. A confirmed order's price is permanent, so the
    // job does not have a code path that could touch one.
    ordersRepriced: 0,
    triggerRatePerGram: metalRates.find((rate) => rate.id === 'gold-22').ratePerGram,
    startedAt: isoHoursAgo(startedHoursAgo),
    completedAt: isoHoursAgo(startedHoursAgo - 0.15),
    startedBy: author.id,
    startedByName: author.name,
    error:
      status === 'failed'
        ? 'Pricing worker lost its connection to the catalogue store partway through'
        : null,
  };
});

export const BULK_REFRESH_SCOPES = [
  { value: 'all', label: 'Entire catalogue' },
  { value: 'category', label: 'One category' },
  { value: 'manufacturer', label: 'One manufacturer' },
  { value: 'purity', label: 'One purity' },
];

export const PRICING_CATEGORIES = CATEGORIES;
export const PRICING_METALS = METALS;
