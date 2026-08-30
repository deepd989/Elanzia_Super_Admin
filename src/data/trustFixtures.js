// Feature fixtures for Trust and issue resolution - ADM-065 to ADM-067,
// ADM-070, ADM-071.
//
// Everything here references src/data/core by id. No order, product,
// manufacturer, jeweller or admin user is invented in this file.
//
// It also imports `returns` from logisticsFixtures, which is the one place
// these two halves of the feature area touch: a return whose weigh-in comes up
// short beyond tolerance becomes a dispute, and the dispute has to carry the
// same id the return already points at.

import { adminUsers, jewellerById, manufacturerById, orderById, orders, products } from '@/data/core';
import { RETURN_WEIGHT_TOLERANCE_GRAMS, returns } from '@/data/logisticsFixtures';

export const TRUST_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(TRUST_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoHoursAgo = (h) => new Date(NOW_MS - h * HOUR_MS).toISOString();
const isoDaysAgo = (d) => new Date(NOW_MS - d * DAY_MS).toISOString();
const isoDaysAhead = (d) => new Date(NOW_MS + d * DAY_MS).toISOString();
const pad = (n, w) => String(n).padStart(w, '0');
const hoursSince = (iso) => (iso ? Math.max(0, Math.round((NOW_MS - Date.parse(iso)) / HOUR_MS)) : null);

const trustStaff = adminUsers.filter(
  (user) => user.status === 'active' && ['ops', 'support', 'finance', 'super_admin'].includes(user.roleId),
);

export const DISPUTE_SLA_HOURS = 72;

// ---------------------------------------------------------------------------
// Disputes - ADM-065
// ---------------------------------------------------------------------------

const DISPUTE_TYPES = [
  { type: 'purity', label: 'Purity below declaration', severity: 'critical' },
  { type: 'weight_shortfall', label: 'Weight short on return', severity: 'critical' },
  { type: 'damage', label: 'Damaged on arrival', severity: 'high' },
  { type: 'non_delivery', label: 'Goods never arrived', severity: 'critical' },
  { type: 'wrong_item', label: 'Wrong piece dispatched', severity: 'medium' },
  { type: 'late_delivery', label: 'Delivered after the promised date', severity: 'medium' },
  { type: 'payment', label: 'Payment or invoice discrepancy', severity: 'high' },
  { type: 'hallmark', label: 'Hallmark disputed on the piece received', severity: 'high' },
];

const DISPUTE_STATUSES = ['open', 'awaiting_evidence', 'under_review', 'resolved', 'closed'];

// Every return that failed its weigh-in already points at a dispute id. Those
// disputes are built first, with the id the return expects, so the link works
// in both directions.
const shortfallReturns = returns.filter((row) => row.disputeId);

const shortfallDisputes = shortfallReturns.map((returnRecord, index) => {
  const order = orderById[returnRecord.orderId];
  const raisedAt = returnRecord.verifiedAt ?? returnRecord.raisedAt;

  return {
    id: returnRecord.disputeId,
    orderId: returnRecord.orderId,
    returnId: returnRecord.id,
    type: 'weight_shortfall',
    typeLabel: 'Weight short on return',
    subject: `${returnRecord.shortfallGrams}g short on ${returnRecord.sku}`,
    detail:
      `The piece left at ${returnRecord.declaredNetWeight}g and was weighed back in at ` +
      `${returnRecord.receivedNetWeight}g. That is ${returnRecord.shortfallGrams}g beyond the ` +
      `${RETURN_WEIGHT_TOLERANCE_GRAMS}g tolerance, so the refund is held until this is settled.`,
    severity: 'critical',
    // The platform raised this itself, off the weigh-in. Nobody had to notice.
    raisedByParty: 'elanzia',
    raisedById: null,
    raisedByName: 'Automatic weigh-in check',
    againstParty: 'jeweller',
    jewellerId: returnRecord.jewellerId,
    jewellerName: returnRecord.jewellerName,
    manufacturerId: returnRecord.manufacturerId,
    manufacturerName: returnRecord.manufacturerName,
    raisedAt,
    ageHours: hoursSince(raisedAt),
    slaDueAt: new Date(Date.parse(raisedAt) + DISPUTE_SLA_HOURS * HOUR_MS).toISOString(),
    slaBreached: hoursSince(raisedAt) > DISPUTE_SLA_HOURS,
    status: index % 2 === 0 ? 'under_review' : 'open',
    assigneeId: trustStaff[index % trustStaff.length].id,
    assigneeName: trustStaff[index % trustStaff.length].name,
    claimValue: returnRecord.refundAmount,
    evidenceCount: 4,
    messageCount: 2 + index,
    resolutionId: null,
    autoRaised: true,
  };
});

// The order core already flags as disputed, plus a spread across the delivered
// book so the console has something to filter.
const disputableOrders = orders.filter((order) =>
  ['delivered', 'returned', 'refunded', 'disputed'].includes(order.status),
);

const filler = Array.from({ length: 40 }).map((_, index) => {
  const order = disputableOrders[index % disputableOrders.length];
  const coreDispute = order.disputeReason;
  const kind = coreDispute ? DISPUTE_TYPES[0] : DISPUTE_TYPES[index % DISPUTE_TYPES.length];
  const raisedAt = isoDaysAgo(1 + index * 1.7);
  const status = DISPUTE_STATUSES[index % DISPUTE_STATUSES.length];
  const isClosed = ['resolved', 'closed'].includes(status);
  const jeweller = jewellerById[order.jewellerId];
  const manufacturer = manufacturerById[order.manufacturerIds[0]];
  const againstParty = ['payment', 'late_delivery'].includes(kind.type) ? 'elanzia' : 'manufacturer';

  return {
    id: `DSP-${pad(1000 + index, 4)}`,
    orderId: order.id,
    returnId: null,
    type: kind.type,
    typeLabel: kind.label,
    subject: coreDispute ?? `${kind.label} on ${order.id}`,
    detail: coreDispute
      ? `${coreDispute}. Raised by ${jeweller.businessName} against ${manufacturer.businessName}.`
      : `${jeweller.businessName} raised this against ${manufacturer.businessName} after delivery of ${order.id}.`,
    severity: kind.severity,
    raisedByParty: 'jeweller',
    raisedById: order.jewellerId,
    raisedByName: jeweller.businessName,
    againstParty,
    jewellerId: order.jewellerId,
    jewellerName: jeweller.businessName,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    raisedAt,
    ageHours: hoursSince(raisedAt),
    slaDueAt: new Date(Date.parse(raisedAt) + DISPUTE_SLA_HOURS * HOUR_MS).toISOString(),
    slaBreached: !isClosed && hoursSince(raisedAt) > DISPUTE_SLA_HOURS,
    status,
    assigneeId: index % 6 === 0 ? null : trustStaff[index % trustStaff.length].id,
    assigneeName: index % 6 === 0 ? null : trustStaff[index % trustStaff.length].name,
    claimValue: Math.round(order.goodsValue * [0.1, 0.25, 1, 0.4][index % 4]),
    evidenceCount: 2 + (index % 4),
    messageCount: 1 + (index % 6),
    resolutionId: isClosed ? `RES-${pad(index + 1, 4)}` : null,
    autoRaised: false,
  };
});

export const disputes = [...shortfallDisputes, ...filler];
export const disputeById = Object.fromEntries(disputes.map((row) => [row.id, row]));

// ---------------------------------------------------------------------------
// Evidence and messages - ADM-066
// ---------------------------------------------------------------------------

const EVIDENCE_TEMPLATES = [
  { kind: 'packing_video', type: 'video', label: 'Packing video from the manufacturer', party: 'manufacturer', durationSeconds: 145 },
  { kind: 'unboxing_video', type: 'video', label: 'Unboxing video from the jeweller', party: 'jeweller', durationSeconds: 98 },
  { kind: 'photo', type: 'image', label: 'Piece as received', party: 'jeweller', durationSeconds: null },
  { kind: 'assay_report', type: 'document', label: 'Independent assay report', party: 'jeweller', durationSeconds: null },
  { kind: 'weighbridge_slip', type: 'document', label: 'Elanzia hub weigh-in slip', party: 'elanzia', durationSeconds: null },
  { kind: 'invoice', type: 'document', label: 'Original tax invoice', party: 'elanzia', durationSeconds: null },
];

// Packing video, unboxing video, photos and documents in one place, because a
// reviewer deciding who pays should not be opening four tabs to do it.
export const disputeEvidence = disputes.flatMap((dispute, index) =>
  EVIDENCE_TEMPLATES.slice(0, dispute.evidenceCount).map((template, itemIndex) => ({
    id: `${dispute.id}-E${itemIndex + 1}`,
    disputeId: dispute.id,
    kind: template.kind,
    type: template.type,
    label: template.label,
    url: null,
    uploadedByParty: template.party,
    uploadedAt: isoHoursAgo(hoursSince(dispute.raisedAt) - itemIndex),
    durationSeconds: template.durationSeconds,
    sizeBytes: template.type === 'video' ? 18_000_000 + itemIndex * 1_200_000 : 240_000 + itemIndex * 40_000,
  })),
);

const MESSAGE_BODIES = [
  'The assay came back at 91.2 percent against a declared 91.6. Report attached.',
  'Our packing video shows the piece sealed at the declared weight. Please check the outer seal.',
  'Requesting an independent assay at a mutually agreed lab before we go further.',
  'The consignment seal was intact on arrival according to the carrier scan.',
  'We are willing to take the piece back and re-finish it at our cost.',
  'The jeweller has confirmed they will accept a partial credit rather than a return.',
  'Escalating to the trust desk. Both parties have submitted their evidence.',
];

export const disputeMessages = disputes.flatMap((dispute, index) =>
  Array.from({ length: dispute.messageCount }).map((_, messageIndex) => {
    const isInternal = messageIndex === dispute.messageCount - 1 && index % 3 === 0;
    const party = messageIndex % 2 === 0 ? 'jeweller' : 'manufacturer';

    return {
      id: `${dispute.id}-M${messageIndex + 1}`,
      disputeId: dispute.id,
      at: isoHoursAgo(Math.max(1, hoursSince(dispute.raisedAt) - messageIndex * 6)),
      authorParty: isInternal ? 'elanzia' : party,
      authorId: isInternal ? dispute.assigneeId : party === 'jeweller' ? dispute.jewellerId : dispute.manufacturerId,
      authorName: isInternal
        ? dispute.assigneeName ?? 'Elanzia trust desk'
        : party === 'jeweller'
          ? dispute.jewellerName
          : dispute.manufacturerName,
      body: MESSAGE_BODIES[(index + messageIndex) % MESSAGE_BODIES.length],
      // An internal note is visible to Elanzia only. Both parties see the rest.
      internal: isInternal,
      attachmentCount: messageIndex % 3 === 0 ? 1 : 0,
    };
  }),
);

// ---------------------------------------------------------------------------
// Resolution outcomes - ADM-067
//
// Every outcome says who carries the cost. That is the whole point of the
// screen: a resolution that does not name a liable party has not resolved
// anything, it has just closed a ticket.
// ---------------------------------------------------------------------------

export const resolutionOutcomes = [
  {
    id: 'upheld_manufacturer_liable',
    label: 'Upheld against the manufacturer',
    description: 'The complaint stands. The jeweller is refunded and the manufacturer carries it.',
    liableParty: 'manufacturer',
    refundsJeweller: true,
    recoversFromManufacturer: true,
    reversesCommission: true,
    requiresAmount: true,
  },
  {
    id: 'upheld_partial_credit',
    label: 'Upheld in part, credit issued',
    description: 'Partly the manufacturer, partly acceptable variance. A credit note settles it.',
    liableParty: 'manufacturer',
    refundsJeweller: false,
    issuesCredit: true,
    recoversFromManufacturer: true,
    reversesCommission: false,
    requiresAmount: true,
  },
  {
    id: 'rejected_jeweller_liable',
    label: 'Rejected, no fault found',
    description: 'The evidence supports the manufacturer. No refund and no credit.',
    liableParty: 'jeweller',
    refundsJeweller: false,
    recoversFromManufacturer: false,
    reversesCommission: false,
    requiresAmount: false,
  },
  {
    id: 'carrier_liable',
    label: 'Carrier at fault, insurance claim',
    description: 'Loss or damage in transit. The jeweller is made whole and the claim recovers it.',
    liableParty: 'carrier',
    refundsJeweller: true,
    recoversFromManufacturer: false,
    reversesCommission: true,
    opensInsuranceClaim: true,
    requiresAmount: true,
  },
  {
    id: 'goodwill_elanzia_absorbs',
    label: 'Goodwill, Elanzia absorbs',
    description: 'Nobody is clearly at fault and the relationship is worth more than the amount.',
    liableParty: 'elanzia',
    refundsJeweller: true,
    recoversFromManufacturer: false,
    reversesCommission: false,
    requiresAmount: true,
  },
  {
    id: 'replacement_issued',
    label: 'Replacement piece issued',
    description: 'The manufacturer remakes the piece. No money moves.',
    liableParty: 'manufacturer',
    refundsJeweller: false,
    recoversFromManufacturer: false,
    reversesCommission: false,
    issuesReplacement: true,
    requiresAmount: false,
  },
];

export const resolutions = disputes
  .filter((dispute) => dispute.resolutionId)
  .map((dispute, index) => {
    const outcome = resolutionOutcomes[index % resolutionOutcomes.length];
    const refundAmount = outcome.refundsJeweller ? dispute.claimValue : 0;
    const creditAmount = outcome.issuesCredit ? Math.round(dispute.claimValue * 0.4) : 0;
    const order = orderById[dispute.orderId];
    const commissionReversed = outcome.reversesCommission
      ? Math.round(((refundAmount || dispute.claimValue) * order.commissionPercent) / 100)
      : 0;
    const manufacturerRecovery = outcome.recoversFromManufacturer ? refundAmount + creditAmount : 0;

    return {
      id: dispute.resolutionId,
      disputeId: dispute.id,
      orderId: dispute.orderId,
      outcome: outcome.id,
      outcomeLabel: outcome.label,
      liableParty: outcome.liableParty,
      refundAmount,
      creditAmount,
      commissionReversed,
      manufacturerRecovery,
      // Whatever nobody else carries lands on the platform.
      elanziaAbsorbs: refundAmount + creditAmount - manufacturerRecovery,
      note: `${outcome.description} Settled against ${dispute.orderId}.`,
      recordedAt: isoDaysAgo(index * 2),
      recordedBy: trustStaff[index % trustStaff.length].id,
      recordedByName: trustStaff[index % trustStaff.length].name,
      notifiedParties: true,
    };
  });

// ---------------------------------------------------------------------------
// Certificates - ADM-070
//
// Catalogue moderation asks whether a listing may publish. This asks whether
// the certificates themselves hold up: duplicate HUIDs, a hallmark purity that
// disagrees with the declared purity, an expired stone certificate. The states
// are derived from the same product fields Catalogue reads, so the two views
// cannot contradict each other.
// ---------------------------------------------------------------------------

export const CERTIFICATE_KINDS = [
  { id: 'bis_hallmark', label: 'BIS hallmark', issuer: 'Bureau of Indian Standards' },
  { id: 'huid', label: 'HUID', issuer: 'Bureau of Indian Standards' },
  { id: 'igi', label: 'IGI stone report', issuer: 'International Gemmological Institute' },
  { id: 'gia', label: 'GIA stone report', issuer: 'Gemological Institute of America' },
];

// Two pieces deliberately share a HUID. A HUID is unique to one article by
// definition, so a duplicate is either a clerical error or a piece passing off
// another's hallmark, and it is the single most serious thing this screen finds.
const DUPLICATE_HUID_PAIR = products.filter((product) => product.huid).slice(0, 2);

let certSeq = 0;

export const certificates = products.flatMap((product, index) => {
  const rows = [];
  const manufacturer = manufacturerById[product.manufacturerId];
  const base = {
    productId: product.id,
    sku: product.sku,
    productTitle: product.title,
    manufacturerId: product.manufacturerId,
    manufacturerName: manufacturer.businessName,
    declaredPurity: product.purity,
    productStatus: product.status,
  };

  // Hallmark. The same rule Catalogue uses: live at 22K or above without one
  // is the critical case, and it shows here as a missing certificate.
  const hallmarkMissing = !product.hallmarked;
  certSeq += 1;
  rows.push({
    ...base,
    id: `CRT-${pad(certSeq, 4)}`,
    kind: 'bis_hallmark',
    kindLabel: 'BIS hallmark',
    issuer: 'Bureau of Indian Standards',
    number: product.hallmarked ? `BIS/${pad(700000 + index * 13, 6)}` : null,
    issuedAt: product.hallmarked ? product.listedAt : null,
    expiresAt: null,
    certifiedPurity: product.hallmarked
      ? index % 17 === 0
        ? product.purity - 1 // a real assay disagreement, seeded on purpose
        : product.purity
      : null,
    state: hallmarkMissing
      ? 'missing'
      : index % 17 === 0
        ? 'flagged'
        : 'valid',
    flagReason: hallmarkMissing
      ? null
      : index % 17 === 0
        ? 'purity_mismatch'
        : null,
    flagDetail:
      index % 17 === 0 && !hallmarkMissing
        ? `Hallmark certifies ${product.purity - 1}K against a declared ${product.purity}K`
        : null,
    // Critical only where the piece is actually on sale. A draft without a
    // hallmark is paperwork; a live 22K piece without one is unsellable stock
    // sitting on the marketplace.
    severity:
      hallmarkMissing && product.status === 'live' && product.purity >= 22 ? 'critical' : 'medium',
    flaggedAt: index % 17 === 0 ? isoDaysAgo(index % 30) : null,
    flaggedBy: index % 17 === 0 ? trustStaff[index % trustStaff.length].id : null,
    verifiedAt: product.hallmarked && index % 17 !== 0 ? isoDaysAgo(30 + (index % 60)) : null,
  });

  // HUID, present exactly when hallmarked.
  if (product.huid) {
    const isDuplicate = DUPLICATE_HUID_PAIR.some((row) => row.id === product.id);
    certSeq += 1;
    rows.push({
      ...base,
      id: `CRT-${pad(certSeq, 4)}`,
      kind: 'huid',
      kindLabel: 'HUID',
      issuer: 'Bureau of Indian Standards',
      number: isDuplicate ? DUPLICATE_HUID_PAIR[0].huid : product.huid,
      issuedAt: product.listedAt,
      expiresAt: null,
      certifiedPurity: product.purity,
      state: isDuplicate ? 'duplicate' : 'valid',
      flagReason: isDuplicate ? 'duplicate_huid' : null,
      flagDetail: isDuplicate
        ? `This HUID is recorded against ${DUPLICATE_HUID_PAIR.map((row) => row.sku).join(' and ')}. A HUID identifies one article.`
        : null,
      severity: isDuplicate ? 'critical' : 'low',
      flaggedAt: isDuplicate ? isoDaysAgo(4) : null,
      flaggedBy: isDuplicate ? trustStaff[0].id : null,
      verifiedAt: isDuplicate ? null : isoDaysAgo(20 + (index % 40)),
    });
  }

  // Stone report, where the piece carries stones.
  if (product.stoneWeight > 0) {
    const kind = index % 2 === 0 ? CERTIFICATE_KINDS[2] : CERTIFICATE_KINDS[3];
    const issuedAt = isoDaysAgo(200 + (index % 400));
    const expiresAt = isoDaysAhead(index % 9 === 0 ? -12 : 300 + (index % 200));
    const expired = Date.parse(expiresAt) < NOW_MS;
    certSeq += 1;
    rows.push({
      ...base,
      id: `CRT-${pad(certSeq, 4)}`,
      kind: kind.id,
      kindLabel: kind.label,
      issuer: kind.issuer,
      number: `${kind.id.toUpperCase()}-${pad(2200000 + index * 29, 7)}`,
      issuedAt,
      expiresAt,
      certifiedPurity: null,
      state: expired ? 'expired' : 'valid',
      flagReason: expired ? 'expired' : null,
      flagDetail: expired ? 'The stone report lapsed and has not been renewed' : null,
      severity: expired ? 'medium' : 'low',
      flaggedAt: null,
      flaggedBy: null,
      verifiedAt: expired ? null : isoDaysAgo(15 + (index % 50)),
    });
  }

  return rows;
});

export const certificateById = Object.fromEntries(certificates.map((row) => [row.id, row]));

// ---------------------------------------------------------------------------
// Reviews - ADM-071
// ---------------------------------------------------------------------------

const REVIEW_BODIES = [
  { rating: 5, title: 'Exactly as described', body: 'Weight and finish matched the listing to the gram. Packed well and dispatched a day early.' },
  { rating: 4, title: 'Good piece, slow dispatch', body: 'The necklace is beautiful and the hallmark is clean. Took three days longer than promised.' },
  { rating: 5, title: 'Reliable for bridal orders', body: 'Third order from this workshop and the quality has not moved. Will keep buying.' },
  { rating: 2, title: 'Finish not up to standard', body: 'Visible tool marks on the reverse. Raised it with support and they have been helpful.' },
  { rating: 3, title: 'Fine but overpriced for the wastage', body: 'Sixteen percent wastage on a machine chain is steep. The piece itself is fine.' },
  { rating: 1, title: 'Assay came back short', body: 'Independent assay read below the declared purity. Dispute raised and still open.' },
  { rating: 4, title: 'Solid supplier', body: 'Good communication when I asked for a size change before dispatch.' },
];

const FLAG_REASONS = ['abusive_language', 'off_topic', 'suspected_fake', 'names_an_individual', 'competitor_review'];

const reviewableOrders = orders.filter((order) => order.status === 'delivered');

export const reviews = Array.from({ length: 64 }).map((_, index) => {
  const order = reviewableOrders[index % reviewableOrders.length];
  const template = REVIEW_BODIES[index % REVIEW_BODIES.length];
  const jeweller = jewellerById[order.jewellerId];
  const targetIsProduct = index % 3 !== 0;
  const line = order.lines[index % order.lines.length];
  const manufacturer = manufacturerById[line.manufacturerId];

  const flagCount = index % 6 === 0 ? 1 + (index % 3) : 0;
  const state = flagCount > 0
    ? index % 12 === 0
      ? 'removed'
      : 'held'
    : index % 9 === 0
      ? 'pending'
      : 'published';

  const submittedAt = isoDaysAgo(1 + index * 1.3);

  return {
    id: `REV-${pad(index + 1, 4)}`,
    targetType: targetIsProduct ? 'product' : 'manufacturer',
    targetId: targetIsProduct ? line.productId : manufacturer.id,
    targetName: targetIsProduct ? line.title : manufacturer.businessName,
    manufacturerId: manufacturer.id,
    manufacturerName: manufacturer.businessName,
    orderId: order.id,
    jewellerId: order.jewellerId,
    jewellerName: jeweller.businessName,
    // Only a jeweller who actually bought the piece can review it, so every
    // row here is anchored to a delivered order.
    verifiedPurchase: true,
    rating: template.rating,
    title: template.title,
    body: template.body,
    submittedAt,
    ageHours: hoursSince(submittedAt),
    state,
    flagCount,
    flagReasons: flagCount > 0 ? FLAG_REASONS.slice(0, flagCount) : [],
    moderatedAt: ['held', 'removed'].includes(state) ? isoDaysAgo(index % 10) : null,
    moderatedBy: ['held', 'removed'].includes(state) ? trustStaff[index % trustStaff.length].id : null,
    moderationReason: state === 'removed' ? 'Names an individual employee by name' : null,
    // A one star review on an order with an open dispute is context a
    // moderator needs before deciding whether it is abuse or a fair account.
    linkedDisputeId: disputes.find((dispute) => dispute.orderId === order.id)?.id ?? null,
  };
});
