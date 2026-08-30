// Mock API for Onboarding - ADM-013 to ADM-016.
//
// ENTITY SHAPES referenced by the contracts below:
//
// ApplicationRow: { id, businessName, legalName, contactName, email, phone,
//                   city, state, pincode, gstin, pan,
//                   status: 'applied'|'under_review'|'info_requested'
//                           |'approved'|'rejected'|'suspended',
//                   submittedAt, ageHours, slaBreached,
//                   reviewerId, reviewerName, documentCount,
//                   failedCheckCount, blockedCheckCount, pendingCheckCount,
//                   rejectionReason, suspensionReason }
//   Manufacturer rows add: bisLicence, categories[], speciality
//   Jeweller rows add:     shopType, invitedByManufacturerId, acquisitionMode,
//                          creditLimit, paymentTermsDays
//
// ApplicationDetail: ApplicationRow + { checks: Check[], documents: Document[],
//                                       timeline: TimelineEntry[] }
//
// Check: { code, state: 'pass'|'fail'|'pending', detail, blocking: boolean }
//   code: 'gstin_format' | 'gstin_state' | 'pan_embedded' | 'bis_register'
//       | 'duplicate_gstin' | 'bank_penny_drop' | 'factory_address'
//       | 'shop_establishment' | 'referral'
//
// Document: { id, applicationId, kind, type: 'image'|'document'|'video',
//             label, url: string|null, pageCount, sizeBytes,
//             state: 'received'|'missing', uploadedAt }
//
// TimelineEntry: { id, at, kind: 'submitted'|'assigned'|'info_requested'
//                                |'decision', actorId, actorName, summary }
//
// ApplicationCounts: { pending, applied, underReview, infoRequested,
//                      approved, rejected, suspended, slaBreached }

import { MockApiError, mockRequest, queryCollection } from './_client';
import { jewellers, manufacturers } from '@/data/core';
import {
  jewellerApplicationById,
  manufacturerApplicationById,
  PENDING_STATUSES,
} from '@/data/onboardingFixtures';

function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

function nowIso() {
  return new Date().toISOString();
}

// Decisions mutate these in place for the life of the session, the way the
// real endpoints will mutate rows in a database. Nothing else may write here.
let manufacturerRecords = [...manufacturers];
let jewellerRecords = [...jewellers];

// The queue row a screen sorts and filters on. The member row and the
// verification record are joined here rather than in a screen, because the
// backend will return them already joined.
function toManufacturerRow(manufacturer) {
  const application = manufacturerApplicationById[manufacturer.id];

  return {
    id: manufacturer.id,
    businessName: manufacturer.businessName,
    legalName: manufacturer.legalName,
    contactName: manufacturer.contactName,
    email: manufacturer.email,
    phone: manufacturer.phone,
    city: manufacturer.city,
    state: manufacturer.state,
    pincode: manufacturer.pincode,
    gstin: manufacturer.gstin,
    pan: manufacturer.pan,
    bisLicence: manufacturer.bisLicence,
    categories: manufacturer.categories,
    speciality: manufacturer.speciality,
    status: manufacturer.status,
    rejectionReason: manufacturer.rejectionReason,
    suspensionReason: manufacturer.suspensionReason,
    submittedAt: application.submittedAt,
    ageHours: application.ageHours,
    slaBreached: application.slaBreached && PENDING_STATUSES.includes(manufacturer.status),
    reviewerId: application.reviewerId,
    reviewerName: application.reviewerName,
    documentCount: application.documentCount,
    failedCheckCount: application.failedCheckCount,
    blockedCheckCount: application.blockedCheckCount,
    pendingCheckCount: application.pendingCheckCount,
  };
}

function toJewellerRow(jeweller) {
  const application = jewellerApplicationById[jeweller.id];

  return {
    id: jeweller.id,
    businessName: jeweller.businessName,
    contactName: jeweller.contactName,
    email: jeweller.email,
    phone: jeweller.phone,
    city: jeweller.city,
    state: jeweller.state,
    pincode: jeweller.pincode,
    gstin: jeweller.gstin,
    // A jeweller registers with a GSTIN and no separate PAN card. The PAN is
    // the ten characters inside the GSTIN, which is where it comes from on a
    // real registration too.
    pan: jeweller.gstin.slice(2, 12),
    shopType: jeweller.shopType,
    invitedByManufacturerId: jeweller.invitedByManufacturerId,
    acquisitionMode: jeweller.acquisitionMode,
    creditLimit: jeweller.creditLimit,
    paymentTermsDays: jeweller.paymentTermsDays,
    status: jeweller.status,
    rejectionReason: jeweller.rejectionReason,
    suspensionReason: jeweller.suspensionReason,
    submittedAt: application.submittedAt,
    ageHours: application.ageHours,
    slaBreached: application.slaBreached && PENDING_STATUSES.includes(jeweller.status),
    reviewerId: application.reviewerId,
    reviewerName: application.reviewerName,
    documentCount: application.documentCount,
    failedCheckCount: application.failedCheckCount,
    blockedCheckCount: application.blockedCheckCount,
    pendingCheckCount: application.pendingCheckCount,
  };
}

