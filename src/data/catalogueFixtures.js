// Feature fixtures for Catalogue control - ADM-023 to ADM-034.
// Everything here references src/data/core by id. No manufacturer, jeweller
// or product is invented in this file.
//
// Rows are derived by index maths off a fixed anchor rather than
// Math.random(), so the moderation queue shows the same work on every reload.

import { adminUsers, jewellers, manufacturerById, orders, products } from '@/data/core';

// The anchor. Matches accessFixtures.js and operationsFixtures.js.
export const CATALOGUE_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(CATALOGUE_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

function isoHoursAgo(hours) {
  return new Date(NOW_MS - hours * HOUR_MS).toISOString();
}

function isoDaysAgo(days) {
  return new Date(NOW_MS - days * DAY_MS).toISOString();
}

function isoDaysAhead(days) {
  return new Date(NOW_MS + days * DAY_MS).toISOString();
}

const activeStaff = adminUsers.filter((user) => user.status === 'active');

// ---------------------------------------------------------------------------
// HSN register - ADM-033
// ---------------------------------------------------------------------------

// Real codes. Chapter 71 covers articles of jewellery of precious metal, all
// at 3%. 9988 is a SAC, not an HSN: job work is a service and is taxed at 5%,
// which is why the register has to carry both kinds.
//
// The rate lives HERE and nowhere else. That is what "HSN drives GST" means -
// a product does not carry its own rate, it carries a code, and the code says
// what the rate is.
export const hsnCodes = [
  {
    code: '7113 19 10',
    description: 'Articles of jewellery of gold, unstudded',
    chapter: '71',
    kind: 'goods',
    gstRate: 3,
    effectiveFrom: '2022-07-18T00:00:00.000Z',
    updatedAt: isoDaysAgo(210),
  },
  {
    code: '7113 19 20',
    description: 'Articles of jewellery of gold, set with pearls',
    chapter: '71',
    kind: 'goods',
    gstRate: 3,
    effectiveFrom: '2022-07-18T00:00:00.000Z',
    updatedAt: isoDaysAgo(210),
  },
  {
    code: '7113 19 30',
    description: 'Articles of jewellery of gold, set with diamonds',
    chapter: '71',
    kind: 'goods',
    gstRate: 3,
    effectiveFrom: '2022-07-18T00:00:00.000Z',
    updatedAt: isoDaysAgo(88),
  },
  {
    code: '7113 19 40',
    description: 'Articles of jewellery of gold, set with other precious and semi-precious stones',
    chapter: '71',
    kind: 'goods',
    gstRate: 3,
    effectiveFrom: '2022-07-18T00:00:00.000Z',
    updatedAt: isoDaysAgo(88),
  },
  {
    code: '7113 11 10',
    description: 'Articles of jewellery of silver, whether or not plated',
    chapter: '71',
    kind: 'goods',
    gstRate: 3,
    effectiveFrom: '2022-07-18T00:00:00.000Z',
    // Registered but unused - Elanzia lists gold only. A zero-count row the
    // screen has to render without looking broken.
    updatedAt: isoDaysAgo(400),
  },
  {
    code: '9988',
    description: 'Job work in relation to manufacture of jewellery (making charges)',
    chapter: '99',
    kind: 'service',
    gstRate: 5,
    effectiveFrom: '2021-10-01T00:00:00.000Z',
    updatedAt: isoDaysAgo(365),
  },
];

export const hsnByCode = Object.fromEntries(hsnCodes.map((row) => [row.code, row]));

// ---------------------------------------------------------------------------
// Category tree - ADM-026
// ---------------------------------------------------------------------------

// Two levels, deliberately. A jeweller browsing on a phone does not navigate a
// four deep taxonomy, and a deeper tree makes the HSN default ambiguous.
const CATEGORY_SEED = [
  { id: 'CAT-neckwear', name: 'Neckwear', parentId: null, defaultHsn: '7113 19 10' },
  { id: 'CAT-necklaces', name: 'Necklaces', parentId: 'CAT-neckwear', defaultHsn: '7113 19 10' },
  { id: 'CAT-mangalsutra', name: 'Mangalsutra', parentId: 'CAT-neckwear', defaultHsn: '7113 19 10' },
  { id: 'CAT-pendants', name: 'Pendants', parentId: 'CAT-neckwear', defaultHsn: '7113 19 40' },
  // No product uses Chains, but five manufacturers list it as a category they
  // make. A real taxonomy carries branches nobody has listed into yet.
  { id: 'CAT-chains', name: 'Chains', parentId: 'CAT-neckwear', defaultHsn: '7113 19 10' },

  { id: 'CAT-handwear', name: 'Handwear', parentId: null, defaultHsn: '7113 19 10' },
  { id: 'CAT-bangles', name: 'Bangles', parentId: 'CAT-handwear', defaultHsn: '7113 19 10' },
  { id: 'CAT-bracelets', name: 'Bracelets', parentId: 'CAT-handwear', defaultHsn: '7113 19 30' },
  { id: 'CAT-rings', name: 'Rings', parentId: 'CAT-handwear', defaultHsn: '7113 19 30' },

  { id: 'CAT-earnose', name: 'Ear and nose', parentId: null, defaultHsn: '7113 19 10' },
  { id: 'CAT-earrings', name: 'Earrings', parentId: 'CAT-earnose', defaultHsn: '7113 19 40' },
  { id: 'CAT-nosepins', name: 'Nose Pins', parentId: 'CAT-earnose', defaultHsn: '7113 19 10' },

  { id: 'CAT-anklets-group', name: 'Anklets and toe rings', parentId: null, defaultHsn: '7113 19 10' },
  { id: 'CAT-anklets', name: 'Anklets', parentId: 'CAT-anklets-group', defaultHsn: '7113 19 10' },

  { id: 'CAT-sets', name: 'Sets and collections', parentId: null, defaultHsn: '7113 19 30' },
  { id: 'CAT-bridal', name: 'Bridal Sets', parentId: 'CAT-sets', defaultHsn: '7113 19 30' },
  { id: 'CAT-temple', name: 'Temple Jewellery', parentId: 'CAT-sets', defaultHsn: '7113 19 40' },
];

// Which attribute set a leaf category is scored against. Assigned below, once
// the sets exist.
const CATEGORY_ATTRIBUTE_SET = {
  'CAT-necklaces': 'ATS-studded',
  'CAT-mangalsutra': 'ATS-plain',
  'CAT-pendants': 'ATS-studded',
  'CAT-chains': 'ATS-chain',
  'CAT-bangles': 'ATS-plain',
  'CAT-bracelets': 'ATS-studded',
  'CAT-rings': 'ATS-studded',
  'CAT-earrings': 'ATS-studded',
  'CAT-nosepins': 'ATS-plain',
  'CAT-anklets': 'ATS-plain',
  'CAT-bridal': 'ATS-bridal',
  'CAT-temple': 'ATS-bridal',
};

// A category's default HSN is whatever most of its pieces are actually
// declared as. Picking it by hand would make almost every listing read as an
// override, which would leave ADM-033 unable to show the ones that really are.
function modalHsn(categoryName, fallback) {
  const owned = products.filter((product) => product.category === categoryName);
  if (owned.length === 0) return fallback;

  const counts = owned.reduce((tally, product) => {
    tally[product.hsn] = (tally[product.hsn] ?? 0) + 1;
    return tally;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export const categoryTree = CATEGORY_SEED.map((seed, index) => {
  const owned = products.filter((product) => product.category === seed.name);
  const children = CATEGORY_SEED.filter((row) => row.parentId === seed.id);

  // A parent inherits the code its busiest child uses.
  const defaultHsn = seed.parentId
    ? modalHsn(seed.name, seed.defaultHsn)
    : modalHsn(
        children
          .map((child) => ({ name: child.name, n: products.filter((x) => x.category === child.name).length }))
          .sort((a, b) => b.n - a.n)[0]?.name ?? seed.name,
        seed.defaultHsn,
      );

  return {
    ...seed,
    defaultHsn,
    slug: seed.name.toLowerCase().replace(/\s+/g, '-'),
    status: 'active',
    attributeSetId: CATEGORY_ATTRIBUTE_SET[seed.id] ?? null,
    // Counts the exact category, never the subtree. Moving a listing between
    // two siblings must not change what a parent claims to hold.
    productCount: owned.length,
    liveCount: owned.filter((product) => product.status === 'live').length,
    order: index,
    createdAt: isoDaysAgo(540),
    updatedAt: isoDaysAgo(30 + (index % 11) * 9),
  };
});

export const categoryByName = Object.fromEntries(
  categoryTree.filter((row) => row.parentId).map((row) => [row.name, row]),
);

// ---------------------------------------------------------------------------
// Attributes and sets - ADM-027
// ---------------------------------------------------------------------------

export const attributeDefinitions = [
  { id: 'ATR-metal', label: 'Metal', group: 'metal', type: 'enum', unit: null, required: true, derived: false, options: ['Gold', 'Silver', 'Platinum'], helpText: 'Elanzia lists gold only today.' },
  { id: 'ATR-purity', label: 'Purity', group: 'metal', type: 'enum', unit: 'K', required: true, derived: false, options: ['24K', '22K', '18K', '14K'], helpText: 'Drives the metal rate the piece is priced at.' },
  { id: 'ATR-gross', label: 'Gross weight', group: 'weight', type: 'number', unit: 'g', required: true, derived: false, options: [], helpText: 'The whole piece on the scale, to 3 decimals.' },
  { id: 'ATR-stone', label: 'Stone weight', group: 'weight', type: 'number', unit: 'g', required: true, derived: false, options: [], helpText: 'Total weight of every stone set into the piece.' },
  // The one number a jeweller argues about. It is arithmetic, not an opinion,
  // so it is never typed in - see the derived flag.
  { id: 'ATR-net', label: 'Net weight', group: 'weight', type: 'number', unit: 'g', required: true, derived: true, options: [], helpText: 'Gross minus stone. Metal is charged on this and nothing else.' },
  { id: 'ATR-stonetype', label: 'Stone type', group: 'stone', type: 'enum', unit: null, required: false, derived: false, options: ['None', 'Polki', 'Kundan', 'Cubic Zirconia', 'Diamond', 'Ruby', 'Emerald', 'Pearl'], helpText: 'Decides which HSN the piece falls under.' },
  { id: 'ATR-carat', label: 'Stone carat', group: 'stone', type: 'number', unit: 'ct', required: false, derived: false, options: [], helpText: 'Total carat across all stones.' },
  { id: 'ATR-setting', label: 'Setting', group: 'stone', type: 'enum', unit: null, required: false, derived: false, options: ['Closed', 'Open', 'Prong', 'Bezel', 'Pave', 'Channel'], helpText: null },
  { id: 'ATR-wastage', label: 'Wastage', group: 'making', type: 'number', unit: '%', required: true, derived: false, options: [], helpText: 'Added to the metal value, never deducted. Trade convention.' },
  { id: 'ATR-making', label: 'Making charges', group: 'making', type: 'number', unit: 'INR/g', required: true, derived: false, options: [], helpText: 'Charged per gram of net weight.' },
  { id: 'ATR-hallmarked', label: 'Hallmarked', group: 'compliance', type: 'boolean', unit: null, required: true, derived: false, options: [], helpText: 'BIS hallmarking. Mandatory to sell at 22K and above.' },
  { id: 'ATR-huid', label: 'HUID', group: 'compliance', type: 'text', unit: null, required: false, derived: false, options: [], helpText: 'The six digit code hallmarking issues. Present exactly when hallmarked.' },
  { id: 'ATR-hsn', label: 'HSN code', group: 'compliance', type: 'enum', unit: null, required: true, derived: false, options: hsnCodes.filter((row) => row.kind === 'goods').map((row) => row.code), helpText: 'Sets the GST rate. Defaults from the category.' },
  { id: 'ATR-moq', label: 'Minimum order quantity', group: 'making', type: 'number', unit: null, required: true, derived: false, options: [], helpText: null },
  { id: 'ATR-leadtime', label: 'Lead time', group: 'making', type: 'number', unit: 'days', required: true, derived: false, options: [], helpText: 'Working days from confirmation to dispatch ready.' },
  { id: 'ATR-size', label: 'Size', group: 'making', type: 'text', unit: null, required: false, derived: false, options: [], helpText: 'Ring size, bangle diameter or chain length.' },
  { id: 'ATR-finish', label: 'Finish', group: 'making', type: 'enum', unit: null, required: false, derived: false, options: ['Matte', 'High polish', 'Antique', 'Satin', 'Rhodium'], helpText: null },
  { id: 'ATR-certificate', label: 'Stone certificate', group: 'compliance', type: 'text', unit: null, required: false, derived: false, options: [], helpText: 'IGI or GIA number where the stones are certified.' },
];

export const attributeById = Object.fromEntries(attributeDefinitions.map((row) => [row.id, row]));

// Purity, gross weight and HSN cannot be dropped from any set: the first two
// price the piece and the third taxes it. The mock API enforces this.
export const REQUIRED_ATTRIBUTE_IDS = ['ATR-purity', 'ATR-gross', 'ATR-hsn'];

const BASE_ATTRIBUTES = [
  'ATR-metal', 'ATR-purity', 'ATR-gross', 'ATR-stone', 'ATR-net',
  'ATR-wastage', 'ATR-making', 'ATR-hallmarked', 'ATR-huid', 'ATR-hsn',
  'ATR-moq', 'ATR-leadtime',
];

const ATTRIBUTE_SET_SEED = [
  { id: 'ATS-plain', name: 'Plain gold', description: 'Unstudded pieces priced on metal, wastage and making alone.', extra: ['ATR-size', 'ATR-finish'] },
  { id: 'ATS-studded', name: 'Studded', description: 'Pieces carrying stones, where stone weight and type change both price and HSN.', extra: ['ATR-stonetype', 'ATR-carat', 'ATR-setting', 'ATR-certificate', 'ATR-size', 'ATR-finish'] },
  { id: 'ATS-chain', name: 'Chains', description: 'Machine and handmade chains, sold by length.', extra: ['ATR-size', 'ATR-finish'] },
  { id: 'ATS-bridal', name: 'Bridal and temple sets', description: 'Multi piece sets where every component is weighed and certified separately.', extra: ['ATR-stonetype', 'ATR-carat', 'ATR-setting', 'ATR-certificate', 'ATR-finish'] },
];

export const attributeSets = ATTRIBUTE_SET_SEED.map((seed) => {
  const categoryIds = Object.entries(CATEGORY_ATTRIBUTE_SET)
    .filter(([, setId]) => setId === seed.id)
    .map(([categoryId]) => categoryId);

  const categoryNames = categoryIds.map(
    (categoryId) => CATEGORY_SEED.find((row) => row.id === categoryId).name,
  );

  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    categoryIds,
    attributeIds: [...BASE_ATTRIBUTES, ...seed.extra],
    productCount: products.filter((product) => categoryNames.includes(product.category)).length,
    updatedAt: isoDaysAgo(20 + seed.id.length),
    updatedBy: activeStaff[seed.id.length % activeStaff.length].id,
  };
});

// ---------------------------------------------------------------------------
// Media standards - ADM-032
// ---------------------------------------------------------------------------

// What a listing has to show before it reaches the marketplace. A jeweller
// buying a 60g necklace off a photograph needs the hallmark legible, which is
// why that angle is required rather than encouraged.
export const mediaStandards = {
  minResolutionPx: 1600,
  maxFileSizeMb: 8,
  allowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
  background: 'plain_white',
  requiredAngles: ['Front', 'Reverse', 'Side profile', 'Hallmark close-up'],
  minImages: 4,
  maxImages: 10,
  videoRequired: true,
  videoMaxSeconds: 30,
  updatedAt: isoDaysAgo(46),
  updatedBy: activeStaff[0].id,
};

// The angles a listing is presumed to have, in order. A piece with 6 images
// has the 4 required angles plus 2 detail shots.
const EXTRA_ANGLES = ['Clasp detail', 'Stone detail', 'Scale reference', 'Worn on model', 'Packaging', 'Certificate'];

export function mediaItemsFor(product) {
  const angles = [
    ...mediaStandards.requiredAngles.slice(0, Math.min(product.imageCount, 4)),
    ...EXTRA_ANGLES.slice(0, Math.max(0, product.imageCount - 4)),
  ];

  const images = angles.map((label, index) => ({
    id: `${product.id}-IMG-${index + 1}`,
    type: 'image',
    // No url. The fixtures carry no binaries, and inventing one would render
    // a broken image rather than an honest placeholder.
    url: null,
    label: `${label} - ${product.sku}`,
    caption: index === 0 ? product.title : null,
  }));

  if (product.hasVideo) {
    images.push({
      id: `${product.id}-VID-1`,
      type: 'video',
      url: null,
      label: `Turntable video - ${product.sku}`,
      caption: `Up to ${mediaStandards.videoMaxSeconds} seconds`,
    });
  }

  return images;
}

// ---------------------------------------------------------------------------
// Product flags - ADM-023, ADM-024
// ---------------------------------------------------------------------------

const STALE_LISTING_DAYS = 365;

// The effective HSN for a piece: its own code, falling back to whatever its
// category defaults to. This is the resolution ADM-033 exposes and the reason
// a category can never be deleted while listings point at it.
export function resolveHsn(product) {
  const category = categoryByName[product.category];
  const code = product.hsn ?? category?.defaultHsn ?? null;

  return {
    code,
    source: product.hsn ? 'product' : 'category',
    categoryDefault: category?.defaultHsn ?? null,
    isOverride: Boolean(product.hsn && category && product.hsn !== category.defaultHsn),
    gstRate: code ? (hsnByCode[code]?.gstRate ?? null) : null,
  };
}

export function flagsFor(product) {
  const flags = [];
  const manufacturer = manufacturerById[product.manufacturerId];
  const hsn = resolveHsn(product);
  const ageDays = Math.floor((NOW_MS - Date.parse(product.listedAt)) / DAY_MS);

  // BIS hallmarking is mandatory at 22K and above. A piece live without it is
  // on the marketplace and unsellable at the same time.
  if (product.status === 'live' && product.purity >= 22 && !product.hallmarked) {
    flags.push({
      code: 'hallmark_missing',
      severity: 'critical',
      summary: 'Live at 22K or above with no hallmark',
      detail: `${product.purity}K cannot be sold without BIS hallmarking. No HUID is recorded against ${product.sku}.`,
    });
  }

  if (product.imageCount < mediaStandards.minImages) {
    flags.push({
      code: 'below_media_standard',
      severity: 'medium',
      summary: `${product.imageCount} of ${mediaStandards.minImages} required images`,
      detail: `Missing ${mediaStandards.requiredAngles.slice(product.imageCount).join(', ') || 'required angles'}.`,
    });
  }

  if (mediaStandards.videoRequired && !product.hasVideo) {
    flags.push({
      code: 'no_video',
      severity: 'low',
      summary: 'No turntable video',
      detail: `The current standard asks for a video of up to ${mediaStandards.videoMaxSeconds} seconds.`,
    });
  }

  // Currently no rows: every manufacturer that owns a listing is approved.
  // The rule stays because the moment onboarding suspends one, its listings
  // must surface here rather than quietly staying live.
  if (manufacturer && manufacturer.status !== 'approved') {
    flags.push({
      code: 'manufacturer_not_approved',
      severity: 'critical',
      summary: `Owner is ${manufacturer.status.replace(/_/g, ' ')}`,
      detail: `${manufacturer.businessName} cannot sell while its account is ${manufacturer.status.replace(/_/g, ' ')}.`,
    });
  }

  if (product.status === 'live' && ageDays > STALE_LISTING_DAYS) {
    flags.push({
      code: 'stale_listing',
      severity: 'low',
      summary: `Untouched for ${Math.floor(ageDays / 30)} months`,
      detail: 'Price and stock have not been confirmed by the manufacturer in over a year.',
    });
  }

  if (product.status === 'live' && product.stockQuantity === 0) {
    flags.push({
      code: 'zero_stock_live',
      severity: 'medium',
      summary: 'Live with no stock',
      detail: 'A jeweller can order this and nothing will ship. It belongs in out of stock.',
    });
  }

  // Zero rows by construction today, because every product's HSN was assigned
  // from a register whose rate is 3 and every price carries gstPercent 3. The
  // first real supplier import will produce some, so the check ships now.
  if (hsn.gstRate !== null && hsn.gstRate !== product.price.gstPercent) {
    flags.push({
      code: 'hsn_gst_mismatch',
      severity: 'critical',
      summary: `HSN says ${hsn.gstRate}%, price charges ${product.price.gstPercent}%`,
      detail: `${hsn.code} is taxed at ${hsn.gstRate}%. The listing is priced at ${product.price.gstPercent}%.`,
    });
  }

  return flags;
}

const FLAG_SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

// The row every catalogue list renders. Flattened on purpose: applyFilters in
// _client.js compares top level fields only.
export function toCatalogueRow(product) {
  const manufacturer = manufacturerById[product.manufacturerId];
  const flags = flagsFor(product);
  const hsn = resolveHsn(product);

  return {
    id: product.id,
    sku: product.sku,
    title: product.title,
    manufacturerId: product.manufacturerId,
    manufacturerName: manufacturer.businessName,
    manufacturerCity: manufacturer.city,
    manufacturerStatus: manufacturer.status,
    category: product.category,
    speciality: product.speciality,
    purity: product.purity,
    grossWeight: product.grossWeight,
    stoneWeight: product.stoneWeight,
    netWeight: product.netWeight,
    hallmarked: product.hallmarked,
    huid: product.huid,
    hsn: hsn.code,
    hsnSource: hsn.source,
    hsnIsOverride: hsn.isOverride,
    gstRate: hsn.gstRate,
    visibility: product.visibility,
    imageCount: product.imageCount,
    hasVideo: product.hasVideo,
    stockQuantity: product.stockQuantity,
    minOrderQuantity: product.minOrderQuantity,
    leadTimeDays: product.leadTimeDays,
    status: product.status,
    listedAt: product.listedAt,
    priceTotal: product.price.total,
    rejectionReason: product.rejectionReason,
    flags,
    flagCount: flags.length,
    topSeverity: flags.length
      ? flags.slice().sort((a, b) => FLAG_SEVERITY_RANK[a.severity] - FLAG_SEVERITY_RANK[b.severity])[0].severity
      : null,
    // 'awaiting' is exactly pending_review or draft - the same rule the
    // Operations listing_moderation alert uses. If these two ever diverge the
    // dashboard starts disagreeing with the queue it links to.
    queue: ['pending_review', 'draft'].includes(product.status)
      ? 'awaiting'
      : flags.length > 0
        ? 'flagged'
        : 'clear',
  };
}

export const catalogueRows = products.map(toCatalogueRow);

// Products sitting on a confirmed order line. Their price is permanent, so the
// mock API refuses to edit them - the order has to keep describing what was
// actually bought.
export const productIdsOnConfirmedOrders = [
  ...new Set(
    orders
      .filter((order) => Boolean(order.confirmedAt))
      .flatMap((order) => order.lines.map((line) => line.productId)),
  ),
];

// ---------------------------------------------------------------------------
// AI listing jobs - ADM-028, ADM-029
// ---------------------------------------------------------------------------

// Manufacturers that actually list are the ones using photo-to-listing.
const aiManufacturerIds = [...new Set(products.map((product) => product.manufacturerId))];

const AI_FAILURES = [
  { code: 'image_below_min_resolution', reason: `Sharpest frame was under ${mediaStandards.minResolutionPx}px on the long edge` },
  { code: 'no_jewellery_detected', reason: 'No piece found in frame. The images look like packaging shots' },
  { code: 'multiple_pieces_in_frame', reason: 'Four pieces in one frame. Photograph one listing at a time' },
  { code: 'hallmark_unreadable', reason: 'Hallmark stamp too small to read at the supplied resolution' },
  { code: 'model_timeout', reason: 'Extraction did not return within the 90 second budget' },
  { code: 'insufficient_credits', reason: 'Manufacturer credit balance reached zero mid batch' },
];

const AI_STATUS_CYCLE = [
  'published', 'needs_review', 'published', 'failed', 'needs_review',
  'published', 'running', 'published', 'rejected', 'needs_review',
  'published', 'failed', 'queued', 'published', 'cancelled',
];

const STONE_TYPES = ['None', 'Polki', 'Kundan', 'Cubic Zirconia', 'Diamond', 'Ruby', 'Emerald', 'Pearl'];
const SETTINGS = ['Closed', 'Open', 'Prong', 'Bezel', 'Pave', 'Channel'];

// Confidence is per field, not per job. A model can read a hallmark stamp
// perfectly and still guess the wastage, and the reviewer needs to see which
// is which rather than one blended number.
function extractionFor(product, index) {
  const wobble = (offset) => 0.62 + (((index * 7 + offset * 13) % 38) / 100);

  const field = (value, offset, sourceImageIndex = 0) => ({
    value,
    confidence: Number(wobble(offset).toFixed(2)),
    sourceImageIndex,
  });

  return {
    title: field(product.title, 1),
    category: field(product.category, 2),
    speciality: field(product.speciality, 3),
    purity: field(product.purity, 4, 3),
    grossWeight: field(product.grossWeight, 5),
    stoneWeight: field(product.stoneWeight, 6),
    stoneType: field(product.stoneWeight > 0 ? STONE_TYPES[(index % 7) + 1] : 'None', 7),
    setting: field(SETTINGS[index % SETTINGS.length], 8),
    hallmarked: field(product.hallmarked, 9, 3),
    huid: field(product.huid, 10, 3),
    wastagePercent: field(product.price.wastagePercent, 11),
    makingChargesPerGram: field(product.price.makingChargesPerGram, 12),
    suggestedHsn: field(resolveHsn(product).code, 13),
  };
}

// A field the model is under 0.7 sure of has to be looked at by a human before
// the listing publishes. Publishing an unreviewed purity is how a 14K piece
// reaches the marketplace labelled 22K.
export const AI_CONFIDENCE_THRESHOLD = 0.7;

export const aiListingJobs = Array.from({ length: 46 }).map((_, index) => {
  const product = products[(index * 13) % products.length];
  const manufacturerId = aiManufacturerIds[index % aiManufacturerIds.length];
  const manufacturer = manufacturerById[manufacturerId];
  const status = AI_STATUS_CYCLE[index % AI_STATUS_CYCLE.length];
  const failure = AI_FAILURES[index % AI_FAILURES.length];

  const submittedAt = isoHoursAgo(2 + index * 5.5);
  const started = status === 'queued' ? null : isoHoursAgo(1.8 + index * 5.5);
  const finished = ['queued', 'running'].includes(status) ? null : isoHoursAgo(1.5 + index * 5.5);
  const failed = status === 'failed';
  const extracted = failed ? null : extractionFor(product, index);

  const confidences = extracted
    ? Object.values(extracted).map((entry) => entry.confidence)
    : [];

  return {
    id: `AIJ-${String(index + 1).padStart(4, '0')}`,
    manufacturerId,
    manufacturerName: manufacturer.businessName,
    manufacturerCity: manufacturer.city,
    sourceImageCount: 3 + (index % 6),
    model: index % 4 === 0 ? 'listing-vision-2' : 'listing-vision-1',
    status,
    submittedAt,
    startedAt: started,
    completedAt: finished,
    durationMs: finished ? 18000 + (index % 11) * 6400 : null,
    creditsUsed: failed ? 0 : 1 + (index % 3),
    overallConfidence: confidences.length
      ? Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(2))
      : null,
    lowConfidenceFields: extracted
      ? Object.entries(extracted)
          .filter(([, entry]) => entry.confidence < AI_CONFIDENCE_THRESHOLD)
          .map(([name]) => name)
      : [],
    // Only a published job has a real listing behind it.
    productId: status === 'published' ? product.id : null,
    productSku: status === 'published' ? product.sku : null,
    reviewedBy: ['published', 'rejected'].includes(status)
      ? activeStaff[index % activeStaff.length].id
      : null,
    reviewedByName: ['published', 'rejected'].includes(status)
      ? activeStaff[index % activeStaff.length].name
      : null,
    reviewedAt: ['published', 'rejected'].includes(status) ? finished : null,
    failureCode: failed ? failure.code : null,
    failureReason: failed ? failure.reason : null,
    retryCount: failed ? index % 3 : 0,
    extracted,
    // The photographs the extraction ran on. Same placeholder discipline as
    // every other media reference in this file.
    sourceImages: Array.from({ length: 3 + (index % 6) }).map((__, imageIndex) => ({
      id: `AIJ-${String(index + 1).padStart(4, '0')}-IMG-${imageIndex + 1}`,
      type: 'image',
      url: null,
      label: `Upload ${imageIndex + 1} - ${manufacturer.businessName}`,
      caption: imageIndex === 0 ? `Submitted ${new Date(Date.parse(submittedAt)).toISOString().slice(0, 10)}` : null,
    })),
  };
});

// ---------------------------------------------------------------------------
// AI credits - ADM-030
// ---------------------------------------------------------------------------

const AI_PLANS = ['Starter', 'Studio', 'Studio', 'Workshop'];

export const aiCreditAccounts = aiManufacturerIds.map((manufacturerId, index) => {
  const manufacturer = manufacturerById[manufacturerId];
  const jobs = aiListingJobs.filter((job) => job.manufacturerId === manufacturerId);
  const consumedTotal = jobs.reduce((sum, job) => sum + job.creditsUsed, 0);
  // Deliberately spread so the queue carries exhausted and nearly exhausted
  // accounts. A manufacturer at zero credits cannot list at all, and that is
  // the row this screen exists to catch before support does.
  const remaining = [42, 18, 0, 7, 31, 3, 58, 0, 12, 26, 9, 47, 2, 63][index % 14];
  const grantedTotal = consumedTotal + remaining;
  const balance = remaining;
  const succeeded = jobs.filter((job) => job.status === 'published').length;
  const finished = jobs.filter((job) => !['queued', 'running'].includes(job.status)).length;

  return {
    manufacturerId,
    manufacturerName: manufacturer.businessName,
    city: manufacturer.city,
    plan: AI_PLANS[index % AI_PLANS.length],
    balance,
    grantedTotal,
    consumedTotal,
    consumedThisMonth: consumedTotal,
    jobsThisMonth: jobs.length,
    successRate: finished ? Number(((succeeded / finished) * 100).toFixed(1)) : null,
    lastJobAt: jobs.length ? jobs[0].submittedAt : null,
    // A manufacturer at zero cannot list at all, which is a support call
    // waiting to happen rather than a number on a chart.
    state: balance === 0 ? 'exhausted' : balance < 10 ? 'low' : 'healthy',
  };
});

// Six months of consumption, so ADM-030 has a trend rather than one bar.
export const aiUsageSeries = Array.from({ length: 6 }).map((_, index) => {
  const monthsBack = 5 - index;
  const at = new Date(NOW_MS - monthsBack * 30 * DAY_MS);
  const total = aiCreditAccounts.reduce((sum, account) => sum + account.consumedTotal, 0);

  return {
    month: at.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
    date: at.toISOString().slice(0, 10),
    creditsConsumed: Math.round((total * (62 + index * 9)) / 100),
    jobs: Math.round((aiListingJobs.length * (58 + index * 10)) / 100),
  };
});

export const aiCreditLedger = aiCreditAccounts.flatMap((account, index) => [
  {
    id: `AIC-${account.manufacturerId}-G1`,
    manufacturerId: account.manufacturerId,
    type: 'grant',
    credits: account.grantedTotal,
    at: isoDaysAgo(120 - index),
    actorId: activeStaff[index % activeStaff.length].id,
    reason: `${account.plan} plan allocation`,
  },
  {
    id: `AIC-${account.manufacturerId}-C1`,
    manufacturerId: account.manufacturerId,
    type: 'consume',
    credits: -account.consumedTotal,
    at: isoDaysAgo(3 + index),
    actorId: null,
    reason: 'Photo to listing extraction',
  },
]);

// ---------------------------------------------------------------------------
// Visibility and design protection - ADM-031
// ---------------------------------------------------------------------------

// A manufacturer's private range is its unreleased design book. The whole
// point of the model is that Elanzia can administer it without reading it, so
// NOTHING in the exported shapes below carries a piece title, image or price.
// The pieces themselves stay in core and are reachable only through the
// break-glass unseal in catalogueApi.js, which writes an audit row.

const privateProducts = products.filter((product) => product.visibility === 'private');

const approvedJewellers = jewellers.filter((jeweller) => jeweller.status === 'approved');

export const accessGrants = privateProducts.flatMap((product, rangeIndex) =>
  Array.from({ length: 3 + (rangeIndex % 3) }).map((_, grantIndex) => {
    const jeweller = approvedJewellers[(rangeIndex * 7 + grantIndex * 5) % approvedJewellers.length];
    const cycle = (rangeIndex + grantIndex) % 5;
    const status = cycle === 3 ? 'expired' : cycle === 4 ? 'revoked' : 'active';
    const grantedAt = isoDaysAgo(120 - rangeIndex * 9 - grantIndex * 4);

    return {
      id: `PGR-${String(rangeIndex + 1).padStart(2, '0')}${String(grantIndex + 1).padStart(2, '0')}`,
      manufacturerId: product.manufacturerId,
      jewellerId: jeweller.id,
      jewellerName: jeweller.businessName,
      jewellerCity: jeweller.city,
      grantedAt,
      expiresAt: status === 'expired' ? isoDaysAgo(6 + grantIndex) : isoDaysAhead(20 + rangeIndex * 11),
      status,
      // Elanzia never issues access to someone else's design book. An admin
      // can revoke a grant, never create one.
      grantedBy: 'manufacturer',
      viewCount: (rangeIndex * 3 + grantIndex * 5) % 24,
      lastViewedAt: status === 'active' ? isoHoursAgo(9 + grantIndex * 26) : null,
      revokedAt: status === 'revoked' ? isoDaysAgo(11 + grantIndex) : null,
      revokedReason: status === 'revoked' ? 'Buyer relationship ended' : null,
    };
  }),
);

export const privateViewLogs = accessGrants
  .filter((grant) => grant.viewCount > 0)
  .flatMap((grant, index) =>
    Array.from({ length: Math.min(3, grant.viewCount) }).map((_, viewIndex) => ({
      id: `PVL-${grant.id}-${viewIndex + 1}`,
      manufacturerId: grant.manufacturerId,
      at: isoHoursAgo(4 + index * 7 + viewIndex * 31),
      viewerType: 'jeweller',
      viewerId: grant.jewellerId,
      viewerName: grant.jewellerName,
      action: viewIndex === 0 ? 'viewed_range' : 'viewed_piece',
      grantId: grant.id,
      reason: null,
    })),
  );

export const privateRanges = privateProducts.map((product) => {
  const manufacturer = manufacturerById[product.manufacturerId];
  const grants = accessGrants.filter((grant) => grant.manufacturerId === product.manufacturerId);
  const logs = privateViewLogs.filter((log) => log.manufacturerId === product.manufacturerId);

  return {
    manufacturerId: product.manufacturerId,
    manufacturerName: manufacturer.businessName,
    city: manufacturer.city,
    pieceCount: products.filter(
      (row) => row.manufacturerId === product.manufacturerId && row.visibility === 'private',
    ).length,
    // Always true in this shape. Unsealing returns a separate payload and
    // never writes back here, so a refresh re-seals.
    sealed: true,
    activeGrants: grants.filter((grant) => grant.status === 'active').length,
    expiredGrants: grants.filter((grant) => grant.status === 'expired').length,
    revokedGrants: grants.filter((grant) => grant.status === 'revoked').length,
    viewsLast30Days: logs.filter((log) => Date.parse(log.at) > NOW_MS - 30 * DAY_MS).length,
    firstSealedAt: product.listedAt,
    lastViewedAt: logs.length ? logs[0].at : null,
  };
});

export const UNSEAL_REASON_MIN_LENGTH = 20;
export const UNSEAL_WINDOW_MINUTES = 15;

// Past break-glass events, so the screen has history on first render rather
// than an empty audit panel that looks like the logging is broken.
export const unsealRequests = privateRanges.slice(0, 3).map((range, index) => ({
  id: `UNS-${String(index + 1).padStart(4, '0')}`,
  manufacturerId: range.manufacturerId,
  adminId: activeStaff[index % activeStaff.length].id,
  adminName: activeStaff[index % activeStaff.length].name,
  reason: [
    'Jeweller complaint that a private piece was visible on the public marketplace',
    'Weight dispute on a delivered private order, assay report attached to ticket',
    'Manufacturer asked us to confirm which pieces are still sealed after a migration',
  ][index],
  requestedAt: isoDaysAgo(4 + index * 9),
  expiresAt: isoDaysAgo(4 + index * 9),
  status: 'expired',
}));

// ---------------------------------------------------------------------------
// Bulk runs and the audit trail - ADM-034, ADM-025
// ---------------------------------------------------------------------------

const BULK_ACTIONS = ['archive', 'publish', 'recategorise', 'set_hsn', 'request_changes', 'unpublish'];

export const bulkRuns = Array.from({ length: 12 }).map((_, index) => {
  const actor = activeStaff[index % activeStaff.length];
  const total = 4 + index * 3;
  const blocked = index % 5 === 2 ? 1 + (index % 3) : 0;
  const failed = index % 6 === 4 ? 2 : 0;

  return {
    id: `BLK-${String(index + 1).padStart(4, '0')}`,
    action: BULK_ACTIONS[index % BULK_ACTIONS.length],
    params: {},
    filters: { category: index % 3 === 0 ? 'Bangles' : '', status: index % 2 ? 'live' : '' },
    reason: [
      'Seasonal range retired at the manufacturer request',
      'Backfilling HSN after the taxonomy review',
      'Republished after the hallmark certificates arrived',
      'Moved out of Temple Jewellery into Necklaces',
    ][index % 4],
    requestedBy: actor.id,
    requestedByName: actor.name,
    requestedAt: isoDaysAgo(2 + index * 6),
    total,
    succeeded: total - failed - blocked,
    failed,
    blocked,
    status: failed > 0 ? 'partial' : blocked > 0 ? 'partial' : 'succeeded',
  };
});

const AUDIT_ACTIONS = [
  { action: 'field_corrected', summary: 'Corrected stone weight from the assay report' },
  { action: 'approved', summary: 'Approved and published to the marketplace' },
  { action: 'rejected', summary: 'Rejected: declared net weight does not match the assay report' },
  { action: 'hsn_reassigned', summary: 'HSN moved off the category default' },
  { action: 'changes_requested', summary: 'Sent back for hallmark certificate' },
  { action: 'archived', summary: 'Archived at the manufacturer request' },
];

export const productAuditTrail = products.flatMap((product, index) =>
  Array.from({ length: 1 + (index % 3) }).map((_, entryIndex) => {
    const actor = activeStaff[(index + entryIndex) % activeStaff.length];
    const entry = AUDIT_ACTIONS[(index + entryIndex) % AUDIT_ACTIONS.length];

    return {
      id: `PAU-${product.id}-${entryIndex + 1}`,
      productId: product.id,
      at: isoDaysAgo(1 + index * 2 + entryIndex * 17),
      actorId: actor.id,
      actorName: actor.name,
      action: entry.action,
      summary: entry.summary,
      // Every admin edit carries a written reason. An edit to somebody else's
      // listing with no reason recorded is indistinguishable from tampering.
      reason: entry.summary,
    };
  }),
);
