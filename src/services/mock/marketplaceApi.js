// Mock API for Marketplace oversight - ADM-042 to ADM-047.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Enquiry: { id, jewellerId, jewellerName, jewellerCity,
//            manufacturerId, manufacturerName, manufacturerCity,
//            productId: Product.id|null, productTitle: string|null,
//            subject, category, purity: 24|22|18|14, expectedWeightGrams,
//            quantity,
//            status: 'awaiting_manufacturer'|'quoted'|'negotiating'
//                    |'accepted'|'declined'|'expired'|'closed',
//            openedAt: ISO, lastMessageAt: ISO,
//            lastMessageBy: 'jeweller'|'manufacturer'|'elanzia',
//            firstResponseHours: number|null, firstResponseBreached: boolean,
//            ageDays, idleDays, ageBucket: 'today'|'week'|'fortnight'|'older',
//            valueBand: 'unquoted'|'under_1l'|'1l_5l'|'5l_20l'|'above_20l',
//            messageCount, quotationCount,
//            latestQuotationId: Quotation.id|null,
//            latestQuotedValue: number|null,
//            stalled: boolean,
//            stalledReason: 'no_first_response'|'manufacturer_silent'
//                           |'jeweller_silent'|null,
//            nudgeCount, nudgedAt: ISO|null,
//            convertedOrderId: Order.id|null, closedAt: ISO|null,
//            closeReason: 'sourced_elsewhere'|'budget_withdrawn'
//                         |'duplicate_enquiry'|null }
//
// Message: { id, enquiryId, at: ISO,
//            author: 'jeweller'|'manufacturer'|'elanzia', authorName, body,
//            attachmentCount, quotationId?: Quotation.id }
//
// PriceBreakup: { purity, netWeight, grossWeight, metalRatePerGram, metalValue,
//                 wastagePercent, wastageValue, makingChargesPerGram,
//                 makingCharges, stoneValue, subtotal, gstPercent, gstValue,
//                 total }
//   Price = (metal rate x net weight) + wastage + making + stone, then GST on
//   the sum. Wastage is ADDED, not deducted - trade convention.
//
// Quotation: { id, enquiryId, revision, quotedAt: ISO, validUntil: ISO,
//              status: 'offered'|'superseded'|'accepted'|'declined'|'expired',
//              quantity, leadTimeDays, price: PriceBreakup, unitTotal,
//              lineTotal, notes }
//
// MicrositeSubmission: { id, micrositeId, manufacturerId, manufacturerName,
//                        city, slug, version, submittedAt: ISO, ageHours,
//                        slaHours, slaBreached,
//                        status: 'submitted'|'in_review'|'changes_requested'
//                                |'approved'|'rejected'|'superseded',
//                        decidedAt: ISO|null, reviewerId: AdminUser.id|null,
//                        reviewerName: string|null, changeSummary, headline,
//                        about, speciality, categories: string[],
//                        certifications: string[],
//                        featuredProductIds: Product.id[], contactEmail,
//                        contactPhone, media: MediaItem[],
//                        flags: MicrositeFlag[], reasons: string[],
//                        reviewerNote: string|null }
//
// Microsite: { id, manufacturerId, manufacturerName, city, state, slug,
//              status: 'draft'|'submitted'|'in_review'|'changes_requested'
//                      |'live'|'rejected'|'suspended',
//              liveVersion: number|null, firstPublishedAt: ISO|null,
//              lastPublishedAt: ISO|null, suspendedAt: ISO|null,
//              suspensionReason: string|null, monthlyVisitors,
//              enquiriesFromSite }
//
// MicrositeFlag: { code: 'private_piece_featured'|'contact_bypass'
//                        |'unsubstantiated_claim',
//                  entityId: Product.id|null, detail }
//
// MediaItem: { id, type: 'image'|'document'|'video', url: string|null, label,
//              caption }
//
// SearchTerm: { id, term, category, purity, searches30d, searchesPrevious30d,
//               uniqueJewellers, resultCount, zeroResult: boolean,
//               clickThroughRate, ordersAttributed, topCity,
//               trend: 'rising'|'flat'|'falling', firstSeenAt: ISO,
//               lastSeenAt: ISO, unmetValue,
//               sourcingRequestId: SourcingRequest.id|null }
//
// DemandPoint: { date: 'YYYY-MM-DD', searches, zeroResultSearches }
//
// CategoryGap: { category, zeroResultSearches, listingCount,
//                manufacturerCount, unmetValue, gapScore }
//
// SourcingRequest: { id, jewellerId, jewellerName, jewellerCity, title, brief,
//                    category, purity, targetWeightGrams, quantity,
//                    targetUnitBudget, indicativeUnitValue,
//                    indicativeTotalValue, neededBy: ISO,
//                    originSearchTermId: SearchTerm.id|null,
//                    originSearchTerm: string|null, media: MediaItem[],
//                    status: 'new'|'routed'|'responses_in'|'matched'
//                            |'no_match'|'withdrawn'|'expired',
//                    postedAt: ISO, routedAt: ISO|null, ageHours, slaHours,
//                    slaBreached, ownerId: AdminUser.id, ownerName,
//                    routedManufacturerIds: Manufacturer.id[], routedCount,
//                    responseCount, bestQuotedValue: number|null,
//                    matchedManufacturerId: Manufacturer.id|null,
//                    matchedManufacturerName: string|null, closedAt: ISO|null,
//                    closeReason: 'matched_to_manufacturer'
//                                 |'no_manufacturer_capable'
//                                 |'jeweller_withdrew'
//                                 |'budget_below_making_cost'
//                                 |'expired_unanswered'|null,
//                    closeNote: string|null }
//
// SourcingResponse: { id, requestId, manufacturerId, manufacturerName, city,
//                     routedAt: ISO|null, respondedAt: ISO|null,
//                     status: 'no_response'|'responded'|'declined',
//                     canMake: boolean, declineReason: string|null,
//                     leadTimeDays, minOrderQuantity,
//                     price: PriceBreakup|null, quotedUnitPrice: number|null,
//                     quotedTotal: number|null, shortlisted: boolean,
//                     notes: string|null }
//
// Suggestion: { manufacturerId, manufacturerName, city, speciality,
//               listingCount, onTimeDispatchPercent, rating,
//               purityMatch: boolean, matchScore }

