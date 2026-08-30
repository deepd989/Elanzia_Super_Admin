// Mock API for Trust and issue resolution - ADM-065 to ADM-067, ADM-070,
// ADM-071.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Dispute: { id, orderId, returnId: string|null, type, typeLabel, subject,
//            detail, severity: 'medium'|'high'|'critical',
//            raisedByParty: 'jeweller'|'manufacturer'|'elanzia',
//            raisedById, raisedByName, againstParty, jewellerId, jewellerName,
//            manufacturerId, manufacturerName, raisedAt, ageHours, slaDueAt,
//            slaBreached, status: 'open'|'awaiting_evidence'|'under_review'
//            |'resolved'|'closed', assigneeId, assigneeName, claimValue,
//            evidenceCount, messageCount, resolutionId, autoRaised }
//   `autoRaised` is true when the platform opened it off a failed weigh-in
//   rather than a person reporting it.
//
// DisputeEvidence: { id, disputeId, kind: 'packing_video'|'unboxing_video'
//                    |'photo'|'assay_report'|'weighbridge_slip'|'invoice',
//                    type: 'video'|'image'|'document', label, url,
//                    uploadedByParty, uploadedAt, durationSeconds, sizeBytes }
//
// DisputeMessage: { id, disputeId, at, authorParty, authorId, authorName,
//                   body, internal: boolean, attachmentCount }
//   `internal` messages are visible to Elanzia only. Both parties see the rest.
//
// ResolutionOutcome: { id, label, description, liableParty: 'manufacturer'
//                      |'jeweller'|'carrier'|'elanzia', refundsJeweller,
//                      issuesCredit, issuesReplacement, recoversFromManufacturer,
//                      reversesCommission, opensInsuranceClaim, requiresAmount }
//
// Resolution: { id, disputeId, orderId, outcome, outcomeLabel, liableParty,
//               refundAmount, creditAmount, commissionReversed,
//               manufacturerRecovery, elanziaAbsorbs, note, recordedAt,
//               recordedBy, recordedByName, notifiedParties }
//   The money always balances: refund + credit = manufacturerRecovery +
//   elanziaAbsorbs.
//
// Certificate: { id, kind: 'bis_hallmark'|'huid'|'igi'|'gia', kindLabel,
//                issuer, productId, sku, productTitle, productStatus,
//                manufacturerId, manufacturerName, number: string|null,
//                issuedAt, expiresAt, declaredPurity, certifiedPurity,
//                state: 'valid'|'flagged'|'missing'|'expired'|'duplicate',
//                flagReason, flagDetail, severity, flaggedAt, flaggedBy,
//                verifiedAt }
//
// Review: { id, targetType: 'product'|'manufacturer', targetId, targetName,
//           manufacturerId, manufacturerName, orderId, jewellerId,
//           jewellerName, verifiedPurchase, rating, title, body, submittedAt,
//           ageHours, state: 'published'|'pending'|'held'|'removed',
//           flagCount, flagReasons, moderatedAt, moderatedBy,
//           moderationReason, linkedDisputeId }

import { MockApiError, mockRequest, queryCollection } from './_client';
import { adminUsers, jewellerById, manufacturerById, orderById, productById } from '@/data/core';
import {
  DISPUTE_SLA_HOURS,
  certificates,
  disputeEvidence,
  disputeMessages,
  disputes,
  resolutionOutcomes,
  resolutions,
  reviews,
} from '@/data/trustFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies.
// ---------------------------------------------------------------------------

let disputeRecords = disputes.map((row) => ({ ...row }));
let evidenceRecords = disputeEvidence.map((row) => ({ ...row }));
let messageRecords = disputeMessages.map((row) => ({ ...row }));
let resolutionRecords = resolutions.map((row) => ({ ...row }));
let certificateRecords = certificates.map((row) => ({ ...row }));
let reviewRecords = reviews.map((row) => ({ ...row }));