// 'pending' is the tab a reviewer lives in, and it is three statuses rather
// than one. Expanding it here keeps the screens from knowing that.
function applyQueue(rows, queue) {
  if (queue === 'pending') return rows.filter((row) => PENDING_STATUSES.includes(row.status));
  if (queue === 'breached') return rows.filter((row) => row.slaBreached);
  return rows;
}

function countsFor(rows) {
  return {
    pending: rows.filter((row) => PENDING_STATUSES.includes(row.status)).length,
    applied: rows.filter((row) => row.status === 'applied').length,
    underReview: rows.filter((row) => row.status === 'under_review').length,
    infoRequested: rows.filter((row) => row.status === 'info_requested').length,
    approved: rows.filter((row) => row.status === 'approved').length,
    rejected: rows.filter((row) => row.status === 'rejected').length,
    suspended: rows.filter((row) => row.status === 'suspended').length,
    slaBreached: rows.filter((row) => row.slaBreached).length,
    total: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

const DECISION_STATUS = {
  approve: 'approved',
  request_info: 'info_requested',
  reject: 'rejected',
};

// The decision is refused rather than warned about when a blocking check has
// failed. A business admitted on an unmatched BIS licence can list hallmarked
// gold it is not registered to sell, and that is Elanzia's problem, not theirs.
function blockingFailures(checks) {
  return checks.filter((check) => check.blocking && check.state === 'fail');
}

function decide({ record, application, decision, reason, updateStatus }) {
  if (!DECISION_STATUS[decision]) {
    return mockError('unknown_decision', 'That is not a decision this queue takes', 422);
  }
  if (!PENDING_STATUSES.includes(record.status)) {
    return mockError(
      'application_already_decided',
      `${record.businessName} was already ${record.status.replace(/_/g, ' ')}`,
      409,
    );
  }
  // Rejecting or sending an application back without a written reason produces
  // an applicant who cannot fix anything.
  if (decision !== 'approve' && !String(reason ?? '').trim()) {
    return mockError('decision_reason_required', 'Say what the applicant has to fix', 422);
  }

  if (decision === 'approve') {
    const blocked = blockingFailures(application.checks);
    if (blocked.length > 0) {
      return mockError(
        'blocking_check_failed',
        `${blocked.length} verification check${blocked.length === 1 ? '' : 's'} must pass before this application can be approved`,
        422,
      );
    }
    const missing = application.documents.filter((document) => document.state === 'missing');
    if (missing.length > 0) {
      return mockError(
        'documents_missing',
        `${missing.map((document) => document.label).join(', ')} has not been supplied`,
        422,
      );
    }
  }

  return mockRequest(updateStatus(DECISION_STATUS[decision], String(reason ?? '').trim()));
}

// ---------------------------------------------------------------------------
// Manufacturer applications - ADM-013, ADM-014
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/onboarding/manufacturers/applications
// Query: { queue: 'pending'|'breached'|'all', status, city, search,
//          page, pageSize, sortBy, sortDir }
// Returns: { items: ApplicationRow[], total, page, pageSize }
// Notes: `queue` is applied before `status`, so the pending tab with no status
//        filter returns applied, under_review and info_requested together.
//        Sorted oldest first by default - a verification queue is worked from
//        the top of the ageing list, not the bottom.
export function listManufacturerApplications({
  search,
  filters = {},
  page,
  pageSize,
  sortBy = 'submittedAt',
  sortDir = 'asc',
} = {}) {
  const { queue = 'pending', ...rest } = filters;

  return mockRequest(() => {
    const rows = applyQueue(manufacturerRecords.map(toManufacturerRow), queue);

    return queryCollection(rows, {
      search,
      searchFields: ['id', 'businessName', 'legalName', 'contactName', 'email', 'gstin', 'pan', 'city'],
      filters: rest,
      sortBy,
      sortDir,
      page,
      pageSize,
    });
  });
}

// BACKEND CONTRACT
// GET /admin/onboarding/manufacturers/applications/counts
// Returns: ApplicationCounts
// Notes: counted across every application, not the current page, so the tab
//        counts do not change as somebody pages through.
export function getManufacturerApplicationCounts() {
  return mockRequest(() => countsFor(manufacturerRecords.map(toManufacturerRow)));
}

// BACKEND CONTRACT
// GET /admin/onboarding/manufacturers/applications/:id
// Returns: ApplicationDetail
// Errors: 404 application_not_found
export function getManufacturerApplication(id) {
  const manufacturer = manufacturerRecords.find((row) => row.id === id);
  if (!manufacturer) {
    return mockError('application_not_found', 'That application no longer exists', 404);
  }
  const application = manufacturerApplicationById[id];

  return mockRequest(() => ({
    ...toManufacturerRow(manufacturer),
    checks: application.checks,
    documents: application.documents,
    timeline: application.timeline,
  }));
}

// BACKEND CONTRACT
// POST /admin/onboarding/manufacturers/applications/:id/decision
// Body: { decision: 'approve'|'request_info'|'reject', reason }
// Returns: ApplicationRow
// Errors: 404 application_not_found, 409 application_already_decided,
//         422 unknown_decision, 422 decision_reason_required,
//         422 blocking_check_failed, 422 documents_missing
// Notes: an approve is refused while any blocking check fails or any document
//        is missing. Hallmarked gold cannot legally be sold without a BIS
//        registration, so admitting a manufacturer whose licence is not on the
//        BIS register puts Elanzia on the hook, not the manufacturer.
export function decideManufacturerApplication({ id, decision, reason } = {}) {
  const manufacturer = manufacturerRecords.find((row) => row.id === id);
  if (!manufacturer) {
    return mockError('application_not_found', 'That application no longer exists', 404);
  }

  return decide({
    record: manufacturer,
    application: manufacturerApplicationById[id],
    decision,
    reason,
    updateStatus(status, note) {
      const updated = {
        ...manufacturer,
        status,
        approvedAt: status === 'approved' ? nowIso() : manufacturer.approvedAt,
        rejectionReason: status === 'rejected' ? note : null,
      };
      manufacturerRecords = manufacturerRecords.map((row) => (row.id === id ? updated : row));
      return toManufacturerRow(updated);
    },
  });
}

// ---------------------------------------------------------------------------
// Jeweller applications - ADM-015, ADM-016
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/onboarding/jewellers/applications
// Query: { queue: 'pending'|'breached'|'all', status, city, acquisitionMode,
//          search, page, pageSize, sortBy, sortDir }
// Returns: { items: ApplicationRow[], total, page, pageSize }
// Notes: same queue semantics as the manufacturer list above.
export function listJewellerApplications({
  search,
  filters = {},
  page,
  pageSize,
  sortBy = 'submittedAt',
  sortDir = 'asc',
} = {}) {
  const { queue = 'pending', ...rest } = filters;

  return mockRequest(() => {
    const rows = applyQueue(jewellerRecords.map(toJewellerRow), queue);

    return queryCollection(rows, {
      search,
      searchFields: ['id', 'businessName', 'contactName', 'email', 'gstin', 'city'],
      filters: rest,
      sortBy,
      sortDir,
      page,
      pageSize,
    });
  });
}

// BACKEND CONTRACT
// GET /admin/onboarding/jewellers/applications/counts
// Returns: ApplicationCounts
export function getJewellerApplicationCounts() {
  return mockRequest(() => countsFor(jewellerRecords.map(toJewellerRow)));
}

// BACKEND CONTRACT
// GET /admin/onboarding/jewellers/applications/:id
// Returns: ApplicationDetail
// Errors: 404 application_not_found
export function getJewellerApplication(id) {
  const jeweller = jewellerRecords.find((row) => row.id === id);
  if (!jeweller) {
    return mockError('application_not_found', 'That application no longer exists', 404);
  }
  const application = jewellerApplicationById[id];

  return mockRequest(() => ({
    ...toJewellerRow(jeweller),
    checks: application.checks,
    documents: application.documents,
    timeline: application.timeline,
  }));
}

// BACKEND CONTRACT
// POST /admin/onboarding/jewellers/applications/:id/decision
// Body: { decision: 'approve'|'request_info'|'reject', reason }
// Returns: ApplicationRow
// Errors: 404 application_not_found, 409 application_already_decided,
//         422 unknown_decision, 422 decision_reason_required,
//         422 blocking_check_failed, 422 documents_missing
// Notes: approving sets kycVerifiedAt. A jeweller with no KYC date has never
//        been verified, whatever their status says.
export function decideJewellerApplication({ id, decision, reason } = {}) {
  const jeweller = jewellerRecords.find((row) => row.id === id);
  if (!jeweller) {
    return mockError('application_not_found', 'That application no longer exists', 404);
  }

  return decide({
    record: jeweller,
    application: jewellerApplicationById[id],
    decision,
    reason,
    updateStatus(status, note) {
      const updated = {
        ...jeweller,
        status,
        kycVerifiedAt: status === 'approved' ? nowIso() : jeweller.kycVerifiedAt,
        rejectionReason: status === 'rejected' ? note : null,
      };
      jewellerRecords = jewellerRecords.map((row) => (row.id === id ? updated : row));
      return toJewellerRow(updated);
    },
  });
}
