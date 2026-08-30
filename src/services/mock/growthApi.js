// Mock API for Growth and content - ADM-072 to ADM-081.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Blocker: { productId, code: 'private_piece'|'not_live'
//                            |'manufacturer_suspended', reason }
//
// Invitation: { id, introducerId, introducerName, introducerCity,
//               inviteeEmail, inviteeBusinessName, jewellerId: Jeweller.id|null,
//               status: 'sent'|'opened'|'accepted'|'expired'|'revoked'
//                       |'declined',
//               sentAt, openedAt, acceptedAt, expiresAt, declinedAt,
//               revokedAt, revokedReason,
//               acquisitionMode: 'linked'|'graduated'|null, graduatedAt,
//               ordersPlaced, lifetimeSpend, feeEarnedToDate,
//               feeState: 'earning'|'window_closed'|'not_earning' }
//
// Attribution: { jewellerId, jewellerName, jewellerCity, introducerId,
//                introducerName, introducedAt, acquisitionMode, graduatedAt,
//                windowMonths, windowEndsAt, windowOpen, monthsRemaining,
//                ratePercent, attributableOrders, attributableGmv,
//                commissionEarnedByElanzia, feeEarnedToDate, feeAccruingNow,
//                ledger: [{ orderId, confirmedAt, orderTotal, orderCommission,
//                           inWindow, fee }] }
//
// Exhibition: { id, name, venue, city, startsOn, endsOn,
//               status: 'planned'|'live'|'closed'|'cancelled',
//               stallCount, scanCount, connectionCount, taggedEnquiryCount,
//               taggedEnquiryValue, orderCount, followUpsOpen,
//               ownerId, ownerName, notes }
//
// Stall: { id, exhibitionId, code, hallName, manufacturerId, manufacturerName,
//          qrToken: string|null, qrIssuedAt, qrRevokedAt, qrVersion,
//          scanCount, connectionCount }
//
// ShowLead: { id, exhibitionId, stallId, stallCode, manufacturerId,
//             manufacturerName, jewellerId, jewellerName, jewellerCity,
//             scannedAt, source: 'stall_qr'|'badge'|'manual',
//             outcome: 'scanned'|'connected'|'enquiry_raised'|'ordered',
//             enquiryId: string|null, enquiryValue,
//             followUpState: 'pending'|'contacted'|'converted'|'lost',
//             followUpAt, followUpById, followUpByName, followUpNote }
//
// CmsPage: { id, title, slug, path,
//            status: 'draft'|'in_review'|'published'|'archived',
//            body, excerpt, metaTitle, metaDescription, canonicalPath,
//            noindex, heroAssetId, authorId, authorName,
//            createdAt, updatedAt, publishedAt, version, wordCount }
//
// MediaAsset: { id, label, type: 'image'|'video'|'document', url: null,
//               widthPx, heightPx, sizeKb, altText, credit, uploadedAt,
//               uploadedById, uploadedByName,
//               usedBy: [{ kind: 'page'|'collection'|'banner', id, title }],
//               usageCount }
//
// Collection: { id, title, slug, description, heroAssetId,
//               surface: 'homepage'|'category_page'|'campaign'|'microsite',
//               status: 'draft'|'published'|'scheduled'|'archived',
//               productIds, itemCount, publishedItemCount, blocked: Blocker[],
//               startsOn, endsOn, curatorId, curatorName,
//               createdAt, updatedAt, publishedAt }
//
// Banner: { id, slot: 'home_hero'|'home_strip'|'category_top'|'search_footer',
//           title, subtitle, assetId, assetLabel, ctaLabel, ctaPath,
//           linkedProductId, linkedProductTitle, linkedCollectionId,
//           status: 'draft'|'live'|'scheduled'|'expired',
//           order, startsOn, endsOn, impressions, clicks, clickThroughRate,
//           blocked: Blocker[], updatedAt }
//
// PageTemplate: { id, name, kind: 'city_category'|'city'|'category'
//                                 |'speciality',
//                 pathPattern, titlePattern, metaDescriptionPattern,
//                 introPattern, minProducts, status: 'active'|'paused',
//                 updatedAt, generatedCount, suppressedCount, withheldCount }
//
// TemplatePreview: { templateId, minProducts, combinations,
//                    generated: [{ key, path, title, metaDescription,
//                                  productCount }],
//                    suppressed: [{ key, path, productCount, reason: 'thin' }],
//                    withheld: Blocker[],
//                    generatedCount, suppressedCount, withheldCount }
//
// SeoSettings: { siteName, titleSuffix, defaultMetaDescription, canonicalHost,
//                robotsPolicy: 'index'|'noindex', crawlDelaySeconds,
//                openGraphImageAssetId, twitterHandle, organisationSchema,
//                sitemapIncludesProducts, sitemapIncludesMicrosites,
//                sitemapIncludesTemplatePages, sitemapIncludesCollections,
//                updatedAt, updatedById, updatedByName }
//
// Sitemap: { generatedAt, totalUrls, withheld: Blocker[],
//            sections: [{ kind, included, excluded }],
//            entries: [{ path, kind, lastModified, changeFrequency,
//                        priority }] }
//
// Redirect: { id, fromPath, toPath, kind: 301|302, reason,
//             health: 'ok'|'chained'|'loop'|'target_missing'|'shadowed',
//             hits, lastHitAt, createdAt, createdById, createdByName }

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import { jewellerById, manufacturerById, orders, productById, products } from '@/data/core';
import {
  ATTRIBUTION_WINDOW_MONTHS,
  BANNER_SLOTS,
  GROWTH_NOW,
  INVITATION_EXPIRY_DAYS,
  RESERVED_SLUGS,
  attributionByJewellerId,
  banners,
  cmsPages,
  collections,
  exhibitions,
  invitations,
  mediaAssets,
  pageTemplates,
  publicSurfaceBlockers,
  publiclyListable,
  redirects,
  seoSettings,
  showEnquiryLinks,
  showLeads,
  stalls,
  templateGrid,
} from '@/data/growthFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let invitationRecords = invitations.map((row) => ({ ...row }));
let exhibitionRecords = exhibitions.map((row) => ({ ...row }));
let stallRecords = stalls.map((row) => ({ ...row }));
let leadRecords = showLeads.map((row) => ({ ...row }));
let linkRecords = showEnquiryLinks.map((row) => ({ ...row }));
let pageRecords = cmsPages.map((row) => ({ ...row }));
let assetRecords = mediaAssets.map((row) => ({ ...row }));
let collectionRecords = collections.map((row) => ({ ...row, productIds: [...row.productIds] }));
let bannerRecords = banners.map((row) => ({ ...row }));
let templateRecords = pageTemplates.map((row) => ({ ...row }));
let settingsRecord = { ...seoSettings };
let redirectRecords = redirects.map((row) => ({ ...row }));
let sitemapBuiltAt = new Date(Date.parse(GROWTH_NOW) - 6 * 3600000).toISOString();

const NOW_MS = Date.parse(GROWTH_NOW);
const actingAdmin = { id: 'STF-001', name: 'Rajesh Soni' };

