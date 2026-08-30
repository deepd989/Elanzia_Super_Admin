// Feature fixtures for Logistics and returns - ADM-063, 064, 068, 069.
//
// Everything here references src/data/core by id. No order, product,
// manufacturer, jeweller or admin user is invented in this file.
//
// A CONSIGNMENT IS NOT AN ORDER. An order with lines from three manufacturers
// ships as three consignments, from three cities, on three AWBs, arriving on
// three days. Modelling shipments per order-and-manufacturer is what makes the
// tracking console true, and it is also what gives the queue enough rows to be
// worth filtering.

import { adminUsers, jewellerById, manufacturerById, orders } from '@/data/core';

// The anchor. Matches operationsFixtures.js so every area agrees about "now".
export const LOGISTICS_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(LOGISTICS_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoHoursAgo = (h) => new Date(NOW_MS - h * HOUR_MS).toISOString();
const isoDaysAgo = (d) => new Date(NOW_MS - d * DAY_MS).toISOString();
const pad = (n, w) => String(n).padStart(w, '0');
const round3 = (v) => Number(Number(v).toFixed(3));

const hoursSince = (iso) => (iso ? Math.max(0, Math.round((NOW_MS - Date.parse(iso)) / HOUR_MS)) : null);

// Staff who can own a consignment problem. Deactivated accounts are excluded:
// assigning work to somebody who cannot sign in is how a queue stops moving.
const opsStaff = adminUsers.filter(
  (user) => user.status === 'active' && ['ops', 'super_admin', 'support'].includes(user.roleId),
);

// ---------------------------------------------------------------------------
// Carriers and policy
// ---------------------------------------------------------------------------

export const CARRIERS = [
  { id: 'sequel', name: 'Sequel Logistics', specialism: 'Bullion and jewellery', trackingUrl: 'https://sequel.example/track/' },
  { id: 'brinks', name: 'Brinks India', specialism: 'High value secure transit', trackingUrl: 'https://brinks.example/track/' },
  { id: 'malca', name: 'Malca-Amit', specialism: 'International and high value', trackingUrl: 'https://malca.example/track/' },
];

// Above this, a consignment must move on a secure carrier and be insured to
// its full declared value. It is also the line above which a loss becomes an
// insurance claim rather than a write-off.
export const HIGH_VALUE_THRESHOLD = 500000;

// A returned piece may weigh this much less than it left at before anybody
// worries. Below it is scale calibration between two sets of scales; above it
// is metal that has not come back.
export const RETURN_WEIGHT_TOLERANCE_GRAMS = 0.05;

export const SHIPMENT_SLA_DAYS = 5;
export const EXCEPTION_SLA_HOURS = 24;
export const CLAIM_SLA_DAYS = 21;

// ---------------------------------------------------------------------------
// Shipments - ADM-063
// ---------------------------------------------------------------------------

// Orders that have physically moved. Anything earlier has nothing to track.
const SHIPPED_STATUSES = ['dispatched', 'delivered', 'returned', 'refunded', 'disputed'];

const shippedOrders = orders.filter((order) => SHIPPED_STATUSES.includes(order.status));

const SHIPMENT_STATUS_BY_ORDER = {
  dispatched: 'in_transit',
  delivered: 'delivered',
  returned: 'delivered',
  refunded: 'delivered',
  disputed: 'delivered',
};

export const shipments = shippedOrders.flatMap((order, orderIndex) =>
  order.manufacturerIds.map((manufacturerId, legIndex) => {
    const manufacturer = manufacturerById[manufacturerId];
    const jeweller = jewellerById[order.jewellerId];
    const seq = orderIndex * 4 + legIndex;

    // The value on this leg only. An order's insurance is split across its
    // consignments in proportion to what each one is actually carrying.
    const legLines = order.lines.filter((line) => line.manufacturerId === manufacturerId);
    const declaredValue = legLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const netWeight = round3(
      legLines.reduce((sum, line) => sum + line.netWeight * line.quantity, 0),
    );
    const share = order.goodsValue === 0 ? 0 : declaredValue / order.goodsValue;
    const isHighValue = declaredValue >= HIGH_VALUE_THRESHOLD;

    const carrier = isHighValue ? CARRIERS[seq % 2 === 0 ? 1 : 2] : CARRIERS[0];
    const dispatchedAt = order.dispatchedAt ?? isoDaysAgo(6 + (seq % 5));
    const transitDays = [2, 3, 4, 5, 3, 6][seq % 6];

    // A leg is late when the order is dispatched but past its SLA. Delivered
    // legs take the order's delivery date.
    const status = SHIPMENT_STATUS_BY_ORDER[order.status] ?? 'in_transit';
    const deliveredAt = status === 'delivered' ? order.deliveredAt : null;

    return {
      id: `SHP-${pad(seq + 1, 4)}`,
      orderId: order.id,
      manufacturerId,
      manufacturerName: manufacturer.businessName,
      jewellerId: order.jewellerId,
      jewellerName: jeweller.businessName,
      // The order's AWB belongs to its first leg. Later legs carry their own.
      awb: legIndex === 0 && order.awb ? order.awb : `SEQ${pad(4200000 + seq * 137, 7)}`,
      carrierId: carrier.id,
      carrierName: carrier.name,
      status,
      originCity: manufacturer.city,
      destinationCity: order.shippingCity,
      dispatchedAt,
      expectedAt: new Date(Date.parse(dispatchedAt) + transitDays * DAY_MS).toISOString(),
      deliveredAt,
      transitDays,
      lineCount: legLines.length,
      netWeight,
      declaredValue,
      // Above the threshold cover is mandatory. Below it the manufacturer
      // chooses, and about one leg in three travels uninsured - which is
      // exactly why a claim has to check before it is raised.
      insuredValue: isHighValue || seq % 3 !== 0 ? declaredValue : 0,
      insurancePremium: isHighValue || seq % 3 !== 0 ? Math.round(order.insurance * share) : 0,
      isHighValue,
      lastScanAt: deliveredAt ?? isoHoursAgo(3 + (seq % 30)),
      lastScanLocation: deliveredAt ? order.shippingCity : [manufacturer.city, 'Mumbai hub', 'Bengaluru hub'][seq % 3],
      ageHours: hoursSince(dispatchedAt),
      slaBreached: !deliveredAt && hoursSince(dispatchedAt) > SHIPMENT_SLA_DAYS * 24,
    };
  }),
);

export const shipmentById = Object.fromEntries(shipments.map((row) => [row.id, row]));

// The scan trail. Built backwards from where the consignment actually is, so
// the last event always matches the row in the console.
const SCAN_STEPS = [
  { status: 'picked_up', label: 'Picked up from the manufacturer' },
  { status: 'in_transit', label: 'In transit' },
  { status: 'at_hub', label: 'Arrived at sorting hub' },
  { status: 'out_for_delivery', label: 'Out for delivery' },
  { status: 'delivered', label: 'Delivered and signed for' },
];

export const trackingEvents = shipments.flatMap((shipment, index) => {
  const steps = shipment.status === 'delivered' ? SCAN_STEPS : SCAN_STEPS.slice(0, 3);
  const start = Date.parse(shipment.dispatchedAt);
  const span = (Date.parse(shipment.deliveredAt ?? shipment.lastScanAt) - start) || HOUR_MS;

  return steps.map((step, stepIndex) => ({
    id: `TRK-${pad(index + 1, 4)}-${stepIndex + 1}`,
    shipmentId: shipment.id,
    at: new Date(start + (span / Math.max(1, steps.length - 1)) * stepIndex).toISOString(),
    status: step.status,
    label: step.label,
    location:
      stepIndex === 0
        ? shipment.originCity
        : stepIndex >= steps.length - 1 && shipment.status === 'delivered'
          ? shipment.destinationCity
          : ['Mumbai hub', 'Bengaluru hub', 'Surat hub'][(index + stepIndex) % 3],
    source: shipment.carrierName,
  }));
});

// ---------------------------------------------------------------------------
// Shipment exceptions - ADM-064
// ---------------------------------------------------------------------------

const EXCEPTION_TYPES = [
  { type: 'delayed', severity: 'medium', summary: 'Past the delivery SLA', impact: 'The jeweller has been waiting beyond the five day promise.' },
  { type: 'address_issue', severity: 'medium', summary: 'Address could not be located', impact: 'The consignment is sitting at the hub until somebody confirms the address.' },
  { type: 'damaged_packaging', severity: 'high', summary: 'Outer packaging damaged in transit', impact: 'Contents unverified. The seal may have been broken.' },
  { type: 'seal_broken', severity: 'critical', summary: 'Tamper seal broken on arrival', impact: 'Treat as a possible loss. Do not release to the jeweller before a weigh-in.' },
  { type: 'weight_mismatch', severity: 'critical', summary: 'Carrier weight disagrees with the declared weight', impact: 'Metal may be missing. This becomes an insurance claim if it is confirmed.' },
  { type: 'refused_delivery', severity: 'high', summary: 'Jeweller refused delivery', impact: 'The consignment is returning to the manufacturer at Elanzia expense.' },
  { type: 'lost_in_transit', severity: 'critical', summary: 'No scan for over 72 hours', impact: 'The carrier cannot locate the consignment.' },
  { type: 'customs_hold', severity: 'medium', summary: 'Held at a state check post', impact: 'E-way bill queried. Dispatch paperwork needs re-filing.' },
];

// Exceptions land on real consignments, weighted towards the ones still moving
// and the high-value ones, because that is where they actually happen.
const exceptionCandidates = shipments.filter(
  (shipment, index) => shipment.status !== 'delivered' || index % 3 === 0,
);

export const shipmentExceptions = Array.from({ length: 46 }).map((_, index) => {
  const shipment = exceptionCandidates[index % exceptionCandidates.length];
  const kind = EXCEPTION_TYPES[index % EXCEPTION_TYPES.length];
  const raisedAt = isoHoursAgo(2 + index * 5 + (index % 7) * 3);
  const age = hoursSince(raisedAt);

  // The oldest third are still open, which is what makes the SLA badge mean
  // something rather than every row being green.
  const state = index % 3 === 0 ? 'open' : index % 3 === 1 ? 'investigating' : 'resolved';
  const assignee = index % 5 === 0 ? null : opsStaff[index % opsStaff.length];

  return {
    id: `EXC-${pad(index + 1, 4)}`,
    shipmentId: shipment.id,
    awb: shipment.awb,
    orderId: shipment.orderId,
    manufacturerName: shipment.manufacturerName,
    jewellerName: shipment.jewellerName,
    type: kind.type,
    severity: kind.severity,
    summary: kind.summary,
    impact: kind.impact,
    detail: `${shipment.carrierName} reported this on ${shipment.awb} between ${shipment.originCity} and ${shipment.destinationCity}.`,
    declaredValue: shipment.declaredValue,
    raisedAt,
    ageHours: age,
    slaBreached: state !== 'resolved' && age > EXCEPTION_SLA_HOURS,
    state,
    assigneeId: assignee?.id ?? null,
    assigneeName: assignee?.name ?? null,
    resolvedAt: state === 'resolved' ? isoHoursAgo(Math.max(0, age - 6)) : null,
    resolvedBy: state === 'resolved' ? opsStaff[(index + 1) % opsStaff.length].id : null,
    resolution: state === 'resolved' ? 'Carrier re-scanned and the consignment moved on the same day.' : null,
    // A critical exception on an insured consignment is where a claim starts.
    claimEligible: ['seal_broken', 'weight_mismatch', 'lost_in_transit'].includes(kind.type),
  };
});

// ---------------------------------------------------------------------------
// Insurance claims - ADM-068
// ---------------------------------------------------------------------------

export const INSURERS = [
  { id: 'newindia', name: 'New India Assurance', policyPrefix: 'NIA-JWL' },
  { id: 'iffco', name: 'IFFCO Tokio', policyPrefix: 'IFF-VAL' },
  { id: 'bajaj', name: 'Bajaj Allianz', policyPrefix: 'BAJ-TRN' },
];

const LOSS_TYPES = [
  { id: 'partial_loss', label: 'Partial loss', share: 0.35 },
  { id: 'total_loss', label: 'Total loss', share: 1 },
  { id: 'damage', label: 'Damage in transit', share: 0.18 },
  { id: 'theft', label: 'Theft', share: 1 },
  { id: 'shortage', label: 'Weight shortage on arrival', share: 0.12 },
];

const CLAIM_STATES = [
  'submitted', 'under_assessment', 'surveyor_appointed', 'documents_requested',
  'approved', 'settled', 'rejected', 'withdrawn',
];

// Claims only exist on insured consignments. The claim-eligible exceptions
// above are where they come from.
const claimable = shipmentExceptions.filter(
  (exception) => exception.claimEligible && shipmentById[exception.shipmentId].insuredValue > 0,
);

export const insuranceClaims = Array.from({ length: 42 }).map((_, index) => {
  const exception = claimable[index % Math.max(1, claimable.length)];
  const shipment = shipmentById[exception.shipmentId];
  const insurer = INSURERS[index % INSURERS.length];
  const loss = LOSS_TYPES[index % LOSS_TYPES.length];
  const status = CLAIM_STATES[index % CLAIM_STATES.length];

  const claimedValue = Math.round(shipment.insuredValue * loss.share);
  const raisedAt = isoDaysAgo(1 + index * 2);
  const isClosed = ['settled', 'rejected', 'withdrawn'].includes(status);

  return {
    id: `CLM-${pad(index + 1, 4)}`,
    shipmentId: shipment.id,
    awb: shipment.awb,
    orderId: shipment.orderId,
    exceptionId: exception.id,
    manufacturerName: shipment.manufacturerName,
    jewellerName: shipment.jewellerName,
    insurerId: insurer.id,
    insurerName: insurer.name,
    policyNumber: `${insurer.policyPrefix}-${pad(90000 + index * 41, 6)}`,
    lossType: loss.id,
    lossTypeLabel: loss.label,
    incidentAt: exception.raisedAt,
    raisedAt,
    raisedBy: opsStaff[index % opsStaff.length].id,
    raisedByName: opsStaff[index % opsStaff.length].name,
    insuredValue: shipment.insuredValue,
    claimedValue,
    // An insurer rarely pays the full claim. The gap is what Elanzia carries.
    settledValue: status === 'settled' ? Math.round(claimedValue * 0.82) : status === 'rejected' ? 0 : null,
    status,
    insurerReference: index % 4 === 0 ? null : `${insurer.id.toUpperCase()}/${pad(index + 1, 5)}`,
    slaDueAt: new Date(Date.parse(raisedAt) + CLAIM_SLA_DAYS * DAY_MS).toISOString(),
    slaBreached: !isClosed && hoursSince(raisedAt) > CLAIM_SLA_DAYS * 24,
    closedAt: isClosed ? isoDaysAgo(Math.max(0, index * 2 - 4)) : null,
    rejectionReason: status === 'rejected'
      ? 'Surveyor found the seal intact and the declared weight correct on arrival'
      : null,
    documentCount: 2 + (index % 4),
  };
});

// ---------------------------------------------------------------------------
// Returns - ADM-069
//
// A return is per LINE, not per order. A four line order can have one piece
// come back and the other three stay. Core carries three orders with a
// `return` block; those are reproduced here in matching state, and the rest
// are modelled across the delivered orders.
// ---------------------------------------------------------------------------

const RETURN_REASONS = [
  { code: 'purity_dispute', label: 'Assay below the declared purity' },
  { code: 'weight_short', label: 'Net weight short against the invoice' },
  { code: 'damaged', label: 'Damaged in transit' },
  { code: 'wrong_item', label: 'Wrong design dispatched' },
  { code: 'finish_quality', label: 'Finish not to the standard ordered' },
  { code: 'hallmark_missing', label: 'No hallmark on the piece received' },
  { code: 'late_delivery', label: 'Arrived after the event it was bought for' },
];

const returnableOrders = orders.filter((order) =>
  ['delivered', 'returned', 'refunded'].includes(order.status),
);

// The three orders core already describes. Their state here must match, or the
// order page and this queue would tell a jeweller two different stories.
const coreReturnByOrderId = Object.fromEntries(
  orders.filter((order) => order.return).map((order) => [order.id, order.return]),
);

let returnSeq = 0;

export const returns = returnableOrders.flatMap((order, orderIndex) => {
  const core = coreReturnByOrderId[order.id];
  // Orders core already flags return exactly one line, to stay in step with
  // what the order page says. Everything else returns one line, and every
  // other order returns a second, which is a believable return rate on a
  // trade where a piece can fail an assay.
  const linesReturned = core ? 1 : orderIndex % 2 === 0 ? Math.min(2, order.lines.length) : 1;

  return order.lines.slice(0, linesReturned).map((line, lineIndex) => {
    returnSeq += 1;
    const seq = returnSeq;
    const reason = core
      ? RETURN_REASONS.find((r) => core.reason.toLowerCase().includes(r.code.split('_')[0])) ?? RETURN_REASONS[1]
      : RETURN_REASONS[seq % RETURN_REASONS.length];

    const declaredNetWeight = round3(line.netWeight * line.quantity);
    // Most pieces come back exactly. A few are short, and two are short by
    // enough to stop the refund and open a dispute.
    const shortfall = seq % 7 === 0 ? round3(0.4 + (seq % 3) * 0.35) : seq % 5 === 0 ? 0.02 : 0;
    const receivedNetWeight = round3(declaredNetWeight - shortfall);

    const raisedAt = core ? core.raisedAt : isoDaysAgo(2 + seq * 1.5);
    const verifiedAt = core ? core.verifiedAt : seq % 4 === 0 ? null : isoDaysAgo(Math.max(0, 2 + seq * 1.5 - 2));

    // The state machine, and the rule that governs it: nothing reaches
    // 'refunded' without passing through 'verified' first.
    const state = core
      ? core.refundStatus === 'processed'
        ? 'refunded'
        : 'awaiting_verification'
      : !verifiedAt
        ? 'awaiting_verification'
        : shortfall > RETURN_WEIGHT_TOLERANCE_GRAMS
          ? 'disputed'
          : seq % 3 === 0
            ? 'verified'
            : 'refunded';

    return {
      id: `RTN-${pad(seq, 4)}`,
      orderId: order.id,
      orderLineId: line.id,
      productId: line.productId,
      title: line.title,
      sku: line.sku,
      purity: line.purity,
      quantity: line.quantity,
      jewellerId: order.jewellerId,
      jewellerName: jewellerById[order.jewellerId].businessName,
      manufacturerId: line.manufacturerId,
      manufacturerName: manufacturerById[line.manufacturerId].businessName,
      reasonCode: reason.code,
      reason: core ? core.reason : reason.label,
      raisedAt,
      ageHours: hoursSince(raisedAt),
      declaredNetWeight,
      receivedNetWeight: verifiedAt ? receivedNetWeight : null,
      shortfallGrams: verifiedAt ? round3(declaredNetWeight - receivedNetWeight) : null,
      withinTolerance: verifiedAt ? shortfall <= RETURN_WEIGHT_TOLERANCE_GRAMS : null,
      verifiedAt,
      verifiedBy: verifiedAt ? opsStaff[seq % opsStaff.length].id : null,
      mediaChecked: Boolean(verifiedAt),
      state,
      // The refund is the line price the order was CONFIRMED at. Nothing here
      // reads today's metal rate: a confirmed order's price is permanent.
      refundAmount: line.lineTotal,
      refundedAt: state === 'refunded' ? isoDaysAgo(Math.max(0, seq * 1.5 - 3)) : null,
      disputeId: state === 'disputed' ? `DSP-${pad(seq, 4)}` : null,
      mediaCount: 3 + (seq % 3),
      lineIndex,
    };
  });
});

export const returnById = Object.fromEntries(returns.map((row) => [row.id, row]));

// Unboxing video, packing video and the weighbridge slip. The unboxing video is
// what a verification is checked against, so every return has one.
export const returnMedia = returns.flatMap((returnRecord, index) => {
  const base = [
    { kind: 'unboxing_video', type: 'video', label: 'Unboxing video from the jeweller', durationSeconds: 90 + (index % 60) },
    { kind: 'packing_video', type: 'video', label: 'Packing video from the manufacturer', durationSeconds: 120 + (index % 40) },
    { kind: 'weighbridge_slip', type: 'document', label: 'Weigh-in slip at the Elanzia hub', durationSeconds: null },
  ];
  const extras = [
    { kind: 'photo', type: 'image', label: 'Piece as received, front', durationSeconds: null },
    { kind: 'photo', type: 'image', label: 'Hallmark close-up as received', durationSeconds: null },
  ].slice(0, returnRecord.mediaCount - 3);

  return [...base, ...extras].map((media, mediaIndex) => ({
    id: `${returnRecord.id}-M${mediaIndex + 1}`,
    returnId: returnRecord.id,
    kind: media.kind,
    type: media.type,
    label: media.label,
    url: null,
    capturedAt: returnRecord.raisedAt,
    durationSeconds: media.durationSeconds,
    uploadedByParty: media.kind === 'packing_video' ? 'manufacturer' : media.kind === 'weighbridge_slip' ? 'elanzia' : 'jeweller',
  }));
});
