// Mock API for Logistics and returns - ADM-063, 064, 068, 069.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Shipment: { id, orderId, manufacturerId, manufacturerName, jewellerId,
//             jewellerName, awb, carrierId, carrierName,
//             status: 'in_transit'|'delivered'|'exception'|'returned',
//             originCity, destinationCity, dispatchedAt, expectedAt,
//             deliveredAt: ISO|null, transitDays, lineCount, netWeight,
//             declaredValue, insuredValue, insurancePremium, isHighValue,
//             lastScanAt, lastScanLocation, ageHours, slaBreached }
//   One consignment, not one order. An order with lines from three
//   manufacturers ships as three shipments on three AWBs.
//
// TrackingEvent: { id, shipmentId, at, status, label, location, source }
//
// ShipmentException: { id, shipmentId, awb, orderId, manufacturerName,
//                      jewellerName, type, severity: 'medium'|'high'|'critical',
//                      summary, impact, detail, declaredValue, raisedAt,
//                      ageHours, slaBreached, state: 'open'|'investigating'
//                      |'resolved', assigneeId, assigneeName, resolvedAt,
//                      resolvedBy, resolution, claimEligible }
//
// InsuranceClaim: { id, shipmentId, awb, orderId, exceptionId, insurerId,
//                   insurerName, policyNumber, lossType, lossTypeLabel,
//                   incidentAt, raisedAt, raisedBy, raisedByName,
//                   insuredValue, claimedValue, settledValue: number|null,
//                   status: 'submitted'|'under_assessment'|'surveyor_appointed'
//                   |'documents_requested'|'approved'|'settled'|'rejected'
//                   |'withdrawn', insurerReference, slaDueAt, slaBreached,
//                   closedAt, rejectionReason, documentCount }
//
// ReturnRecord: { id, orderId, orderLineId, productId, title, sku, purity,
//                 quantity, jewellerId, jewellerName, manufacturerId,
//                 manufacturerName, reasonCode, reason, raisedAt, ageHours,
//                 declaredNetWeight, receivedNetWeight: number|null,
//                 shortfallGrams: number|null, withinTolerance: boolean|null,
//                 verifiedAt, verifiedBy, mediaChecked,
//                 state: 'awaiting_verification'|'verified'|'refunded'
//                 |'disputed'|'rejected',
//                 refundAmount, refundedAt, disputeId, mediaCount }
//   Weights are grams to three decimals throughout.
//
// ReturnMedia: { id, returnId, kind: 'unboxing_video'|'packing_video'
//                |'weighbridge_slip'|'photo', type, label, url, capturedAt,
//                durationSeconds, uploadedByParty }
//
// WeighIn: { declaredNetWeight, receivedNetWeight, shortfallGrams,
//            toleranceGrams, withinTolerance, shortfallValue }

import { MockApiError, mockRequest, queryCollection } from './_client';
import { adminUsers, orderById } from '@/data/core';
import {
  CARRIERS,
  HIGH_VALUE_THRESHOLD,
  INSURERS,
  RETURN_WEIGHT_TOLERANCE_GRAMS,
  insuranceClaims,
  returnMedia,
  returns,
  shipmentExceptions,
  shipments,
  trackingEvents,
} from '@/data/logisticsFixtures';
import { createDisputeFromReturn } from './trustApi';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A refresh resets them, which is correct for a
// prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let shipmentRecords = shipments.map((row) => ({ ...row }));
let eventRecords = trackingEvents.map((row) => ({ ...row }));
let exceptionRecords = shipmentExceptions.map((row) => ({ ...row }));
let claimRecords = insuranceClaims.map((row) => ({ ...row }));
let returnRecords = returns.map((row) => ({ ...row }));

let actingAdminId = 'STF-003';

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the mock's audit trail names a real person.
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
const round3 = (v) => Number(Number(v).toFixed(3));
const pad = (n, w) => String(n).padStart(w, '0');
const adminName = (id) => adminUsers.find((user) => user.id === id)?.name ?? null;

// Redux freezes whatever it stores. These rows are this module's own mutable
// records, so handing out the live objects would freeze them and make the next
// mutation throw. Every list endpoint returns copies instead.
function queryRows(rows, options) {
  const result = queryCollection(rows, options);
  return { ...result, items: result.items.map((row) => ({ ...row })) };
}