import {
  MockApiError,
  applyFilters,
  applySearch,
  applySort,
  mockRequest,
  paginate,
  queryCollection,
} from './_client';
import { jewellerById, manufacturerById, productById } from '@/data/core';
import {
  FIRST_RESPONSE_SLA_HOURS,
  MICROSITE_REVIEW_SLA_HOURS,
  STALL_THRESHOLD_DAYS,
  capableManufacturers,
  categoryGaps,
  demandSeries,
  enquiries,
  enquiryMessages,
  enquiryQuotations,
  micrositeById,
  micrositeSubmissions,
  microsites,
  searchTerms,
  sourcingRequests,
  sourcingResponses,
} from '@/data/marketplaceFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let enquiryRecords = enquiries.map((row) => ({ ...row }));
let messageRecords = enquiryMessages.map((row) => ({ ...row }));
let submissionRecords = micrositeSubmissions.map((row) => ({ ...row }));
let siteRecords = microsites.map((row) => ({ ...row }));
let searchTermRecords = searchTerms.map((row) => ({ ...row }));
let requestRecords = sourcingRequests.map((row) => ({ ...row }));
let responseRecords = sourcingResponses.map((row) => ({ ...row }));

const HOUR_MS = 3600000;

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

// The values a filter dropdown offers. They come back with the data rather than
// being read from a fixture by the screen, because a screen that imports a
// fixture to build its own dropdown has quietly bypassed the whole data layer.
// Sorted by label, so the list does not reshuffle as rows change.
function facetOf(rows, valueKey, labelKey) {
  const seen = new Map();
  rows.forEach((row) => {
    if (row[valueKey] && !seen.has(row[valueKey])) seen.set(row[valueKey], row[labelKey]);
  });
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label: label ?? value }))
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
}

// ---------------------------------------------------------------------------
// Enquiries and quotations - ADM-042
// ---------------------------------------------------------------------------

const OPEN_ENQUIRY_STATUSES = ['awaiting_manufacturer', 'quoted', 'negotiating'];

// Age and value are what the desk actually filters on, and neither is a field a
// jeweller ever typed. Bucketing them here rather than in the screen means the
// boundaries are stated once and the backend inherits them.
function ageBucketFor(enquiry) {
  if (enquiry.ageDays < 1) return 'today';
  if (enquiry.ageDays <= 7) return 'week';
  if (enquiry.ageDays <= 14) return 'fortnight';
  return 'older';
}

function valueBandFor(enquiry) {
  const value = enquiry.latestQuotedValue;
  if (value === null) return 'unquoted';
  if (value < 100000) return 'under_1l';
  if (value < 500000) return '1l_5l';
  if (value < 2000000) return '5l_20l';
  return 'above_20l';
}

function decorate(enquiry) {
  return { ...enquiry, ageBucket: ageBucketFor(enquiry), valueBand: valueBandFor(enquiry) };
}