let actingAdminId = 'STF-007';

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
export function setActingAdmin(adminId) {
  if (adminId) actingAdminId = adminId;
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

const nowIso = () => new Date().toISOString();
const pad = (n, w) => String(n).padStart(w, '0');
const adminName = (id) => adminUsers.find((user) => user.id === id)?.name ?? null;
// Redux freezes whatever it stores. These rows are this module's own mutable
// records, so handing out the live objects would freeze them and make the next
// mutation throw. Every list endpoint returns copies instead.
function queryRows(rows, options) {
  const result = queryCollection(rows, options);
  return { ...result, items: result.items.map((row) => ({ ...row })) };
}

const countBy = (rows, key) =>
  rows.reduce((map, row) => ({ ...map, [row[key]]: (map[row[key]] ?? 0) + 1 }), {});

// ---------------------------------------------------------------------------
// The seam with Logistics.
//
// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// This is called from logisticsApi.verifyReturn when a weigh-in comes up short
// beyond tolerance. On the real backend the two live in one service and the
// return verification writes the dispute in the same transaction; the endpoint
// a client sees is POST /admin/returns/:id/verify, which already documents
// that it returns the dispute it opened.
// ---------------------------------------------------------------------------
export function createDisputeFromReturn(returnRecord, weighIn, raisedByAdminId) {
  const created = {
    id: `DSP-${pad(9000 + disputeRecords.length, 4)}`,
    orderId: returnRecord.orderId,
    returnId: returnRecord.id,
    type: 'weight_shortfall',
    typeLabel: 'Weight short on return',
    subject: `${weighIn.shortfallGrams}g short on ${returnRecord.sku}`,
    detail:
      `The piece left at ${weighIn.declaredNetWeight}g and was weighed back in at ` +
      `${weighIn.receivedNetWeight}g. That is beyond the ${weighIn.toleranceGrams}g tolerance, ` +
      `so the refund is held until this is settled.`,
    severity: 'critical',
    raisedByParty: 'elanzia',
    raisedById: raisedByAdminId,
    raisedByName: adminName(raisedByAdminId) ?? 'Automatic weigh-in check',
    againstParty: 'jeweller',
    jewellerId: returnRecord.jewellerId,
    jewellerName: returnRecord.jewellerName,
    manufacturerId: returnRecord.manufacturerId,
    manufacturerName: returnRecord.manufacturerName,
    raisedAt: nowIso(),
    ageHours: 0,
    slaDueAt: new Date(Date.now() + DISPUTE_SLA_HOURS * 3600000).toISOString(),
    slaBreached: false,
    status: 'open',
    assigneeId: null,
    assigneeName: null,
    claimValue: weighIn.shortfallValue,
    evidenceCount: 0,
    messageCount: 0,
    resolutionId: null,
    autoRaised: true,
  };

  disputeRecords = [created, ...disputeRecords];
  return { ...created };
}

// ---------------------------------------------------------------------------
// Dispute console - ADM-065
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/trust/disputes
// Query: { search, status, type, severity, assigneeId, slaBreached,
//          page, pageSize, sortBy, sortDir }
// Returns: { items: Dispute[], total, page, pageSize }
// Notes: sorted oldest first by default. A dispute is money held between two
//        members, so the queue is worked from the top.
export function listDisputes({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const rows = filters.slaBreached
    ? disputeRecords.filter((row) => row.slaBreached)
    : disputeRecords;

  return mockRequest(() =>
    queryRows(rows, {
      search,
      searchFields: ['id', 'orderId', 'subject', 'jewellerName', 'manufacturerName'],
      filters: {
        status: filters.status,
        type: filters.type,
        severity: filters.severity,
        assigneeId: filters.assigneeId,
      },
      sortBy: sortBy ?? 'raisedAt',
      sortDir: sortDir ?? 'asc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/trust/disputes/counts
// Returns: { byStatus, byType, bySeverity, unassigned, slaBreached,
//            autoRaised, valueAtStake }
// Notes: valueAtStake is the total claim value of everything not yet resolved,
//        which is the number that says how much of the platform's word is
//        currently in question.
export function getDisputeCounts() {
  const open = disputeRecords.filter((row) => !['resolved', 'closed'].includes(row.status));

  return mockRequest(() => ({
    byStatus: countBy(disputeRecords, 'status'),
    byType: countBy(disputeRecords, 'type'),
    bySeverity: countBy(disputeRecords, 'severity'),
    unassigned: open.filter((row) => !row.assigneeId).length,
    slaBreached: open.filter((row) => row.slaBreached).length,
    autoRaised: open.filter((row) => row.autoRaised).length,
    valueAtStake: open.reduce((sum, row) => sum + row.claimValue, 0),
  }));
}

// BACKEND CONTRACT
// GET /admin/trust/disputes/:id
// Returns: { dispute, order, parties: { jeweller, manufacturer }, evidence,
//            messages, timeline, linkedReturn }
// Errors: 404 dispute_not_found
// Notes: everything a reviewer needs in one response - packing video, unboxing
//        video, photos, documents and the full message history - because
//        deciding who pays should not mean opening four tabs. Messages are
//        oldest first. `linkedReturn` is set when the dispute came out of a
//        failed weigh-in rather than somebody reporting it.
export function getDispute(id) {
  const dispute = disputeRecords.find((row) => row.id === id);
  if (!dispute) return mockError('dispute_not_found', 'That dispute does not exist', 404);

  const order = orderById[dispute.orderId] ?? null;
  const messages = messageRecords
    .filter((row) => row.disputeId === id)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return mockRequest(() => ({
    dispute: { ...dispute },
    order,
    parties: {
      jeweller: jewellerById[dispute.jewellerId] ?? null,
      manufacturer: manufacturerById[dispute.manufacturerId] ?? null,
    },
    evidence: evidenceRecords.filter((row) => row.disputeId === id),
    messages,
    timeline: [
      { at: dispute.raisedAt, label: 'Dispute raised', actor: dispute.raisedByName },
      ...(dispute.assigneeName
        ? [{ at: dispute.raisedAt, label: 'Assigned', actor: dispute.assigneeName }]
        : []),
      ...(dispute.resolutionId
        ? [{
            at: resolutionRecords.find((row) => row.id === dispute.resolutionId)?.recordedAt,
            label: 'Resolution recorded',
            actor: resolutionRecords.find((row) => row.id === dispute.resolutionId)?.recordedByName,
          }]
        : []),
    ],
    linkedReturn: dispute.returnId,
  }));
}

// BACKEND CONTRACT
// POST /admin/trust/disputes/assign
// Body: { disputeIds: string[], adminId }
// Returns: { updated: number }
// Errors: 404 admin_not_found, 422 no_selection
export function assignDispute({ disputeIds = [], adminId }) {
  if (disputeIds.length === 0) return mockError('no_selection', 'Select at least one dispute', 422);

  const admin = adminUsers.find((user) => user.id === adminId);
  if (!admin || admin.status !== 'active') {
    return mockError('admin_not_found', 'That account cannot be assigned work', 404);
  }

  let updated = 0;
  disputeRecords.forEach((row) => {
    if (disputeIds.includes(row.id)) {
      row.assigneeId = admin.id;
      row.assigneeName = admin.name;
      updated += 1;
    }
  });
  return mockRequest({ updated });
}

// BACKEND CONTRACT
// POST /admin/trust/disputes/:id/notes
// Body: { note, internal }
// Returns: DisputeMessage
// Errors: 404 dispute_not_found, 422 note_required, 409 already_resolved
// Notes: an internal note is visible to Elanzia only. A note to the parties is
//        part of the record they can both read, so the flag is explicit rather
//        than inferred from who wrote it.
export function addDisputeNote({ id, note, internal = true }) {
  const dispute = disputeRecords.find((row) => row.id === id);
  if (!dispute) return mockError('dispute_not_found', 'That dispute does not exist', 404);
  if (['resolved', 'closed'].includes(dispute.status)) {
    return mockError('already_resolved', 'That dispute is closed', 409);
  }
  if (!String(note ?? '').trim()) return mockError('note_required', 'Write something first', 422);

  const created = {
    id: `${id}-M${messageRecords.filter((row) => row.disputeId === id).length + 1}`,
    disputeId: id,
    at: nowIso(),
    authorParty: 'elanzia',
    authorId: actingAdminId,
    authorName: adminName(actingAdminId),
    body: note,
    internal,
    attachmentCount: 0,
  };

  messageRecords = [...messageRecords, created];
  dispute.messageCount += 1;
  return mockRequest({ ...created });
}

// BACKEND CONTRACT
// POST /admin/trust/disputes/:id/request-evidence
// Body: { fromParty, items: string[], note }
// Returns: Dispute with status 'awaiting_evidence'
// Errors: 404 dispute_not_found, 422 items_required, 409 already_resolved
// Notes: asking for evidence pauses the SLA clock, because the delay is now
//        the member's rather than the desk's.
export function requestEvidence({ id, fromParty, items = [], note }) {
  const dispute = disputeRecords.find((row) => row.id === id);
  if (!dispute) return mockError('dispute_not_found', 'That dispute does not exist', 404);
  if (['resolved', 'closed'].includes(dispute.status)) {
    return mockError('already_resolved', 'That dispute is closed', 409);
  }
  if (items.length === 0) return mockError('items_required', 'Say what you need', 422);

  Object.assign(dispute, {
    status: 'awaiting_evidence',
    awaitingFrom: fromParty,
    requestedItems: items,
    slaBreached: false,
  });
  return mockRequest({ ...dispute });
}

// BACKEND CONTRACT
// POST /admin/trust/disputes/:id/reopen
// Body: { reason }
// Returns: Dispute with status 'under_review'
// Errors: 404 dispute_not_found, 409 not_resolved, 422 reason_required
// Notes: the resolution stays on the record. Reopening adds to the history, it
//        does not erase what was decided the first time.
export function reopenDispute({ id, reason }) {
  const dispute = disputeRecords.find((row) => row.id === id);
  if (!dispute) return mockError('dispute_not_found', 'That dispute does not exist', 404);
  if (!['resolved', 'closed'].includes(dispute.status)) {
    return mockError('not_resolved', 'That dispute is still open', 409);
  }
  if (!String(reason ?? '').trim()) return mockError('reason_required', 'Say why', 422);

  Object.assign(dispute, { status: 'under_review', reopenedAt: nowIso(), reopenReason: reason });
  return mockRequest({ ...dispute });
}

// ---------------------------------------------------------------------------
// Resolution - ADM-067
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/trust/resolution-outcomes
// Returns: { items: ResolutionOutcome[] }
// Notes: the catalogue of ways a dispute can end. Every one names a liable
//        party, because a resolution that does not say who carries the cost
//        has not resolved anything - it has closed a ticket.
export function listResolutionOutcomes() {
  return mockRequest({ items: resolutionOutcomes });
}

function computeResolution(dispute, outcome, refundAmount, creditAmount) {
  const order = orderById[dispute.orderId];
  const refund = outcome.refundsJeweller ? Number(refundAmount || 0) : 0;
  const credit = outcome.issuesCredit ? Number(creditAmount || 0) : 0;
  const commissionReversed = outcome.reversesCommission
    ? Math.round(((refund || dispute.claimValue) * (order?.commissionPercent ?? 4)) / 100)
    : 0;
  const manufacturerRecovery = outcome.recoversFromManufacturer ? refund + credit : 0;

  return {
    refundAmount: refund,
    creditAmount: credit,
    commissionReversed,
    manufacturerRecovery,
    // Whatever nobody else carries lands on the platform. This is the number
    // the desk is actually deciding when it picks an outcome.
    elanziaAbsorbs: refund + credit - manufacturerRecovery,
    opensInsuranceClaim: Boolean(outcome.opensInsuranceClaim),
    issuesReplacement: Boolean(outcome.issuesReplacement),
    settlementImpact: manufacturerRecovery > 0
      ? `Recovered from ${dispute.manufacturerName} on the next settlement run`
      : 'No effect on manufacturer settlement',
  };
}

// BACKEND CONTRACT
// POST /admin/trust/disputes/:id/resolution/preview
// Body: { outcome, refundAmount, creditAmount }
// Returns: { refundAmount, creditAmount, commissionReversed,
//            manufacturerRecovery, elanziaAbsorbs, opensInsuranceClaim,
//            issuesReplacement, settlementImpact }
// Errors: 404 dispute_not_found, 404 outcome_not_found
// Notes: read-only. Nothing is written and no money moves. The figures always
//        balance: refund + credit = manufacturerRecovery + elanziaAbsorbs.
export function previewResolution({ id, outcome: outcomeId, refundAmount, creditAmount }) {
  const dispute = disputeRecords.find((row) => row.id === id);
  if (!dispute) return mockError('dispute_not_found', 'That dispute does not exist', 404);

  const outcome = resolutionOutcomes.find((row) => row.id === outcomeId);
  if (!outcome) return mockError('outcome_not_found', 'That outcome is not in the catalogue', 404);

  return mockRequest(() => ({
    outcome: outcome.id,
    outcomeLabel: outcome.label,
    liableParty: outcome.liableParty,
    ...computeResolution(dispute, outcome, refundAmount, creditAmount),
  }));
}

// BACKEND CONTRACT
// POST /admin/trust/disputes/:id/resolution
// Body: { outcome, refundAmount, creditAmount, note, notifyParties }
// Returns: { dispute, resolution }
// Errors: 404 dispute_not_found, 404 outcome_not_found, 409 already_resolved,
//         422 amount_required, 422 note_required
// Notes: outcomes flagged requiresAmount will not save without one. The note
//        is mandatory on every outcome, because both members can read it and
//        it is the only explanation they get. Recording a resolution moves the
//        dispute to 'resolved' and unblocks any return it was holding.
export function recordResolution({ id, outcome: outcomeId, refundAmount, creditAmount, note, notifyParties = true }) {
  const dispute = disputeRecords.find((row) => row.id === id);
  if (!dispute) return mockError('dispute_not_found', 'That dispute does not exist', 404);
  if (['resolved', 'closed'].includes(dispute.status)) {
    return mockError('already_resolved', 'That dispute already has a resolution', 409);
  }

  const outcome = resolutionOutcomes.find((row) => row.id === outcomeId);
  if (!outcome) return mockError('outcome_not_found', 'That outcome is not in the catalogue', 404);

  if (outcome.requiresAmount) {
    const total = Number(refundAmount || 0) + Number(creditAmount || 0);
    if (!Number.isFinite(total) || total <= 0) {
      return mockError('amount_required', 'That outcome needs an amount', 422);
    }
  }
  if (!String(note ?? '').trim()) {
    return mockError('note_required', 'Both members will read this. Write an explanation', 422);
  }

  const computed = computeResolution(dispute, outcome, refundAmount, creditAmount);
  const created = {
    id: `RES-${pad(9000 + resolutionRecords.length, 4)}`,
    disputeId: dispute.id,
    orderId: dispute.orderId,
    outcome: outcome.id,
    outcomeLabel: outcome.label,
    liableParty: outcome.liableParty,
    ...computed,
    note,
    recordedAt: nowIso(),
    recordedBy: actingAdminId,
    recordedByName: adminName(actingAdminId),
    notifiedParties: notifyParties,
  };

  resolutionRecords = [created, ...resolutionRecords];
  Object.assign(dispute, { status: 'resolved', resolutionId: created.id, slaBreached: false });

  return mockRequest(() => ({ dispute: { ...dispute }, resolution: { ...created } }));
}

// BACKEND CONTRACT
// GET /admin/trust/resolutions
// Query: { outcome, liableParty, page, pageSize, sortBy, sortDir }
// Returns: { items: Resolution[], total, page, pageSize }
// Notes: sorted by recordedAt descending. This is what a reviewer checks
//        before deciding a similar case, so like cases end alike.
export function listResolutions({ filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryRows(resolutionRecords, {
      filters: { outcome: filters.outcome, liableParty: filters.liableParty },
      sortBy: sortBy ?? 'recordedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// ---------------------------------------------------------------------------
// Certificates - ADM-070
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/trust/certificates
// Query: { search, kind, state, manufacturerId, severity, page, pageSize,
//          sortBy, sortDir }
// Returns: { items: Certificate[], total, page, pageSize }
// Notes: this is an audit of the certificates themselves, which is a different
//        question from whether a listing may publish. Catalogue moderation is
//        a publish gate; this finds duplicate HUIDs, a hallmark purity that
//        disagrees with the declared purity, and expired stone reports across
//        the whole estate.
export function listCertificates({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryRows(certificateRecords, {
      search,
      searchFields: ['number', 'sku', 'productTitle', 'manufacturerName'],
      filters: {
        kind: filters.kind,
        state: filters.state,
        manufacturerId: filters.manufacturerId,
        severity: filters.severity,
      },
      sortBy: sortBy ?? 'issuedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/trust/certificates/counts
// Returns: { byKind, byState, bySeverity, mismatches, duplicates,
//            expiringSoon, criticalOpen }
// Notes: criticalOpen counts live pieces at 22K or above with no hallmark.
//        Those are on the marketplace and unsellable at the same time.
export function getCertificateCounts() {
  const soon = Date.now() + 60 * 24 * 3600000;

  return mockRequest(() => ({
    byKind: countBy(certificateRecords, 'kind'),
    byState: countBy(certificateRecords, 'state'),
    bySeverity: countBy(certificateRecords, 'severity'),
    mismatches: certificateRecords.filter((row) => row.flagReason === 'purity_mismatch').length,
    duplicates: certificateRecords.filter((row) => row.state === 'duplicate').length,
    expiringSoon: certificateRecords.filter(
      (row) => row.expiresAt && Date.parse(row.expiresAt) > Date.now() && Date.parse(row.expiresAt) < soon,
    ).length,
    criticalOpen: certificateRecords.filter(
      (row) => row.severity === 'critical' && row.state !== 'valid',
    ).length,
  }));
}

// BACKEND CONTRACT
// GET /admin/trust/certificates/:id
// Returns: { certificate, product, relatedCertificates }
// Errors: 404 certificate_not_found
// Notes: relatedCertificates are the other certificates on the same piece, and
//        for a duplicate HUID also the other pieces carrying that number -
//        which is the whole point of looking at one.
export function getCertificate(id) {
  const certificate = certificateRecords.find((row) => row.id === id);
  if (!certificate) return mockError('certificate_not_found', 'That certificate does not exist', 404);

  const sameProduct = certificateRecords.filter(
    (row) => row.productId === certificate.productId && row.id !== id,
  );
  const sameNumber = certificate.number
    ? certificateRecords.filter(
        (row) => row.number === certificate.number && row.productId !== certificate.productId,
      )
    : [];

  return mockRequest(() => ({
    certificate: { ...certificate },
    product: productById[certificate.productId] ?? null,
    relatedCertificates: [...sameProduct, ...sameNumber],
  }));
}

// BACKEND CONTRACT
// POST /admin/trust/certificates/:id/flag
// Body: { reason, note }
// Returns: Certificate with state 'flagged'
// Errors: 404 certificate_not_found, 422 reason_required, 409 already_flagged
// Notes: flagging a certificate does not pull the listing. That is a catalogue
//        decision made with this as evidence, which keeps the audit and the
//        publish gate as two separate judgements.
export function flagCertificate({ id, reason, note }) {
  const certificate = certificateRecords.find((row) => row.id === id);
  if (!certificate) return mockError('certificate_not_found', 'That certificate does not exist', 404);
  if (certificate.state === 'flagged') {
    return mockError('already_flagged', 'That certificate is already flagged', 409);
  }
  if (!String(reason ?? '').trim()) return mockError('reason_required', 'Choose a reason', 422);

  Object.assign(certificate, {
    state: 'flagged',
    flagReason: reason,
    flagDetail: note ?? null,
    flaggedAt: nowIso(),
    flaggedBy: actingAdminId,
  });
  return mockRequest({ ...certificate });
}

// BACKEND CONTRACT
// POST /admin/trust/certificates/:id/clear
// Body: { note }
// Returns: Certificate with state 'valid'
// Errors: 404 certificate_not_found, 409 not_flagged, 422 note_required
// Notes: clearing a flag records who cleared it and why. A certificate that
//        was questioned and then cleared is a different fact from one that was
//        never questioned.
export function clearCertificateFlag({ id, note }) {
  const certificate = certificateRecords.find((row) => row.id === id);
  if (!certificate) return mockError('certificate_not_found', 'That certificate does not exist', 404);
  if (certificate.state !== 'flagged') {
    return mockError('not_flagged', 'That certificate is not flagged', 409);
  }
  if (!String(note ?? '').trim()) return mockError('note_required', 'Say what you checked', 422);

  Object.assign(certificate, {
    state: 'valid',
    flagReason: null,
    flagDetail: null,
    flaggedAt: null,
    flaggedBy: null,
    clearedAt: nowIso(),
    clearedBy: actingAdminId,
    clearNote: note,
    verifiedAt: nowIso(),
  });
  return mockRequest({ ...certificate });
}

// ---------------------------------------------------------------------------
// Reviews - ADM-071
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/trust/reviews
// Query: { search, state, rating, targetType, flaggedOnly, page, pageSize,
//          sortBy, sortDir }
// Returns: { items: Review[], total, page, pageSize }
// Notes: every review is anchored to a delivered order, so verifiedPurchase is
//        always true - a jeweller cannot review a piece they did not buy.
//        linkedDisputeId is set where the same order is in dispute, which is
//        context a moderator needs before calling a one star review abuse.
export function listReviews({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const rows = filters.flaggedOnly ? reviewRecords.filter((row) => row.flagCount > 0) : reviewRecords;

  return mockRequest(() =>
    queryRows(rows, {
      search,
      searchFields: ['title', 'body', 'targetName', 'jewellerName', 'orderId'],
      filters: {
        state: filters.state,
        rating: filters.rating ? Number(filters.rating) : '',
        targetType: filters.targetType,
      },
      sortBy: sortBy ?? 'submittedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/trust/reviews/counts
// Returns: { byState, byRating, flagged, pending, averageRating }
// Notes: averageRating counts published reviews only. Including held and
//        removed ones would let a moderator move the public average by
//        moderating, which is not a power anybody should have.
export function getReviewCounts() {
  const published = reviewRecords.filter((row) => row.state === 'published');

  return mockRequest(() => ({
    byState: countBy(reviewRecords, 'state'),
    byRating: countBy(reviewRecords, 'rating'),
    flagged: reviewRecords.filter((row) => row.flagCount > 0).length,
    pending: reviewRecords.filter((row) => row.state === 'pending').length,
    averageRating:
      published.length === 0
        ? 0
        : Number((published.reduce((sum, row) => sum + row.rating, 0) / published.length).toFixed(2)),
  }));
}

// BACKEND CONTRACT
// POST /admin/trust/reviews/moderate
// Body: { reviewIds: string[], decision: 'publish'|'hold'|'remove', reason }
// Returns: { updated: number, items: Review[] }
// Errors: 422 no_selection, 422 reason_required, 409 already_moderated
// Notes: holding or removing needs a reason - removing deletes something a
//        buyer wrote about a purchase they actually made, and the record of
//        why has to outlive the review. Publishing back does not.
export function moderateReviews({ reviewIds = [], decision, reason }) {
  if (reviewIds.length === 0) return mockError('no_selection', 'Select at least one review', 422);
  if (!['publish', 'hold', 'remove'].includes(decision)) {
    return mockError('no_selection', 'Choose what to do with them', 422);
  }
  if (decision !== 'publish' && !String(reason ?? '').trim()) {
    return mockError('reason_required', 'A reason is required to hold or remove a review', 422);
  }

  const alreadyRemoved = reviewRecords.filter(
    (row) => reviewIds.includes(row.id) && row.state === 'removed' && decision === 'remove',
  );
  if (alreadyRemoved.length === reviewIds.length && reviewIds.length > 0) {
    return mockError('already_moderated', 'Those reviews are already removed', 409);
  }

  const nextState = decision === 'publish' ? 'published' : decision === 'hold' ? 'held' : 'removed';
  const updated = [];

  reviewRecords.forEach((row) => {
    if (!reviewIds.includes(row.id)) return;
    Object.assign(row, {
      state: nextState,
      moderatedAt: nowIso(),
      moderatedBy: actingAdminId,
      moderationReason: decision === 'publish' ? null : reason,
    });
    updated.push({ ...row });
  });

  return mockRequest(() => ({ updated: updated.length, items: updated }));
}