function countBy(rows, key) {
  return rows.reduce((map, row) => ({ ...map, [row[key]]: (map[row[key]] ?? 0) + 1 }), {});
}

// The weigh-in, and the rule that decides what happens next. Inside the
// tolerance is two sets of scales disagreeing; outside it is metal that has
// not come back, and no refund moves until somebody has settled that.
function buildWeighIn(returnRecord, receivedNetWeight) {
  const received = round3(receivedNetWeight);
  const shortfall = round3(returnRecord.declaredNetWeight - received);
  const line = orderById[returnRecord.orderId]?.lines.find(
    (candidate) => candidate.id === returnRecord.orderLineId,
  );

  return {
    declaredNetWeight: returnRecord.declaredNetWeight,
    receivedNetWeight: received,
    shortfallGrams: shortfall,
    toleranceGrams: RETURN_WEIGHT_TOLERANCE_GRAMS,
    withinTolerance: shortfall <= RETURN_WEIGHT_TOLERANCE_GRAMS,
    // Valued at the rate the ORDER WAS CONFIRMED AT, never today's rate. A
    // confirmed order's price is permanent, and that includes what a gram of
    // it was worth.
    shortfallValue: line ? Math.round(Math.max(0, shortfall) * line.metalRateAtConfirmation) : 0,
  };
}

