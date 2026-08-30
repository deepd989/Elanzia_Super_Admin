// Feature fixtures for Access and shell.
// Everything here references src/data/core by id. No manufacturer, jeweller,
// role or admin user is invented in this file.

import { adminUsers, jewellers, manufacturers, roles } from '@/data/core';
import { en } from '@/i18n/en';

// ---------------------------------------------------------------------------
// Sign-in - ADM-001, ADM-002, ADM-003
// ---------------------------------------------------------------------------

// The seeded demo credentials. A prototype still has to be signed into, and
// hiding these in a comment somewhere costs the backend team an afternoon.
export const demoCredentials = {
  password: 'elanzia2026',
  otpCode: '445566',
  twoFactorCode: '778899',
  // Anything else fails, which is how the error states get exercised.
};

export const OTP_TTL_SECONDS = 120;
export const MAX_SIGN_IN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 30;

// ---------------------------------------------------------------------------
// Own profile - ADM-004
// ---------------------------------------------------------------------------

// The notification catalogue. Each row is a thing the portal can tell an admin
// about, and per channel whether they want to hear about it.
export const notificationPreferences = [
  {
    id: 'onboarding.applicationSubmitted',
    label: 'access.notify.applicationSubmitted',
    description: 'access.notify.applicationSubmittedHelp',
    module: 'onboarding',
    channels: { email: true, sms: false, inApp: true },
  },
  {
    id: 'onboarding.applicationAgeing',
    label: 'access.notify.applicationAgeing',
    description: 'access.notify.applicationAgeingHelp',
    module: 'onboarding',
    channels: { email: true, sms: false, inApp: true },
  },
  {
    id: 'orders.paymentFailed',
    label: 'access.notify.paymentFailed',
    description: 'access.notify.paymentFailedHelp',
    module: 'orders',
    channels: { email: true, sms: true, inApp: true },
  },
  {
    id: 'orders.cancelled',
    label: 'access.notify.orderCancelled',
    description: 'access.notify.orderCancelledHelp',
    module: 'orders',
    channels: { email: false, sms: false, inApp: true },
  },
  {
    id: 'payments.settlementReady',
    label: 'access.notify.settlementReady',
    description: 'access.notify.settlementReadyHelp',
    module: 'payments',
    channels: { email: true, sms: false, inApp: true },
  },
  {
    id: 'payments.settlementFailed',
    label: 'access.notify.settlementFailed',
    description: 'access.notify.settlementFailedHelp',
    module: 'payments',
    // A failed settlement means a manufacturer has not been paid, so SMS is
    // on by default and this row cannot be silenced entirely.
    channels: { email: true, sms: true, inApp: true },
    alwaysOn: true,
  },
  {
    id: 'returns.disputeRaised',
    label: 'access.notify.disputeRaised',
    description: 'access.notify.disputeRaisedHelp',
    module: 'returns',
    channels: { email: true, sms: false, inApp: true },
  },
  {
    id: 'catalogue.listingFlagged',
    label: 'access.notify.listingFlagged',
    description: 'access.notify.listingFlaggedHelp',
    module: 'catalogue',
    channels: { email: false, sms: false, inApp: true },
  },
  {
    id: 'access.newSignIn',
    label: 'access.notify.newSignIn',
    description: 'access.notify.newSignInHelp',
    module: 'access',
    channels: { email: true, sms: false, inApp: false },
    alwaysOn: true,
  },
];

export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
];

// ---------------------------------------------------------------------------
// Impersonation - ADM-008
// ---------------------------------------------------------------------------

