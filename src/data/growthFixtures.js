// Feature fixtures for Growth and content - ADM-072 to ADM-081.
//
// Everything here references src/data/core by id. No manufacturer, jeweller,
// product or order is invented in this file. Rows are derived by index maths
// off a fixed anchor rather than Math.random(), so a page that published
// yesterday is still published today.
//
// One import is not from core: `enquiries` from src/data/marketplaceFixtures.
// A show report has to say how much pipeline a trade fair produced, and that
// pipeline is a marketplace conversation. Growth reads those rows and never
// writes them - the conversation belongs to Marketplace, the tag belongs here.

import { adminUsers, jewellers, manufacturerById, manufacturers, orders, products } from '@/data/core';
import { enquiries } from '@/data/marketplaceFixtures';

export const GROWTH_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(GROWTH_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

function isoDaysAgo(days) {
  return new Date(NOW_MS - days * DAY_MS).toISOString();
}

function isoDaysAhead(days) {
  return new Date(NOW_MS + days * DAY_MS).toISOString();
}

function dayOnly(iso) {
  return iso.slice(0, 10);
}

const activeStaff = adminUsers.filter((user) => user.status === 'active');

// ---------------------------------------------------------------------------
// THE PUBLIC SURFACE GUARD
// ---------------------------------------------------------------------------
//
// READ THIS BEFORE ADDING ANY SCREEN THAT PUBLISHES SOMETHING.
//
// Every other area of this portal is an internal surface. This one is not: a
// CMS page, a curated collection, a merchandising banner, a programmatic city
// page and the sitemap are all read by people who never sign in, and by
// crawlers that keep a copy of whatever they were shown.
//
// So there is exactly ONE predicate for "may this piece be seen by the public",
// and everything that publishes goes through it. The rule already exists in
// four inlined copies elsewhere in the codebase:
//
//   src/data/marketplaceFixtures.js:199   visibility public && status live
//   src/data/marketplaceFixtures.js:462   visibility private
//   src/services/mock/marketplaceApi.js   visibility !== public   (x2)
//   src/services/mock/catalogueApi.js     visibility private
//
// Those belong to other areas and are not touched here. This is the fifth
// surface and it does not get a fifth copy.
//
// A piece is withheld for one of three reasons, and the caller is always told
// which. Silently dropping seventeen products looks exactly like a broken
// generator.

export const PUBLIC_BLOCK_CODES = ['private_piece', 'not_live', 'manufacturer_suspended'];

export function publicSurfaceBlockers(product) {
  if (!product) return [{ productId: null, code: 'not_live', reason: 'No such listing' }];

  const blockers = [];
  const manufacturer = manufacturerById[product.manufacturerId];

  // A private range is a workshop's unreleased design book. Putting one on a
  // public page is the single unrecoverable breach the visibility model in
  // ADM-031 exists to prevent.
  if (product.visibility !== 'public') {
    blockers.push({
      productId: product.id,
      code: 'private_piece',
      reason: `${product.title} is in a private range and cannot appear on a public page`,
    });
  }

  // Draft, pending review, rejected, archived and out of stock are all pieces
  // a jeweller cannot actually buy today.
  if (product.status !== 'live') {
    blockers.push({
      productId: product.id,
      code: 'not_live',
      reason: `${product.title} is ${product.status.replace(/_/g, ' ')} and is not for sale`,
    });
  }

  // No rows today: every manufacturer that owns a listing is approved. It
  // ships anyway, because it is what pulls a workshop's pieces off every
  // public page the moment onboarding suspends it.
  if (manufacturer && manufacturer.status !== 'approved') {
    blockers.push({
      productId: product.id,
      code: 'manufacturer_suspended',
      reason: `${manufacturer.businessName} is ${manufacturer.status.replace(/_/g, ' ')} and has no public presence`,
    });
  }

  return blockers;
}

export function publiclyListable(product) {
  return publicSurfaceBlockers(product).length === 0;
}

// The 43 pieces of the 60 that may be seen by anybody. Recomputed rather than
// stored, so a piece that goes private is out of every public surface on the
// next read and not on the next re-save.
export const publicCatalogue = products.filter(publiclyListable);

export const withheldFromPublic = products
  .filter((product) => !publiclyListable(product))
  .flatMap(publicSurfaceBlockers);

// ---------------------------------------------------------------------------
// Invitations and attribution - ADM-072
// ---------------------------------------------------------------------------

// How long an introducer earns on the buyer it brought in. The RECORD of who
// introduced whom never expires; the FEE does. An introduction made once must
// not bill the platform forever.
export const ATTRIBUTION_WINDOW_MONTHS = 24;

// The introducer's share, taken out of Elanzia's commission on the order.
//
// It is NEVER taken out of the payout of whoever filled the order. A workshop
// that cut, set and shipped a necklace must not subsidise the introduction fee
// of a different workshop that happened to bring the buyer in - see
// src/data/core/settlementLines.js for the split this must not disturb.
export const ATTRIBUTION_RATE_PERCENT = 12;

export const INVITATION_EXPIRY_DAYS = 30;

const INVITE_DOMAINS = ['gold', 'jewels', 'ornaments', 'bullion', 'sons'];
const INVITE_TOWNS = ['Nashik', 'Vadodara', 'Madurai', 'Indore', 'Nagpur', 'Bhopal', 'Ludhiana', 'Trichy'];

const approvedManufacturers = manufacturers.filter((row) => row.status === 'approved');

// Invitations that converted. One per jeweller carrying an introducer, joined
// straight off the canonical record so the queue and the account agree.
const acceptedInvitations = jewellers
  .filter((jeweller) => jeweller.invitedByManufacturerId)
  .map((jeweller, index) => {
    const introducer = manufacturerById[jeweller.invitedByManufacturerId];
    const sentAt = new Date(Date.parse(jeweller.registeredAt) - (3 + (index % 9)) * DAY_MS).toISOString();

    return {
      id: `INV-${String(index + 1).padStart(4, '0')}`,
      introducerId: introducer.id,
      introducerName: introducer.businessName,
      introducerCity: introducer.city,
      inviteeEmail: jeweller.email,
      inviteeBusinessName: jeweller.businessName,
      jewellerId: jeweller.id,
      status: 'accepted',
      sentAt,
      openedAt: new Date(Date.parse(sentAt) + 6 * HOUR_MS).toISOString(),
      acceptedAt: jeweller.registeredAt,
      expiresAt: new Date(Date.parse(sentAt) + INVITATION_EXPIRY_DAYS * DAY_MS).toISOString(),
      revokedAt: null,
      revokedReason: null,
      declinedAt: null,
      acquisitionMode: jeweller.acquisitionMode,
      graduatedAt: jeweller.graduatedAt,
    };
  });

// Invitations that did not convert. These carry no jewellerId, because nobody
// joined - the row is an email address and a date, and that is the point of
// having it in the queue.
const OPEN_STATUS_CYCLE = ['sent', 'opened', 'expired', 'sent', 'declined', 'opened', 'revoked', 'sent'];

const openInvitations = Array.from({ length: 39 }).map((_, index) => {
  const introducer = approvedManufacturers[index % approvedManufacturers.length];
  const status = OPEN_STATUS_CYCLE[index % OPEN_STATUS_CYCLE.length];
  const ageDays = 2 + index * 3;
  const sentAt = isoDaysAgo(ageDays);
  const town = INVITE_TOWNS[index % INVITE_TOWNS.length];
  const house = `${town} ${INVITE_DOMAINS[index % INVITE_DOMAINS.length]}`.replace(/\b\w/g, (c) => c.toUpperCase());
  const slug = house.toLowerCase().replace(/\s+/g, '');

  return {
    id: `INV-${String(acceptedInvitations.length + index + 1).padStart(4, '0')}`,
    introducerId: introducer.id,
    introducerName: introducer.businessName,
    introducerCity: introducer.city,
    inviteeEmail: `owner@${slug}.co.in`,
    inviteeBusinessName: house,
    jewellerId: null,
    status: ageDays > INVITATION_EXPIRY_DAYS && status === 'sent' ? 'expired' : status,
    sentAt,
    openedAt: ['opened', 'declined'].includes(status) ? isoDaysAgo(ageDays - 1) : null,
    acceptedAt: null,
    expiresAt: isoDaysAgo(ageDays - INVITATION_EXPIRY_DAYS),
    revokedAt: status === 'revoked' ? isoDaysAgo(Math.max(1, ageDays - 4)) : null,
    revokedReason: status === 'revoked' ? 'Introducer withdrew the invitation' : null,
    declinedAt: status === 'declined' ? isoDaysAgo(Math.max(1, ageDays - 2)) : null,
    acquisitionMode: null,
    graduatedAt: null,
  };
});

export const invitations = [...acceptedInvitations, ...openInvitations].sort(
  (a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt),
);

const confirmedOrdersByJeweller = orders
  .filter((order) => Boolean(order.confirmedAt))
  .reduce((byJeweller, order) => {
    (byJeweller[order.jewellerId] ??= []).push(order);
    return byJeweller;
  }, {});

function addMonths(iso, months) {
  const date = new Date(Date.parse(iso));
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

// One record per introduced buyer. The ledger is derived from the order's
// PERMANENT commission - the figure fixed at confirmation - so a fee never
// moves after the fact even if a rate card changes.
export const attributionRecords = jewellers
  .filter((jeweller) => jeweller.invitedByManufacturerId)
  .map((jeweller) => {
    const introducer = manufacturerById[jeweller.invitedByManufacturerId];
    const windowEndsAt = addMonths(jeweller.registeredAt, ATTRIBUTION_WINDOW_MONTHS);
    const windowOpen = Date.parse(windowEndsAt) > NOW_MS;

    const ledger = (confirmedOrdersByJeweller[jeweller.id] ?? []).map((order) => {
      const inWindow = Date.parse(order.confirmedAt) <= Date.parse(windowEndsAt);
      return {
        orderId: order.id,
        confirmedAt: order.confirmedAt,
        orderTotal: order.total,
        orderCommission: order.commission,
        // Outside the window the order still appears, and still pays nothing.
        // A manufacturer asking why a month was empty is owed the row, not a
        // gap in the list.
        inWindow,
        fee: inWindow ? Math.round((order.commission * ATTRIBUTION_RATE_PERCENT) / 100) : 0,
      };
    });

    const feeEarnedToDate = ledger.reduce((sum, entry) => sum + entry.fee, 0);

    return {
      jewellerId: jeweller.id,
      jewellerName: jeweller.businessName,
      jewellerCity: jeweller.city,
      introducerId: introducer.id,
      introducerName: introducer.businessName,
      introducedAt: jeweller.registeredAt,
      acquisitionMode: jeweller.acquisitionMode,
      graduatedAt: jeweller.graduatedAt,
      windowMonths: ATTRIBUTION_WINDOW_MONTHS,
      windowEndsAt,
      windowOpen,
      monthsRemaining: windowOpen
        ? Math.max(0, Math.round((Date.parse(windowEndsAt) - NOW_MS) / (30 * DAY_MS)))
        : 0,
      ratePercent: ATTRIBUTION_RATE_PERCENT,
      attributableOrders: ledger.filter((entry) => entry.inWindow).length,
      attributableGmv: ledger
        .filter((entry) => entry.inWindow)
        .reduce((sum, entry) => sum + entry.orderTotal, 0),
      commissionEarnedByElanzia: ledger.reduce((sum, entry) => sum + entry.orderCommission, 0),
      feeEarnedToDate,
      feeAccruingNow: windowOpen,
      ledger,
    };
  });

export const attributionByJewellerId = Object.fromEntries(
  attributionRecords.map((record) => [record.jewellerId, record]),
);

// ---------------------------------------------------------------------------
// Exhibitions - ADM-073, ADM-074
// ---------------------------------------------------------------------------

// The real Indian trade fair calendar. IIJS is where this industry actually
// meets, so the show names are the ones a jeweller would recognise.
const EXHIBITION_SEED = [
  { id: 'EXH-001', name: 'IIJS Premiere 2026', venue: 'Jio World Convention Centre', city: 'Mumbai', startsInDays: -178, days: 5, status: 'closed' },
  { id: 'EXH-002', name: 'IIJS Signature 2026', venue: 'Bombay Exhibition Centre', city: 'Mumbai', startsInDays: -96, days: 4, status: 'closed' },
  { id: 'EXH-003', name: 'Jaipur Jewellery Show 2026', venue: 'Jaipur Exhibition and Convention Centre', city: 'Jaipur', startsInDays: -41, days: 4, status: 'closed' },
  { id: 'EXH-004', name: 'Hyderabad Jewellery Pearl and Gem Fair', venue: 'HITEX Exhibition Centre', city: 'Hyderabad', startsInDays: -2, days: 3, status: 'live' },
  { id: 'EXH-005', name: 'IIJS Premiere 2027', venue: 'Jio World Convention Centre', city: 'Mumbai', startsInDays: 96, days: 5, status: 'planned' },
];

const HALLS = ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4'];

export const stalls = EXHIBITION_SEED.flatMap((show, showIndex) =>
  Array.from({ length: show.status === 'planned' ? 5 : 9 }).map((_, index) => {
    const manufacturer = approvedManufacturers[(showIndex * 5 + index) % approvedManufacturers.length];
    const issuedDaysAgo = Math.abs(show.startsInDays) + 7;

    return {
      id: `STL-${show.id.slice(4)}-${String(index + 1).padStart(2, '0')}`,
      exhibitionId: show.id,
      code: `${HALLS[index % HALLS.length].replace('Hall ', 'H')}-${String(index + 1).padStart(3, '0')}`,
      hallName: HALLS[index % HALLS.length],
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.businessName,
      // A planned show has stalls allocated but no codes issued yet.
      qrToken: show.status === 'planned' ? null : `QR-${show.id.slice(4)}${String(index + 1).padStart(2, '0')}-${(showIndex * 31 + index * 7) % 997}`,
      qrIssuedAt: show.status === 'planned' ? null : isoDaysAgo(issuedDaysAgo),
      qrRevokedAt: null,
      qrVersion: show.status === 'planned' ? 0 : 1,
    };
  }),
);

const LEAD_OUTCOMES = ['scanned', 'connected', 'enquiry_raised', 'connected', 'scanned', 'ordered', 'connected', 'scanned'];
const FOLLOW_UP_STATES = ['pending', 'contacted', 'pending', 'converted', 'pending', 'lost', 'contacted', 'pending'];
const LEAD_SOURCES = ['stall_qr', 'stall_qr', 'stall_qr', 'badge', 'manual'];

const approvedJewellers = jewellers.filter((jeweller) => jeweller.status === 'approved');

// Enquiries the desk tagged to a show. The link table is growth's; the enquiry
// row it points at is Marketplace's and is never written here.
const taggableEnquiries = enquiries.filter((enquiry) => enquiry.latestQuotedValue);

export const showLeads = stalls
  .filter((stall) => stall.qrToken)
  .flatMap((stall, stallIndex) =>
    Array.from({ length: 2 + (stallIndex % 4) }).map((_, index) => {
      const seed = stallIndex * 5 + index;
      const jeweller = approvedJewellers[seed % approvedJewellers.length];
      const show = EXHIBITION_SEED.find((row) => row.id === stall.exhibitionId);
      const outcome = LEAD_OUTCOMES[seed % LEAD_OUTCOMES.length];
      const raisedEnquiry = ['enquiry_raised', 'ordered'].includes(outcome);
      const enquiry = raisedEnquiry ? taggableEnquiries[seed % taggableEnquiries.length] : null;

      return {
        id: `LEAD-${stall.id.slice(4)}-${String(index + 1).padStart(2, '0')}`,
        exhibitionId: stall.exhibitionId,
        stallId: stall.id,
        stallCode: stall.code,
        manufacturerId: stall.manufacturerId,
        manufacturerName: stall.manufacturerName,
        jewellerId: jeweller.id,
        jewellerName: jeweller.businessName,
        jewellerCity: jeweller.city,
        scannedAt: isoDaysAgo(Math.abs(show.startsInDays) - (index % show.days)),
        source: LEAD_SOURCES[seed % LEAD_SOURCES.length],
        outcome,
        enquiryId: enquiry?.id ?? null,
        enquiryValue: enquiry?.latestQuotedValue ?? 0,
        followUpState: FOLLOW_UP_STATES[seed % FOLLOW_UP_STATES.length],
        followUpAt: FOLLOW_UP_STATES[seed % FOLLOW_UP_STATES.length] === 'pending' ? null : isoDaysAgo(Math.max(1, Math.abs(show.startsInDays) - 10)),
        followUpById: FOLLOW_UP_STATES[seed % FOLLOW_UP_STATES.length] === 'pending' ? null : activeStaff[seed % activeStaff.length].id,
        followUpByName: FOLLOW_UP_STATES[seed % FOLLOW_UP_STATES.length] === 'pending' ? null : activeStaff[seed % activeStaff.length].name,
        followUpNote: null,
      };
    }),
  );

// The tag itself, kept separate from the lead so an enquiry can be attributed
// to a show without a scan ever having been recorded.
export const showEnquiryLinks = showLeads
  .filter((lead) => lead.enquiryId)
  .map((lead, index) => ({
    id: `SEL-${String(index + 1).padStart(4, '0')}`,
    enquiryId: lead.enquiryId,
    exhibitionId: lead.exhibitionId,
    stallId: lead.stallId,
    taggedAt: lead.scannedAt,
    taggedById: activeStaff[index % activeStaff.length].id,
    taggedByName: activeStaff[index % activeStaff.length].name,
  }));

export const exhibitions = EXHIBITION_SEED.map((show, index) => {
  const showStalls = stalls.filter((stall) => stall.exhibitionId === show.id);
  const leads = showLeads.filter((lead) => lead.exhibitionId === show.id);
  const owner = activeStaff[index % activeStaff.length];
  const startsOn = show.startsInDays < 0 ? isoDaysAgo(-show.startsInDays) : isoDaysAhead(show.startsInDays);

  return {
    id: show.id,
    name: show.name,
    venue: show.venue,
    city: show.city,
    startsOn: dayOnly(startsOn),
    endsOn: dayOnly(new Date(Date.parse(startsOn) + show.days * DAY_MS).toISOString()),
    status: show.status,
    stallCount: showStalls.length,
    scanCount: leads.length,
    connectionCount: leads.filter((lead) => lead.outcome !== 'scanned').length,
    taggedEnquiryCount: leads.filter((lead) => lead.enquiryId).length,
    taggedEnquiryValue: leads.reduce((sum, lead) => sum + lead.enquiryValue, 0),
    orderCount: leads.filter((lead) => lead.outcome === 'ordered').length,
    followUpsOpen: leads.filter((lead) => lead.followUpState === 'pending').length,
    ownerId: owner.id,
    ownerName: owner.name,
    notes: show.status === 'planned' ? 'Stall allocation confirmed, codes not yet issued.' : null,
  };
});

export const exhibitionById = Object.fromEntries(exhibitions.map((show) => [show.id, show]));

// ---------------------------------------------------------------------------
// Media library - ADM-076
// ---------------------------------------------------------------------------

// No binaries and no upload endpoint. `url` is null throughout and MediaViewer
// renders the label, the same honest placeholder ADM-024 and ADM-029 use. The
// library is here to say what exists, what it is called, and what would break
// if it were deleted.
const ASSET_SUBJECTS = [
  'Bridal necklace on ivory', 'Temple bangle stack', 'Polki earring pair',
  'Rajkot workshop floor', 'Chain drawing bench', 'Hallmark punch close-up',
  'Kundan set on silk', 'Nose pin macro', 'Gold bar and scale',
  'IIJS stall frontage', 'Buyer at counter', 'Assay report scan',
];

export const mediaAssets = Array.from({ length: 52 }).map((_, index) => {
  const type = index % 11 === 4 ? 'video' : index % 13 === 7 ? 'document' : 'image';
  const uploader = activeStaff[index % activeStaff.length];

  return {
    id: `AST-${String(index + 1).padStart(4, '0')}`,
    label: `${ASSET_SUBJECTS[index % ASSET_SUBJECTS.length]} ${String(index + 1).padStart(2, '0')}`,
    type,
    url: null,
    widthPx: type === 'image' ? [1600, 2048, 2400, 3200][index % 4] : null,
    heightPx: type === 'image' ? [1200, 1365, 1600, 2133][index % 4] : null,
    sizeKb: 180 + ((index * 137) % 2400),
    // Alt text is not decoration. A picture of a necklace with no alt text is
    // a page a screen reader and a crawler both read as empty.
    altText: index % 6 === 5 ? null : `${ASSET_SUBJECTS[index % ASSET_SUBJECTS.length]}, photographed for the Elanzia catalogue`,
    credit: index % 4 === 3 ? 'Elanzia studio' : null,
    uploadedAt: isoDaysAgo(3 + index * 6),
    uploadedById: uploader.id,
    uploadedByName: uploader.name,
  };
});

// ---------------------------------------------------------------------------
// CMS pages - ADM-075
// ---------------------------------------------------------------------------

// Paths the router or the marketplace already owns. A CMS page cannot claim
// one, or it would shadow a real surface.
export const RESERVED_SLUGS = ['admin', 'sign-in', 'search', 'orders', 'catalogue', 'sitemap.xml', 'robots.txt'];

const PAGE_SEED = [
  { title: 'About Elanzia', slug: 'about', status: 'published' },
  { title: 'How buying works', slug: 'how-buying-works', status: 'published' },
  { title: 'How selling works', slug: 'how-selling-works', status: 'published' },
  { title: 'Hallmarking and purity', slug: 'hallmarking-and-purity', status: 'published' },
  { title: 'Understanding making charges', slug: 'making-charges-explained', status: 'published' },
  { title: 'Wastage, and why it is added', slug: 'wastage-explained', status: 'published' },
  { title: 'Net weight versus gross weight', slug: 'net-versus-gross-weight', status: 'published' },
  { title: 'Payment and settlement', slug: 'payment-and-settlement', status: 'published' },
  { title: 'Returns and disputes', slug: 'returns-and-disputes', status: 'published' },
  { title: 'Insurance on transit', slug: 'transit-insurance', status: 'published' },
  { title: 'GST and HSN for jewellery', slug: 'gst-and-hsn', status: 'published' },
  { title: 'Trade terms glossary', slug: 'glossary', status: 'published' },
  { title: 'For manufacturers in Rajkot', slug: 'manufacturers-rajkot', status: 'published' },
  { title: 'For manufacturers in Coimbatore', slug: 'manufacturers-coimbatore', status: 'published' },
  { title: 'Privacy policy', slug: 'privacy', status: 'published' },
  { title: 'Terms of trade', slug: 'terms', status: 'published' },
  { title: 'Exhibiting with Elanzia', slug: 'exhibitions', status: 'in_review' },
  { title: 'Private ranges explained', slug: 'private-ranges', status: 'in_review' },
  { title: 'Credit terms for buyers', slug: 'credit-terms', status: 'draft' },
  { title: 'Autumn bridal buying guide', slug: 'autumn-bridal-guide', status: 'draft' },
  { title: 'Careers', slug: 'careers', status: 'draft' },
  { title: 'Press and media', slug: 'press', status: 'archived' },
  { title: 'Diwali 2025 campaign', slug: 'diwali-2025', status: 'archived' },
  { title: 'Referral programme', slug: 'referrals', status: 'published' },
];

const PARAGRAPH = [
  'Elanzia is a wholesale marketplace for gold jewellery. Manufacturers list what they make, jewellers buy it, and every price on the platform is built the same way.',
  'The metal value is the day rate multiplied by the net weight. Wastage is added to that, not deducted from it, because the trade has always quoted it that way.',
  'Net weight is gross weight minus the weight of the stones. A jeweller pays the metal rate on the net figure and nothing else, which is why both numbers are shown on every listing.',
  'Making charges are quoted per gram of net weight. GST follows the HSN code the piece is declared under, and the code is set on the listing rather than typed in per order.',
  'Once an order is confirmed its price is fixed. The metal rate can move by any amount afterwards and that order does not reprice.',
];

export const cmsPages = PAGE_SEED.map((seed, index) => {
  const author = activeStaff[index % activeStaff.length];
  const body = PARAGRAPH.slice(0, 2 + (index % 4)).join('\n\n');
  const published = seed.status === 'published';

  return {
    id: `PG-${String(index + 1).padStart(3, '0')}`,
    title: seed.title,
    slug: seed.slug,
    path: `/${seed.slug}`,
    status: seed.status,
    body,
    excerpt: PARAGRAPH[index % PARAGRAPH.length].slice(0, 140),
    metaTitle: `${seed.title} | Elanzia Trade`,
    // One published page deliberately ships without a description, so the
    // publish guard has something to catch on a re-publish.
    metaDescription: index === 11 ? null : PARAGRAPH[(index + 1) % PARAGRAPH.length].slice(0, 155),
    canonicalPath: null,
    noindex: seed.status !== 'published',
    heroAssetId: mediaAssets[(index * 3) % mediaAssets.length].id,
    authorId: author.id,
    authorName: author.name,
    createdAt: isoDaysAgo(120 - index * 3),
    updatedAt: isoDaysAgo(2 + index * 4),
    publishedAt: published ? isoDaysAgo(5 + index * 4) : null,
    version: 1 + (index % 5),
    wordCount: body.split(/\s+/).length,
  };
});

// ---------------------------------------------------------------------------
// Collections and banners - ADM-077, ADM-078
// ---------------------------------------------------------------------------

const COLLECTION_SEED = [
  { title: 'Bridal season picks', surface: 'homepage', status: 'published', category: 'Bridal Sets' },
  { title: 'Temple jewellery from Coimbatore', surface: 'category_page', status: 'published', category: 'Temple Jewellery' },
  { title: 'Everyday bangles under 20g', surface: 'homepage', status: 'published', category: 'Bangles' },
  { title: 'Polki and kundan', surface: 'campaign', status: 'published', category: 'Necklaces' },
  { title: 'Light nose pins', surface: 'category_page', status: 'published', category: 'Nose Pins' },
  { title: 'Mangalsutra classics', surface: 'homepage', status: 'published', category: 'Mangalsutra' },
  { title: 'Rajkot chain workshops', surface: 'microsite', status: 'published', category: 'Bracelets' },
  { title: 'Diwali gifting edit', surface: 'campaign', status: 'scheduled', category: 'Pendants' },
  { title: '22K bridal, Jaipur makers', surface: 'category_page', status: 'draft', category: 'Bridal Sets' },
  { title: 'New this month', surface: 'homepage', status: 'draft', category: 'Rings' },
  { title: 'Antique finish edit', surface: 'campaign', status: 'draft', category: 'Earrings' },
  { title: 'Wedding 2025 archive', surface: 'campaign', status: 'archived', category: 'Bridal Sets' },
  { title: 'Anklets and toe rings', surface: 'category_page', status: 'draft', category: 'Anklets' },
  { title: 'Heavy statement pieces', surface: 'homepage', status: 'draft', category: 'Necklaces' },
];

export const collections = COLLECTION_SEED.map((seed, index) => {
  const inCategory = products.filter((product) => product.category === seed.category);
  const safe = inCategory.filter(publiclyListable);

  // Three drafts deliberately name a protected piece. A guard with nothing to
  // catch has not been tested, and these are the rows ADM-077 has to refuse.
  const contraband =
    seed.status === 'draft' && index % 3 === 0
      ? products.filter((product) => !publiclyListable(product)).slice(index % 4, (index % 4) + 1)
      : [];

  const picked = [...safe.slice(0, 3 + (index % 4)), ...contraband];

  return {
    id: `COL-${String(index + 1).padStart(3, '0')}`,
    title: seed.title,
    slug: seed.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    description: `${seed.title}, curated for the ${seed.surface.replace(/_/g, ' ')}.`,
    heroAssetId: mediaAssets[(index * 5) % mediaAssets.length].id,
    surface: seed.surface,
    status: seed.status,
    productIds: picked.map((product) => product.id),
    startsOn: seed.status === 'scheduled' ? dayOnly(isoDaysAhead(9)) : null,
    endsOn: seed.status === 'scheduled' ? dayOnly(isoDaysAhead(40)) : null,
    curatorId: activeStaff[index % activeStaff.length].id,
    curatorName: activeStaff[index % activeStaff.length].name,
    createdAt: isoDaysAgo(90 - index * 4),
    updatedAt: isoDaysAgo(1 + index * 3),
    publishedAt: seed.status === 'published' ? isoDaysAgo(6 + index * 3) : null,
  };
});

export const BANNER_SLOTS = [
  { id: 'home_hero', label: 'Home hero', maxLive: 3 },
  { id: 'home_strip', label: 'Home strip', maxLive: 4 },
  { id: 'category_top', label: 'Category top', maxLive: 4 },
  { id: 'search_footer', label: 'Search footer', maxLive: 2 },
];

const BANNER_SEED = [
  { slot: 'home_hero', title: 'Bridal season is open', status: 'live' },
  { slot: 'home_hero', title: 'Verified workshops only', status: 'live' },
  { slot: 'home_hero', title: 'Diwali gifting', status: 'scheduled' },
  { slot: 'home_strip', title: 'Hallmarked, every piece', status: 'live' },
  { slot: 'home_strip', title: 'Transit insured to the door', status: 'live' },
  { slot: 'home_strip', title: 'Credit terms for approved buyers', status: 'draft' },
  { slot: 'category_top', title: 'Temple jewellery, Coimbatore', status: 'live' },
  { slot: 'category_top', title: 'Chains from Rajkot', status: 'live' },
  { slot: 'category_top', title: 'Polki and kundan', status: 'draft' },
  { slot: 'category_top', title: 'Autumn bangles', status: 'expired' },
  { slot: 'search_footer', title: 'Cannot find it? Post a sourcing brief', status: 'live' },
  { slot: 'search_footer', title: 'Talk to the Elanzia desk', status: 'draft' },
  { slot: 'home_strip', title: 'New workshops this month', status: 'expired' },
  { slot: 'home_hero', title: 'IIJS Premiere, meet us at H1-004', status: 'expired' },
  { slot: 'category_top', title: 'Nose pins under 3g', status: 'draft' },
  { slot: 'home_strip', title: 'Net weight, always shown', status: 'live' },
  { slot: 'search_footer', title: 'Wholesale only, GST required', status: 'expired' },
  { slot: 'home_hero', title: 'Private ranges for named buyers', status: 'draft' },
];

export const banners = BANNER_SEED.map((seed, index) => {
  const slotPosition = BANNER_SEED.slice(0, index).filter((row) => row.slot === seed.slot).length;
  const linksToCollection = index % 3 === 0;
  const safePool = publicCatalogue;

  // Two drafts point at a protected piece, for the same reason the collections
  // above do.
  const linkedProduct =
    linksToCollection
      ? null
      : seed.status === 'draft' && index % 5 === 0
        ? products.filter((product) => !publiclyListable(product))[index % 6]
        : safePool[(index * 7) % safePool.length];

  return {
    id: `BAN-${String(index + 1).padStart(3, '0')}`,
    slot: seed.slot,
    title: seed.title,
    subtitle: index % 2 === 0 ? 'Wholesale prices, verified workshops' : null,
    assetId: mediaAssets[(index * 4) % mediaAssets.length].id,
    ctaLabel: index % 2 === 0 ? 'Browse' : 'See the edit',
    ctaPath: linksToCollection ? `/collections/${collections[index % collections.length].slug}` : '/search',
    linkedProductId: linkedProduct?.id ?? null,
    linkedCollectionId: linksToCollection ? collections[index % collections.length].id : null,
    status: seed.status,
    order: slotPosition,
    startsOn: seed.status === 'scheduled' ? dayOnly(isoDaysAhead(12)) : dayOnly(isoDaysAgo(30 + index)),
    endsOn: seed.status === 'expired' ? dayOnly(isoDaysAgo(4 + index)) : null,
    impressions: seed.status === 'live' ? 4200 + index * 1370 : 0,
    clicks: seed.status === 'live' ? 60 + index * 23 : 0,
    updatedAt: isoDaysAgo(2 + index * 2),
  };
});

// ---------------------------------------------------------------------------
// Programmatic pages and SEO - ADM-079, ADM-080
// ---------------------------------------------------------------------------

export const SEO_CITIES = [...new Set(manufacturers.map((row) => row.city))].sort();
export const SEO_CATEGORIES = [...new Set(products.map((row) => row.category))].sort();

// A generated page with two pieces on it is a page worth having. One with none
// is a thin page, and a crawler that meets enough of them stops trusting the
// whole domain. The threshold is a field on the template rather than a
// constant here, so ADM-079 can show what raising it would cost before it is
// saved - the same shape as the media standard preview in ADM-032.
export const DEFAULT_MIN_PRODUCTS_PER_PAGE = 2;

// Every combination a template could generate, with the guard already applied.
// `withheld` is what the guard removed, and it is carried rather than dropped:
// the difference between "this city has no bangles" and "this city has three
// bangles and none of them may be shown" is the whole point of the screen.
export function templateGrid(kind) {
  const keysFor = {
    city_category: SEO_CITIES.flatMap((city) => SEO_CATEGORIES.map((category) => ({ city, category }))),
    city: SEO_CITIES.map((city) => ({ city, category: null })),
    category: SEO_CATEGORIES.map((category) => ({ city: null, category })),
    speciality: [...new Set(products.map((row) => row.speciality))].sort().map((speciality) => ({ speciality })),
  };

  return (keysFor[kind] ?? []).map((key) => {
    const matches = products.filter((product) => {
      const city = manufacturerById[product.manufacturerId].city;
      if (key.city && city !== key.city) return false;
      if (key.category && product.category !== key.category) return false;
      if (key.speciality && product.speciality !== key.speciality) return false;
      return true;
    });

    const listable = matches.filter(publiclyListable);

    return {
      key,
      matched: matches.length,
      productCount: listable.length,
      productIds: listable.map((product) => product.id),
      withheld: matches.filter((product) => !publiclyListable(product)).flatMap(publicSurfaceBlockers),
    };
  });
}

export const pageTemplates = [
  {
    id: 'TPL-city-category',
    name: 'City and category',
    kind: 'city_category',
    pathPattern: '/wholesale/{city}/{category}',
    titlePattern: '{category} wholesale in {city} | Elanzia Trade',
    metaDescriptionPattern:
      'Buy {category} wholesale from verified {city} manufacturers. Hallmarked, net weight stated, GST invoiced.',
    introPattern: 'Verified {city} workshops making {category} for the wholesale trade.',
    minProducts: DEFAULT_MIN_PRODUCTS_PER_PAGE,
    status: 'active',
    updatedAt: isoDaysAgo(12),
  },
  {
    id: 'TPL-city',
    name: 'City hub',
    kind: 'city',
    pathPattern: '/wholesale/{city}',
    titlePattern: 'Wholesale jewellery manufacturers in {city} | Elanzia Trade',
    metaDescriptionPattern: 'Verified gold jewellery workshops in {city}, with live wholesale prices.',
    introPattern: 'Every verified workshop we work with in {city}.',
    minProducts: 3,
    status: 'active',
    updatedAt: isoDaysAgo(28),
  },
  {
    id: 'TPL-category',
    name: 'Category hub',
    kind: 'category',
    pathPattern: '/wholesale/{category}',
    titlePattern: '{category} at wholesale | Elanzia Trade',
    metaDescriptionPattern: 'Wholesale {category} from verified Indian manufacturers, priced on live metal rates.',
    introPattern: '{category} from workshops across India.',
    minProducts: 2,
    status: 'active',
    updatedAt: isoDaysAgo(19),
  },
  {
    id: 'TPL-speciality',
    name: 'Speciality hub',
    kind: 'speciality',
    pathPattern: '/craft/{speciality}',
    titlePattern: '{speciality} jewellery at wholesale | Elanzia Trade',
    metaDescriptionPattern: 'Workshops specialising in {speciality} work, with wholesale pricing.',
    introPattern: 'The workshops that specialise in {speciality} work.',
    minProducts: 2,
    // Paused, so ADM-079 has a template that generates nothing today.
    status: 'paused',
    updatedAt: isoDaysAgo(64),
  },
];

export const seoSettings = {
  siteName: 'Elanzia Trade',
  titleSuffix: ' | Elanzia Trade',
  defaultMetaDescription:
    'Elanzia Trade is a wholesale marketplace for hallmarked gold jewellery from verified Indian manufacturers.',
  canonicalHost: 'https://elanzia.trade',
  robotsPolicy: 'index',
  crawlDelaySeconds: 0,
  openGraphImageAssetId: mediaAssets[0].id,
  twitterHandle: '@elanziatrade',
  organisationSchema: true,
  sitemapIncludesProducts: true,
  sitemapIncludesMicrosites: true,
  sitemapIncludesTemplatePages: true,
  sitemapIncludesCollections: true,
  updatedAt: isoDaysAgo(21),
  updatedById: activeStaff[0].id,
  updatedByName: activeStaff[0].name,
};

// ---------------------------------------------------------------------------
// Redirects - ADM-081
// ---------------------------------------------------------------------------

const REDIRECT_SEED = [
  // A real migration: the old flat URLs moved under /wholesale.
  ...SEO_CITIES.map((city) => ({
    from: `/${city.toLowerCase()}-jewellery`,
    to: `/wholesale/${city.toLowerCase()}`,
    reason: 'City pages moved under /wholesale',
  })),
  ...SEO_CATEGORIES.map((category) => ({
    from: `/${category.toLowerCase().replace(/\s+/g, '-')}`,
    to: `/wholesale/${category.toLowerCase().replace(/\s+/g, '-')}`,
    reason: 'Category pages moved under /wholesale',
  })),
  { from: '/about-us', to: '/about', reason: 'Slug shortened' },
  { from: '/faq', to: '/how-buying-works', reason: 'FAQ folded into the buying guide' },
  { from: '/buyers', to: '/how-buying-works', reason: 'Duplicate landing page retired' },
  { from: '/sellers', to: '/how-selling-works', reason: 'Duplicate landing page retired' },
  { from: '/making-charges', to: '/making-charges-explained', reason: 'Slug clarified' },
  { from: '/wastage', to: '/wastage-explained', reason: 'Slug clarified' },
  { from: '/hallmark', to: '/hallmarking-and-purity', reason: 'Slug clarified' },
  { from: '/gst', to: '/gst-and-hsn', reason: 'Slug clarified' },
  { from: '/diwali', to: '/diwali-2025', reason: 'Campaign archived' },
  { from: '/press-releases', to: '/press', reason: 'Slug shortened' },
  { from: '/terms-of-trade', to: '/terms', reason: 'Slug shortened' },
  { from: '/privacy-policy', to: '/privacy', reason: 'Slug shortened' },
  { from: '/careers-2025', to: '/careers', reason: 'Year dropped from the slug' },
  { from: '/refer', to: '/referrals', reason: 'Slug clarified' },
  { from: '/glossary-of-terms', to: '/glossary', reason: 'Slug shortened' },
  { from: '/insurance', to: '/transit-insurance', reason: 'Slug clarified' },
  { from: '/net-weight', to: '/net-versus-gross-weight', reason: 'Slug clarified' },
  { from: '/returns', to: '/returns-and-disputes', reason: 'Slug clarified' },

  // The three unhealthy rows the screen exists to surface.
  // A chain: /old-about goes to /about-us, which itself goes to /about.
  { from: '/old-about', to: '/about-us', reason: 'Legacy link from a 2024 press kit' },
  // A loop: these two point at each other.
  { from: '/trade-terms', to: '/wholesale-terms', reason: 'Renamed during the 2025 migration' },
  { from: '/wholesale-terms', to: '/trade-terms', reason: 'Renamed back, and nobody removed the first one' },
  // A target that was never written.
  { from: '/bulk-orders', to: '/bulk-ordering-guide', reason: 'Guide commissioned, not yet published' },
  { from: '/finance', to: '/credit-terms', reason: 'Credit terms page still in draft' },
];

export const redirects = REDIRECT_SEED.map((seed, index) => ({
  id: `RDR-${String(index + 1).padStart(4, '0')}`,
  fromPath: seed.from,
  toPath: seed.to,
  // 301 unless the target is a campaign, which comes back.
  kind: seed.to.includes('diwali') ? 302 : 301,
  reason: seed.reason,
  hits: (index * 137) % 900,
  lastHitAt: index % 7 === 3 ? null : isoDaysAgo(1 + (index % 40)),
  createdAt: isoDaysAgo(60 + index * 4),
  createdById: activeStaff[index % activeStaff.length].id,
  createdByName: activeStaff[index % activeStaff.length].name,
}));
