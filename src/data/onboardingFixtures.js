// Feature fixtures for Onboarding - ADM-013 to ADM-016.
//
// Everything here references src/data/core by id. No manufacturer or jeweller
// is invented in this file: an application IS a core member row, plus the
// paperwork and the checks that were run against it.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so a screenshot taken today still matches the code tomorrow.

import { adminUsers, jewellers, manufacturers } from '@/data/core';

// The anchor. Matches operationsFixtures.js so the alert queue and the
// application queue agree about how old a waiting application is.
export const ONBOARDING_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(ONBOARDING_NOW);
const HOUR_MS = 3600000;

const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const hoursSince = (iso) => (iso ? Math.max(0, Math.round((NOW_MS - Date.parse(iso)) / HOUR_MS)) : null);

// How long an applicant may reasonably be left without a decision. The same
// number operationsFixtures grades its verification alerts against.
export const VERIFICATION_SLA_HOURS = 48;

// The statuses that still need a human. Everything else has been decided.
export const PENDING_STATUSES = ['applied', 'under_review', 'info_requested'];

const verificationStaff = adminUsers.filter(
  (user) => user.status === 'active' && ['ops', 'super_admin'].includes(user.roleId),
);

const pick = (rows, index) => rows[index % rows.length];

// ---------------------------------------------------------------------------
// Verification checks
// ---------------------------------------------------------------------------

// The first two digits of a GSTIN are the state the business is registered in.
// An address in Rajkot behind a 33 GSTIN is either a typo or a different
// business, and both are worth stopping on.
const GST_STATE_CODES = {
  Gujarat: '24',
  'Tamil Nadu': '33',
  Rajasthan: '08',
  'West Bengal': '19',
  Maharashtra: '27',
  Telangana: '36',
};

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z][A-Z0-9]$/;

function checkState(passed) {
  return passed ? 'pass' : 'fail';
}

// A check is { code, state, detail, blocking }. `blocking` means an approval
// is refused while it fails - see decideApplication in the mock API. The
// non-blocking ones are things a reviewer should read and may still overrule.
function manufacturerChecks(manufacturer, index) {
  // Digits 3 to 12 of a GSTIN are the holder's PAN. Two documents that disagree
  // about the PAN are two different businesses, whatever the letterhead says.
  const embeddedPan = manufacturer.gstin.slice(2, 12);
  const expectedStateCode = GST_STATE_CODES[manufacturer.state];

  // The BIS register lookup is a live call in production. One applicant in
  // seven comes back unmatched, which is the case the workspace exists for:
  // the licence number is on the form and is not on the register.
  const bisOnRegister = Boolean(manufacturer.bisLicence) && index % 7 !== 3;

  return [
    {
      code: 'gstin_format',
      state: checkState(GSTIN_PATTERN.test(manufacturer.gstin)),
      detail: manufacturer.gstin,
      blocking: true,
    },
    {
      code: 'gstin_state',
      state: checkState(manufacturer.gstin.slice(0, 2) === expectedStateCode),
      detail: `${manufacturer.gstin.slice(0, 2)} against ${manufacturer.state}`,
      blocking: true,
    },
    {
      code: 'pan_embedded',
      state: checkState(embeddedPan === manufacturer.pan),
      detail: `${manufacturer.pan} against ${embeddedPan} in the GSTIN`,
      blocking: true,
    },
    {
      // Hallmarked gold cannot legally be sold without a BIS registration, so
      // an unmatched licence stops an approval outright rather than warning.
      code: 'bis_register',
      state: checkState(bisOnRegister),
      detail: manufacturer.bisLicence ?? 'No licence number on the application',
      blocking: true,
    },
    {
      code: 'duplicate_gstin',
      state: checkState(
        manufacturers.filter((row) => row.gstin === manufacturer.gstin).length === 1,
      ),
      detail: 'Checked against every manufacturer and jeweller on the platform',
      blocking: true,
    },
    {
      // A one rupee credit to the account on the cancelled cheque. It fails
      // when the name on the account is not the name on the application.
      code: 'bank_penny_drop',
      state: index % 5 === 2 ? 'pending' : 'pass',
      detail: index % 5 === 2 ? 'Awaiting the credit to settle' : `Name matched ${manufacturer.legalName}`,
      blocking: false,
    },
    {
      code: 'factory_address',
      state: index % 6 === 4 ? 'fail' : 'pass',
      detail:
        index % 6 === 4
          ? 'Address proof shows a residential premises, not a workshop'
          : `${manufacturer.city} ${manufacturer.pincode}`,
      blocking: false,
    },
  ];
}

