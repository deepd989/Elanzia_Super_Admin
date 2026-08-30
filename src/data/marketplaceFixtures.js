// Feature fixtures for Marketplace oversight - ADM-042 to ADM-047.
// Everything here references src/data/core by id. No manufacturer, jeweller,
// product or order is invented in this file.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so the queues show the same rows on every reload and a
// screenshot taken today still matches the code tomorrow.

import {
  adminUsers,
  jewellers,
  manufacturerById,
  manufacturers,
  orders,
  products,
} from '@/data/core';

// The anchor. Matches operationsFixtures.js so the two areas agree about "now".
export const MARKETPLACE_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(MARKETPLACE_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

// The service levels the marketplace desk is held to. They live here because
// the enquiry queue, the stalled queue and the sourcing desk all grade against
// them and must use the same numbers.
export const FIRST_RESPONSE_SLA_HOURS = 24;
export const STALL_THRESHOLD_DAYS = 3;
export const QUOTE_VALIDITY_DAYS = 7;
export const MICROSITE_REVIEW_SLA_HOURS = 48;
export const SOURCING_ROUTE_SLA_HOURS = 12;
export const SOURCING_RESPONSE_SLA_HOURS = 72;

function isoHoursAgo(hours) {
  return new Date(NOW_MS - hours * HOUR_MS).toISOString();
}

function isoDaysAgo(days) {
  return isoHoursAgo(days * 24);
}

function isoDaysAhead(days) {
  return new Date(NOW_MS + days * DAY_MS).toISOString();
}

function hoursSince(iso) {
  if (!iso) return null;
  return Math.max(0, Math.round((NOW_MS - Date.parse(iso)) / HOUR_MS));
}

function daysSinceIso(iso) {
  if (!iso) return null;
  return Math.max(0, Math.floor((NOW_MS - Date.parse(iso)) / DAY_MS));
}

// Cycles a list without ever landing on undefined, so a fixture row can be
// added to any source array without re-tuning every index below.
function pick(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

// A manufacturer that has not been approved cannot be quoted against, routed a
// sourcing brief or given a public microsite, so every derivation below starts
// from these two lists rather than from the full core arrays.
const tradingManufacturers = manufacturers.filter((row) => row.status === 'approved');
const tradingJewellers = jewellers.filter((row) => row.status === 'approved');
const suspendedManufacturers = manufacturers.filter((row) => row.status === 'suspended');
const marketplaceStaff = adminUsers.filter((user) => user.status === 'active');

// ---------------------------------------------------------------------------
// Pricing helpers
// ---------------------------------------------------------------------------

// The rates a quotation is struck at. They match goldRateSnapshot in
// operationsFixtures.js, because a quote and the dashboard rate panel reading
// two different numbers on the same morning is the fastest way to lose a
// manufacturer's trust in the portal.
const METAL_RATE_PER_GRAM = { 24: 7912, 22: 7251, 18: 5936, 14: 4617 };

const GST_PERCENT = 3;

// What a piece of each category typically weighs and costs to make. A quotation
// against a free-text requirement has no listing to price off, so it is priced
// from here instead.
const CATEGORY_PROFILE = {
  'Bridal Sets': { purity: 22, netWeight: 62.48, wastagePercent: 13.5, makingChargesPerGram: 820, stoneValue: 0 },
  Necklaces: { purity: 22, netWeight: 44.216, wastagePercent: 12.5, makingChargesPerGram: 760, stoneValue: 0 },
  'Temple Jewellery': { purity: 22, netWeight: 38.604, wastagePercent: 14, makingChargesPerGram: 910, stoneValue: 0 },
  Bangles: { purity: 22, netWeight: 28.42, wastagePercent: 11.5, makingChargesPerGram: 690, stoneValue: 0 },
  Anklets: { purity: 22, netWeight: 21.6, wastagePercent: 11, makingChargesPerGram: 480, stoneValue: 0 },
  Mangalsutra: { purity: 22, netWeight: 16.844, wastagePercent: 12, makingChargesPerGram: 640, stoneValue: 18400 },
  Bracelets: { purity: 18, netWeight: 14.908, wastagePercent: 10.5, makingChargesPerGram: 580, stoneValue: 0 },
  Chains: { purity: 22, netWeight: 12.372, wastagePercent: 8.5, makingChargesPerGram: 420, stoneValue: 0 },
  Earrings: { purity: 22, netWeight: 9.816, wastagePercent: 12.5, makingChargesPerGram: 700, stoneValue: 26500 },
  Rings: { purity: 18, netWeight: 6.204, wastagePercent: 9.5, makingChargesPerGram: 520, stoneValue: 14200 },
  Pendants: { purity: 18, netWeight: 5.412, wastagePercent: 10, makingChargesPerGram: 560, stoneValue: 9800 },
  'Nose Pins': { purity: 22, netWeight: 2.108, wastagePercent: 12.5, makingChargesPerGram: 730, stoneValue: 0 },
};

export const ENQUIRY_CATEGORIES = Object.keys(CATEGORY_PROFILE);

/**
 * The one price composition, in the order the trade states it:
 * (metal rate x net weight) + wastage + making + stone, then GST on the lot.
 *
 * Wastage is ADDED to the metal value, not deducted from the weight - trade
 * convention, and the single number a jeweller disputes most often.
 */
function buildPriceBreakup({ purity, netWeight, grossWeight, wastagePercent, makingChargesPerGram, stoneValue }) {
  const metalRatePerGram = METAL_RATE_PER_GRAM[purity];
  const metalValue = Math.round(metalRatePerGram * netWeight);
  const wastageValue = Math.round((metalValue * wastagePercent) / 100);
  const makingCharges = Math.round(makingChargesPerGram * netWeight);
  const subtotal = metalValue + wastageValue + makingCharges + stoneValue;
  const gstValue = Math.round((subtotal * GST_PERCENT) / 100);

  return {
    purity,
    netWeight,
    grossWeight,
    metalRatePerGram,
    metalValue,
    wastagePercent,
    wastageValue,
    makingChargesPerGram,
    makingCharges,
    stoneValue,
    subtotal,
    gstPercent: GST_PERCENT,
    gstValue,
    total: subtotal + gstValue,
  };
}

// A quotation priced off a live listing rather than off the category profile.
// The listing already carries a committed breakup, so the quote re-uses it and
// only moves the negotiable parts: wastage and making.
function quoteFromProduct(product, { wastageDelta = 0, makingDelta = 0 } = {}) {
  return buildPriceBreakup({
    purity: product.purity,
    netWeight: product.netWeight,
    grossWeight: product.grossWeight,
    wastagePercent: Math.max(0, Number((product.price.wastagePercent + wastageDelta).toFixed(1))),
    makingChargesPerGram: Math.max(0, product.price.makingChargesPerGram + makingDelta),
    stoneValue: product.price.stoneValue,
  });
}

function quoteFromCategory(category, index, { wastageDelta = 0, makingDelta = 0 } = {}) {
  const profile = CATEGORY_PROFILE[category] ?? CATEGORY_PROFILE.Necklaces;
  // Spread the weights around the profile so a queue of 48 enquiries does not
  // show the same gram figure twelve times.
  const netWeight = Number((profile.netWeight * (0.82 + ((index * 7) % 23) / 60)).toFixed(3));

  return buildPriceBreakup({
    purity: profile.purity,
    netWeight,
    grossWeight: Number((netWeight + (profile.stoneValue > 0 ? 1.24 : 0)).toFixed(3)),
    wastagePercent: Number((profile.wastagePercent + wastageDelta).toFixed(1)),
    makingChargesPerGram: profile.makingChargesPerGram + makingDelta,
    stoneValue: profile.stoneValue,
  });
}

// ---------------------------------------------------------------------------
// Enquiries and quotations - ADM-042, ADM-043
// ---------------------------------------------------------------------------

export const ENQUIRY_STATUSES = [
  'awaiting_manufacturer',
  'quoted',
  'negotiating',
  'accepted',
  'declined',
  'expired',
  'closed',
];

export const STALL_REASONS = ['no_first_response', 'manufacturer_silent', 'jeweller_silent'];

// How the 48 conversations are distributed. Written out rather than computed so
// the mix stays deliberate: enough awaiting_manufacturer rows to fill a stalled
// queue, enough accepted rows to show a conversion rate that is not zero.
const ENQUIRY_MIX = [
  { status: 'awaiting_manufacturer', count: 11 },
  { status: 'quoted', count: 10 },
  { status: 'negotiating', count: 8 },
  { status: 'accepted', count: 6 },
  { status: 'declined', count: 5 },
  { status: 'expired', count: 4 },
  { status: 'closed', count: 4 },
];

// Orders that a conversation can be said to have produced. An accepted enquiry
// points at a real confirmed order rather than inventing an id.
const convertibleOrders = orders.filter((order) => Boolean(order.confirmedAt));

// The listings a jeweller can raise an enquiry against. Private pieces are
// excluded: a jeweller cannot enquire about something they were never shown.
const enquirableProducts = products.filter(
  (product) => product.visibility === 'public' && product.status === 'live',
);

const ENQUIRY_SUBJECTS = {
  'Bridal Sets': 'Full bridal set for a Diwali window, matched finish',
  Necklaces: 'Antique rani haar, 40 to 50 g, repeat order',
  'Temple Jewellery': 'Temple lakshmi haar with matching jhumkas',
  Bangles: 'Set of six machine-finished bangles, 22K',
  Anklets: 'Anklets with ghungroo, wholesale counter stock',
  Mangalsutra: 'Short mangalsutra, black bead chain, CZ pendant',
  Bracelets: 'Rose gold bracelet, 18K, light weight',
  Chains: 'Machine chains, 20 inch, assorted patterns',
  Earrings: 'Kundan jhumkas, bridal weight',
  Rings: 'Casual daily wear rings, 18K, size assortment',
  Pendants: 'Meenakari pendants, small ticket display stock',
  'Nose Pins': 'Stud nose pins, tray of assorted stones',
};

const JEWELLER_OPENERS = [
  'We are stocking up for the wedding season. Can you quote for the specification below?',
  'A repeat customer has asked for this. What is your best rate and lead time?',
  'Our counter has been asking for this piece all month. Do you make it in this weight?',
  'Sending a reference image. Can you make something close in 22K?',
  'Need this before the festival window closes. Please quote per piece.',
];

const MANUFACTURER_REPLIES = [
  'We can make this. Quote attached, valid for a week from today.',
  'Possible in this weight, but the wastage will be higher at that finish. Revised quote attached.',
  'We have the die ready, so lead time is short. Please see the breakup.',
  'Stone weight will change the net, so I have quoted on net only. Confirm and we will start.',
  'We can hold this rate for the week. After that the metal rate applies afresh.',
];

const NEGOTIATION_REPLIES = [
  'The making charge is above what our counter can carry. Can you revisit it?',
  'Rate is workable if you can bring the wastage down by a point.',
  'We will take the quantity up if the per-gram making comes down.',
  'Lead time is the problem, not the price. Can you dispatch sooner?',
];

// One flat build so the message thread, the quotation revisions and the summary
// row can never disagree about how many messages a conversation has.
function buildEnquiry(index, status) {
  const jeweller = pick(tradingJewellers, index * 3 + 1);
  const manufacturer = pick(tradingManufacturers, index * 5 + 2);
  const category = pick(manufacturer.categories, index);
  const listingCandidates = enquirableProducts.filter(
    (product) => product.manufacturerId === manufacturer.id && product.category === category,
  );
  // Roughly one enquiry in three is free text or an image, with no listing
  // behind it. Those are the ones that later become sourcing briefs.
  const product = index % 3 === 0 ? null : (listingCandidates[0] ?? null);

  const openedHoursAgo = 6 + ((index * 17) % 620);
  const openedAt = isoHoursAgo(openedHoursAgo);

  const answered = status !== 'awaiting_manufacturer';
  const firstResponseHours = answered ? 2 + ((index * 11) % 40) : null;

  // Where the conversation stopped. An unanswered enquiry has been idle since
  // it was opened, which is exactly what makes it a stalled-queue candidate.
  const idleHours = answered ? 1 + ((index * 13) % 260) : openedHoursAgo;
  const lastMessageAt = isoHoursAgo(Math.min(idleHours, openedHoursAgo));

  const quantity = 1 + ((index * 3) % 6);
  const quotationCount = { awaiting_manufacturer: 0, quoted: 1, negotiating: 3, accepted: 2, declined: 2, expired: 1, closed: 1 }[status];

  const quotations = Array.from({ length: quotationCount }).map((_, revision) => {
    const quotedAt = isoHoursAgo(Math.max(idleHours, 1) + (quotationCount - revision - 1) * 26);
    // Each revision concedes a little: that is what a negotiation looks like.
    const options = { wastageDelta: -0.5 * revision, makingDelta: -25 * revision };
    const price = product ? quoteFromProduct(product, options) : quoteFromCategory(category, index, options);
    const isLatest = revision === quotationCount - 1;

    return {
      id: `QTN-${String(index + 1).padStart(3, '0')}-R${revision + 1}`,
      enquiryId: `ENQ-${String(index + 1).padStart(3, '0')}`,
      revision: revision + 1,
      quotedAt,
      validUntil: new Date(Date.parse(quotedAt) + QUOTE_VALIDITY_DAYS * DAY_MS).toISOString(),
      status: !isLatest
        ? 'superseded'
        : { quoted: 'offered', negotiating: 'offered', accepted: 'accepted', declined: 'declined', expired: 'expired', closed: 'superseded' }[status],
      quantity,
      leadTimeDays: 6 + ((index * 5) % 22),
      price,
      unitTotal: price.total,
      lineTotal: price.total * quantity,
      notes: pick(MANUFACTURER_REPLIES, index + revision),
    };
  });

  const latestQuotation = quotations[quotations.length - 1] ?? null;

  // Only a conversation that was accepted has an order behind it, and it is a
  // real confirmed order from core rather than a made-up id.
  const convertedOrder = status === 'accepted' ? pick(convertibleOrders, index * 7) : null;

  const messages = [];
  const messageAt = (hoursAgo) => isoHoursAgo(Math.max(1, hoursAgo));
  messages.push({
    id: `MSG-${String(index + 1).padStart(3, '0')}-1`,
    enquiryId: `ENQ-${String(index + 1).padStart(3, '0')}`,
    at: openedAt,
    author: 'jeweller',
    authorName: jeweller.contactName,
    body: pick(JEWELLER_OPENERS, index),
    attachmentCount: product ? 0 : 1 + (index % 2),
  });

  quotations.forEach((quotation, revision) => {
    messages.push({
      id: `MSG-${String(index + 1).padStart(3, '0')}-${messages.length + 1}`,
      enquiryId: quotation.enquiryId,
      at: quotation.quotedAt,
      author: 'manufacturer',
      authorName: manufacturer.contactName,
      body: quotation.notes,
      attachmentCount: 1,
      quotationId: quotation.id,
    });

    if (status === 'negotiating' && revision < quotations.length - 1) {
      messages.push({
        id: `MSG-${String(index + 1).padStart(3, '0')}-${messages.length + 1}`,
        enquiryId: quotation.enquiryId,
        at: new Date(Date.parse(quotation.quotedAt) + 5 * HOUR_MS).toISOString(),
        author: 'jeweller',
        authorName: jeweller.contactName,
        body: pick(NEGOTIATION_REPLIES, index + revision),
        attachmentCount: 0,
      });
    }
  });

  // How a decided conversation ends. Without it every thread stops on the
  // manufacturer's quote and the jeweller never appears to have answered.
  const CLOSING_LINES = {
    accepted: 'Rate works. Raising the order against this quote now.',
    declined: 'We have gone with another workshop this time. Thank you for quoting.',
    expired: 'Season has passed, we will come back to this next quarter.',
    closed: 'Customer has changed the requirement. Closing this for now.',
  };
  if (CLOSING_LINES[status]) {
    messages.push({
      id: `MSG-${String(index + 1).padStart(3, '0')}-${messages.length + 1}`,
      enquiryId: `ENQ-${String(index + 1).padStart(3, '0')}`,
      at: lastMessageAt,
      author: 'jeweller',
      authorName: jeweller.contactName,
      body: CLOSING_LINES[status],
      attachmentCount: 0,
    });
  }

  // Elanzia has nudged roughly one silent conversation in four already. The
  // nudge is a message in the thread, not a hidden flag, because the jeweller
  // and the manufacturer both see that the desk stepped in.
  const nudgeCount = !answered && index % 4 === 1 ? 1 : 0;
  const nudgedAt = nudgeCount > 0 ? isoHoursAgo(Math.max(2, Math.round(idleHours / 2))) : null;
  if (nudgedAt) {
    messages.push({
      id: `MSG-${String(index + 1).padStart(3, '0')}-${messages.length + 1}`,
      enquiryId: `ENQ-${String(index + 1).padStart(3, '0')}`,
      at: nudgedAt,
      author: 'elanzia',
      authorName: pick(marketplaceStaff, index).name,
      body: 'Following up on behalf of the jeweller. Please respond with a quote or decline so the enquiry can close.',
      attachmentCount: 0,
    });
  }

  const idleDays = Math.floor(idleHours / 24);
  const openConversation = ['awaiting_manufacturer', 'quoted', 'negotiating'].includes(status);

  // Stalled is a property of an OPEN conversation only. A declined or expired
  // enquiry is finished, and dressing it up as stalled sends the desk chasing
  // people who have nothing left to say.
  const stalled = openConversation && idleDays >= STALL_THRESHOLD_DAYS;
  const stalledReason = !stalled
    ? null
    : status === 'awaiting_manufacturer'
      ? 'no_first_response'
      : pick(['manufacturer_silent', 'jeweller_silent'], index);

  return {
    id: `ENQ-${String(index + 1).padStart(3, '0')}`,
    jewellerId: jeweller.id,
    jewellerName: jeweller.businessName,
    jewellerCity: jeweller.city,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    manufacturerCity: manufacturer.city,
    productId: product?.id ?? null,
    productTitle: product?.title ?? null,
    subject: ENQUIRY_SUBJECTS[category] ?? ENQUIRY_SUBJECTS.Necklaces,
    category,
    purity: latestQuotation?.price.purity ?? (CATEGORY_PROFILE[category]?.purity ?? 22),
    expectedWeightGrams: latestQuotation?.price.netWeight ?? CATEGORY_PROFILE[category]?.netWeight ?? null,
    quantity,
    status,
    openedAt,
    lastMessageAt,
    lastMessageBy: messages[messages.length - 1].author,
    firstResponseHours,
    firstResponseBreached: firstResponseHours === null
      ? hoursSince(openedAt) > FIRST_RESPONSE_SLA_HOURS
      : firstResponseHours > FIRST_RESPONSE_SLA_HOURS,
    ageDays: daysSinceIso(openedAt),
    idleDays,
    messageCount: messages.length,
    quotationCount,
    latestQuotationId: latestQuotation?.id ?? null,
    latestQuotedValue: latestQuotation?.lineTotal ?? null,
    stalled,
    stalledReason,
    nudgeCount,
    nudgedAt,
    convertedOrderId: convertedOrder?.id ?? null,
    closedAt: ['closed', 'declined', 'expired'].includes(status) ? lastMessageAt : null,
    closeReason: status === 'closed' ? pick(['sourced_elsewhere', 'budget_withdrawn', 'duplicate_enquiry'], index) : null,
    messages,
    quotations,
  };
}

const enquiryRows = ENQUIRY_MIX.flatMap(({ status, count }) =>
  Array.from({ length: count }).map(() => status),
).map((status, index) => buildEnquiry(index, status));

// The summary row a queue renders. The thread and the quotations are fetched
// separately, so a 40-message conversation never rides along in a list payload.
export const enquiries = enquiryRows.map(({ messages, quotations, ...summary }) => summary);

export const enquiryMessages = enquiryRows.flatMap((row) => row.messages);

export const enquiryQuotations = enquiryRows.flatMap((row) => row.quotations);

// ---------------------------------------------------------------------------
// Manufacturer microsites - ADM-044
// ---------------------------------------------------------------------------

export const MICROSITE_STATUSES = ['draft', 'submitted', 'in_review', 'changes_requested', 'live', 'rejected', 'suspended'];

export const MICROSITE_REJECTION_REASONS = [
  'private_piece_featured',
  'contact_bypass',
  'unsubstantiated_claim',
  'poor_imagery',
  'incomplete_profile',
  'trademark_misuse',
];

// A microsite belongs to an approved manufacturer. A suspended manufacturer
// keeps its site record so the desk can see it was taken down rather than
// never existing, which is why the suspended two are in this list.
const micrositeOwners = [...tradingManufacturers, ...suspendedManufacturers];

// The pieces a manufacturer chose to feature. Private catalogue pieces must
// never reach a public surface, so a microsite that features one is a policy
// hit the reviewer has to clear before approving - see MICROSITE_FLAGS below.
const privateProducts = products.filter((product) => product.visibility === 'private');

function slugFor(manufacturer) {
  return manufacturer.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const microsites = micrositeOwners.map((manufacturer, index) => {
  const suspended = manufacturer.status === 'suspended';
  // Manufacturers with no live catalogue have nothing to show, so their site is
  // still a draft. That is a real zero state, not a gap in the fixture.
  const status = suspended
    ? 'suspended'
    : manufacturer.productCount === 0
      ? 'draft'
      : pick(
          ['live', 'submitted', 'live', 'in_review', 'changes_requested', 'live', 'rejected', 'submitted', 'in_review', 'live', 'changes_requested', 'live'],
          index,
        );

  return {
    id: `MS-${String(index + 1).padStart(3, '0')}`,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    city: manufacturer.city,
    state: manufacturer.state,
    slug: slugFor(manufacturer),
    status,
    liveVersion: ['live', 'changes_requested', 'in_review', 'submitted'].includes(status) ? 1 + (index % 3) : null,
    firstPublishedAt: status === 'live' ? isoDaysAgo(120 + index * 9) : null,
    lastPublishedAt: status === 'live' ? isoDaysAgo(9 + ((index * 5) % 60)) : null,
    suspendedAt: suspended ? isoDaysAgo(22 + index) : null,
    suspensionReason: suspended ? 'Manufacturer account suspended, so the public site was taken down with it.' : null,
    monthlyVisitors: status === 'live' ? 180 + ((index * 137) % 2400) : 0,
    enquiriesFromSite: status === 'live' ? 2 + ((index * 7) % 34) : 0,
  };
});

const micrositeById = Object.fromEntries(microsites.map((site) => [site.id, site]));

const MICROSITE_HEADLINES = [
  'Hand-finished temple jewellery from the Rajkot workshop floor',
  'Antique bridal sets, cast and finished under one roof',
  'Machine chains at volume, dispatched in seventy two hours',
  'CZ studded everyday gold for the modern counter',
  'Polki and kundan for the wedding season, made to weight',
  'Nakshi work in the Bengal tradition, three generations on',
];

const MICROSITE_ABOUT =
  'A family workshop supplying the trade since 1998. All pieces are BIS hallmarked, weighed on calibrated scales and dispatched insured. Custom weights and finishes are quoted against the day rate.';

const CHANGE_SUMMARIES = [
  'Added six featured pieces and refreshed the hero image.',
  'Rewrote the about section and corrected the hallmark claim.',
  'Replaced the gallery with studio photography.',
  'Updated contact details and added the GJEPC membership.',
  'First submission for review.',
];

// Every submission a manufacturer has made, oldest first. The moderation queue
// is a queue of SUBMISSIONS, not of sites: a site that came back three times
// after changes were requested is three pieces of reviewer work, and hiding two
// of them behind the current state is how a review backlog goes unseen.
export const micrositeSubmissions = microsites.flatMap((site, siteIndex) => {
  const manufacturer = manufacturerById[site.manufacturerId];
  if (site.status === 'draft') return [];

  // A live site has been through review more often than one still waiting for
  // its first decision, so its history is longer.
  const versions = site.status === 'live' ? 4 + (siteIndex % 3) : 2 + (siteIndex % 3);

  return Array.from({ length: versions }).map((_, versionIndex) => {
    const isLatest = versionIndex === versions - 1;
    const submittedAt = isoDaysAgo(4 + (versions - versionIndex - 1) * 21 + ((siteIndex * 3) % 11));

    // The latest submission carries the site's own state. Everything before it
    // was decided long ago.
    const status = isLatest
      ? { live: 'approved', suspended: 'approved', in_review: 'in_review', submitted: 'submitted', changes_requested: 'changes_requested', rejected: 'rejected' }[site.status]
      : 'superseded';

    const decided = !['submitted', 'in_review'].includes(status);
    const reviewer = pick(marketplaceStaff, siteIndex + versionIndex);

    const featuredProductIds = products
      .filter((product) => product.manufacturerId === manufacturer.id && product.status === 'live')
      .slice(0, 6)
      .map((product) => product.id);

    // The policy hit. Roughly one submission in six features a piece the
    // manufacturer keeps private, which the reviewer must clear before this can
    // go live - a private piece on a public microsite is the same breach as a
    // private piece in public search.
    const leakedPrivate =
      (siteIndex + versionIndex) % 6 === 2
        ? privateProducts.find((product) => product.manufacturerId === manufacturer.id) ??
          pick(privateProducts, siteIndex)
        : null;

    const flags = [];
    if (leakedPrivate) {
      flags.push({
        code: 'private_piece_featured',
        entityId: leakedPrivate.id,
        detail: `${leakedPrivate.title} is a private catalogue piece and cannot appear on a public page.`,
      });
    }
    if ((siteIndex + versionIndex) % 7 === 3) {
      flags.push({
        code: 'contact_bypass',
        entityId: null,
        detail: 'The about section publishes a direct WhatsApp number, which routes trade away from the marketplace.',
      });
    }
    if ((siteIndex + versionIndex) % 9 === 4) {
      flags.push({
        code: 'unsubstantiated_claim',
        entityId: null,
        detail: 'Claims "certified by BIS since 1998" against a BIS licence issued in 2011.',
      });
    }

    return {
      id: `MSR-${String(siteIndex + 1).padStart(3, '0')}-V${versionIndex + 1}`,
      micrositeId: site.id,
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.businessName,
      city: manufacturer.city,
      slug: site.slug,
      version: versionIndex + 1,
      status,
      submittedAt,
      ageHours: hoursSince(submittedAt),
      slaHours: MICROSITE_REVIEW_SLA_HOURS,
      slaBreached: !decided && hoursSince(submittedAt) > MICROSITE_REVIEW_SLA_HOURS,
      // Decided a few days after it landed, never before it - an audit trail
      // that runs backwards is the first thing a backend reviewer will spot.
      decidedAt: decided
        ? new Date(Date.parse(submittedAt) + (1 + ((siteIndex + versionIndex) % 4)) * DAY_MS).toISOString()
        : null,
      reviewerId: decided ? reviewer.id : null,
      reviewerName: decided ? reviewer.name : null,
      changeSummary: versionIndex === 0 ? CHANGE_SUMMARIES[4] : pick(CHANGE_SUMMARIES, siteIndex + versionIndex),
      headline: pick(MICROSITE_HEADLINES, siteIndex),
      about: MICROSITE_ABOUT,
      speciality: manufacturer.speciality,
      categories: manufacturer.categories,
      certifications: manufacturer.bisLicence ? ['BIS hallmark', 'GJEPC member'] : ['GJEPC member'],
      featuredProductIds,
      contactEmail: manufacturer.email,
      contactPhone: manufacturer.phone,
      // Stand-ins for the uploaded artwork. MediaViewer renders the labels and
      // the placeholder frame; there is no asset pipeline in a prototype.
      media: [
        { id: `${site.id}-V${versionIndex + 1}-hero`, type: 'image', url: null, label: 'Hero banner', caption: pick(MICROSITE_HEADLINES, siteIndex) },
        { id: `${site.id}-V${versionIndex + 1}-workshop`, type: 'image', url: null, label: 'Workshop floor', caption: `${manufacturer.city} unit` },
        { id: `${site.id}-V${versionIndex + 1}-gallery`, type: 'image', url: null, label: 'Featured pieces', caption: `${featuredProductIds.length} pieces` },
        { id: `${site.id}-V${versionIndex + 1}-licence`, type: 'document', url: null, label: 'BIS licence', caption: manufacturer.bisLicence ?? 'Not supplied' },
      ],
      flags,
      reasons: status === 'rejected' ? ['unsubstantiated_claim', 'poor_imagery'] : status === 'changes_requested' ? ['incomplete_profile'] : [],
      reviewerNote:
        status === 'rejected'
          ? 'Hallmark claim does not match the licence on file, and the gallery is phone photography against a patterned cloth. Reshoot and resubmit.'
          : status === 'changes_requested'
            ? 'Add the workshop address and the dispatch commitment before this goes live.'
            : null,
    };
  });
});

export { micrositeById };

// ---------------------------------------------------------------------------
// Search and demand insights - ADM-045
// ---------------------------------------------------------------------------

export const SEARCH_TRENDS = ['rising', 'flat', 'falling'];

// What jewellers typed. The zero-result rows are the supply gap list, and the
// reason this screen exists: a search that returns nothing is demand the
// marketplace was handed and could not serve.
const SEARCH_TERM_SEEDS = [
  { term: 'polki bridal set 22k', category: 'Bridal Sets', purity: 22, zeroResult: true },
  { term: 'temple haar 60 gram', category: 'Temple Jewellery', purity: 22, zeroResult: true },
  { term: 'rose gold bangles 18k', category: 'Bangles', purity: 18, zeroResult: true },
  { term: 'lightweight rani haar', category: 'Necklaces', purity: 22, zeroResult: false },
  { term: 'meenakari jhumka', category: 'Earrings', purity: 22, zeroResult: true },
  { term: 'machine chain 20 inch', category: 'Chains', purity: 22, zeroResult: false },
  { term: 'cz mangalsutra short', category: 'Mangalsutra', purity: 22, zeroResult: false },
  { term: 'antique kasu mala', category: 'Necklaces', purity: 22, zeroResult: true },
  { term: 'baby bangles 14k', category: 'Bangles', purity: 14, zeroResult: true },
  { term: 'nakshi kada gents', category: 'Bracelets', purity: 22, zeroResult: true },
  { term: 'diamond look ring 18k', category: 'Rings', purity: 18, zeroResult: false },
  { term: 'gold anklet ghungroo', category: 'Anklets', purity: 22, zeroResult: false },
  { term: 'kundan choker set', category: 'Bridal Sets', purity: 22, zeroResult: true },
  { term: 'plain gold pendant small', category: 'Pendants', purity: 18, zeroResult: false },
  { term: 'hallmarked nose pin tray', category: 'Nose Pins', purity: 22, zeroResult: false },
  { term: 'filigree earrings cuttack', category: 'Earrings', purity: 22, zeroResult: true },
  { term: 'mens bracelet 22k heavy', category: 'Bracelets', purity: 22, zeroResult: true },
  { term: 'thushi maharashtrian', category: 'Necklaces', purity: 22, zeroResult: true },
  { term: 'coorgi jewellery set', category: 'Bridal Sets', purity: 22, zeroResult: true },
  { term: 'gold toe rings silver', category: 'Anklets', purity: 22, zeroResult: true },
  { term: 'bombay chain daily wear', category: 'Chains', purity: 22, zeroResult: false },
  { term: 'jadau necklace jaipur', category: 'Necklaces', purity: 22, zeroResult: true },
  { term: 'antique mango mala', category: 'Necklaces', purity: 22, zeroResult: true },
  { term: 'lakshmi pendant 8 gram', category: 'Pendants', purity: 22, zeroResult: false },
  { term: 'bangle 2.6 size 22k', category: 'Bangles', purity: 22, zeroResult: false },
  { term: 'navratna ring', category: 'Rings', purity: 22, zeroResult: true },
];

export const searchTerms = Array.from({ length: 52 }).map((_, index) => {
  const seed = pick(SEARCH_TERM_SEEDS, index);
  // The seeds repeat twice over, so the second pass is the same intent typed
  // from a different city. Real search logs look exactly like this.
  const secondPass = index >= SEARCH_TERM_SEEDS.length;
  const city = pick(['Mumbai', 'Jaipur', 'Coimbatore', 'Surat', 'Kolkata', 'Hyderabad', 'Rajkot'], index);
  const term = secondPass ? `${seed.term} ${city.toLowerCase()}` : seed.term;
  const zeroResult = secondPass ? index % 3 !== 0 : seed.zeroResult;
  const searches30d = 12 + ((index * 37) % 210) + (zeroResult ? 24 : 0);
  const resultCount = zeroResult ? 0 : 1 + ((index * 5) % 34);
  const profile = CATEGORY_PROFILE[seed.category];

  return {
    id: `SRT-${String(index + 1).padStart(3, '0')}`,
    term,
    category: seed.category,
    purity: seed.purity,
    searches30d,
    searchesPrevious30d: Math.max(4, searches30d - 30 + ((index * 13) % 70)),
    uniqueJewellers: Math.max(1, Math.round(searches30d / (3 + (index % 4)))),
    resultCount,
    zeroResult,
    // A search that returns rows but nobody opens is a relevance problem, not a
    // supply problem, and the desk handles the two differently.
    clickThroughRate: zeroResult ? 0 : Number((0.08 + ((index * 7) % 46) / 100).toFixed(2)),
    ordersAttributed: zeroResult ? 0 : (index * 3) % 9,
    topCity: city,
    trend: pick(SEARCH_TRENDS, index + (zeroResult ? 0 : 1)),
    firstSeenAt: isoDaysAgo(30 + ((index * 11) % 150)),
    lastSeenAt: isoDaysAgo((index * 3) % 6),
    // What the marketplace would have earned had it been able to answer: the
    // demand volume valued at what a piece of that category typically quotes at.
    unmetValue: zeroResult
      ? Math.round(
          buildPriceBreakup({
            purity: profile.purity,
            netWeight: profile.netWeight,
            grossWeight: profile.netWeight,
            wastagePercent: profile.wastagePercent,
            makingChargesPerGram: profile.makingChargesPerGram,
            stoneValue: profile.stoneValue,
          }).total * Math.max(1, Math.round(searches30d / 20)),
        )
      : 0,
    sourcingRequestId: null,
  };
});

// 30 sessions of search volume, walked backwards so the last point is today.
export const demandSeries = Array.from({ length: 30 }).map((_, index) => {
  const daysBack = 29 - index;
  const searches = 640 + ((index * 53) % 220) - daysBack * 4;
  return {
    date: new Date(NOW_MS - daysBack * DAY_MS).toISOString().slice(0, 10),
    searches,
    zeroResultSearches: Math.round(searches * (0.17 + ((index * 7) % 9) / 100)),
  };
});

// Where the catalogue is thin relative to what is being asked for. Listing and
// manufacturer counts come from core, so the gap closes on its own when a
// manufacturer lists.
export const categoryGaps = ENQUIRY_CATEGORIES.map((category) => {
  const listings = products.filter(
    (product) => product.category === category && product.status === 'live' && product.visibility === 'public',
  );
  const suppliers = new Set(listings.map((product) => product.manufacturerId));
  const zeroResultSearches = searchTerms
    .filter((row) => row.category === category && row.zeroResult)
    .reduce((total, row) => total + row.searches30d, 0);

  return {
    category,
    zeroResultSearches,
    listingCount: listings.length,
    manufacturerCount: suppliers.size,
    unmetValue: searchTerms
      .filter((row) => row.category === category && row.zeroResult)
      .reduce((total, row) => total + row.unmetValue, 0),
    // Demand per available listing. A category with 300 unanswered searches and
    // 40 listings is a relevance problem; 300 against 2 listings is a supply gap.
    gapScore: Number((zeroResultSearches / Math.max(1, listings.length)).toFixed(1)),
  };
}).sort((left, right) => right.gapScore - left.gapScore);

// ---------------------------------------------------------------------------
// Sourcing desk - ADM-046, ADM-047
// ---------------------------------------------------------------------------

export const SOURCING_STATUSES = ['new', 'routed', 'responses_in', 'matched', 'no_match', 'withdrawn', 'expired'];

export const SOURCING_CLOSE_REASONS = ['matched_to_manufacturer', 'no_manufacturer_capable', 'jeweller_withdrew', 'budget_below_making_cost', 'expired_unanswered'];

const SOURCING_MIX = [
  { status: 'new', count: 8 },
  { status: 'routed', count: 9 },
  { status: 'responses_in', count: 10 },
  { status: 'matched', count: 8 },
  { status: 'no_match', count: 4 },
  { status: 'withdrawn', count: 3 },
  { status: 'expired', count: 2 },
];

const SOURCING_BRIEFS = {
  'Bridal Sets': 'Full bridal set, antique finish, matched haar, choker, jhumkas and vanki. Customer has approved a reference image.',
  Necklaces: 'Long kasu mala in 22K, temple finish, coins to be uniform. Repeat requirement, monthly.',
  'Temple Jewellery': 'Lakshmi haar with matching jhumkas, south finish, delivered before the muhurat window.',
  Bangles: 'Rose gold bangles in 18K, 2.6 size, six piece set, light weight for daily wear.',
  Bracelets: 'Gents nakshi kada, heavy 22K, hand engraved. Nothing on the marketplace comes close.',
  Earrings: 'Meenakari jhumkas, Jaipur enamel work, bridal weight.',
  Chains: 'Machine chains, 20 inch, assorted patterns, volume order for a wholesale counter.',
  Rings: 'Navratna ring in 22K, stones supplied by the customer, setting only.',
  Mangalsutra: 'Short mangalsutra with CZ pendant, modern design, display stock.',
  Pendants: 'Small ticket meenakari pendants for a counter display tray.',
  Anklets: 'Gold anklets with ghungroo, pair, wholesale counter stock.',
  'Nose Pins': 'Assorted stud nose pins, tray of twelve, hallmarked.',
};

// Manufacturers who can plausibly make a thing: they are approved, they list
// the category, and they are not suspended. This is what the workspace shows as
// suggestions, and it is deliberately the same rule the routing endpoint
// enforces - a desk that can suggest someone it cannot route to is broken.
export function capableManufacturers(category, purity) {
  return tradingManufacturers
    .filter((manufacturer) => manufacturer.categories.includes(category))
    .map((manufacturer) => {
      const listings = products.filter(
        (product) => product.manufacturerId === manufacturer.id && product.status === 'live',
      );
      const purityMatch = listings.some((product) => product.purity === purity);

      return {
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.businessName,
        city: manufacturer.city,
        speciality: manufacturer.speciality,
        listingCount: listings.length,
        onTimeDispatchPercent: manufacturer.onTimeDispatchPercent,
        rating: manufacturer.rating,
        purityMatch,
        // Category is the entry ticket. Beyond that, a manufacturer who already
        // works in the purity and ships on time is the one to route to first.
        matchScore: Number(
          (
            40 +
            (purityMatch ? 25 : 0) +
            Math.min(20, listings.length) +
            (manufacturer.onTimeDispatchPercent ?? 60) / 10
          ).toFixed(1),
        ),
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore);
}

const DECLINE_REASONS = [
  'Weight is below what our dies support.',
  'Booked through the festival window, cannot commit to the date.',
  'We do not do enamel work in house.',
  'Budget is below our making cost at this weight.',
];

const RESPONSE_NOTES = [
  'We can make this to the reference. Quote is per piece at the day rate.',
  'Possible, but the stone setting will add to the lead time.',
  'We have made this pattern before. Sample can be sent first.',
  'Can do it in a lighter weight if the budget is fixed.',
];

function buildSourcingRequest(index, status) {
  const requestId = `SRC-${String(index + 1).padStart(3, '0')}`;
  const jeweller = pick(tradingJewellers, index * 7 + 3);
  const category = pick(ENQUIRY_CATEGORIES, index * 3 + 1);
  const profile = CATEGORY_PROFILE[category];
  const quantity = 1 + ((index * 5) % 8);
  const targetWeight = Number((profile.netWeight * (0.85 + ((index * 11) % 30) / 100)).toFixed(3));

  const indicative = buildPriceBreakup({
    purity: profile.purity,
    netWeight: targetWeight,
    grossWeight: targetWeight,
    wastagePercent: profile.wastagePercent,
    makingChargesPerGram: profile.makingChargesPerGram,
    stoneValue: profile.stoneValue,
  });

  const postedAt = isoHoursAgo(3 + ((index * 19) % 540));
  const routed = !['new', 'withdrawn'].includes(status);
  const routedAt = routed ? isoHoursAgo(Math.max(1, hoursSince(postedAt) - 6 - (index % 9))) : null;

  // Roughly one brief in three came from a search that found nothing. That link
  // is the whole point of the demand screen: a gap becomes desk work.
  const gapTerm = index % 3 === 1 ? pick(searchTerms.filter((row) => row.zeroResult), index) : null;

  // Route to the best three to five matches. A category only one workshop
  // lists routes to one workshop, and that thin result is the real shape of a
  // supply gap rather than something to pad out.
  const routedIds = routed
    ? capableManufacturers(category, profile.purity)
        .slice(0, 3 + (index % 3))
        .map((row) => row.manufacturerId)
    : [];

  const responses = routedIds.map((manufacturerId, responseIndex) => {
    const manufacturer = manufacturerById[manufacturerId];
    // Not everyone answers. Silence is a real outcome the desk has to see.
    //
    // The first workshop routed always answers on a brief that has reached
    // responses_in or matched, because those two states are DEFINED by a usable
    // quote being on the table. A row in either state with nothing quoted would
    // be a brief the desk can neither compare nor close.
    const guaranteed = responseIndex === 0 && ['responses_in', 'matched'].includes(status);
    const responded = guaranteed || (status !== 'routed' && (index + responseIndex) % 4 !== 3);
    const declined = !guaranteed && responded && (index + responseIndex) % 5 === 2;
    const price = buildPriceBreakup({
      purity: profile.purity,
      netWeight: targetWeight,
      grossWeight: targetWeight,
      wastagePercent: profile.wastagePercent + ((responseIndex * 7) % 5) / 2 - 1,
      makingChargesPerGram: profile.makingChargesPerGram + ((responseIndex * 31) % 120) - 60,
      stoneValue: profile.stoneValue,
    });

    return {
      id: `SRR-${String(index + 1).padStart(3, '0')}-${responseIndex + 1}`,
      requestId,
      manufacturerId,
      manufacturerName: manufacturer.businessName,
      city: manufacturer.city,
      routedAt,
      respondedAt: responded ? isoHoursAgo(Math.max(1, hoursSince(routedAt) - 4 - responseIndex * 7)) : null,
      status: !responded ? 'no_response' : declined ? 'declined' : 'responded',
      canMake: responded && !declined,
      declineReason: declined ? pick(DECLINE_REASONS, index + responseIndex) : null,
      leadTimeDays: 8 + ((index + responseIndex * 3) % 26),
      minOrderQuantity: 1 + ((responseIndex * 2) % 4),
      price: responded && !declined ? price : null,
      quotedUnitPrice: responded && !declined ? price.total : null,
      quotedTotal: responded && !declined ? price.total * quantity : null,
      shortlisted: responded && !declined && responseIndex === 0 && ['responses_in', 'matched'].includes(status),
      notes: responded && !declined ? pick(RESPONSE_NOTES, index + responseIndex) : null,
    };
  });

  const answering = responses.filter((response) => response.canMake);
  const matched = status === 'matched' ? (answering[0] ?? null) : null;
  const owner = pick(marketplaceStaff, index);

  return {
    request: {
      id: requestId,
      jewellerId: jeweller.id,
      jewellerName: jeweller.businessName,
      jewellerCity: jeweller.city,
      title: `${category} requirement from ${jeweller.city}`,
      brief: SOURCING_BRIEFS[category] ?? SOURCING_BRIEFS.Necklaces,
      category,
      purity: profile.purity,
      targetWeightGrams: targetWeight,
      quantity,
      // What the jeweller says they will pay. Below the indicative quote on some
      // rows on purpose - a brief the trade cannot make at that price is a
      // no_match the desk has to close, not a failure to try.
      targetUnitBudget: Math.round(indicative.total * (0.82 + ((index * 13) % 40) / 100)),
      indicativeUnitValue: indicative.total,
      indicativeTotalValue: indicative.total * quantity,
      neededBy: isoDaysAhead(9 + ((index * 7) % 45)),
      originSearchTermId: gapTerm?.id ?? null,
      originSearchTerm: gapTerm?.term ?? null,
      // A photograph with no listing behind it is the commonest sourcing brief
      // on the desk, so most rows carry reference media.
      media:
        index % 5 === 4
          ? []
          : [
              { id: `${requestId}-ref1`, type: 'image', url: null, label: 'Reference photograph', caption: 'Supplied by the jeweller' },
              { id: `${requestId}-ref2`, type: 'image', url: null, label: 'Customer sketch', caption: 'Weight noted on the sketch' },
            ],
      status,
      postedAt,
      routedAt,
      ageHours: hoursSince(postedAt),
      slaHours: routed ? SOURCING_RESPONSE_SLA_HOURS : SOURCING_ROUTE_SLA_HOURS,
      slaBreached:
        ['new', 'routed', 'responses_in'].includes(status) &&
        hoursSince(routed ? routedAt : postedAt) > (routed ? SOURCING_RESPONSE_SLA_HOURS : SOURCING_ROUTE_SLA_HOURS),
      ownerId: owner.id,
      ownerName: owner.name,
      routedManufacturerIds: routedIds,
      routedCount: routedIds.length,
      responseCount: responses.filter((response) => response.status !== 'no_response').length,
      bestQuotedValue: answering.length > 0 ? Math.min(...answering.map((response) => response.quotedTotal)) : null,
      matchedManufacturerId: matched?.manufacturerId ?? null,
      matchedManufacturerName: matched?.manufacturerName ?? null,
      closedAt: ['matched', 'no_match', 'withdrawn', 'expired'].includes(status) ? isoHoursAgo(1 + (index % 40)) : null,
      closeReason: {
        matched: 'matched_to_manufacturer',
        no_match: 'no_manufacturer_capable',
        withdrawn: 'jeweller_withdrew',
        expired: 'expired_unanswered',
      }[status] ?? null,
      closeNote:
        status === 'no_match'
          ? 'Three workshops quoted above the jeweller ceiling and two declined on the weight. Jeweller informed, brief closed.'
          : null,
    },
    responses,
  };
}

const sourcingRows = SOURCING_MIX.flatMap(({ status, count }) =>
  Array.from({ length: count }).map(() => status),
).map((status, index) => buildSourcingRequest(index, status));

export const sourcingRequests = sourcingRows.map((row) => row.request);

export const sourcingResponses = sourcingRows.flatMap((row) => row.responses);

// Close the loop the other way: a search term that already has a brief against
// it must say so, or the desk raises the same brief twice.
sourcingRequests.forEach((request) => {
  if (!request.originSearchTermId) return;
  const term = searchTerms.find((row) => row.id === request.originSearchTermId);
  if (term && !term.sourcingRequestId) term.sourcingRequestId = request.id;
});
