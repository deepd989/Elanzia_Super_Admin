// CANONICAL FIXTURE - metal rates, the number every price on the platform
// derives from.
//
// This is core rather than a feature fixture because three areas read it and
// none of them may disagree: Pricing manages it (ADM-035 to ADM-041),
// Operations displays it on the dashboard (ADM-010), and the prices baked into
// src/data/core/products.js were computed from the `previousRatePerGram`
// values below. One number, one place.
//
// HOW A PURITY GETS ITS RATE
//
// Two mechanisms, and the difference matters:
//
//   quoted:  the feed publishes this purity directly. IBJA quotes 999, 916,
//            750 and 585 gold as separate numbers, so all four gold rates are
//            facts off the wire, not arithmetic. They do not sit at exactly
//            the nominal purity ratio, and they are not supposed to - the
//            market prices each caratage on its own.
//
//   derived: the feed does not publish this purity. The rate is the reference
//            purity's rate times the configured conversion factor. Silver 925
//            works this way, which is what makes the factor table in ADM-038
//            load bearing rather than decorative.
//
// The factor table therefore does two jobs: it produces the rate for every
// unquoted purity, and it audits the quoted ones. A quoted rate that drifts
// far from its nominal ratio means the feed is publishing something odd, and
// the board says so rather than passing it through in silence.