// Manufacturers and jewellers in one addressable list, because a support agent
// looking for "Shree Balaji" does not know or care which side of the
// marketplace they sit on.
export const impersonationTargets = [
  ...manufacturers
    .filter((manufacturer) => manufacturer.status === 'approved' || manufacturer.status === 'suspended')
    .map((manufacturer) => ({
      id: manufacturer.id,
      targetType: 'manufacturer',
      businessName: manufacturer.businessName,
      contactName: manufacturer.contactName,
      city: manufacturer.city,
      email: manufacturer.email,
      status: manufacturer.status,
      panelPath: `/manufacturer/${manufacturer.id}/dashboard`,
      lastActiveAt: manufacturer.approvedAt,
    })),
  ...jewellers
    .filter((jeweller) => jeweller.status === 'approved' || jeweller.status === 'suspended')
    .map((jeweller) => ({
      id: jeweller.id,
      targetType: 'jeweller',
      businessName: jeweller.businessName,
      contactName: jeweller.contactName,
      city: jeweller.city,
      email: jeweller.email,
      status: jeweller.status,
      panelPath: `/jeweller/${jeweller.id}/dashboard`,
      lastActiveAt: jeweller.lastOrderAt,
    })),
];

const IMPERSONATION_REASONS = [
  'Jeweller could not see a confirmed order in their panel',
  'Manufacturer reported the listing form rejecting a valid HUID',
  'Walking a new jeweller through their first purchase order',
  'Verifying a reported price mismatch on the buyer side',
  'Manufacturer cannot locate their settlement statement',
  'Reproducing a reported upload failure on product media',
  'Checking a jeweller credit limit query raised on call',
];

// The audit trail. Every impersonation is logged with who, whom, why and for
// how long, because "an admin looked at my account" is a question the platform
// has to be able to answer precisely.
export const impersonationSessions = Array.from({ length: 18 }).map((_, index) => {
  const admin = adminUsers.filter((user) =>
    ['support', 'regional_support_lead', 'super_admin'].includes(user.roleId),
  )[index % 5];
  const target = impersonationTargets[(index * 7) % impersonationTargets.length];
  const startedAt = new Date(Date.parse('2026-08-29T10:00:00+05:30') - (index + 1) * 8 * 3600000);
  const durationMinutes = [4, 9, 12, 3, 21, 7, 15][index % 7];

  return {
    id: `IMP-${String(index + 1).padStart(4, '0')}`,
    adminId: admin.id,
    adminName: admin.name,
    targetType: target.targetType,
    targetId: target.id,
    targetName: target.businessName,
    reason: IMPERSONATION_REASONS[index % IMPERSONATION_REASONS.length],
    startedAt: startedAt.toISOString(),
    endedAt: new Date(startedAt.getTime() + durationMinutes * 60000).toISOString(),
    durationMinutes,
    // Read-only sessions cannot place an order or change a price on the
    // member's behalf. Assist mode can, and is logged more loudly.
    mode: index % 4 === 0 ? 'assist' : 'read_only',
    actionsTaken: index % 4 === 0 ? [1, 2, 3][index % 3] : 0,
  };
});

// ---------------------------------------------------------------------------
// Translations - ADM-009
// ---------------------------------------------------------------------------

export const locales = [
  { code: 'en', label: 'English', nativeLabel: 'English', isDefault: true, publishedAt: '2024-04-01T05:30:00.000Z' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', isDefault: false, publishedAt: '2026-03-12T06:00:00.000Z' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', isDefault: false, publishedAt: null },
];

// Flatten the real en.js into dot paths. Deriving the key list rather than
// hand-listing it means the workbench can never drift from the strings the
// app actually renders.
function flattenStrings(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? [[path, value]]
      : flattenStrings(value, path);
  });
}

const SOURCE_STRINGS = flattenStrings(en);