// BACKEND CONTRACT
// GET /admin/marketplace/enquiries
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { manufacturerId, jewellerId, status, ageBucket,
//                     valueBand } }
// Returns: { items: Enquiry[], total: number, page: number, pageSize: number }
// Notes: sorted by lastMessageAt desc by default, because the desk reads this
//        queue to find conversations that have gone quiet.
//        search matches jewellerName, manufacturerName, subject and id.
//        ageBucket is computed from openedAt: today <1d, week 1-7d,
//        fortnight 8-14d, older >14d. valueBand is computed from the latest
//        quotation's line total: unquoted (no quote yet), under_1l, 1l_5l,
//        5l_20l, above_20l. Both are server-side buckets so every client
//        agrees where the boundaries fall.
export function listEnquiries(query = {}) {
  return mockRequest(() =>
    queryCollection(enquiryRecords.map(decorate), {
      ...query,
      sortBy: query.sortBy ?? 'lastMessageAt',
      sortDir: query.sortDir ?? 'desc',
      searchFields: ['id', 'jewellerName', 'manufacturerName', 'subject', 'category'],
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/marketplace/enquiries/overview
// Query: { filters: { manufacturerId, jewellerId, status, ageBucket,
//                     valueBand } }
// Returns: { openCount, awaitingFirstResponse, stalledCount, quotedValueTotal,
//            medianFirstResponseHours, firstResponseBreachedCount,
//            conversionRate, byStatus: { <status>: number },
//            facets: { manufacturers: Option[], jewellers: Option[] } }
//   Option: { value, label }
// Notes: the SAME filters the list endpoint takes are applied here, so the
//        tiles and the table can never describe two different populations.
//        conversionRate is accepted enquiries over all enquiries that reached a
//        quote - an enquiry nobody ever answered was never a chance to convert.
//        quotedValueTotal sums the LATEST quotation of each open conversation
//        only. Summing superseded revisions would count the same piece of gold
//        three times over.
export function getEnquiryOverview({ filters = {} } = {}) {
  return mockRequest(() => {
    const { items } = queryCollection(enquiryRecords.map(decorate), {
      filters,
      page: 1,
      pageSize: enquiryRecords.length,
    });

    const open = items.filter((row) => OPEN_ENQUIRY_STATUSES.includes(row.status));
    const answered = items.filter((row) => row.firstResponseHours !== null);
    const responseHours = answered.map((row) => row.firstResponseHours).sort((a, b) => a - b);
    const quoted = items.filter((row) => row.quotationCount > 0);

    return {
      openCount: open.length,
      awaitingFirstResponse: items.filter((row) => row.status === 'awaiting_manufacturer').length,
      stalledCount: items.filter((row) => row.stalled).length,
      quotedValueTotal: open.reduce((total, row) => total + (row.latestQuotedValue ?? 0), 0),
      medianFirstResponseHours:
        responseHours.length === 0 ? null : responseHours[Math.floor(responseHours.length / 2)],
      firstResponseBreachedCount: items.filter((row) => row.firstResponseBreached).length,
      slaHours: FIRST_RESPONSE_SLA_HOURS,
      conversionRate:
        quoted.length === 0
          ? 0
          : Number(
              ((items.filter((row) => row.status === 'accepted').length / quoted.length) * 100).toFixed(1),
            ),
      byStatus: items.reduce((counts, row) => {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
        return counts;
      }, {}),

      // Built from every enquiry, not from the filtered set, so narrowing to
      // one manufacturer does not remove every other manufacturer from the
      // dropdown that got you there.
      facets: {
        manufacturers: facetOf(enquiryRecords, 'manufacturerId', 'manufacturerName'),
        jewellers: facetOf(enquiryRecords, 'jewellerId', 'jewellerName'),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/marketplace/enquiries/:enquiryId
// Returns: { enquiry: Enquiry, messages: Message[], quotations: Quotation[],
//            jeweller: { id, businessName, city, phone, email, creditLimit },
//            manufacturer: { id, businessName, city, phone, email,
//                            onTimeDispatchPercent } }
// Errors: 404 enquiry_not_found
// Notes: messages ascending by time, quotations descending by revision so the
//        offer on the table is first. A superseded revision is never deleted -
//        the concession history is the negotiation, and a dispute later turns
//        on it.
export function getEnquiryThread(enquiryId) {
  const enquiry = enquiryRecords.find((row) => row.id === enquiryId);
  if (!enquiry) return mockError('enquiry_not_found', 'That enquiry no longer exists', 404);

  return mockRequest(() => {
    const jeweller = jewellerById[enquiry.jewellerId];
    const manufacturer = manufacturerById[enquiry.manufacturerId];

    return {
      enquiry: decorate(enquiry),
      messages: applySort(
        messageRecords.filter((row) => row.enquiryId === enquiryId),
        'at',
        'asc',
      ),
      quotations: applySort(
        enquiryQuotations.filter((row) => row.enquiryId === enquiryId),
        'revision',
        'desc',
      ),
      jeweller: {
        id: jeweller.id,
        businessName: jeweller.businessName,
        contactName: jeweller.contactName,
        city: jeweller.city,
        phone: jeweller.phone,
        email: jeweller.email,
        creditLimit: jeweller.creditLimit,
      },
      manufacturer: {
        id: manufacturer.id,
        businessName: manufacturer.businessName,
        contactName: manufacturer.contactName,
        city: manufacturer.city,
        phone: manufacturer.phone,
        email: manufacturer.email,
        onTimeDispatchPercent: manufacturer.onTimeDispatchPercent,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Stalled conversations - ADM-043
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/marketplace/enquiries/stalled
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { thresholdDays, stalledReason, manufacturerId } }
// Returns: { items: Enquiry[], total, page, pageSize, thresholdDays, slaHours,
//            facets: { manufacturers: Option[] } }
// Notes: sorted by idleDays desc by default - the point of the queue is the
//        conversation nobody has touched for longest.
//        thresholdDays defaults to 3 and is a MINIMUM idle age, not an equality
//        filter, so it cannot go through the generic filter path.
//        Only OPEN conversations can stall. A declined or expired enquiry is
//        finished, and chasing people who have nothing left to say is how a
//        nudge stops meaning anything.
export function listStalledEnquiries(query = {}) {
  const { thresholdDays = STALL_THRESHOLD_DAYS, stalledReason, manufacturerId } = query.filters ?? {};
  const threshold = Number(thresholdDays) || STALL_THRESHOLD_DAYS;

  return mockRequest(() => {
    const candidates = enquiryRecords
      .filter((row) => OPEN_ENQUIRY_STATUSES.includes(row.status))
      .filter((row) => row.idleDays >= threshold)
      .map(decorate);

    const result = queryCollection(candidates, {
      ...query,
      sortBy: query.sortBy ?? 'idleDays',
      sortDir: query.sortDir ?? 'desc',
      filters: { stalledReason, manufacturerId },
      searchFields: ['id', 'jewellerName', 'manufacturerName', 'subject'],
    });

    return {
      ...result,
      thresholdDays: threshold,
      slaHours: FIRST_RESPONSE_SLA_HOURS,
      facets: { manufacturers: facetOf(enquiryRecords, 'manufacturerId', 'manufacturerName') },
    };
  });
}

// BACKEND CONTRACT
// POST /admin/marketplace/enquiries/nudge
// Body: { enquiryIds: Enquiry.id[], channel: 'email'|'whatsapp'|'call',
//         note: string }
// Returns: { updated: Enquiry[], messages: Message[] }
// Errors: 400 no_enquiries_selected, 400 nudge_note_required,
//         409 enquiry_not_open
// Notes: a nudge posts a visible message into the thread rather than sending a
//        private reminder. Both sides see that the desk stepped in, which is
//        what stops the same conversation being nudged by two people on the
//        same morning.
//        A call must carry a note, because the only record of what was said on
//        the phone is what the caller writes down.
export function nudgeEnquiries({ enquiryIds = [], channel = 'email', note = '' } = {}) {
  if (enquiryIds.length === 0) {
    return mockError('no_enquiries_selected', 'Select at least one conversation to nudge');
  }
  if (channel === 'call' && note.trim().length === 0) {
    return mockError('nudge_note_required', 'A call nudge needs a note saying what was said');
  }

  const targets = enquiryRecords.filter((row) => enquiryIds.includes(row.id));
  const closed = targets.find((row) => !OPEN_ENQUIRY_STATUSES.includes(row.status));
  if (closed) {
    return mockError('enquiry_not_open', `${closed.id} is already closed and cannot be nudged`, 409);
  }

  return mockRequest(() => {
    const at = nowIso();
    const posted = [];

    enquiryRecords = enquiryRecords.map((row) => {
      if (!enquiryIds.includes(row.id)) return row;

      const message = {
        id: `MSG-${row.id.slice(4)}-N${row.nudgeCount + 1}`,
        enquiryId: row.id,
        at,
        author: 'elanzia',
        authorName: 'Marketplace desk',
        body:
          note.trim() ||
          'Following up on behalf of the jeweller. Please respond with a quote or decline so the enquiry can close.',
        attachmentCount: 0,
        channel,
      };
      posted.push(message);

      return { ...row, nudgeCount: row.nudgeCount + 1, nudgedAt: at, lastMessageBy: 'elanzia' };
    });

    messageRecords = [...messageRecords, ...posted];

    return {
      updated: enquiryRecords.filter((row) => enquiryIds.includes(row.id)).map(decorate),
      messages: posted,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/marketplace/enquiries/:enquiryId/close
// Body: { reason: 'sourced_elsewhere'|'budget_withdrawn'|'duplicate_enquiry',
//         note: string }
// Returns: Enquiry
// Errors: 404 enquiry_not_found, 400 close_reason_required,
//         409 enquiry_converted, 409 enquiry_already_closed
// Notes: a conversation that produced a confirmed order is not Elanzia's to
//        close. The order is the record of what was agreed, and closing the
//        thread behind it removes the evidence a dispute would be settled on.
export function closeEnquiry({ enquiryId, reason, note = '' } = {}) {
  const enquiry = enquiryRecords.find((row) => row.id === enquiryId);
  if (!enquiry) return mockError('enquiry_not_found', 'That enquiry no longer exists', 404);
  if (!reason) return mockError('close_reason_required', 'Choose why this conversation is being closed');
  if (enquiry.convertedOrderId) {
    return mockError(
      'enquiry_converted',
      `This conversation produced ${enquiry.convertedOrderId} and stays open as the record of what was agreed`,
      409,
    );
  }
  if (!OPEN_ENQUIRY_STATUSES.includes(enquiry.status)) {
    return mockError('enquiry_already_closed', 'That conversation is already closed', 409);
  }

  return mockRequest(() => {
    const closed = {
      ...enquiry,
      status: 'closed',
      closedAt: nowIso(),
      closeReason: reason,
      closeNote: note.trim() || null,
      stalled: false,
      stalledReason: null,
    };
    enquiryRecords = enquiryRecords.map((row) => (row.id === enquiryId ? closed : row));
    return decorate(closed);
  });
}

// ---------------------------------------------------------------------------
// Manufacturer microsites - ADM-044
// ---------------------------------------------------------------------------

const UNDECIDED_SUBMISSION_STATUSES = ['submitted', 'in_review', 'changes_requested'];

// BACKEND CONTRACT
// GET /admin/marketplace/microsites/submissions
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, city, manufacturerId } }
// Returns: { items: MicrositeSubmission[], total, page, pageSize,
//            awaitingDecision: number, slaBreached: number, slaHours: number,
//            facets: { cities: Option[], manufacturers: Option[] } }
// Notes: the queue is over SUBMISSIONS, not over sites. A site that came back
//        three times after changes were requested is three pieces of reviewer
//        work, and collapsing them to the current state is how a review backlog
//        goes unseen.
//        Default order puts everything still awaiting a decision first, oldest
//        submission at the top, and the decided history after it. Sorting the
//        whole list by date alone would bury this morning's submission under
//        last quarter's approvals.
export function listMicrositeSubmissions(query = {}) {
  const { search, filters, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(submissionRecords, search, ['id', 'manufacturerName', 'slug', 'city', 'headline']);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'submittedAt', sortBy ? sortDir : 'asc');

    // The undecided-first pass runs BEFORE paging, not after. Reordering one
    // page of twenty would leave this morning's submission on page three of a
    // date-sorted history, which is the bug this ordering exists to prevent.
    if (!sortBy) {
      rows = [...rows].sort(
        (left, right) =>
          Number(UNDECIDED_SUBMISSION_STATUSES.includes(right.status)) -
          Number(UNDECIDED_SUBMISSION_STATUSES.includes(left.status)),
      );
    }

    return {
      ...paginate(rows, { page, pageSize }),
      awaitingDecision: submissionRecords.filter((row) =>
        UNDECIDED_SUBMISSION_STATUSES.includes(row.status),
      ).length,
      slaBreached: submissionRecords.filter((row) => row.slaBreached).length,
      slaHours: MICROSITE_REVIEW_SLA_HOURS,
      facets: {
        cities: facetOf(submissionRecords, 'city', 'city'),
        manufacturers: facetOf(submissionRecords, 'manufacturerId', 'manufacturerName'),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/marketplace/microsites/submissions/:submissionId
// Returns: { submission: MicrositeSubmission, microsite: Microsite,
//            manufacturer: { id, businessName, city, gstin, bisLicence,
//                            status, categories, speciality },
//            featuredProducts: Product[], flags: MicrositeFlag[] }
// Errors: 404 submission_not_found
// Notes: featuredProducts are resolved from the catalogue at read time rather
//        than copied into the submission, so a piece that went private after it
//        was submitted shows as private HERE, in front of the reviewer, instead
//        of going live off a stale snapshot.
export function getMicrositeSubmission(submissionId) {
  const submission = submissionRecords.find((row) => row.id === submissionId);
  if (!submission) return mockError('submission_not_found', 'That submission no longer exists', 404);

  return mockRequest(() => {
    const manufacturer = manufacturerById[submission.manufacturerId];
    const featuredProducts = submission.featuredProductIds
      .map((id) => productById[id])
      .filter(Boolean);

    // Recomputed rather than read off the fixture, for the reason above: the
    // catalogue may have moved since the manufacturer submitted.
    const liveFlags = [
      ...submission.flags.filter((flag) => flag.code !== 'private_piece_featured'),
      ...featuredProducts
        .filter((product) => product.visibility !== 'public')
        .map((product) => ({
          code: 'private_piece_featured',
          entityId: product.id,
          detail: `${product.title} is a private catalogue piece and cannot appear on a public page.`,
        })),
      ...submission.flags.filter(
        (flag) =>
          flag.code === 'private_piece_featured' &&
          !featuredProducts.some((product) => product.id === flag.entityId),
      ),
    ];

    return {
      submission: { ...submission, flags: liveFlags },
      microsite: siteRecords.find((row) => row.id === submission.micrositeId) ?? micrositeById[submission.micrositeId],
      manufacturer: {
        id: manufacturer.id,
        businessName: manufacturer.businessName,
        legalName: manufacturer.legalName,
        city: manufacturer.city,
        gstin: manufacturer.gstin,
        bisLicence: manufacturer.bisLicence,
        status: manufacturer.status,
        categories: manufacturer.categories,
        speciality: manufacturer.speciality,
      },
      featuredProducts,
      flags: liveFlags,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/marketplace/microsites/submissions/:submissionId/review
// Body: { decision: 'approve'|'request_changes'|'reject'|'suspend',
//         reasons: string[], note: string }
//   reasons from: 'private_piece_featured'|'contact_bypass'
//                 |'unsubstantiated_claim'|'poor_imagery'|'incomplete_profile'
//                 |'trademark_misuse'
// Returns: { submission: MicrositeSubmission, microsite: Microsite }
// Errors: 404 submission_not_found, 409 submission_already_decided,
//         400 review_note_required, 400 review_reason_required,
//         409 private_piece_featured, 409 manufacturer_not_approved
// Notes: approving PUBLISHES the site, so the two blocking checks are enforced
//        here and not left to the screen. A private catalogue piece must never
//        reach a public surface, and a manufacturer who is not approved has no
//        public presence to publish.
//        Anything other than a clean approve needs a written note. A rejection
//        with no reason produces a manufacturer who cannot fix anything.
export function reviewMicrosite({ submissionId, decision, reasons = [], note = '' } = {}) {
  const submission = submissionRecords.find((row) => row.id === submissionId);
  if (!submission) return mockError('submission_not_found', 'That submission no longer exists', 404);
  if (!UNDECIDED_SUBMISSION_STATUSES.includes(submission.status)) {
    return mockError('submission_already_decided', 'That submission has already been decided', 409);
  }
  if (decision !== 'approve' && note.trim().length === 0) {
    return mockError('review_note_required', 'Say what the manufacturer needs to change');
  }
  if ((decision === 'reject' || decision === 'request_changes') && reasons.length === 0) {
    return mockError('review_reason_required', 'Choose at least one reason');
  }

  const manufacturer = manufacturerById[submission.manufacturerId];
  if (decision === 'approve') {
    if (manufacturer.status !== 'approved') {
      return mockError(
        'manufacturer_not_approved',
        `${manufacturer.businessName} is ${manufacturer.status} and cannot have a public page`,
        409,
      );
    }
    const leaked = submission.featuredProductIds
      .map((id) => productById[id])
      .filter((product) => product && product.visibility !== 'public');
    if (leaked.length > 0) {
      return mockError(
        'private_piece_featured',
        `${leaked[0].title} is private and would go public with this page`,
        409,
      );
    }
  }

  return mockRequest(() => {
    const at = nowIso();
    const nextSubmissionStatus = {
      approve: 'approved',
      request_changes: 'changes_requested',
      reject: 'rejected',
      suspend: 'rejected',
    }[decision];

    const decided = {
      ...submission,
      status: nextSubmissionStatus,
      decidedAt: at,
      reasons,
      reviewerNote: note.trim() || null,
      slaBreached: false,
    };
    submissionRecords = submissionRecords.map((row) => (row.id === submissionId ? decided : row));

    const nextSiteStatus = {
      approve: 'live',
      request_changes: 'changes_requested',
      reject: 'rejected',
      suspend: 'suspended',
    }[decision];

    const site = siteRecords.find((row) => row.id === submission.micrositeId);
    const nextSite = {
      ...site,
      status: nextSiteStatus,
      liveVersion: decision === 'approve' ? submission.version : site.liveVersion,
      firstPublishedAt: decision === 'approve' ? (site.firstPublishedAt ?? at) : site.firstPublishedAt,
      lastPublishedAt: decision === 'approve' ? at : site.lastPublishedAt,
      suspendedAt: decision === 'suspend' ? at : site.suspendedAt,
      suspensionReason: decision === 'suspend' ? note.trim() : site.suspensionReason,
    };
    siteRecords = siteRecords.map((row) => (row.id === nextSite.id ? nextSite : row));

    return { submission: decided, microsite: nextSite };
  });
}

// ---------------------------------------------------------------------------
// Search and demand insights - ADM-045
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/marketplace/demand/insights
// Query: { rangeDays }   default 30, maximum 90
// Returns: { summary: { totalSearches, zeroResultSearches, zeroResultRate,
//                       unmetValue, uniqueTerms, gapTerms, risingGapTerms,
//                       briefsRaised },
//            demandSeries: DemandPoint[], categoryGaps: CategoryGap[],
//            risingTerms: SearchTerm[], facets: { categories: Option[] },
//            refreshedAt: ISO }
// Notes: a zero-result search is demand the marketplace was handed and could
//        not serve, which is why it is the headline number rather than total
//        search volume.
//        unmetValue prices that demand at what a piece of the category
//        typically quotes at. It is an indication of the size of the gap, not
//        revenue that was lost - the jeweller may never have bought at all.
//        categoryGaps is ordered by gapScore desc: unanswered searches per live
//        listing. 300 unanswered searches against 40 listings is a relevance
//        problem; 300 against 2 is a supply gap, and only the second one is
//        fixed by signing a manufacturer.
export function getDemandInsights({ rangeDays = 30 } = {}) {
  return mockRequest(() => {
    const series = demandSeries.slice(-Math.min(rangeDays, 90));
    const zeroResultTerms = searchTermRecords.filter((row) => row.zeroResult);
    const totalSearches = series.reduce((total, point) => total + point.searches, 0);
    const zeroResultSearches = series.reduce((total, point) => total + point.zeroResultSearches, 0);

    return {
      summary: {
        totalSearches,
        zeroResultSearches,
        zeroResultRate: Number(((zeroResultSearches / Math.max(1, totalSearches)) * 100).toFixed(1)),
        unmetValue: zeroResultTerms.reduce((total, row) => total + row.unmetValue, 0),
        uniqueTerms: searchTermRecords.length,
        gapTerms: zeroResultTerms.length,
        risingGapTerms: zeroResultTerms.filter((row) => row.trend === 'rising').length,
        briefsRaised: searchTermRecords.filter((row) => row.sourcingRequestId).length,
      },
      demandSeries: series,
      categoryGaps,
      risingTerms: applySort(
        zeroResultTerms.filter((row) => row.trend === 'rising'),
        'searches30d',
        'desc',
      ).slice(0, 8),
      facets: { categories: facetOf(searchTermRecords, 'category', 'category') },
      refreshedAt: nowIso(),
    };
  });
}

// BACKEND CONTRACT
// GET /admin/marketplace/demand/search-terms
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { zeroResult: 'true'|'false', category, trend } }
// Returns: { items: SearchTerm[], total, page, pageSize }
// Notes: sorted by searches30d desc by default. zeroResult arrives as a string
//        because it is a URL filter value, and is compared as one.
export function listSearchTerms(query = {}) {
  const { zeroResult, ...restFilters } = query.filters ?? {};

  return mockRequest(() => {
    const scoped =
      zeroResult === undefined || zeroResult === ''
        ? searchTermRecords
        : searchTermRecords.filter((row) => String(row.zeroResult) === String(zeroResult));

    return queryCollection(scoped, {
      ...query,
      sortBy: query.sortBy ?? 'searches30d',
      sortDir: query.sortDir ?? 'desc',
      filters: restFilters,
      searchFields: ['term', 'category', 'topCity'],
    });
  });
}

// BACKEND CONTRACT
// POST /admin/marketplace/demand/search-terms/:termId/sourcing-request
// Body: { note: string, jewellerId: Jeweller.id|null }
// Returns: { searchTerm: SearchTerm, request: SourcingRequest }
// Errors: 404 search_term_not_found, 409 brief_already_raised,
//         409 term_not_a_gap
// Notes: this is the seam between the demand screen and the sourcing desk. A
//        term that already carries a brief cannot raise a second one, or the
//        desk routes the same requirement to the same workshops twice.
//        A term that returns results is not a supply gap, so it cannot become a
//        sourcing brief from here.
//        jewellerId is optional and normally absent: a brief raised off a
//        search gap stands for the aggregate demand of everyone who typed that
//        term, not for one jeweller's requirement. Consumers must handle a
//        SourcingRequest with a null jeweller.
export function raiseSourcingBrief({ termId, note = '', jewellerId } = {}) {
  const term = searchTermRecords.find((row) => row.id === termId);
  if (!term) return mockError('search_term_not_found', 'That search term no longer exists', 404);
  if (term.sourcingRequestId) {
    return mockError('brief_already_raised', `${term.sourcingRequestId} already covers this gap`, 409);
  }
  if (!term.zeroResult) {
    return mockError('term_not_a_gap', 'That search returns listings, so it is not a supply gap', 409);
  }

  return mockRequest(() => {
    const jeweller = jewellerId ? jewellerById[jewellerId] : null;
    const requestId = `SRC-${String(requestRecords.length + 1).padStart(3, '0')}`;
    const at = nowIso();

    const request = {
      id: requestId,
      jewellerId: jeweller?.id ?? null,
      jewellerName: jeweller?.businessName ?? null,
      jewellerCity: jeweller?.city ?? null,
      title: `${term.category} gap raised from search`,
      brief: note.trim() || `Jewellers searched for "${term.term}" ${term.searches30d} times in 30 days and found nothing.`,
      category: term.category,
      purity: term.purity,
      targetWeightGrams: null,
      quantity: 1,
      targetUnitBudget: null,
      indicativeUnitValue: null,
      indicativeTotalValue: null,
      neededBy: null,
      originSearchTermId: term.id,
      originSearchTerm: term.term,
      media: [],
      status: 'new',
      postedAt: at,
      routedAt: null,
      ageHours: 0,
      slaHours: 12,
      slaBreached: false,
      ownerId: null,
      ownerName: null,
      routedManufacturerIds: [],
      routedCount: 0,
      responseCount: 0,
      bestQuotedValue: null,
      matchedManufacturerId: null,
      matchedManufacturerName: null,
      closedAt: null,
      closeReason: null,
      closeNote: null,
    };

    requestRecords = [...requestRecords, request];
    const updatedTerm = { ...term, sourcingRequestId: requestId };
    searchTermRecords = searchTermRecords.map((row) => (row.id === termId ? updatedTerm : row));

    return { searchTerm: updatedTerm, request };
  });
}

// ---------------------------------------------------------------------------
// Sourcing desk - ADM-046, ADM-047
// ---------------------------------------------------------------------------

const OPEN_SOURCING_STATUSES = ['new', 'routed', 'responses_in'];

// BACKEND CONTRACT
// GET /admin/marketplace/sourcing/requests
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, ownerId, category, slaBreached } }
// Returns: { items: SourcingRequest[], total, page, pageSize }
// Notes: sorted by postedAt desc by default. slaBreached arrives as a string
//        because it is a URL filter value, and is compared as one.
export function listSourcingRequests(query = {}) {
  const { slaBreached, ...restFilters } = query.filters ?? {};

  return mockRequest(() => {
    const scoped =
      slaBreached === undefined || slaBreached === ''
        ? requestRecords
        : requestRecords.filter((row) => String(row.slaBreached) === String(slaBreached));

    return queryCollection(scoped, {
      ...query,
      sortBy: query.sortBy ?? 'postedAt',
      sortDir: query.sortDir ?? 'desc',
      filters: restFilters,
      searchFields: ['id', 'title', 'jewellerName', 'category', 'originSearchTerm'],
    });
  });
}

// BACKEND CONTRACT
// GET /admin/marketplace/sourcing/summary
// Returns: { open, unrouted, awaitingResponses, slaBreached, matchedThisMonth,
//            noMatchThisMonth, medianRouteHours, routeSlaHours,
//            responseSlaHours, facets: { owners: Option[],
//                                        categories: Option[] } }
// Notes: unrouted is the number that matters most. A brief nobody has sent to a
//        workshop yet is the desk's own backlog, not the trade's.
//        medianRouteHours measures posted to routed, which is the only part of
//        the cycle Elanzia controls.
export function getSourcingSummary() {
  return mockRequest(() => {
    const open = requestRecords.filter((row) => OPEN_SOURCING_STATUSES.includes(row.status));
    const routed = requestRecords.filter((row) => row.routedAt);
    const routeHours = routed
      .map((row) => Math.max(0, Math.round((Date.parse(row.routedAt) - Date.parse(row.postedAt)) / HOUR_MS)))
      .sort((a, b) => a - b);

    return {
      open: open.length,
      unrouted: requestRecords.filter((row) => row.status === 'new').length,
      awaitingResponses: requestRecords.filter((row) => row.status === 'routed').length,
      slaBreached: open.filter((row) => row.slaBreached).length,
      matchedThisMonth: requestRecords.filter((row) => row.status === 'matched').length,
      noMatchThisMonth: requestRecords.filter((row) => row.status === 'no_match').length,
      medianRouteHours: routeHours.length === 0 ? null : routeHours[Math.floor(routeHours.length / 2)],
      routeSlaHours: 12,
      responseSlaHours: 72,
      facets: {
        owners: facetOf(requestRecords, 'ownerId', 'ownerName'),
        categories: facetOf(requestRecords, 'category', 'category'),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/marketplace/sourcing/requests/:requestId
// Returns: { request: SourcingRequest, responses: SourcingResponse[],
//            suggestedManufacturers: Suggestion[],
//            jeweller: { id, businessName, contactName, city, phone, email,
//                        creditLimit, paymentTermsDays } | null }
// Errors: 404 sourcing_request_not_found
// Notes: responses are ordered quoted-first and cheapest-first, with declines
//        and silences after them. A desk comparing three quotes should not have
//        to scroll past four workshops that never replied.
//        suggestedManufacturers excludes anyone already routed, and applies the
//        same capability rule the route endpoint enforces. A desk that can be
//        shown someone it cannot route to is broken.
export function getSourcingRequest(requestId) {
  const request = requestRecords.find((row) => row.id === requestId);
  if (!request) return mockError('sourcing_request_not_found', 'That sourcing brief no longer exists', 404);

  return mockRequest(() => {
    const responses = responseRecords
      .filter((row) => row.requestId === requestId)
      .sort((left, right) => {
        if (left.canMake !== right.canMake) return left.canMake ? -1 : 1;
        if (left.canMake) return left.quotedTotal - right.quotedTotal;
        return String(left.status).localeCompare(String(right.status));
      });

    const jeweller = request.jewellerId ? jewellerById[request.jewellerId] : null;

    return {
      request,
      responses,
      suggestedManufacturers: capableManufacturers(request.category, request.purity).filter(
        (row) => !request.routedManufacturerIds.includes(row.manufacturerId),
      ),
      // Null on a brief raised off a search gap - see raiseSourcingBrief.
      jeweller: jeweller
        ? {
            id: jeweller.id,
            businessName: jeweller.businessName,
            contactName: jeweller.contactName,
            city: jeweller.city,
            phone: jeweller.phone,
            email: jeweller.email,
            creditLimit: jeweller.creditLimit,
            paymentTermsDays: jeweller.paymentTermsDays,
          }
        : null,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/marketplace/sourcing/requests/:requestId/route
// Body: { manufacturerIds: Manufacturer.id[], briefNote: string }
// Returns: { request: SourcingRequest, responses: SourcingResponse[] }
// Errors: 404 sourcing_request_not_found, 400 no_manufacturers_selected,
//         409 manufacturer_not_approved, 409 request_closed,
//         409 manufacturer_already_routed
// Notes: routing to a manufacturer who is not approved would put an unverified
//        workshop in front of a jeweller with Elanzia's name on the
//        introduction, so it is refused here rather than warned about.
//        Routing is additive. A second round goes to new workshops and leaves
//        the first round's responses untouched.
export function routeSourcingRequest({ requestId, manufacturerIds = [], briefNote = '' } = {}) {
  const request = requestRecords.find((row) => row.id === requestId);
  if (!request) return mockError('sourcing_request_not_found', 'That sourcing brief no longer exists', 404);
  if (manufacturerIds.length === 0) {
    return mockError('no_manufacturers_selected', 'Choose at least one manufacturer to route this to');
  }
  if (!OPEN_SOURCING_STATUSES.includes(request.status)) {
    return mockError('request_closed', 'That brief is closed and cannot be routed again', 409);
  }

  const unapproved = manufacturerIds.find((id) => manufacturerById[id]?.status !== 'approved');
  if (unapproved) {
    return mockError(
      'manufacturer_not_approved',
      `${manufacturerById[unapproved]?.businessName ?? unapproved} is not an approved manufacturer`,
      409,
    );
  }

  const duplicate = manufacturerIds.find((id) => request.routedManufacturerIds.includes(id));
  if (duplicate) {
    return mockError(
      'manufacturer_already_routed',
      `${manufacturerById[duplicate].businessName} already has this brief`,
      409,
    );
  }

  return mockRequest(() => {
    const at = nowIso();
    const added = manufacturerIds.map((manufacturerId, index) => {
      const manufacturer = manufacturerById[manufacturerId];
      return {
        id: `SRR-${requestId.slice(4)}-N${request.routedCount + index + 1}`,
        requestId,
        manufacturerId,
        manufacturerName: manufacturer.businessName,
        city: manufacturer.city,
        routedAt: at,
        respondedAt: null,
        status: 'no_response',
        canMake: false,
        declineReason: null,
        leadTimeDays: null,
        minOrderQuantity: null,
        price: null,
        quotedUnitPrice: null,
        quotedTotal: null,
        shortlisted: false,
        notes: briefNote.trim() || null,
      };
    });

    const routedIds = [...request.routedManufacturerIds, ...manufacturerIds];
    const updated = {
      ...request,
      status: request.status === 'new' ? 'routed' : request.status,
      routedAt: request.routedAt ?? at,
      routedManufacturerIds: routedIds,
      routedCount: routedIds.length,
      slaHours: 72,
      slaBreached: false,
    };

    requestRecords = requestRecords.map((row) => (row.id === requestId ? updated : row));
    responseRecords = [...responseRecords, ...added];

    return { request: updated, responses: responseRecords.filter((row) => row.requestId === requestId) };
  });
}

// BACKEND CONTRACT
// POST /admin/marketplace/sourcing/requests/:requestId/responses/:responseId/shortlist
// Body: { shortlisted: boolean }
// Returns: SourcingResponse
// Errors: 404 sourcing_response_not_found, 409 response_not_quoted
// Notes: only a workshop that said it can make the piece and gave a price can
//        be shortlisted. Shortlisting a decline is meaningless, and it is what
//        a mis-click looks like.
export function shortlistSourcingResponse({ responseId, shortlisted = true } = {}) {
  const response = responseRecords.find((row) => row.id === responseId);
  if (!response) return mockError('sourcing_response_not_found', 'That response no longer exists', 404);
  if (shortlisted && !response.canMake) {
    return mockError('response_not_quoted', 'That workshop has not quoted for this brief', 409);
  }

  return mockRequest(() => {
    const updated = { ...response, shortlisted };
    responseRecords = responseRecords.map((row) => (row.id === responseId ? updated : row));
    return updated;
  });
}

// BACKEND CONTRACT
// POST /admin/marketplace/sourcing/requests/:requestId/outcome
// Body: { outcome: 'matched'|'no_match', manufacturerId: Manufacturer.id|null,
//         note: string }
// Returns: SourcingRequest
// Errors: 404 sourcing_request_not_found, 409 request_closed,
//         400 manufacturer_required, 409 manufacturer_did_not_quote,
//         400 close_note_required
// Notes: a match must name a workshop that actually quoted. Recording a match
//        against someone who never replied leaves the jeweller waiting on an
//        introduction that was never made.
//        no_match must carry a note. It is the record of what the desk tried,
//        and the next brief for the same thing is worked from it.
export function recordSourcingOutcome({ requestId, outcome, manufacturerId = null, note = '' } = {}) {
  const request = requestRecords.find((row) => row.id === requestId);
  if (!request) return mockError('sourcing_request_not_found', 'That sourcing brief no longer exists', 404);
  if (!OPEN_SOURCING_STATUSES.includes(request.status)) {
    return mockError('request_closed', 'That brief has already been closed', 409);
  }

  if (outcome === 'matched') {
    if (!manufacturerId) return mockError('manufacturer_required', 'Choose the workshop the jeweller was matched to');
    const quoted = responseRecords.find(
      (row) => row.requestId === requestId && row.manufacturerId === manufacturerId && row.canMake,
    );
    if (!quoted) {
      return mockError(
        'manufacturer_did_not_quote',
        `${manufacturerById[manufacturerId]?.businessName ?? manufacturerId} has not quoted for this brief`,
        409,
      );
    }
  } else if (note.trim().length === 0) {
    return mockError('close_note_required', 'Say what was tried before closing this as no match');
  }

  return mockRequest(() => {
    const updated = {
      ...request,
      status: outcome,
      closedAt: nowIso(),
      closeReason: outcome === 'matched' ? 'matched_to_manufacturer' : 'no_manufacturer_capable',
      closeNote: note.trim() || null,
      matchedManufacturerId: outcome === 'matched' ? manufacturerId : null,
      matchedManufacturerName: outcome === 'matched' ? manufacturerById[manufacturerId].businessName : null,
      slaBreached: false,
    };
    requestRecords = requestRecords.map((row) => (row.id === requestId ? updated : row));
    return updated;
  });
}