// The anchor. Matches operationsFixtures.js and accessFixtures.js so all three
// areas agree about "now".
export const METAL_RATES_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(METAL_RATES_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();

// A quoted rate is allowed to sit this far from its nominal purity ratio
// before the board flags it. Wide enough for normal caratage spreads, narrow
// enough to catch a feed publishing a decimal in the wrong place.
export const NOMINAL_DEVIATION_TOLERANCE_PERCENT = 0.25;

export const METALS = [
  {
    id: 'gold',
    label: 'Gold',
    referencePurity: 24,
    unit: 'gram',
    purities: [
      { purity: 24, label: '24K', nominalFactor: 24 / 24, quoted: true },
      { purity: 22, label: '22K', nominalFactor: 22 / 24, quoted: true },
      { purity: 18, label: '18K', nominalFactor: 18 / 24, quoted: true },
      { purity: 14, label: '14K', nominalFactor: 14 / 24, quoted: true },
    ],
  },
  {
    id: 'silver',
    label: 'Silver',
    referencePurity: 999,
    unit: 'gram',
    purities: [
      { purity: 999, label: '999 fine', nominalFactor: 1, quoted: true },
      // Not quoted. Its rate comes out of the factor table, so editing the
      // factor in ADM-038 moves a real price.
      { purity: 925, label: '925 sterling', nominalFactor: 925 / 999, quoted: false },
    ],
  },
];

export const metalById = Object.fromEntries(METALS.map((metal) => [metal.id, metal]));

// ---------------------------------------------------------------------------
// What the feed published. These are facts, not arithmetic.
//
// The gold figures are the ones ADM-010 has always rendered, and the
// `previous` column is the rate src/data/core/products.js was priced at. A
// jeweller comparing a live listing against a past order sees a believable
// move rather than two unrelated numbers, and that only holds while these
// stay in step.
// ---------------------------------------------------------------------------
export const quotedRates = [
  { metal: 'gold', purity: 24, ratePerGram: 7912, previousRatePerGram: 7850 },
  { metal: 'gold', purity: 22, ratePerGram: 7251, previousRatePerGram: 7195 },
  { metal: 'gold', purity: 18, ratePerGram: 5936, previousRatePerGram: 5890 },
  { metal: 'gold', purity: 14, ratePerGram: 4617, previousRatePerGram: 4583 },
  { metal: 'silver', purity: 999, ratePerGram: 98.6, previousRatePerGram: 97.85 },
];

// ---------------------------------------------------------------------------
// The conversion factor table - what ADM-038 edits.
//
// `factor` is what the platform actually applies. `nominalFactor` on METALS is
// the pure purity ratio it is measured against. Silver 925 carries a
// deliberate custom factor: sterling trades at a small premium to its pure
// metal content because of the fabrication in it, and somebody configured that
// rather than accepting 925/999.
// ---------------------------------------------------------------------------
export const purityFactors = [
  { metal: 'gold', purity: 22, factor: 22 / 24, updatedAt: null, updatedBy: null },
  { metal: 'gold', purity: 18, factor: 18 / 24, updatedAt: null, updatedBy: null },
  { metal: 'gold', purity: 14, factor: 14 / 24, updatedAt: null, updatedBy: null },
  {
    metal: 'silver',
    purity: 925,
    factor: 0.93,
    updatedAt: isoHoursAgo(30 * 24),
    updatedBy: 'STF-005',
  },
];

const factorFor = (metal, purity) =>
  purityFactors.find((row) => row.metal === metal && row.purity === purity)?.factor ?? null;

const quoteFor = (metal, purity) =>
  quotedRates.find((row) => row.metal === metal && row.purity === purity) ?? null;

const round = (value, dp) => Number(value.toFixed(dp));

// Silver is quoted to the paisa; gold to the rupee. Rounding silver to whole
// rupees would lose a fifth of a percent on every sterling price.
const precisionFor = (metal) => (metal === 'silver' ? 2 : 0);

// ---------------------------------------------------------------------------
// The board. One row per metal and purity, each carrying where its number came
// from so a reader never has to guess.
// ---------------------------------------------------------------------------
function buildRates({ factors = purityFactors } = {}) {
  const resolve = (metal, purity) =>
    factors.find((row) => row.metal === metal && row.purity === purity)?.factor ??
    factorFor(metal, purity);

  return METALS.flatMap((metal) =>
    metal.purities.map((purityRow) => {
      const quote = quoteFor(metal.id, purityRow.purity);
      const dp = precisionFor(metal.id);
      const reference = quoteFor(metal.id, metal.referencePurity);
      const factor = resolve(metal.id, purityRow.purity);

      const ratePerGram = quote
        ? quote.ratePerGram
        : round(reference.ratePerGram * factor, dp);
      const previousRatePerGram = quote
        ? quote.previousRatePerGram
        : round(reference.previousRatePerGram * factor, dp);

      // The rate this purity would carry at its pure nominal ratio. Used to
      // audit a quoted rate, not to produce it.
      const nominalRate = round(reference.ratePerGram * purityRow.nominalFactor, dp);
      const deviationPercent =
        nominalRate === 0 ? 0 : round(((ratePerGram - nominalRate) / nominalRate) * 100, 3);

      return {
        id: `${metal.id}-${purityRow.purity}`,
        metal: metal.id,
        metalLabel: metal.label,
        purity: purityRow.purity,
        purityLabel: purityRow.label,
        isReference: purityRow.purity === metal.referencePurity,
        ratePerGram,
        previousRatePerGram,
        changePercent: round(
          ((ratePerGram - previousRatePerGram) / previousRatePerGram) * 100,
          2,
        ),
        source: purityRow.quoted ? 'IBJA' : 'derived',
        derivedFrom: purityRow.quoted ? null : `${metal.id}-${metal.referencePurity}`,
        factorApplied: purityRow.quoted ? null : factor,
        nominalFactor: round(purityRow.nominalFactor, 6),
        nominalRate,
        deviationPercent,
        beyondTolerance:
          Math.abs(deviationPercent) > NOMINAL_DEVIATION_TOLERANCE_PERCENT,
      };
    }),
  );
}

export const metalRates = buildRates();

// Exported so ADM-038 can preview what a factor edit does before it saves.
export function ratesForFactors(factors) {
  return buildRates({ factors });
}

// ---------------------------------------------------------------------------
// History. 180 sessions per metal and purity.
//
// The most recent 14 gold sessions reproduce exactly what ADM-010 has always
// charted - same drift array, same arithmetic - so promoting this data into
// core moves no pixel on the dashboard.
// ---------------------------------------------------------------------------
const RECENT_GOLD_DRIFT = [0, -18, 24, -9, 31, -22, 12, 7, -14, 26, -5, 19, -11, 0];
const HISTORY_SESSIONS = 180;

// Deterministic wander for the sessions older than the 14 the dashboard shows.
// Not random: a screenshot taken today still matches the code tomorrow.
function olderDrift(daysBack) {
  return (
    Math.round(Math.sin(daysBack / 5.5) * 46) +
    Math.round(Math.cos(daysBack / 13) * 28) -
    Math.round(daysBack * 1.4)
  );
}

function gold22At(daysBack) {
  if (daysBack <= 13) {
    // index into the dashboard's array: index 13 is today, 0 is 13 days back
    return 7251 - daysBack * 9 + RECENT_GOLD_DRIFT[13 - daysBack];
  }
  return 7251 - 13 * 9 + RECENT_GOLD_DRIFT[0] + olderDrift(daysBack - 13);
}

export const metalRateHistory = Array.from({ length: HISTORY_SESSIONS }).flatMap(
  (_, index) => {
    const daysBack = HISTORY_SESSIONS - 1 - index;
    const date = new Date(NOW_MS - daysBack * DAY_MS).toISOString().slice(0, 10);

    // Every gold caratage moves off one IBJA quote, so the whole curve is
    // walked from the 22K session price rather than four independent series.
    const rate22 = gold22At(daysBack);
    const rate24 = Math.round((rate22 * 24) / 22);
    const silver999 = round(98.6 - daysBack * 0.06 + Math.sin(daysBack / 7) * 1.4, 2);

    return [
      { date, metal: 'gold', purity: 24, ratePerGram: rate24, source: 'IBJA' },
      { date, metal: 'gold', purity: 22, ratePerGram: rate22, source: 'IBJA' },
      { date, metal: 'gold', purity: 18, ratePerGram: Math.round(rate24 * 0.750253), source: 'IBJA' },
      { date, metal: 'gold', purity: 14, ratePerGram: Math.round(rate24 * 0.583544), source: 'IBJA' },
      { date, metal: 'silver', purity: 999, ratePerGram: silver999, source: 'IBJA' },
      {
        date,
        metal: 'silver',
        purity: 925,
        ratePerGram: round(silver999 * 0.93, 2),
        source: 'derived',
      },
    ];
  },
);

// When the rate was captured, and when the feed is next due. The metal rate
// feed is degraded, so this is deliberately behind the market.
export const rateSnapshotMeta = {
  source: 'IBJA',
  capturedAt: isoHoursAgo(4.5),
  nextRefreshAt: new Date(NOW_MS + 0.5 * HOUR_MS).toISOString(),
  refreshIntervalMinutes: 30,
  // Older than the refresh interval. Only affects listings nobody has ordered
  // yet - a confirmed order's price is permanent - which is why the dashboard
  // renders it as a warning and not as a critical.
  stale: true,
};

export const metalRateById = Object.fromEntries(metalRates.map((rate) => [rate.id, rate]));

export default metalRates;