// Curated translations. Deliberately partial: Hindi is well covered, Gujarati
// barely started, so the completeness meter and the missing-state filter both
// have something real to show.
const HINDI = {
  'common.save': 'सहेजें',
  'common.cancel': 'रद्द करें',
  'common.confirm': 'पुष्टि करें',
  'common.close': 'बंद करें',
  'common.back': 'वापस',
  'common.next': 'आगे',
  'common.search': 'खोजें',
  'common.filter': 'छाँटें',
  'common.filters': 'छाँटने के विकल्प',
  'common.apply': 'लागू करें',
  'common.reset': 'रीसेट करें',
  'common.export': 'निर्यात',
  'common.view': 'देखें',
  'common.edit': 'संपादित करें',
  'common.delete': 'हटाएँ',
  'common.add': 'जोड़ें',
  'common.approve': 'स्वीकृत करें',
  'common.reject': 'अस्वीकार करें',
  'common.retry': 'फिर से कोशिश करें',
  'common.actions': 'कार्रवाई',
  'common.details': 'विवरण',
  'common.status': 'स्थिति',
  'common.notes': 'टिप्पणियाँ',
  'common.reason': 'कारण',
  'common.history': 'इतिहास',
  'common.summary': 'सारांश',
  'common.overview': 'अवलोकन',
  'common.yes': 'हाँ',
  'common.no': 'नहीं',
  'common.all': 'सभी',
  'common.page': 'पृष्ठ',
  'states.emptyTitle': 'अभी कुछ नहीं',
  'states.errorTitle': 'इसे लोड नहीं किया जा सका',
  'states.errorAction': 'फिर से कोशिश करें',
  'price.metalValue': 'धातु मूल्य',
  'price.wastage': 'घिसाई',
  'price.makingCharges': 'मजदूरी',
  'price.stoneValue': 'नग मूल्य',
  'price.subtotal': 'उप-योग',
  'price.gst': 'जीएसटी',
  'price.total': 'कुल',
  'price.breakupTitle': 'मूल्य विवरण',
  'units.purity': 'शुद्धता',
  'units.gross': 'सकल वजन',
  'units.net': 'शुद्ध वजन',
  'nav.signOut': 'साइन आउट',
  'nav.account': 'खाता',
  'validation.requiredField': 'यह फ़ील्ड आवश्यक है',
};

const GUJARATI = {
  'common.save': 'સાચવો',
  'common.cancel': 'રદ કરો',
  'common.confirm': 'ખાતરી કરો',
  'common.close': 'બંધ કરો',
  'common.search': 'શોધો',
  'common.view': 'જુઓ',
  'common.edit': 'ફેરફાર કરો',
  'common.approve': 'મંજૂર કરો',
  'common.reject': 'નકારો',
  'common.status': 'સ્થિતિ',
  'common.actions': 'ક્રિયાઓ',
  'price.wastage': 'ઘસારો',
  'price.makingCharges': 'મજૂરી',
  'price.total': 'કુલ',
  'units.purity': 'શુદ્ધતા',
  'units.net': 'ચોખ્ખું વજન',
};

// A few Hindi strings are marked draft or stale so the workbench has more than
// two states to filter on. Stale means the English source changed after the
// translation was written, which is the case a translator most needs to find.
const DRAFT_KEYS = new Set(['common.filters', 'common.summary', 'price.subtotal']);
const STALE_KEYS = new Set(['price.makingCharges', 'common.reason', 'units.gross']);

function stateFor(key, value, locale) {
  if (locale === 'en') return 'translated';
  if (!value) return 'missing';
  if (DRAFT_KEYS.has(key)) return 'draft';
  if (STALE_KEYS.has(key)) return 'stale';
  return 'translated';
}

export const translationEntries = SOURCE_STRINGS.map(([key, sourceText], index) => {
  const values = { en: sourceText, hi: HINDI[key] ?? null, gu: GUJARATI[key] ?? null };
  const translator = adminUsers[index % adminUsers.length];

  return {
    key,
    module: key.split('.')[0],
    sourceText,
    values,
    states: {
      en: 'translated',
      hi: stateFor(key, values.hi, 'hi'),
      gu: stateFor(key, values.gu, 'gu'),
    },
    updatedAt: values.hi || values.gu
      ? new Date(Date.parse('2026-08-29T10:00:00+05:30') - (index + 1) * 36 * 3600000).toISOString()
      : null,
    updatedBy: values.hi || values.gu ? translator.id : null,
  };
});

// ---------------------------------------------------------------------------
// Role management - ADM-006, ADM-007
// ---------------------------------------------------------------------------

// How many staff hold each role. Derived rather than stored, so it can never
// disagree with the staff list.
export const roleMemberCounts = roles.reduce((counts, role) => {
  counts[role.id] = adminUsers.filter(
    (user) => user.roleId === role.id && user.status !== 'deactivated',
  ).length;
  return counts;
}, {});