function mockError(code, message, status = 400, extra) {
  return mockRequest(null).then(() => {
    const error = new MockApiError(message, { status, code });
    if (extra) Object.assign(error, extra);
    throw error;
  });
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// THE PUBLIC SURFACE GUARD
// ---------------------------------------------------------------------------
//
// READ THIS BEFORE ADDING AN ENDPOINT THAT PUBLISHES ANYTHING.
//
// Every other area of this portal serves an internal surface. This one serves
// the open internet, and a crawler keeps whatever it was shown. So there is
// one gate, it lives here, and it runs in three places for three different
// reasons:
//
//   at SAVE      so a curator is told immediately which of the twelve pieces
//                they picked cannot go out, and why
//   at PUBLISH   because a piece that was public when it was curated can go
//                private the next morning, and the save-time check is by then
//                a week old
//   at READ      because the sitemap and the generated pages are built fresh
//                on every request, and that is the last line before a URL
//                reaches a crawler
//
// Save-time alone leaks. Read-time alone lets somebody build a twelve piece
// edit that silently publishes four. Both, or neither is worth having.
//
// Nothing is ever dropped quietly. A response that withheld seventeen products
// looks identical to a broken generator unless it says so.

function assertPublicSafe(productIds = []) {
  return productIds.flatMap((productId) => {
    const product = productById[productId];
    if (!product) {
      return [{ productId, code: 'not_live', reason: `${productId} is not in the catalogue` }];
    }
    return publicSurfaceBlockers(product);
  });
}

// ---------------------------------------------------------------------------
// Invitations and attribution - ADM-072
// ---------------------------------------------------------------------------

function decorateInvitation(invitation) {
  const jeweller = invitation.jewellerId ? jewellerById[invitation.jewellerId] : null;
  const attribution = invitation.jewellerId ? attributionByJewellerId[invitation.jewellerId] : null;

  return {
    ...invitation,
    jewellerCity: jeweller?.city ?? null,
    jewellerStatus: jeweller?.status ?? null,
    acquisitionMode: jeweller?.acquisitionMode ?? invitation.acquisitionMode,
    graduatedAt: jeweller?.graduatedAt ?? invitation.graduatedAt,
    ordersPlaced: attribution?.attributableOrders ?? 0,
    lifetimeSpend: jeweller?.lifetimeSpend ?? 0,
    feeEarnedToDate: attribution?.feeEarnedToDate ?? 0,
    // Three states, not two. A buyer that never joined is not "not earning"
    // in the same sense as one whose 24 months ran out.
    feeState: !attribution ? 'not_earning' : attribution.windowOpen ? 'earning' : 'window_closed',
  };
}

const INVITATION_SEARCH_FIELDS = [
  'id', 'introducerName', 'inviteeBusinessName', 'inviteeEmail', 'jewellerId',
];

function narrowInvitations({ search, filters = {} }) {
  const decorated = invitationRecords.map(decorateInvitation);
  const searched = applySearch(decorated, search, INVITATION_SEARCH_FIELDS);

  return applyFilters(searched, {
    status: filters.status,
    acquisitionMode: filters.mode,
    introducerId: filters.introducerId,
    feeState: filters.feeState,
  });
}

// BACKEND CONTRACT
// GET /admin/growth/invitations
// Query: { search, status, mode, introducerId, feeState, page, pageSize,
//          sortBy, sortDir }
//        status: 'sent'|'opened'|'accepted'|'expired'|'revoked'|'declined'
//        mode:   'linked'|'graduated'   (accepted invitations only)
//        feeState: 'earning'|'window_closed'|'not_earning'
// Returns: { items: Invitation[], total, page, pageSize }
// Notes: default sort sentAt desc. An invitation that was never accepted has
//        jewellerId null - it is an email address and a date, and that is
//        exactly what the desk needs to see to chase it.
//        acquisitionMode and graduatedAt are read from the jeweller record
//        rather than copied onto the invitation, so this queue and the account
//        can never disagree about whether a buyer has graduated.
export function listInvitations({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const narrowed = narrowInvitations({ search, filters });
    const sorted = applySort(narrowed, sortBy ?? 'sentAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/growth/invitations/counts
// Query: { search, introducerId }
// Returns: { total, sent, opened, accepted, expired, revoked, declined,
//            linked, graduated, acceptanceRatePercent,
//            feeEarnedToDate, feeAccruingCount, introducerCount }
// Notes: computed WITHOUT the status and mode filters, so the header strip
//        stays a fixed reference while the desk narrows the queue.
export function getInvitationCounts({ search, filters = {} } = {}) {
  return mockRequest(() => {
    const scoped = narrowInvitations({
      search,
      filters: { introducerId: filters.introducerId },
    });

    const byStatus = scoped.reduce((counts, row) => {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
      return counts;
    }, {});

    const accepted = byStatus.accepted ?? 0;

    return {
      total: scoped.length,
      sent: byStatus.sent ?? 0,
      opened: byStatus.opened ?? 0,
      accepted,
      expired: byStatus.expired ?? 0,
      revoked: byStatus.revoked ?? 0,
      declined: byStatus.declined ?? 0,
      linked: scoped.filter((row) => row.acquisitionMode === 'linked').length,
      graduated: scoped.filter((row) => row.acquisitionMode === 'graduated').length,
      acceptanceRatePercent: scoped.length
        ? Number(((accepted / scoped.length) * 100).toFixed(1))
        : 0,
      feeEarnedToDate: scoped.reduce((sum, row) => sum + row.feeEarnedToDate, 0),
      feeAccruingCount: scoped.filter((row) => row.feeState === 'earning').length,
      introducerCount: new Set(scoped.map((row) => row.introducerId)).size,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/growth/invitations/:jewellerId/attribution
// Returns: Attribution
// Errors: 404 attribution_not_found
// Notes: the attribution RECORD is permanent. It survives graduation, it
//        survives the buyer being suspended, and it survives a change of
//        ownership at the introducing workshop. It is the answer to "who
//        brought this buyer in", and that answer does not change.
//        The FEE is not permanent. It runs ATTRIBUTION_WINDOW_MONTHS from the
//        date the buyer joined and then stops, because an introduction made
//        once must not bill the platform forever.
//        `ledger` lists every confirmed order including the ones outside the
//        window, each with inWindow stated. A manufacturer asking why a month
//        paid nothing is owed the row, not a gap in the list.
//        The fee is a share of ELANZIA'S COMMISSION on the order. It is never
//        taken from the payout of whoever filled it - a workshop that cut and
//        shipped the goods does not subsidise a competitor's introduction fee.
//        See src/data/core/settlementLines.js for the split this leaves alone.
export function getAttribution(jewellerId) {
  const record = attributionByJewellerId[jewellerId];
  if (!record) {
    return mockError('attribution_not_found', 'That buyer was not introduced by a manufacturer', 404);
  }
  return mockRequest(record);
}

// BACKEND CONTRACT
// POST /admin/growth/invitations/:invitationId/resend
// Returns: Invitation
// Errors: 404 invitation_not_found, 409 invitation_already_accepted,
//         409 invitation_revoked
// Notes: resending restarts the expiry clock. The original sentAt is kept, so
//        the desk can still see how long this introduction has been chased.
export function resendInvitation({ invitationId } = {}) {
  const invitation = invitationRecords.find((row) => row.id === invitationId);
  if (!invitation) return mockError('invitation_not_found', 'That invitation no longer exists', 404);
  if (invitation.status === 'accepted') {
    return mockError('invitation_already_accepted', 'That invitation has already been accepted', 409);
  }
  if (invitation.status === 'revoked') {
    return mockError('invitation_revoked', 'That invitation was withdrawn', 409);
  }

  const updated = {
    ...invitation,
    status: 'sent',
    resentAt: nowIso(),
    expiresAt: new Date(Date.now() + INVITATION_EXPIRY_DAYS * 86400000).toISOString(),
  };
  invitationRecords = invitationRecords.map((row) => (row.id === invitationId ? updated : row));
  return mockRequest(decorateInvitation(updated));
}

// BACKEND CONTRACT
// POST /admin/growth/invitations/:invitationId/revoke
// Body: { reason }
// Returns: Invitation
// Errors: 404 invitation_not_found, 409 invitation_already_accepted,
//         422 reason_required
// Notes: an accepted invitation cannot be revoked. The buyer has already
//        joined, and withdrawing the invitation would not remove them - it
//        would only destroy the attribution record that pays the introducer.
export function revokeInvitation({ invitationId, reason } = {}) {
  const invitation = invitationRecords.find((row) => row.id === invitationId);
  if (!invitation) return mockError('invitation_not_found', 'That invitation no longer exists', 404);
  if (invitation.status === 'accepted') {
    return mockError(
      'invitation_already_accepted',
      'That buyer has already joined. Revoking would only delete the attribution record',
      409,
    );
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Record why this invitation is being withdrawn', 422);
  }

  const updated = {
    ...invitation,
    status: 'revoked',
    revokedAt: nowIso(),
    revokedReason: String(reason).trim(),
  };
  invitationRecords = invitationRecords.map((row) => (row.id === invitationId ? updated : row));
  return mockRequest(decorateInvitation(updated));
}

// BACKEND CONTRACT
// POST /admin/growth/invitations/:jewellerId/graduate
// Body: { reason }
// Returns: Invitation
// Errors: 404 jeweller_not_found, 409 not_in_linked_mode,
//         409 already_graduated, 422 reason_required
// Notes: graduating opens the whole marketplace to a buyer who has only ever
//        seen one workshop's catalogue, so it is a decision with a reason
//        attached rather than a toggle.
//        It does NOT end the introducer's fee. The window keeps running to its
//        original end date, deliberately: a graduation that cut the
//        introducer's income is a graduation nobody would ever agree to, and
//        the buyer would stay walled in to protect somebody else's revenue.
export function graduateBuyer({ jewellerId, reason } = {}) {
  const jeweller = jewellerById[jewellerId];
  if (!jeweller) return mockError('jeweller_not_found', 'That buyer no longer exists', 404);
  if (jeweller.acquisitionMode === 'direct') {
    return mockError('not_in_linked_mode', 'That buyer joined directly and was never in linked mode', 409);
  }
  if (jeweller.acquisitionMode === 'graduated') {
    return mockError('already_graduated', 'That buyer already has the full marketplace', 409);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Record why this buyer is being graduated', 422);
  }

  const graduatedAt = nowIso();
  const invitation = invitationRecords.find((row) => row.jewellerId === jewellerId);
  const updated = { ...invitation, acquisitionMode: 'graduated', graduatedAt };
  invitationRecords = invitationRecords.map((row) => (row.jewellerId === jewellerId ? updated : row));

  // The canonical record is what every other area reads, so it moves too.
  jeweller.acquisitionMode = 'graduated';
  jeweller.graduatedAt = graduatedAt;

  return mockRequest(decorateInvitation(updated));
}

// ---------------------------------------------------------------------------
// Exhibitions - ADM-073, ADM-074
// ---------------------------------------------------------------------------

function decorateStall(stall) {
  const leads = leadRecords.filter((lead) => lead.stallId === stall.id);
  return {
    ...stall,
    scanCount: leads.length,
    connectionCount: leads.filter((lead) => lead.outcome !== 'scanned').length,
    enquiryCount: leads.filter((lead) => lead.enquiryId).length,
  };
}

function decorateExhibition(show) {
  const showStalls = stallRecords.filter((stall) => stall.exhibitionId === show.id);
  const leads = leadRecords.filter((lead) => lead.exhibitionId === show.id);

  return {
    ...show,
    stallCount: showStalls.length,
    stallsWithoutQr: showStalls.filter((stall) => !stall.qrToken).length,
    scanCount: leads.length,
    connectionCount: leads.filter((lead) => lead.outcome !== 'scanned').length,
    taggedEnquiryCount: leads.filter((lead) => lead.enquiryId).length,
    taggedEnquiryValue: leads.reduce((sum, lead) => sum + lead.enquiryValue, 0),
    orderCount: leads.filter((lead) => lead.outcome === 'ordered').length,
    followUpsOpen: leads.filter((lead) => lead.followUpState === 'pending').length,
  };
}

// BACKEND CONTRACT
// GET /admin/growth/exhibitions
// Returns: { items: Exhibition[] }
// Notes: five shows is the whole calendar, so there is no paging. Ordered by
//        start date descending, which puts the show that is running now, or
//        the one that just finished, at the top.
export function listExhibitions() {
  return mockRequest(() => ({
    items: exhibitionRecords
      .map(decorateExhibition)
      .sort((a, b) => b.startsOn.localeCompare(a.startsOn)),
  }));
}

// BACKEND CONTRACT
// GET /admin/growth/exhibitions/:showId
// Returns: Exhibition
// Errors: 404 exhibition_not_found
export function getExhibition(showId) {
  const show = exhibitionRecords.find((row) => row.id === showId);
  if (!show) return mockError('exhibition_not_found', 'That show is not on the calendar', 404);
  return mockRequest(decorateExhibition(show));
}

// BACKEND CONTRACT
// POST  /admin/growth/exhibitions
// PATCH /admin/growth/exhibitions/:showId
// Body: { id, name, venue, city, startsOn, endsOn, status, ownerId, notes }
// Returns: Exhibition
// Errors: 404 exhibition_not_found, 422 validation_failed,
//         422 end_before_start, 409 show_already_closed
// Notes: a closed show cannot be edited. Its scan and enquiry numbers are what
//        the desk reported to the manufacturers who paid for the stalls, and
//        moving the dates underneath them changes what those numbers mean.
export function saveExhibition({ id, name, venue, city, startsOn, endsOn, status, ownerId, notes } = {}) {
  if (!String(name ?? '').trim()) return mockError('validation_failed', 'A show needs a name', 422);
  if (!startsOn || !endsOn) return mockError('validation_failed', 'A show needs both dates', 422);
  if (endsOn < startsOn) return mockError('end_before_start', 'The show cannot end before it starts', 422);

  if (id) {
    const existing = exhibitionRecords.find((row) => row.id === id);
    if (!existing) return mockError('exhibition_not_found', 'That show is not on the calendar', 404);
    if (existing.status === 'closed' && status !== 'closed') {
      return mockError('show_already_closed', 'A closed show cannot be reopened or re-dated', 409);
    }

    const updated = {
      ...existing,
      name: String(name).trim(),
      venue, city, startsOn, endsOn,
      status: status ?? existing.status,
      ownerId: ownerId ?? existing.ownerId,
      notes: notes ?? existing.notes,
    };
    exhibitionRecords = exhibitionRecords.map((row) => (row.id === id ? updated : row));
    return mockRequest(decorateExhibition(updated));
  }

  const created = {
    id: `EXH-${String(exhibitionRecords.length + 1).padStart(3, '0')}`,
    name: String(name).trim(),
    venue, city, startsOn, endsOn,
    status: status ?? 'planned',
    ownerId: ownerId ?? actingAdmin.id,
    ownerName: actingAdmin.name,
    notes: notes ?? null,
  };
  exhibitionRecords = [...exhibitionRecords, created];
  return mockRequest(decorateExhibition(created));
}

// BACKEND CONTRACT
// GET /admin/growth/exhibitions/:showId/stalls
// Returns: { items: Stall[] }
// Notes: scanCount and connectionCount are counted from the lead table at read
//        time rather than stored, so a stall's numbers cannot drift from the
//        scans that produced them.
export function listStalls(showId) {
  if (!exhibitionRecords.some((row) => row.id === showId)) {
    return mockError('exhibition_not_found', 'That show is not on the calendar', 404);
  }
  return mockRequest(() => ({
    items: stallRecords
      .filter((stall) => stall.exhibitionId === showId)
      .map(decorateStall)
      .sort((a, b) => a.code.localeCompare(b.code)),
  }));
}

// BACKEND CONTRACT
// POST  /admin/growth/exhibitions/:showId/stalls
// PATCH /admin/growth/exhibitions/:showId/stalls/:stallId
// Body: { id, code, hallName, manufacturerId }
// Returns: Stall
// Errors: 404 exhibition_not_found, 404 stall_not_found,
//         404 manufacturer_not_found, 409 stall_code_taken,
//         403 manufacturer_not_approved, 422 validation_failed
// Notes: only an approved manufacturer can be given a stall. A workshop that
//        is suspended has no public presence, and a trade fair stall with our
//        name over it is the most public presence there is.
export function saveStall({ showId, stall = {} } = {}) {
  if (!exhibitionRecords.some((row) => row.id === showId)) {
    return mockError('exhibition_not_found', 'That show is not on the calendar', 404);
  }
  if (!String(stall.code ?? '').trim()) {
    return mockError('validation_failed', 'A stall needs a code', 422);
  }

  const manufacturer = manufacturerById[stall.manufacturerId];
  if (!manufacturer) return mockError('manufacturer_not_found', 'No such manufacturer', 404);
  if (manufacturer.status !== 'approved') {
    return mockError(
      'manufacturer_not_approved',
      `${manufacturer.businessName} is ${manufacturer.status.replace(/_/g, ' ')} and cannot be given a stall`,
      403,
    );
  }

  const clash = stallRecords.find(
    (row) => row.exhibitionId === showId && row.code === stall.code && row.id !== stall.id,
  );
  if (clash) return mockError('stall_code_taken', `${stall.code} is already allocated at this show`, 409);

  if (stall.id) {
    const existing = stallRecords.find((row) => row.id === stall.id);
    if (!existing) return mockError('stall_not_found', 'That stall no longer exists', 404);

    const updated = {
      ...existing,
      code: stall.code,
      hallName: stall.hallName ?? existing.hallName,
      manufacturerId: manufacturer.id,
      manufacturerName: manufacturer.businessName,
    };
    stallRecords = stallRecords.map((row) => (row.id === stall.id ? updated : row));
    return mockRequest(decorateStall(updated));
  }

  const created = {
    id: `STL-${showId.slice(4)}-${String(stallRecords.filter((r) => r.exhibitionId === showId).length + 1).padStart(2, '0')}`,
    exhibitionId: showId,
    code: stall.code,
    hallName: stall.hallName ?? 'Hall 1',
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    qrToken: null,
    qrIssuedAt: null,
    qrRevokedAt: null,
    qrVersion: 0,
  };
  stallRecords = [...stallRecords, created];
  return mockRequest(decorateStall(created));
}

// BACKEND CONTRACT
// POST /admin/growth/exhibitions/:showId/stalls/:stallId/qr
// Returns: Stall
// Errors: 404 stall_not_found, 409 show_closed
// Notes: issuing a code REVOKES the one before it, and qrVersion goes up. A
//        stall with two live codes cannot attribute a scan to a printed
//        banner, and attribution is the only reason the code exists at all.
//        A closed show issues nothing - the scans it reported are final.
export function issueStallQr({ showId, stallId } = {}) {
  const show = exhibitionRecords.find((row) => row.id === showId);
  if (!show) return mockError('exhibition_not_found', 'That show is not on the calendar', 404);
  if (show.status === 'closed') {
    return mockError('show_closed', 'That show has closed and its codes are final', 409);
  }

  const stall = stallRecords.find((row) => row.id === stallId && row.exhibitionId === showId);
  if (!stall) return mockError('stall_not_found', 'That stall no longer exists', 404);

  const version = stall.qrVersion + 1;
  const updated = {
    ...stall,
    qrToken: `QR-${showId.slice(4)}${stall.code.replace(/\W/g, '')}-v${version}`,
    qrIssuedAt: nowIso(),
    // The previous code stops working the moment this one is printed.
    qrRevokedAt: stall.qrToken ? nowIso() : null,
    qrVersion: version,
  };
  stallRecords = stallRecords.map((row) => (row.id === stallId ? updated : row));
  return mockRequest(decorateStall(updated));
}

// BACKEND CONTRACT
// GET /admin/growth/exhibitions/:showId/report
// Returns: { exhibition, funnel: { scans, connections, enquiries, orders },
//            scansByDay: [{ date, scans, connections }],
//            stallLeaderboard: [{ stallId, stallCode, manufacturerName, scans,
//                                 connections, enquiries, enquiryValue }],
//            taggedEnquiryValue, followUpsOpen, followUpsOverdue,
//            conversionPercent }
// Errors: 404 exhibition_not_found
// Notes: the funnel narrows by definition - every connection was a scan first,
//        every enquiry came from a connection. Counting them independently
//        would let the middle of the funnel exceed the top.
//        taggedEnquiryValue is read from the marketplace enquiry rows through
//        the link table. Growth tags the conversation; it does not own it, and
//        it does not copy the value in case the quotation is revised.
export function getExhibitionReport(showId) {
  const show = exhibitionRecords.find((row) => row.id === showId);
  if (!show) return mockError('exhibition_not_found', 'That show is not on the calendar', 404);

  return mockRequest(() => {
    const leads = leadRecords.filter((lead) => lead.exhibitionId === showId);
    const showStalls = stallRecords.filter((stall) => stall.exhibitionId === showId);

    const byDay = leads.reduce((days, lead) => {
      const date = lead.scannedAt.slice(0, 10);
      days[date] ??= { date, scans: 0, connections: 0 };
      days[date].scans += 1;
      if (lead.outcome !== 'scanned') days[date].connections += 1;
      return days;
    }, {});

    const scans = leads.length;
    const connections = leads.filter((lead) => lead.outcome !== 'scanned').length;
    const enquiries = leads.filter((lead) => lead.enquiryId).length;

    return {
      exhibition: decorateExhibition(show),
      funnel: {
        scans,
        connections,
        enquiries,
        orders: leads.filter((lead) => lead.outcome === 'ordered').length,
      },
      conversionPercent: scans ? Number(((enquiries / scans) * 100).toFixed(1)) : 0,
      scansByDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      stallLeaderboard: showStalls
        .map((stall) => {
          const stallLeads = leads.filter((lead) => lead.stallId === stall.id);
          return {
            stallId: stall.id,
            stallCode: stall.code,
            manufacturerName: stall.manufacturerName,
            scans: stallLeads.length,
            connections: stallLeads.filter((lead) => lead.outcome !== 'scanned').length,
            enquiries: stallLeads.filter((lead) => lead.enquiryId).length,
            enquiryValue: stallLeads.reduce((sum, lead) => sum + lead.enquiryValue, 0),
          };
        })
        .sort((a, b) => b.scans - a.scans),
      taggedEnquiryValue: leads.reduce((sum, lead) => sum + lead.enquiryValue, 0),
      taggedEnquiryCount: linkRecords.filter((link) => link.exhibitionId === showId).length,
      followUpsOpen: leads.filter((lead) => lead.followUpState === 'pending').length,
      // A lead nobody has called two weeks after the show is a lead that has
      // gone cold, and the whole point of a stall was to collect it.
      followUpsOverdue: leads.filter(
        (lead) =>
          lead.followUpState === 'pending' &&
          Date.parse(lead.scannedAt) < NOW_MS - 14 * 86400000,
      ).length,
    };
  });
}

// BACKEND CONTRACT
// GET /admin/growth/exhibitions/:showId/leads
// Query: { search, stallId, outcome, followUpState, page, pageSize, sortBy,
//          sortDir }
// Returns: { items: ShowLead[], total, page, pageSize }
// Notes: default sort scannedAt desc.
export function listShowLeads({ showId, search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const scoped = leadRecords.filter((lead) => lead.exhibitionId === showId);
    const searched = applySearch(scoped, search, ['id', 'jewellerName', 'stallCode', 'manufacturerName']);
    const filtered = applyFilters(searched, {
      stallId: filters.stallId,
      outcome: filters.outcome,
      followUpState: filters.followUpState,
    });
    const sorted = applySort(filtered, sortBy ?? 'scannedAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// POST /admin/growth/exhibitions/:showId/leads/:leadId/follow-up
// Body: { followUpState: 'contacted'|'converted'|'lost', note }
// Returns: ShowLead
// Errors: 404 lead_not_found, 422 unknown_state, 422 note_required
// Notes: a lead marked lost needs a note. "Lost" with no reason tells the next
//        show nothing about why the last one did not convert.
export function recordFollowUp({ leadId, followUpState, note } = {}) {
  const lead = leadRecords.find((row) => row.id === leadId);
  if (!lead) return mockError('lead_not_found', 'That lead no longer exists', 404);
  if (!['contacted', 'converted', 'lost'].includes(followUpState)) {
    return mockError('unknown_state', 'That is not a follow-up outcome', 422);
  }
  if (followUpState === 'lost' && !String(note ?? '').trim()) {
    return mockError('note_required', 'Say why this lead was lost', 422);
  }

  const updated = {
    ...lead,
    followUpState,
    followUpAt: nowIso(),
    followUpById: actingAdmin.id,
    followUpByName: actingAdmin.name,
    followUpNote: note?.trim() ?? null,
  };
  leadRecords = leadRecords.map((row) => (row.id === leadId ? updated : row));
  return mockRequest(updated);
}

// ---------------------------------------------------------------------------
// CMS pages - ADM-075
// ---------------------------------------------------------------------------

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// BACKEND CONTRACT
// GET /admin/growth/pages
// Query: { search, status, page, pageSize, sortBy, sortDir }
//        status: 'draft'|'in_review'|'published'|'archived'
// Returns: { items: CmsPage[], total, page, pageSize }
// Notes: default sort updatedAt desc. `body` comes back on the list because
//        the editor is on the same screen - see ADM-075.
export function listPages({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const searched = applySearch(pageRecords, search, ['id', 'title', 'slug', 'metaTitle']);
    const filtered = applyFilters(searched, { status: filters.status });
    const sorted = applySort(filtered, sortBy ?? 'updatedAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/growth/pages/:pageId
// Returns: CmsPage
// Errors: 404 page_not_found
export function getPage(pageId) {
  const page = pageRecords.find((row) => row.id === pageId);
  if (!page) return mockError('page_not_found', 'That page no longer exists', 404);
  return mockRequest(page);
}

// BACKEND CONTRACT
// POST  /admin/growth/pages
// PATCH /admin/growth/pages/:pageId
// Body: { id, title, slug, body, excerpt, metaTitle, metaDescription,
//         canonicalPath, noindex, heroAssetId }
// Returns: CmsPage
// Errors: 404 page_not_found, 409 slug_taken, 422 reserved_slug,
//         422 validation_failed
// Notes: RESERVED_SLUGS are paths the router or the marketplace already owns.
//        A page claiming one would shadow a real surface, so the name is
//        refused rather than silently prefixed.
//        Saving does not publish. A page can be saved with no meta description
//        all day; it just cannot go live that way - see publishPage.
export function savePage({ id, title, slug, body, excerpt, metaTitle, metaDescription, canonicalPath, noindex, heroAssetId } = {}) {
  if (!String(title ?? '').trim()) return mockError('validation_failed', 'A page needs a title', 422);

  const nextSlug = slugify(slug || title);
  if (RESERVED_SLUGS.includes(nextSlug)) {
    return mockError('reserved_slug', `/${nextSlug} is reserved by the platform`, 422);
  }
  if (pageRecords.some((row) => row.slug === nextSlug && row.id !== id)) {
    return mockError('slug_taken', `/${nextSlug} is already used by another page`, 409);
  }

  if (id) {
    const existing = pageRecords.find((row) => row.id === id);
    if (!existing) return mockError('page_not_found', 'That page no longer exists', 404);

    const nextBody = body ?? existing.body;
    const updated = {
      ...existing,
      title: String(title).trim(),
      slug: nextSlug,
      path: `/${nextSlug}`,
      body: nextBody,
      excerpt: excerpt ?? existing.excerpt,
      metaTitle: metaTitle ?? existing.metaTitle,
      metaDescription: metaDescription ?? existing.metaDescription,
      canonicalPath: canonicalPath ?? existing.canonicalPath,
      noindex: noindex ?? existing.noindex,
      heroAssetId: heroAssetId ?? existing.heroAssetId,
      updatedAt: nowIso(),
      version: existing.version + 1,
      wordCount: String(nextBody).split(/\s+/).filter(Boolean).length,
    };
    pageRecords = pageRecords.map((row) => (row.id === id ? updated : row));
    return mockRequest(updated);
  }

  const created = {
    id: `PG-${String(pageRecords.length + 1).padStart(3, '0')}`,
    title: String(title).trim(),
    slug: nextSlug,
    path: `/${nextSlug}`,
    status: 'draft',
    body: body ?? '',
    excerpt: excerpt ?? '',
    metaTitle: metaTitle ?? `${title} | ${settingsRecord.siteName}`,
    metaDescription: metaDescription ?? null,
    canonicalPath: canonicalPath ?? null,
    noindex: true,
    heroAssetId: heroAssetId ?? null,
    authorId: actingAdmin.id,
    authorName: actingAdmin.name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    publishedAt: null,
    version: 1,
    wordCount: String(body ?? '').split(/\s+/).filter(Boolean).length,
  };
  pageRecords = [...pageRecords, created];
  return mockRequest(created);
}

// BACKEND CONTRACT
// POST /admin/growth/pages/:pageId/publish
// Returns: CmsPage
// Errors: 404 page_not_found, 409 already_published,
//         422 meta_description_required, 422 body_required,
//         409 slug_collides_with_redirect
// Notes: a published page must carry a meta description. A page indexed
//        without one gets a description written for it by the search engine,
//        out of whatever text it happened to find first, and that is what
//        every jeweller then sees on the results page.
// Notes: publishing onto a path a redirect already claims is refused. The
//        redirect would win and the page would be unreachable from the moment
//        it went live - a 200 nobody can get to.
export function publishPage({ pageId } = {}) {
  const page = pageRecords.find((row) => row.id === pageId);
  if (!page) return mockError('page_not_found', 'That page no longer exists', 404);
  if (page.status === 'published') return mockError('already_published', 'That page is already live', 409);
  if (!String(page.body ?? '').trim()) {
    return mockError('body_required', 'An empty page cannot be published', 422);
  }
  if (!String(page.metaDescription ?? '').trim()) {
    return mockError(
      'meta_description_required',
      'Write a meta description. Without one the search engine writes its own',
      422,
    );
  }

  const shadowing = redirectRecords.find((row) => row.fromPath === page.path);
  if (shadowing) {
    return mockError(
      'slug_collides_with_redirect',
      `${page.path} already redirects to ${shadowing.toPath}. Remove the redirect first or the page will be unreachable`,
      409,
    );
  }

  const updated = { ...page, status: 'published', noindex: false, publishedAt: nowIso(), updatedAt: nowIso() };
  pageRecords = pageRecords.map((row) => (row.id === pageId ? updated : row));
  sitemapBuiltAt = null;
  return mockRequest(updated);
}

// BACKEND CONTRACT
// POST /admin/growth/pages/:pageId/unpublish
// Body: { reason }
// Returns: CmsPage
// Errors: 404 page_not_found, 409 not_published, 422 reason_required
// Notes: the page becomes a draft and is marked noindex, but its path is NOT
//        freed. Somebody has linked to it. Taking the URL back and giving it
//        to a different page is how a link from a trade magazine ends up on
//        the wrong article.
export function unpublishPage({ pageId, reason } = {}) {
  const page = pageRecords.find((row) => row.id === pageId);
  if (!page) return mockError('page_not_found', 'That page no longer exists', 404);
  if (page.status !== 'published') return mockError('not_published', 'That page is not live', 409);
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Record why this page is coming down', 422);
  }

  const updated = {
    ...page,
    status: 'draft',
    noindex: true,
    unpublishedAt: nowIso(),
    unpublishedReason: String(reason).trim(),
    updatedAt: nowIso(),
  };
  pageRecords = pageRecords.map((row) => (row.id === pageId ? updated : row));
  sitemapBuiltAt = null;
  return mockRequest(updated);
}

// ---------------------------------------------------------------------------
// Media library - ADM-076
// ---------------------------------------------------------------------------

// Where an asset is used. Computed at read time from the things that reference
// it, so a usage count cannot drift from the pages that produced it.
function usageOf(assetId) {
  return [
    ...pageRecords
      .filter((page) => page.heroAssetId === assetId)
      .map((page) => ({ kind: 'page', id: page.id, title: page.title, live: page.status === 'published' })),
    ...collectionRecords
      .filter((collection) => collection.heroAssetId === assetId)
      .map((collection) => ({ kind: 'collection', id: collection.id, title: collection.title, live: collection.status === 'published' })),
    ...bannerRecords
      .filter((banner) => banner.assetId === assetId)
      .map((banner) => ({ kind: 'banner', id: banner.id, title: banner.title, live: banner.status === 'live' })),
  ];
}

function decorateAsset(asset) {
  const usedBy = usageOf(asset.id);
  return { ...asset, usedBy, usageCount: usedBy.length, liveUsageCount: usedBy.filter((row) => row.live).length };
}

// BACKEND CONTRACT
// GET /admin/growth/media
// Query: { search, type, usage, page, pageSize, sortBy, sortDir }
//        type:  'image'|'video'|'document'
//        usage: 'used'|'unused'|'missing_alt'
// Returns: { items: MediaAsset[], total, page, pageSize }
// Notes: there is NO upload endpoint. The fixtures carry no binaries, so `url`
//        is null on every asset and MediaViewer renders the label - the same
//        honest placeholder ADM-024 and ADM-029 already use. The library
//        exists to say what is there, what it is called, and what would break
//        if it went.
// Notes: the 'missing_alt' facet is not housekeeping. An image with no alt
//        text is a hole in the page for a screen reader and for a crawler
//        alike.
export function listMedia({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const decorated = assetRecords.map(decorateAsset);
    const searched = applySearch(decorated, search, ['id', 'label', 'altText', 'credit']);
    const byType = applyFilters(searched, { type: filters.type });

    const scoped =
      filters.usage === 'used'
        ? byType.filter((asset) => asset.usageCount > 0)
        : filters.usage === 'unused'
          ? byType.filter((asset) => asset.usageCount === 0)
          : filters.usage === 'missing_alt'
            ? byType.filter((asset) => asset.type === 'image' && !asset.altText)
            : byType;

    const sorted = applySort(scoped, sortBy ?? 'uploadedAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// PATCH /admin/growth/media/:assetId
// Body: { label, altText, credit }
// Returns: MediaAsset
// Errors: 404 asset_not_found, 422 validation_failed
export function updateMediaAsset({ assetId, patch = {} } = {}) {
  const asset = assetRecords.find((row) => row.id === assetId);
  if (!asset) return mockError('asset_not_found', 'That asset no longer exists', 404);
  if (patch.label !== undefined && !String(patch.label).trim()) {
    return mockError('validation_failed', 'An asset needs a label', 422);
  }

  const updated = {
    ...asset,
    label: patch.label ?? asset.label,
    altText: patch.altText === undefined ? asset.altText : (String(patch.altText).trim() || null),
    credit: patch.credit === undefined ? asset.credit : (String(patch.credit).trim() || null),
  };
  assetRecords = assetRecords.map((row) => (row.id === assetId ? updated : row));
  return mockRequest(decorateAsset(updated));
}

// BACKEND CONTRACT
// DELETE /admin/growth/media/:assetId
// Returns: { assetId, deleted: true }
// Errors: 404 asset_not_found, 409 asset_in_use
// Notes: an asset used by a live page, collection or banner cannot be deleted.
//        Removing it leaves a hole on a public surface, which is worse than a
//        file nobody needed. The 409 names what is using it.
export function deleteMediaAsset({ assetId } = {}) {
  const asset = assetRecords.find((row) => row.id === assetId);
  if (!asset) return mockError('asset_not_found', 'That asset no longer exists', 404);

  const usedBy = usageOf(assetId);
  if (usedBy.length > 0) {
    return mockError(
      'asset_in_use',
      `Used by ${usedBy.map((row) => row.title).slice(0, 3).join(', ')}${usedBy.length > 3 ? ` and ${usedBy.length - 3} more` : ''}`,
      409,
      { usedBy },
    );
  }

  assetRecords = assetRecords.filter((row) => row.id !== assetId);
  return mockRequest({ assetId, deleted: true });
}

// ---------------------------------------------------------------------------
// Collections and banners - ADM-077, ADM-078
// ---------------------------------------------------------------------------

// The guard runs here on READ as well as on save and publish. A collection
// curated last month can contain a piece that went private last night, and
// this is the read that has to notice.
function decorateCollection(collection) {
  const blocked = assertPublicSafe(collection.productIds);
  const blockedIds = new Set(blocked.map((row) => row.productId));

  return {
    ...collection,
    itemCount: collection.productIds.length,
    publishedItemCount: collection.productIds.filter((id) => !blockedIds.has(id)).length,
    blocked,
    items: collection.productIds.map((id) => {
      const product = productById[id];
      return {
        productId: id,
        title: product?.title ?? id,
        sku: product?.sku ?? null,
        manufacturerName: product ? manufacturerById[product.manufacturerId].businessName : null,
        priceTotal: product?.price.total ?? null,
        listable: !blockedIds.has(id),
      };
    }),
  };
}

// BACKEND CONTRACT
// GET /admin/growth/collections
// Query: { search, status, surface, page, pageSize, sortBy, sortDir }
//        surface: 'homepage'|'category_page'|'campaign'|'microsite'
// Returns: { items: Collection[], total, page, pageSize }
// Notes: every row carries `blocked`, recomputed on this read. A published
//        collection showing blocked pieces is a live public surface that has
//        gone wrong since it was approved, and it has to be visible from the
//        list rather than only from inside the editor.
export function listCollections({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const decorated = collectionRecords.map(decorateCollection);
    const searched = applySearch(decorated, search, ['id', 'title', 'slug', 'curatorName']);
    const filtered = applyFilters(searched, { status: filters.status, surface: filters.surface });
    const sorted = applySort(filtered, sortBy ?? 'updatedAt', sortDir ?? 'desc');
    return paginate(sorted, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/growth/collections/:collectionId
// Returns: Collection
// Errors: 404 collection_not_found
export function getCollection(collectionId) {
  const collection = collectionRecords.find((row) => row.id === collectionId);
  if (!collection) return mockError('collection_not_found', 'That collection no longer exists', 404);
  return mockRequest(decorateCollection(collection));
}

// BACKEND CONTRACT
// POST  /admin/growth/collections
// PATCH /admin/growth/collections/:collectionId
// Body: { id, title, slug, description, surface, heroAssetId, productIds,
//         startsOn, endsOn }
// Returns: Collection
// Errors: 404 collection_not_found, 409 slug_taken, 422 validation_failed,
//         422 protected_piece_in_collection
// Notes: the 422 body carries `blocked: Blocker[]`, naming every offending
//        piece and the reason for each. Never a bare rejection - a curator who
//        picked twelve pieces has to be told which three cannot go out and
//        why, or the only way to find out is one at a time.
// Notes: this is the SAVE-time half of the guard. It is not sufficient on its
//        own and is not meant to be - see decorateCollection and
//        publishCollection for the other two.
export function saveCollection({ id, title, slug, description, surface, heroAssetId, productIds = [], startsOn, endsOn } = {}) {
  if (!String(title ?? '').trim()) return mockError('validation_failed', 'A collection needs a title', 422);

  const nextSlug = slugify(slug || title);
  if (collectionRecords.some((row) => row.slug === nextSlug && row.id !== id)) {
    return mockError('slug_taken', `/${nextSlug} is already used by another collection`, 409);
  }

  const blocked = assertPublicSafe(productIds);
  if (blocked.length > 0) {
    return mockError(
      'protected_piece_in_collection',
      `${blocked.length} of these pieces cannot appear on a public surface`,
      422,
      { blocked },
    );
  }

  if (id) {
    const existing = collectionRecords.find((row) => row.id === id);
    if (!existing) return mockError('collection_not_found', 'That collection no longer exists', 404);

    const updated = {
      ...existing,
      title: String(title).trim(),
      slug: nextSlug,
      description: description ?? existing.description,
      surface: surface ?? existing.surface,
      heroAssetId: heroAssetId ?? existing.heroAssetId,
      productIds: [...productIds],
      startsOn: startsOn ?? existing.startsOn,
      endsOn: endsOn ?? existing.endsOn,
      updatedAt: nowIso(),
    };
    collectionRecords = collectionRecords.map((row) => (row.id === id ? updated : row));
    return mockRequest(decorateCollection(updated));
  }

  const created = {
    id: `COL-${String(collectionRecords.length + 1).padStart(3, '0')}`,
    title: String(title).trim(),
    slug: nextSlug,
    description: description ?? '',
    heroAssetId: heroAssetId ?? null,
    surface: surface ?? 'homepage',
    status: 'draft',
    productIds: [...productIds],
    startsOn: startsOn ?? null,
    endsOn: endsOn ?? null,
    curatorId: actingAdmin.id,
    curatorName: actingAdmin.name,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    publishedAt: null,
  };
  collectionRecords = [...collectionRecords, created];
  return mockRequest(decorateCollection(created));
}

// BACKEND CONTRACT
// POST /admin/growth/collections/:collectionId/publish
// Returns: Collection
// Errors: 404 collection_not_found, 409 already_published,
//         422 collection_empty, 409 protected_piece_in_collection
// Notes: this is the PUBLISH-time half of the guard, and it is the one that
//        matters most. A collection can pass the save-time check in March and
//        contain a private piece by April, because the workshop moved it. The
//        check therefore runs again here, against the catalogue as it is right
//        now, and the 409 carries the same `blocked` list.
export function publishCollection({ collectionId } = {}) {
  const collection = collectionRecords.find((row) => row.id === collectionId);
  if (!collection) return mockError('collection_not_found', 'That collection no longer exists', 404);
  if (collection.status === 'published') {
    return mockError('already_published', 'That collection is already live', 409);
  }
  if (collection.productIds.length === 0) {
    return mockError('collection_empty', 'An empty collection cannot be published', 422);
  }

  const blocked = assertPublicSafe(collection.productIds);
  if (blocked.length > 0) {
    return mockError(
      'protected_piece_in_collection',
      `${blocked.length} pieces in this edit cannot go on a public surface`,
      409,
      { blocked },
    );
  }

  const updated = { ...collection, status: 'published', publishedAt: nowIso(), updatedAt: nowIso() };
  collectionRecords = collectionRecords.map((row) => (row.id === collectionId ? updated : row));
  sitemapBuiltAt = null;
  return mockRequest(decorateCollection(updated));
}

function decorateBanner(banner) {
  const blocked = banner.linkedProductId ? assertPublicSafe([banner.linkedProductId]) : [];
  const asset = assetRecords.find((row) => row.id === banner.assetId);
  const product = banner.linkedProductId ? productById[banner.linkedProductId] : null;

  return {
    ...banner,
    assetLabel: asset?.label ?? null,
    linkedProductTitle: product?.title ?? null,
    clickThroughRate: banner.impressions
      ? Number(((banner.clicks / banner.impressions) * 100).toFixed(2))
      : 0,
    blocked,
  };
}

// BACKEND CONTRACT
// GET /admin/growth/banners
// Query: { search, slot, status, page, pageSize }
// Returns: { items: Banner[], total, page, pageSize, slots: BannerSlot[] }
// BannerSlot: { id, label, maxLive, liveCount }
// Notes: ordered by slot then `order`, which is the order they render in on
//        the public page. Every row carries `blocked`, recomputed on read for
//        the same reason a collection does.
export function listBanners({ search, filters = {}, page, pageSize } = {}) {
  return mockRequest(() => {
    const decorated = bannerRecords.map(decorateBanner);
    const searched = applySearch(decorated, search, ['id', 'title', 'subtitle', 'ctaLabel']);
    const filtered = applyFilters(searched, { slot: filters.slot, status: filters.status });
    const sorted = [...filtered].sort(
      (a, b) => a.slot.localeCompare(b.slot) || a.order - b.order,
    );

    return {
      ...paginate(sorted, { page, pageSize }),
      slots: BANNER_SLOTS.map((slot) => ({
        ...slot,
        liveCount: bannerRecords.filter((row) => row.slot === slot.id && row.status === 'live').length,
      })),
    };
  });
}

// BACKEND CONTRACT
// POST  /admin/growth/banners
// PATCH /admin/growth/banners/:bannerId
// Body: { id, slot, title, subtitle, assetId, ctaLabel, ctaPath,
//         linkedProductId, linkedCollectionId, status, startsOn, endsOn }
// Returns: Banner
// Errors: 404 banner_not_found, 404 asset_not_found, 409 slot_full,
//         422 protected_piece_linked, 422 validation_failed
// Notes: a banner pointing at a protected piece is refused for exactly the
//        reason a collection containing one is. The link is a public surface -
//        a jeweller who clicks it lands on a page that should not exist.
// Notes: slot_full is a merchandising rule, not a technical one. A hero slot
//        with six banners in it is a carousel nobody watches to the end.
export function saveBanner({ id, slot, title, subtitle, assetId, ctaLabel, ctaPath, linkedProductId, linkedCollectionId, status, startsOn, endsOn } = {}) {
  if (!String(title ?? '').trim()) return mockError('validation_failed', 'A banner needs a title', 422);

  const slotDefinition = BANNER_SLOTS.find((row) => row.id === slot);
  if (!slotDefinition) return mockError('validation_failed', 'That is not a banner slot', 422);

  if (assetId && !assetRecords.some((row) => row.id === assetId)) {
    return mockError('asset_not_found', 'That asset is not in the library', 404);
  }

  if (linkedProductId) {
    const blocked = assertPublicSafe([linkedProductId]);
    if (blocked.length > 0) {
      return mockError('protected_piece_linked', blocked[0].reason, 422, { blocked });
    }
  }

  if (status === 'live') {
    const liveInSlot = bannerRecords.filter(
      (row) => row.slot === slot && row.status === 'live' && row.id !== id,
    ).length;
    if (liveInSlot >= slotDefinition.maxLive) {
      return mockError(
        'slot_full',
        `${slotDefinition.label} already carries ${slotDefinition.maxLive} live banners`,
        409,
      );
    }
  }

  if (id) {
    const existing = bannerRecords.find((row) => row.id === id);
    if (!existing) return mockError('banner_not_found', 'That banner no longer exists', 404);

    const updated = {
      ...existing,
      slot,
      title: String(title).trim(),
      subtitle: subtitle ?? existing.subtitle,
      assetId: assetId ?? existing.assetId,
      ctaLabel: ctaLabel ?? existing.ctaLabel,
      ctaPath: ctaPath ?? existing.ctaPath,
      linkedProductId: linkedProductId ?? null,
      linkedCollectionId: linkedCollectionId ?? null,
      status: status ?? existing.status,
      startsOn: startsOn ?? existing.startsOn,
      endsOn: endsOn ?? existing.endsOn,
      updatedAt: nowIso(),
    };
    bannerRecords = bannerRecords.map((row) => (row.id === id ? updated : row));
    return mockRequest(decorateBanner(updated));
  }

  const created = {
    id: `BAN-${String(bannerRecords.length + 1).padStart(3, '0')}`,
    slot,
    title: String(title).trim(),
    subtitle: subtitle ?? null,
    assetId: assetId ?? null,
    ctaLabel: ctaLabel ?? 'Browse',
    ctaPath: ctaPath ?? '/search',
    linkedProductId: linkedProductId ?? null,
    linkedCollectionId: linkedCollectionId ?? null,
    status: status ?? 'draft',
    order: bannerRecords.filter((row) => row.slot === slot).length,
    startsOn: startsOn ?? null,
    endsOn: endsOn ?? null,
    impressions: 0,
    clicks: 0,
    updatedAt: nowIso(),
  };
  bannerRecords = [...bannerRecords, created];
  return mockRequest(decorateBanner(created));
}

// BACKEND CONTRACT
// POST /admin/growth/banners/:bannerId/reorder
// Body: { direction: 'up'|'down' }
// Returns: { items: Banner[] }   the whole slot, renumbered
// Errors: 404 banner_not_found, 409 already_at_edge
// Notes: order is a number and this moves it by one within its slot. There is
//        no drag and drop anywhere in this portal and this area does not
//        introduce it - two buttons do the same job with a tenth of the
//        surface area, and they work from a keyboard.
export function reorderBanner({ bannerId, direction } = {}) {
  const banner = bannerRecords.find((row) => row.id === bannerId);
  if (!banner) return mockError('banner_not_found', 'That banner no longer exists', 404);
  if (!['up', 'down'].includes(direction)) {
    return mockError('validation_failed', 'Move it up or down', 422);
  }

  const inSlot = bannerRecords
    .filter((row) => row.slot === banner.slot)
    .sort((a, b) => a.order - b.order);
  const index = inSlot.findIndex((row) => row.id === bannerId);
  const target = direction === 'up' ? index - 1 : index + 1;

  if (target < 0 || target >= inSlot.length) {
    return mockError('already_at_edge', 'That banner is already at the end of its slot', 409);
  }

  const reordered = [...inSlot];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  const renumbered = reordered.map((row, position) => ({ ...row, order: position }));

  bannerRecords = bannerRecords.map(
    (row) => renumbered.find((next) => next.id === row.id) ?? row,
  );

  return mockRequest({ items: renumbered.map(decorateBanner) });
}

// ---------------------------------------------------------------------------
// Programmatic pages, SEO settings and the sitemap - ADM-079, ADM-080
// ---------------------------------------------------------------------------

function fillPattern(pattern, key) {
  return String(pattern)
    .replace(/\{city\}/g, key.city ?? '')
    .replace(/\{category\}/g, key.category ?? '')
    .replace(/\{speciality\}/g, key.speciality ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pathFor(pattern, key) {
  return fillPattern(pattern, key)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function buildTemplatePreview(template, minProducts) {
  const floor = minProducts ?? template.minProducts;
  const grid = templateGrid(template.kind);

  const generated = [];
  const suppressed = [];
  const withheld = [];

  grid.forEach((cell) => {
    withheld.push(...cell.withheld);
    const path = pathFor(template.pathPattern, cell.key);

    if (cell.productCount >= floor) {
      generated.push({
        key: cell.key,
        path,
        title: fillPattern(template.titlePattern, cell.key),
        metaDescription: fillPattern(template.metaDescriptionPattern, cell.key),
        intro: fillPattern(template.introPattern, cell.key),
        productCount: cell.productCount,
        withheldCount: cell.withheld.length,
      });
    } else {
      suppressed.push({
        key: cell.key,
        path,
        productCount: cell.productCount,
        withheldCount: cell.withheld.length,
        reason: 'thin',
      });
    }
  });

  return {
    templateId: template.id,
    minProducts: floor,
    combinations: grid.length,
    generated,
    suppressed,
    withheld,
    generatedCount: generated.length,
    suppressedCount: suppressed.length,
    withheldCount: withheld.length,
  };
}

// BACKEND CONTRACT
// GET /admin/growth/seo/templates
// Returns: { items: PageTemplate[] }
// Notes: generatedCount and suppressedCount are computed against the catalogue
//        as it stands, not stored, so a template's reach moves when the
//        catalogue does.
export function listPageTemplates() {
  return mockRequest(() => ({
    items: templateRecords.map((template) => {
      const preview = buildTemplatePreview(template, template.minProducts);
      return {
        ...template,
        generatedCount: template.status === 'active' ? preview.generatedCount : 0,
        suppressedCount: preview.suppressedCount,
        withheldCount: preview.withheldCount,
        combinations: preview.combinations,
      };
    }),
  }));
}

// BACKEND CONTRACT
// PATCH /admin/growth/seo/templates/:templateId
// Body: { name, pathPattern, titlePattern, metaDescriptionPattern,
//         introPattern, minProducts, status }
// Returns: PageTemplate
// Errors: 404 template_not_found, 422 validation_failed,
//         422 pattern_missing_placeholder
// Notes: a city_category pattern that does not use both {city} and {category}
//        would generate the same URL 77 times. The check is here rather than
//        in the screen because it is the difference between a template and a
//        duplicate-content penalty.
export function savePageTemplate({ id, name, pathPattern, titlePattern, metaDescriptionPattern, introPattern, minProducts, status } = {}) {
  const template = templateRecords.find((row) => row.id === id);
  if (!template) return mockError('template_not_found', 'That template no longer exists', 404);

  const required = {
    city_category: ['{city}', '{category}'],
    city: ['{city}'],
    category: ['{category}'],
    speciality: ['{speciality}'],
  }[template.kind];

  const nextPath = pathPattern ?? template.pathPattern;
  const missing = required.find((token) => !nextPath.includes(token));
  if (missing) {
    return mockError(
      'pattern_missing_placeholder',
      `The path must contain ${missing} or every generated page shares one URL`,
      422,
    );
  }

  const floor = minProducts === undefined ? template.minProducts : Number(minProducts);
  if (!Number.isFinite(floor) || floor < 1) {
    return mockError('validation_failed', 'A page needs at least one piece on it', 422);
  }

  const updated = {
    ...template,
    name: name ?? template.name,
    pathPattern: nextPath,
    titlePattern: titlePattern ?? template.titlePattern,
    metaDescriptionPattern: metaDescriptionPattern ?? template.metaDescriptionPattern,
    introPattern: introPattern ?? template.introPattern,
    minProducts: floor,
    status: status ?? template.status,
    updatedAt: nowIso(),
  };
  templateRecords = templateRecords.map((row) => (row.id === id ? updated : row));
  sitemapBuiltAt = null;
  return mockRequest(updated);
}

// BACKEND CONTRACT
// POST /admin/growth/seo/templates/:templateId/preview
// Body: { minProducts }   optional, to try a threshold before saving it
// Returns: TemplatePreview
// Errors: 404 template_not_found
// Notes: the city and category grid is 7 x 11 = 77 combinations. At the
//        default minProducts of 2, 13 pages generate and 64 are suppressed as
//        thin. Raising it to 3 leaves 5. The threshold is previewed before it
//        is saved for the same reason the media standard is in ADM-032 -
//        afterwards is too late to find out.
// Notes: a page below the threshold is SUPPRESSED, not published with noindex.
//        A thin page that does not exist costs nothing; a thin page a crawler
//        has to be told to ignore still spends the crawl budget.
// Notes: `withheld` is the guard's output and is reported separately from
//        `suppressed`. They are different failures: suppressed means there was
//        never enough stock to fill the page, withheld means there was and it
//        is not allowed out. Without the guard, 11 combinations would clear a
//        threshold of 3; with it, 5 do.
export function previewPageTemplate({ templateId, minProducts } = {}) {
  const template = templateRecords.find((row) => row.id === templateId);
  if (!template) return mockError('template_not_found', 'That template no longer exists', 404);
  return mockRequest(() => buildTemplatePreview(template, minProducts));
}

// BACKEND CONTRACT
// GET /admin/growth/seo/settings
// Returns: SeoSettings
export function getSeoSettings() {
  return mockRequest(settingsRecord);
}

// BACKEND CONTRACT
// PUT /admin/growth/seo/settings
// Body: SeoSettings
// Returns: SeoSettings
// Errors: 422 canonical_host_required, 422 validation_failed
// Notes: switching robotsPolicy to noindex takes the entire site out of every
//        search index. It is stored as asked - this endpoint does not argue -
//        but the screen puts a ConfirmDialog in front of it, because it is one
//        select away from turning off the front door.
export function updateSeoSettings(payload = {}) {
  if (!String(payload.canonicalHost ?? '').trim()) {
    return mockError('canonical_host_required', 'A canonical host is required', 422);
  }
  if (!/^https?:\/\//.test(payload.canonicalHost)) {
    return mockError('validation_failed', 'The canonical host needs a scheme, http or https', 422);
  }
  if (!String(payload.siteName ?? '').trim()) {
    return mockError('validation_failed', 'A site name is required', 422);
  }

  settingsRecord = {
    ...settingsRecord,
    ...payload,
    updatedAt: nowIso(),
    updatedById: actingAdmin.id,
    updatedByName: actingAdmin.name,
  };
  sitemapBuiltAt = null;
  return mockRequest(settingsRecord);
}

function buildSitemap() {
  const entries = [];
  const withheld = [];
  const sections = [];

  const livePages = pageRecords.filter((page) => page.status === 'published' && !page.noindex);
  sections.push({ kind: 'page', included: livePages.length, excluded: pageRecords.length - livePages.length });
  livePages.forEach((page) => {
    entries.push({ path: page.path, kind: 'page', lastModified: page.updatedAt, changeFrequency: 'monthly', priority: 0.7 });
  });

  if (settingsRecord.sitemapIncludesProducts) {
    const listable = products.filter(publiclyListable);
    const blocked = products.filter((product) => !publiclyListable(product)).flatMap(publicSurfaceBlockers);
    withheld.push(...blocked);
    sections.push({ kind: 'product', included: listable.length, excluded: products.length - listable.length });
    listable.forEach((product) => {
      entries.push({ path: `/piece/${product.sku.toLowerCase()}`, kind: 'product', lastModified: product.listedAt, changeFrequency: 'weekly', priority: 0.6 });
    });
  }

  if (settingsRecord.sitemapIncludesCollections) {
    const live = collectionRecords.filter(
      (collection) => collection.status === 'published' && assertPublicSafe(collection.productIds).length === 0,
    );
    const dropped = collectionRecords.filter(
      (collection) => collection.status === 'published' && assertPublicSafe(collection.productIds).length > 0,
    );
    dropped.forEach((collection) => withheld.push(...assertPublicSafe(collection.productIds)));
    sections.push({ kind: 'collection', included: live.length, excluded: collectionRecords.length - live.length });
    live.forEach((collection) => {
      entries.push({ path: `/collections/${collection.slug}`, kind: 'collection', lastModified: collection.updatedAt, changeFrequency: 'weekly', priority: 0.5 });
    });
  }

  if (settingsRecord.sitemapIncludesTemplatePages) {
    let generated = 0;
    let suppressed = 0;
    templateRecords
      .filter((template) => template.status === 'active')
      .forEach((template) => {
        const preview = buildTemplatePreview(template, template.minProducts);
        generated += preview.generatedCount;
        suppressed += preview.suppressedCount;
        withheld.push(...preview.withheld);
        preview.generated.forEach((page) => {
          entries.push({ path: page.path, kind: 'template', lastModified: template.updatedAt, changeFrequency: 'weekly', priority: 0.4 });
        });
      });
    sections.push({ kind: 'template', included: generated, excluded: suppressed });
  }

  // Deduplicated: the same piece is withheld from the product list and from
  // every template page it would have appeared on, and reporting it eight
  // times makes the number meaningless.
  const seen = new Set();
  const uniqueWithheld = withheld.filter((row) => {
    const key = `${row.productId}:${row.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    generatedAt: sitemapBuiltAt,
    stale: sitemapBuiltAt === null,
    totalUrls: entries.length,
    sections,
    withheld: uniqueWithheld,
    withheldCount: uniqueWithheld.length,
    entries: entries.slice(0, 200),
    entriesTruncated: entries.length > 200,
  };
}

// BACKEND CONTRACT
// GET /admin/growth/seo/sitemap
// Returns: Sitemap
// Notes: built fresh on every request rather than served from a stored file.
//        This is the LAST place the guard runs before a URL reaches a crawler,
//        and a cached sitemap is a cached mistake.
// Notes: `withheld` names every protected piece and why, deduplicated. A
//        sitemap that silently drops seventeen products is indistinguishable
//        from a generator that is broken, and the difference matters at 2am.
// Notes: `stale` is true when something published since the last rebuild.
export function getSitemap() {
  return mockRequest(() => buildSitemap());
}

// BACKEND CONTRACT
// POST /admin/growth/seo/sitemap/rebuild
// Returns: Sitemap
// Notes: stamps generatedAt and clears `stale`. The content is identical to a
//        GET - rebuilding is what tells the search engines to come and look,
//        not what makes the file correct.
export function rebuildSitemap() {
  sitemapBuiltAt = nowIso();
  return mockRequest(() => buildSitemap());
}

// ---------------------------------------------------------------------------
// Redirects - ADM-081
// ---------------------------------------------------------------------------

// Health is derived, never stored. A redirect that was fine when it was
// written becomes a chain the moment somebody adds the hop after it.
function redirectHealth(redirect, all = redirectRecords) {
  const others = all.filter((row) => row.id !== redirect.id);

  if (redirect.fromPath === redirect.toPath) return 'loop';

  // Follow the chain. A cycle of any length is a loop.
  const seen = new Set([redirect.fromPath]);
  let hop = others.find((row) => row.fromPath === redirect.toPath);
  let depth = 0;
  while (hop && depth < 10) {
    if (seen.has(hop.fromPath)) return 'loop';
    if (hop.toPath === redirect.fromPath) return 'loop';
    seen.add(hop.fromPath);
    hop = others.find((row) => row.fromPath === hop.toPath);
    depth += 1;
  }

  if (others.some((row) => row.fromPath === redirect.toPath)) return 'chained';
  if (pageRecords.some((page) => page.path === redirect.fromPath && page.status === 'published')) {
    return 'shadowed';
  }
  if (
    !pageRecords.some((page) => page.path === redirect.toPath) &&
    !redirect.toPath.startsWith('/wholesale/') &&
    !redirect.toPath.startsWith('/collections/')
  ) {
    return 'target_missing';
  }
  return 'ok';
}

// BACKEND CONTRACT
// GET /admin/growth/redirects
// Query: { search, kind, health, page, pageSize, sortBy, sortDir }
//        kind: 301|302
//        health: 'ok'|'chained'|'loop'|'target_missing'|'shadowed'
// Returns: { items: Redirect[], total, page, pageSize,
//            counts: { ok, chained, loop, target_missing, shadowed } }
// Notes: health is computed on this read across the whole table, because a
//        redirect's health depends on the others. Adding one hop can turn a
//        healthy row into a chain without that row being touched.
export function listRedirects({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() => {
    const decorated = redirectRecords.map((row) => ({ ...row, health: redirectHealth(row) }));
    const searched = applySearch(decorated, search, ['id', 'fromPath', 'toPath', 'reason']);
    const filtered = applyFilters(searched, { kind: filters.kind, health: filters.health });
    const sorted = applySort(filtered, sortBy ?? 'fromPath', sortDir ?? 'asc');

    return {
      ...paginate(sorted, { page, pageSize }),
      counts: decorated.reduce((counts, row) => {
        counts[row.health] = (counts[row.health] ?? 0) + 1;
        return counts;
      }, {}),
    };
  });
}

// BACKEND CONTRACT
// POST  /admin/growth/redirects
// PATCH /admin/growth/redirects/:redirectId
// Body: { id, fromPath, toPath, kind, reason }
// Returns: Redirect
// Errors: 404 redirect_not_found, 409 redirect_loop, 409 redirect_chain,
//         409 from_path_is_live_page, 409 from_path_taken,
//         422 validation_failed
// Notes: a loop is refused outright. So is a chain: A to B where B already
//        goes to C means every visitor and every crawler makes two hops, and a
//        crawler that meets enough of them stops following at all.
// Notes: a redirect whose fromPath is a LIVE page is refused. It would shadow
//        the page and take it off the internet, and the page would still look
//        published in this portal while returning a 301 to everybody else.
// Notes: a target that does not exist yet is reported as target_missing, not
//        refused. Writing the redirect before the page is a normal order of
//        work during a migration.
export function saveRedirect({ id, fromPath, toPath, kind, reason } = {}) {
  const from = String(fromPath ?? '').trim();
  const to = String(toPath ?? '').trim();

  if (!from.startsWith('/') || !to.startsWith('/')) {
    return mockError('validation_failed', 'Both paths must start with a slash', 422);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('validation_failed', 'Record why this redirect exists', 422);
  }
  if (from === to) {
    return mockError('redirect_loop', 'A path cannot redirect to itself', 409);
  }
  if (redirectRecords.some((row) => row.fromPath === from && row.id !== id)) {
    return mockError('from_path_taken', `${from} already redirects somewhere`, 409);
  }

  const livePage = pageRecords.find((page) => page.path === from && page.status === 'published');
  if (livePage) {
    return mockError(
      'from_path_is_live_page',
      `${from} is the live page "${livePage.title}". This redirect would take it off the internet`,
      409,
    );
  }

  const candidate = { id: id ?? 'RDR-new', fromPath: from, toPath: to };
  const others = redirectRecords.filter((row) => row.id !== id);
  const health = redirectHealth(candidate, [...others, candidate]);

  if (health === 'loop') {
    return mockError('redirect_loop', `${from} and ${to} would point at each other`, 409);
  }
  if (health === 'chained') {
    const next = others.find((row) => row.fromPath === to);
    return mockError(
      'redirect_chain',
      `${from} to ${to} to ${next.toPath} is two hops. Point ${from} straight at ${next.toPath}`,
      409,
    );
  }

  if (id) {
    const existing = redirectRecords.find((row) => row.id === id);
    if (!existing) return mockError('redirect_not_found', 'That redirect no longer exists', 404);

    const updated = { ...existing, fromPath: from, toPath: to, kind: kind ?? existing.kind, reason: String(reason).trim() };
    redirectRecords = redirectRecords.map((row) => (row.id === id ? updated : row));
    return mockRequest({ ...updated, health: redirectHealth(updated) });
  }

  const created = {
    id: `RDR-${String(redirectRecords.length + 1).padStart(4, '0')}`,
    fromPath: from,
    toPath: to,
    kind: kind ?? 301,
    reason: String(reason).trim(),
    hits: 0,
    lastHitAt: null,
    createdAt: nowIso(),
    createdById: actingAdmin.id,
    createdByName: actingAdmin.name,
  };
  redirectRecords = [...redirectRecords, created];
  return mockRequest({ ...created, health: redirectHealth(created) });
}

// BACKEND CONTRACT
// DELETE /admin/growth/redirects/:redirectId
// Returns: { redirectId, deleted: true }
// Errors: 404 redirect_not_found
// Notes: deleting a redirect that is still being hit returns the hit count so
//        the screen can say what is about to start 404ing. It does not refuse -
//        retiring an old URL eventually is the point.
export function deleteRedirect({ redirectId } = {}) {
  const redirect = redirectRecords.find((row) => row.id === redirectId);
  if (!redirect) return mockError('redirect_not_found', 'That redirect no longer exists', 404);

  redirectRecords = redirectRecords.filter((row) => row.id !== redirectId);
  return mockRequest({ redirectId, deleted: true, hitsLost: redirect.hits });
}