// ---------------------------------------------------------------------------
// Shipments - ADM-063
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/logistics/shipments
// Query: { search, status, carrierId, manufacturerId, destinationCity,
//          exceptionsOnly, page, pageSize, sortBy, sortDir }
// Returns: { items: Shipment[], total, page, pageSize }
// Notes: one row per consignment, NOT per order - an order split across three
//        manufacturers appears three times, on three AWBs, with three delivery
//        dates. search matches AWB, order id and either business name. Sorted
//        by dispatchedAt descending by default.
export function listShipments({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const openExceptionShipmentIds = new Set(
    exceptionRecords.filter((row) => row.state !== 'resolved').map((row) => row.shipmentId),
  );

  const rows = shipmentRecords
    .map((shipment) => ({
      ...shipment,
      hasOpenException: openExceptionShipmentIds.has(shipment.id),
    }))
    .filter((shipment) => (filters.exceptionsOnly ? shipment.hasOpenException : true));

  return mockRequest(() =>
    queryRows(rows, {
      search,
      searchFields: ['awb', 'orderId', 'manufacturerName', 'jewellerName', 'destinationCity'],
      filters: {
        status: filters.status,
        carrierId: filters.carrierId,
        manufacturerId: filters.manufacturerId,
        destinationCity: filters.destinationCity,
      },
      sortBy: sortBy ?? 'dispatchedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/logistics/shipments/:id
// Returns: { shipment, events: TrackingEvent[], order, exceptions }
// Errors: 404 shipment_not_found
// Notes: events are oldest first, so the trail reads top to bottom without
//        sorting. `order` is the parent order, included because a consignment
//        on its own does not say what the jeweller actually bought.
export function getShipment(id) {
  const shipment = shipmentRecords.find((row) => row.id === id);
  if (!shipment) return mockError('shipment_not_found', 'That consignment does not exist', 404);

  return mockRequest(() => ({
    shipment: { ...shipment },
    events: eventRecords
      .filter((event) => event.shipmentId === id)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    order: orderById[shipment.orderId] ?? null,
    exceptions: exceptionRecords.filter((row) => row.shipmentId === id),
  }));
}

// BACKEND CONTRACT
// GET /admin/logistics/shipments/counts
// Query: same filters as the list
// Returns: { byStatus, withOpenExceptions, highValueInTransit, slaBreached }
// Notes: computed over the filtered set, not the page, so the tiles do not
//        change when somebody turns a page.
export function getShipmentCounts({ filters = {} } = {}) {
  const openExceptionShipmentIds = new Set(
    exceptionRecords.filter((row) => row.state !== 'resolved').map((row) => row.shipmentId),
  );

  return mockRequest(() => ({
    byStatus: countBy(shipmentRecords, 'status'),
    withOpenExceptions: shipmentRecords.filter((row) => openExceptionShipmentIds.has(row.id)).length,
    highValueInTransit: shipmentRecords.filter(
      (row) => row.isHighValue && row.status === 'in_transit',
    ).length,
    slaBreached: shipmentRecords.filter((row) => row.slaBreached).length,
    highValueThreshold: HIGH_VALUE_THRESHOLD,
  }));
}

// BACKEND CONTRACT
// PATCH /admin/logistics/shipments/:id
// Body: { patch: { carrierId?, expectedAt?, destinationCity? }, reason }
// Returns: Shipment
// Errors: 404 shipment_not_found, 409 already_delivered, 422 reason_required
// Notes: a delivered consignment is a historical record. Correcting one after
//        the fact would rewrite what the jeweller was told on the day.
export function updateShipment({ id, patch = {}, reason }) {
  const shipment = shipmentRecords.find((row) => row.id === id);
  if (!shipment) return mockError('shipment_not_found', 'That consignment does not exist', 404);
  if (shipment.status === 'delivered') {
    return mockError('already_delivered', 'A delivered consignment cannot be edited', 409);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'A reason is required and is recorded', 422);
  }

  const carrier = CARRIERS.find((row) => row.id === patch.carrierId);
  Object.assign(shipment, {
    ...patch,
    ...(carrier ? { carrierId: carrier.id, carrierName: carrier.name } : {}),
  });
  return mockRequest({ ...shipment });
}

// BACKEND CONTRACT
// POST /admin/logistics/shipments/:id/dispatch
// Body: { awb, carrierId }
// Returns: Shipment with status 'in_transit'
// Errors: 404 shipment_not_found, 422 awb_required, 409 already_dispatched,
//         409 high_value_uninsured
// Notes: a consignment above the high value threshold cannot be dispatched
//        without cover. Losing an uninsured 8 lakh parcel is a loss Elanzia
//        carries alone, so the platform refuses rather than warns.
export function markDispatched({ id, awb, carrierId }) {
  const shipment = shipmentRecords.find((row) => row.id === id);
  if (!shipment) return mockError('shipment_not_found', 'That consignment does not exist', 404);
  if (shipment.dispatchedAt && shipment.status !== 'pending') {
    return mockError('already_dispatched', 'That consignment has already moved', 409);
  }
  if (!String(awb ?? '').trim()) {
    return mockError('awb_required', 'An AWB is required to dispatch', 422);
  }
  if (shipment.isHighValue && shipment.insuredValue <= 0) {
    return mockError('high_value_uninsured', 'A high value consignment must be insured first', 409);
  }

  const carrier = CARRIERS.find((row) => row.id === carrierId) ?? CARRIERS[0];
  Object.assign(shipment, {
    awb,
    carrierId: carrier.id,
    carrierName: carrier.name,
    status: 'in_transit',
    dispatchedAt: nowIso(),
  });
  return mockRequest({ ...shipment });
}

// BACKEND CONTRACT
// POST /admin/logistics/shipments/:id/tracking/refresh
// Returns: { shipment, events }
// Errors: 404 shipment_not_found, 502 carrier_unreachable
// Notes: pulls the carrier's latest scans. A carrier that is not responding
//        returns 502 rather than silently leaving the trail stale.
export function refreshTracking(id) {
  const shipment = shipmentRecords.find((row) => row.id === id);
  if (!shipment) return mockError('shipment_not_found', 'That consignment does not exist', 404);

  // Malca-Amit is the flaky integration in this prototype, so the failure path
  // is reachable without anyone having to break something.
  if (shipment.carrierId === 'malca') {
    return mockError('carrier_unreachable', `${shipment.carrierName} did not respond`, 502);
  }

  shipment.lastScanAt = nowIso();
  return mockRequest(() => ({
    shipment: { ...shipment },
    events: eventRecords
      .filter((event) => event.shipmentId === id)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
  }));
}

// ---------------------------------------------------------------------------
// Shipment exceptions - ADM-064
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/logistics/exceptions
// Query: { search, type, severity, state, assigneeId, page, pageSize,
//          sortBy, sortDir }
// Returns: { items: ShipmentException[], total, page, pageSize }
// Notes: sorted oldest first by default, because the queue is worked from the
//        top and an ageing exception is the one costing somebody money.
export function listShipmentExceptions({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryRows(exceptionRecords, {
      search,
      searchFields: ['awb', 'orderId', 'summary', 'manufacturerName', 'jewellerName'],
      filters: {
        type: filters.type,
        severity: filters.severity,
        state: filters.state,
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
// GET /admin/logistics/exceptions/counts
// Returns: { byType, bySeverity, byState, unassigned, slaBreached,
//            claimEligibleOpen }
// Notes: claimEligibleOpen is the number of open exceptions that could still
//        become an insurance claim, which is the number the desk watches.
export function getExceptionCounts() {
  const open = exceptionRecords.filter((row) => row.state !== 'resolved');

  return mockRequest(() => ({
    byType: countBy(exceptionRecords, 'type'),
    bySeverity: countBy(exceptionRecords, 'severity'),
    byState: countBy(exceptionRecords, 'state'),
    unassigned: open.filter((row) => !row.assigneeId).length,
    slaBreached: open.filter((row) => row.slaBreached).length,
    claimEligibleOpen: open.filter((row) => row.claimEligible).length,
  }));
}

// BACKEND CONTRACT
// POST /admin/logistics/exceptions/assign
// Body: { exceptionIds: string[], adminId }
// Returns: { updated: number }
// Errors: 404 admin_not_found, 422 no_selection
// Notes: assigning to a deactivated account is refused - work handed to
//        somebody who cannot sign in is work that silently stops.
export function assignException({ exceptionIds = [], adminId }) {
  if (exceptionIds.length === 0) return mockError('no_selection', 'Select at least one exception', 422);

  const admin = adminUsers.find((user) => user.id === adminId);
  if (!admin || admin.status !== 'active') {
    return mockError('admin_not_found', 'That account cannot be assigned work', 404);
  }

  let updated = 0;
  exceptionRecords.forEach((row) => {
    if (exceptionIds.includes(row.id)) {
      row.assigneeId = admin.id;
      row.assigneeName = admin.name;
      updated += 1;
    }
  });
  return mockRequest({ updated });
}

// BACKEND CONTRACT
// POST /admin/logistics/exceptions/:id/resolve
// Body: { outcome, note }
// Returns: ShipmentException with state 'resolved'
// Errors: 404 exception_not_found, 409 already_resolved, 422 note_required
// Notes: the note is mandatory. An exception closed without one tells the next
//        person nothing about what actually happened to the parcel.
export function resolveException({ id, outcome, note }) {
  const exception = exceptionRecords.find((row) => row.id === id);
  if (!exception) return mockError('exception_not_found', 'That exception does not exist', 404);
  if (exception.state === 'resolved') {
    return mockError('already_resolved', 'That exception is already closed', 409);
  }
  if (!String(note ?? '').trim()) {
    return mockError('note_required', 'Say what happened before closing this', 422);
  }

  Object.assign(exception, {
    state: 'resolved',
    resolvedAt: nowIso(),
    resolvedBy: actingAdminId,
    resolution: note,
    outcome: outcome ?? null,
    slaBreached: false,
  });
  return mockRequest({ ...exception });
}

// ---------------------------------------------------------------------------
// Insurance claims - ADM-068
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/logistics/claims
// Query: { search, status, insurerId, lossType, page, pageSize, sortBy, sortDir }
// Returns: { items: InsuranceClaim[], total, page, pageSize }
// Notes: sorted by raisedAt descending. settledValue is null until an insurer
//        actually pays, and is 0 on a rejection - the two are different facts
//        and the screen shows them differently.
export function listInsuranceClaims({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryRows(claimRecords, {
      search,
      searchFields: ['id', 'awb', 'orderId', 'policyNumber', 'insurerReference'],
      filters: { status: filters.status, insurerId: filters.insurerId, lossType: filters.lossType },
      sortBy: sortBy ?? 'raisedAt',
      sortDir: sortDir ?? 'desc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/logistics/claims/:id
// Returns: { claim, shipment, exception, documents }
// Errors: 404 claim_not_found
export function getInsuranceClaim(id) {
  const claim = claimRecords.find((row) => row.id === id);
  if (!claim) return mockError('claim_not_found', 'That claim does not exist', 404);

  return mockRequest(() => ({
    claim: { ...claim },
    shipment: shipmentRecords.find((row) => row.id === claim.shipmentId) ?? null,
    exception: exceptionRecords.find((row) => row.id === claim.exceptionId) ?? null,
    documents: Array.from({ length: claim.documentCount }).map((_, index) => ({
      id: `${claim.id}-D${index + 1}`,
      label: ['Carrier incident report', 'Weigh-in slip', 'Tax invoice', 'Surveyor report'][index % 4],
      type: 'document',
      uploadedAt: claim.raisedAt,
    })),
  }));
}

// BACKEND CONTRACT
// POST /admin/logistics/claims
// Body: { shipmentId, lossType, claimedValue, note }
// Returns: InsuranceClaim with status 'submitted'
// Errors: 404 shipment_not_found, 409 not_insured, 409 claim_already_open,
//         422 value_exceeds_insured, 422 note_required
// Notes: an uninsured consignment cannot support a claim, and the amount
//        claimed cannot exceed the sum insured. Both are refused rather than
//        submitted and rejected by the insurer three weeks later.
export function raiseInsuranceClaim({ shipmentId, lossType, claimedValue, note }) {
  const shipment = shipmentRecords.find((row) => row.id === shipmentId);
  if (!shipment) return mockError('shipment_not_found', 'That consignment does not exist', 404);
  if (shipment.insuredValue <= 0) {
    return mockError('not_insured', 'That consignment travelled uninsured', 409);
  }
  if (!String(note ?? '').trim()) {
    return mockError('note_required', 'Describe what happened', 422);
  }

  const value = Number(claimedValue);
  if (!Number.isFinite(value) || value <= 0) {
    return mockError('value_exceeds_insured', 'Enter a claim value above zero', 422);
  }
  if (value > shipment.insuredValue) {
    return mockError(
      'value_exceeds_insured',
      'The claim cannot exceed the sum insured on that consignment',
      422,
    );
  }

  const open = claimRecords.find(
    (row) => row.shipmentId === shipmentId && !['settled', 'rejected', 'withdrawn'].includes(row.status),
  );
  if (open) return mockError('claim_already_open', `${open.id} is already open on that consignment`, 409);

  const insurer = INSURERS[claimRecords.length % INSURERS.length];
  const created = {
    id: `CLM-${pad(claimRecords.length + 1, 4)}`,
    shipmentId,
    awb: shipment.awb,
    orderId: shipment.orderId,
    exceptionId: null,
    manufacturerName: shipment.manufacturerName,
    jewellerName: shipment.jewellerName,
    insurerId: insurer.id,
    insurerName: insurer.name,
    policyNumber: `${insurer.policyPrefix}-${pad(90000 + claimRecords.length, 6)}`,
    lossType,
    lossTypeLabel: lossType,
    incidentAt: nowIso(),
    raisedAt: nowIso(),
    raisedBy: actingAdminId,
    raisedByName: adminName(actingAdminId),
    insuredValue: shipment.insuredValue,
    claimedValue: value,
    settledValue: null,
    status: 'submitted',
    insurerReference: null,
    slaDueAt: new Date(Date.now() + 21 * 24 * 3600000).toISOString(),
    slaBreached: false,
    closedAt: null,
    rejectionReason: null,
    documentCount: 1,
    note,
  };

  claimRecords = [created, ...claimRecords];
  return mockRequest({ ...created });
}

// BACKEND CONTRACT
// POST /admin/logistics/claims/:id/status
// Body: { status, insurerReference, settledValue, note }
// Returns: InsuranceClaim
// Errors: 404 claim_not_found, 409 already_closed, 422 settled_value_required,
//         422 rejection_reason_required, 422 settled_exceeds_claimed
// Notes: moving to 'settled' requires the amount the insurer actually paid,
//        which is usually less than the claim. Moving to 'rejected' requires
//        the insurer's reason, because that is what the desk argues with.
export function updateClaimStatus({ id, status, insurerReference, settledValue, note }) {
  const claim = claimRecords.find((row) => row.id === id);
  if (!claim) return mockError('claim_not_found', 'That claim does not exist', 404);
  if (['settled', 'rejected', 'withdrawn'].includes(claim.status)) {
    return mockError('already_closed', 'That claim is already closed', 409);
  }

  if (status === 'settled') {
    const value = Number(settledValue);
    if (!Number.isFinite(value) || value <= 0) {
      return mockError('settled_value_required', 'Enter what the insurer actually paid', 422);
    }
    if (value > claim.claimedValue) {
      return mockError('settled_exceeds_claimed', 'A settlement cannot exceed the claim', 422);
    }
    claim.settledValue = value;
  }
  if (status === 'rejected') {
    if (!String(note ?? '').trim()) {
      return mockError('rejection_reason_required', 'Record the insurer reason', 422);
    }
    claim.rejectionReason = note;
    claim.settledValue = 0;
  }

  Object.assign(claim, {
    status,
    insurerReference: insurerReference ?? claim.insurerReference,
    closedAt: ['settled', 'rejected', 'withdrawn'].includes(status) ? nowIso() : null,
  });
  return mockRequest({ ...claim });
}

// ---------------------------------------------------------------------------
// Returns - ADM-069
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/returns
// Query: { search, state, reasonCode, manufacturerId, page, pageSize,
//          sortBy, sortDir }
// Returns: { items: ReturnRecord[], total, page, pageSize }
// Notes: a return is per ORDER LINE, not per order - a four line order can
//        have one piece come back and the other three stay. Sorted oldest
//        first, because a jeweller waiting on a refund is waiting on this
//        queue. Weights are grams to three decimals.
export function listReturns({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  return mockRequest(() =>
    queryRows(returnRecords, {
      search,
      searchFields: ['id', 'orderId', 'sku', 'title', 'jewellerName', 'manufacturerName'],
      filters: {
        state: filters.state,
        reasonCode: filters.reasonCode,
        manufacturerId: filters.manufacturerId,
      },
      sortBy: sortBy ?? 'raisedAt',
      sortDir: sortDir ?? 'asc',
      page,
      pageSize,
    }),
  );
}

// BACKEND CONTRACT
// GET /admin/returns/:id
// Returns: { returnRecord, order, line, media: ReturnMedia[], weighIn, history }
// Errors: 404 return_not_found
// Notes: media always includes the jeweller's unboxing video and the
//        manufacturer's packing video, because a verification is checked
//        against both. weighIn is null until the piece has been weighed.
export function getReturnWorkspace(id) {
  const returnRecord = returnRecords.find((row) => row.id === id);
  if (!returnRecord) return mockError('return_not_found', 'That return does not exist', 404);

  const order = orderById[returnRecord.orderId] ?? null;

  return mockRequest(() => ({
    returnRecord: { ...returnRecord },
    order,
    line: order?.lines.find((line) => line.id === returnRecord.orderLineId) ?? null,
    media: returnMedia.filter((row) => row.returnId === id),
    weighIn: returnRecord.receivedNetWeight
      ? buildWeighIn(returnRecord, returnRecord.receivedNetWeight)
      : null,
    history: [
      { at: returnRecord.raisedAt, label: 'Return raised by the jeweller', actor: returnRecord.jewellerName },
      ...(returnRecord.verifiedAt
        ? [{ at: returnRecord.verifiedAt, label: 'Weighed in and verified', actor: adminName(returnRecord.verifiedBy) }]
        : []),
      ...(returnRecord.refundedAt
        ? [{ at: returnRecord.refundedAt, label: 'Refund processed', actor: 'Elanzia finance' }]
        : []),
    ],
  }));
}

// BACKEND CONTRACT
// POST /admin/returns/:id/verify
// Body: { receivedNetWeight, mediaChecked, note }
// Returns: { returnRecord, weighIn, disputeCreated: Dispute|null }
// Errors: 404 return_not_found, 409 already_verified, 422 weight_required,
//         422 media_not_reviewed
// Notes: THE gate. Nothing reaches a refund without passing through here.
//        The reviewer must confirm they watched the unboxing video, and must
//        enter the weight the piece came back at.
//        A shortfall inside the tolerance is two sets of scales disagreeing and
//        the return is simply verified. A shortfall beyond it is metal that has
//        not come back: the return moves to 'disputed', the refund is blocked,
//        and the server opens the dispute itself and returns it as
//        `disputeCreated`. Nobody has to remember to raise it.
export function verifyReturn({ id, receivedNetWeight, mediaChecked, note }) {
  const returnRecord = returnRecords.find((row) => row.id === id);
  if (!returnRecord) return mockError('return_not_found', 'That return does not exist', 404);
  if (returnRecord.state !== 'awaiting_verification') {
    return mockError('already_verified', 'That return has already been verified', 409);
  }
  if (!mediaChecked) {
    return mockError('media_not_reviewed', 'Confirm you have watched the unboxing video', 422);
  }

  const weight = Number(receivedNetWeight);
  if (!Number.isFinite(weight) || weight <= 0) {
    return mockError('weight_required', 'Enter the weight the piece came back at', 422);
  }

  const weighIn = buildWeighIn(returnRecord, weight);

  Object.assign(returnRecord, {
    receivedNetWeight: weighIn.receivedNetWeight,
    shortfallGrams: weighIn.shortfallGrams,
    withinTolerance: weighIn.withinTolerance,
    verifiedAt: nowIso(),
    verifiedBy: actingAdminId,
    mediaChecked: true,
    verificationNote: note ?? null,
    state: weighIn.withinTolerance ? 'verified' : 'disputed',
  });

  let disputeCreated = null;
  if (!weighIn.withinTolerance) {
    disputeCreated = createDisputeFromReturn(returnRecord, weighIn, actingAdminId);
    returnRecord.disputeId = disputeCreated.id;
  }

  return mockRequest(() => ({
    returnRecord: { ...returnRecord },
    weighIn,
    disputeCreated,
  }));
}

// BACKEND CONTRACT
// POST /admin/returns/:id/refund
// Body: { note }
// Returns: { returnRecord, refundAmount }
// Errors: 404 return_not_found, 409 not_verified, 409 already_refunded,
//         409 blocked_by_dispute
// Notes: NO REFUND BEFORE VERIFICATION. A return that has not been through
//        POST /verify returns 409 not_verified, and there is no other path to
//        this state. A return sitting in dispute is blocked until the dispute
//        is resolved.
//        The amount is the line total the order was CONFIRMED at. It is never
//        recalculated from today's metal rate - a confirmed order's price is
//        permanent, and a refund is the reverse of that same price.
export function processRefund({ id, note }) {
  const returnRecord = returnRecords.find((row) => row.id === id);
  if (!returnRecord) return mockError('return_not_found', 'That return does not exist', 404);
  if (returnRecord.state === 'refunded') {
    return mockError('already_refunded', 'That return has already been refunded', 409);
  }
  if (returnRecord.state === 'disputed') {
    return mockError(
      'blocked_by_dispute',
      `${returnRecord.disputeId} must be resolved before this can be refunded`,
      409,
    );
  }
  if (returnRecord.state !== 'verified') {
    return mockError('not_verified', 'A return must be verified before any refund', 409);
  }

  const order = orderById[returnRecord.orderId];
  const line = order?.lines.find((candidate) => candidate.id === returnRecord.orderLineId);
  const refundAmount = line ? line.lineTotal : returnRecord.refundAmount;

  Object.assign(returnRecord, {
    state: 'refunded',
    refundAmount,
    refundedAt: nowIso(),
    refundNote: note ?? null,
  });

  return mockRequest(() => ({ returnRecord: { ...returnRecord }, refundAmount }));
}

// BACKEND CONTRACT
// GET /admin/returns/counts
// Returns: { byState, byReason, awaitingVerification, blockedByDispute }
// Notes: awaitingVerification is the number blocking a refund right now, which
//        is the only number on this screen anybody acts on.
export function getReturnCounts() {
  return mockRequest(() => ({
    byState: countBy(returnRecords, 'state'),
    byReason: countBy(returnRecords, 'reasonCode'),
    awaitingVerification: returnRecords.filter((row) => row.state === 'awaiting_verification').length,
    blockedByDispute: returnRecords.filter((row) => row.state === 'disputed').length,
    toleranceGrams: RETURN_WEIGHT_TOLERANCE_GRAMS,
  }));
}