function jewellerChecks(jeweller, index) {
  // Jewellers register with a GSTIN and no separate PAN card, so the PAN is
  // read out of the GSTIN rather than matched against a second document.
  const expectedStateCode = GST_STATE_CODES[jeweller.state];

  return [
    {
      code: 'gstin_format',
      state: checkState(GSTIN_PATTERN.test(jeweller.gstin)),
      detail: jeweller.gstin,
      blocking: true,
    },
    {
      code: 'gstin_state',
      state: checkState(jeweller.gstin.slice(0, 2) === expectedStateCode),
      detail: `${jeweller.gstin.slice(0, 2)} against ${jeweller.state}`,
      blocking: true,
    },
    {
      code: 'duplicate_gstin',
      state: checkState(jewellers.filter((row) => row.gstin === jeweller.gstin).length === 1),
      detail: 'Checked against every manufacturer and jeweller on the platform',
      blocking: true,
    },
    {
      // A retail counter selling gold needs a shop and establishment
      // registration. Without it there is no premises to deliver lakhs to.
      code: 'shop_establishment',
      state: index % 8 === 5 ? 'fail' : 'pass',
      detail:
        index % 8 === 5
          ? 'Registration certificate expired and has not been renewed'
          : jeweller.shopType,
      blocking: true,
    },
    {
      code: 'bank_penny_drop',
      state: index % 5 === 3 ? 'pending' : 'pass',
      detail: index % 5 === 3 ? 'Awaiting the credit to settle' : `Name matched ${jeweller.businessName}`,
      blocking: false,
    },
    {
      // An invited jeweller was vouched for by a manufacturer already trading
      // on the platform, which is worth telling the reviewer.
      code: 'referral',
      state: jeweller.invitedByManufacturerId ? 'pass' : 'pending',
      detail: jeweller.invitedByManufacturerId
        ? `Invited by ${jeweller.invitedByManufacturerId}`
        : 'Registered directly, no referrer',
      blocking: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

const MANUFACTURER_DOCUMENTS = [
  { kind: 'gst_certificate', type: 'document', label: 'GST registration certificate', pageCount: 2 },
  { kind: 'pan_card', type: 'document', label: 'PAN card', pageCount: 1 },
  { kind: 'bis_licence', type: 'document', label: 'BIS hallmarking licence', pageCount: 3 },
  { kind: 'cancelled_cheque', type: 'image', label: 'Cancelled cheque', pageCount: 1 },
  { kind: 'address_proof', type: 'document', label: 'Workshop address proof', pageCount: 2 },
  { kind: 'premises_photos', type: 'image', label: 'Workshop photographs', pageCount: 1 },
];

const JEWELLER_DOCUMENTS = [
  { kind: 'gst_certificate', type: 'document', label: 'GST registration certificate', pageCount: 2 },
  { kind: 'shop_establishment', type: 'document', label: 'Shop and establishment registration', pageCount: 2 },
  { kind: 'cancelled_cheque', type: 'image', label: 'Cancelled cheque', pageCount: 1 },
  { kind: 'address_proof', type: 'document', label: 'Shop address proof', pageCount: 2 },
  { kind: 'premises_photos', type: 'image', label: 'Shop front photographs', pageCount: 1 },
];

// An application that has been sent back for more information is missing
// exactly the document it was sent back for. That is the whole reason the row
// is sitting in info_requested rather than under_review.
function documentsFor(member, templates, submittedAt, index) {
  const missingAt = member.status === 'info_requested' ? templates.length - (1 + (index % 2)) : -1;

  return templates.map((template, templateIndex) => ({
    id: `${member.id}-DOC-${templateIndex + 1}`,
    applicationId: member.id,
    kind: template.kind,
    type: template.type,
    label: template.label,
    // Null until a document store is wired up. MediaViewer renders the
    // placeholder for a null url, which is honest about a prototype.
    url: null,
    pageCount: template.pageCount,
    sizeBytes: 180_000 + templateIndex * 46_000,
    state: templateIndex === missingAt ? 'missing' : 'received',
    uploadedAt: templateIndex === missingAt ? null : isoHoursAgo(hoursSince(submittedAt) - templateIndex),
  }));
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

const INFO_REQUEST_NOTES = [
  'The address proof is a rent agreement that expired in March. Please send a current one.',
  'The cancelled cheque is illegible at the account number. A clearer scan please.',
  'The GST certificate on file is the provisional one. We need the final registration.',
  'The premises photographs do not show the signage. Please include the shop front.',
];

const DECISION_NOTES = {
  approved: 'Documents verified and the register lookups matched. Admitted to the marketplace.',
  rejected: 'Refused at verification. The applicant has been told what did not check out.',
  suspended: 'Trading stopped pending a fresh set of documents.',
};

function timelineFor(member, submittedAt, index) {
  const reviewer = pick(verificationStaff, index);
  const entries = [
    {
      id: `${member.id}-EV-1`,
      at: submittedAt,
      kind: 'submitted',
      actorId: null,
      actorName: member.businessName,
      summary: 'Application submitted with the supporting documents',
    },
  ];

  if (member.status !== 'applied') {
    entries.push({
      id: `${member.id}-EV-2`,
      at: isoHoursAgo(Math.max(1, hoursSince(submittedAt) - 6)),
      kind: 'assigned',
      actorId: reviewer.id,
      actorName: reviewer.name,
      summary: 'Picked up for verification',
    });
  }

  if (member.status === 'info_requested') {
    entries.push({
      id: `${member.id}-EV-3`,
      at: isoHoursAgo(Math.max(1, hoursSince(submittedAt) - 12)),
      kind: 'info_requested',
      actorId: reviewer.id,
      actorName: reviewer.name,
      summary: pick(INFO_REQUEST_NOTES, index),
    });
  }

  const decidedAt = member.approvedAt ?? member.kycVerifiedAt ?? null;
  if (DECISION_NOTES[member.status]) {
    entries.push({
      id: `${member.id}-EV-4`,
      at: decidedAt ?? isoHoursAgo(Math.max(1, hoursSince(submittedAt) - 24)),
      kind: 'decision',
      actorId: reviewer.id,
      actorName: reviewer.name,
      summary:
        member.rejectionReason ?? member.suspensionReason ?? DECISION_NOTES[member.status],
    });
  }

  return entries.sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
}

// ---------------------------------------------------------------------------
// The application rows
// ---------------------------------------------------------------------------

// An application row is the core member row plus the queue facts a reviewer
// sorts and filters on. It never carries a copy of the member's own fields
// under a second name.
function applicationRow(member, submittedAt, checks, index) {
  const ageHours = hoursSince(submittedAt) ?? 0;
  const isPending = PENDING_STATUSES.includes(member.status);

  return {
    id: member.id,
    submittedAt,
    ageHours,
    // Only an undecided application can breach. A rejection recorded four
    // months late is history, not a queue item.
    slaBreached: isPending && ageHours > VERIFICATION_SLA_HOURS,
    reviewerId: member.status === 'applied' ? null : pick(verificationStaff, index).id,
    reviewerName: member.status === 'applied' ? null : pick(verificationStaff, index).name,
    documentCount: checks.length,
    failedCheckCount: checks.filter((check) => check.state === 'fail').length,
    blockedCheckCount: checks.filter((check) => check.state === 'fail' && check.blocking).length,
    pendingCheckCount: checks.filter((check) => check.state === 'pending').length,
  };
}

const manufacturerRecords = manufacturers.map((manufacturer, index) => {
  const checks = manufacturerChecks(manufacturer, index);
  const documents = documentsFor(
    manufacturer,
    MANUFACTURER_DOCUMENTS,
    manufacturer.appliedAt,
    index,
  );

  return {
    ...applicationRow(manufacturer, manufacturer.appliedAt, checks, index),
    documentCount: documents.filter((document) => document.state === 'received').length,
    checks,
    documents,
    timeline: timelineFor(manufacturer, manufacturer.appliedAt, index),
  };
});

const jewellerRecords = jewellers.map((jeweller, index) => {
  const checks = jewellerChecks(jeweller, index);
  const documents = documentsFor(jeweller, JEWELLER_DOCUMENTS, jeweller.registeredAt, index);

  return {
    ...applicationRow(jeweller, jeweller.registeredAt, checks, index),
    documentCount: documents.filter((document) => document.state === 'received').length,
    checks,
    documents,
    timeline: timelineFor(jeweller, jeweller.registeredAt, index),
  };
});

export const manufacturerApplications = manufacturerRecords;
export const jewellerApplications = jewellerRecords;

export const manufacturerApplicationById = Object.fromEntries(
  manufacturerRecords.map((row) => [row.id, row]),
);
export const jewellerApplicationById = Object.fromEntries(
  jewellerRecords.map((row) => [row.id, row]),
);
