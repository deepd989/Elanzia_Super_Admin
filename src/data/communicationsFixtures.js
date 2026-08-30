// Feature fixtures for the broadcast console, the composer, the template
// library and the delivery log - ADM-085, ADM-086, ADM-089, ADM-090.
//
// Every recipient here references src/data/core by id. No manufacturer and no
// jeweller is invented in this file - a delivery row that named somebody the
// rest of the portal has never heard of would be a message nobody could trace.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so the log shows the same rows on every reload.
//
// THE RULE THIS FILE EXISTS UNDER
//
// A suppression is not a failure. A message the TRAI DND registry refused, or
// one whose WhatsApp template the operator has not approved, did not fail on
// the way out - it was never allowed to leave, and sending it again is a
// regulatory breach rather than a retry. That is why every delivery row carries
// `retryable` as a fact of its failure code, computed here once, instead of
// leaving four screens to each decide which failures may be pushed again.

import { adminUsers, jewellers, manufacturers } from '@/data/core';

// The anchor. Matches ordersFixtures.js, operationsFixtures.js and
// core/metalRates.js so every area agrees about "now".
export const COMMS_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(COMMS_NOW);
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoHoursAgo = (hours) => new Date(NOW_MS - hours * HOUR_MS).toISOString();
const isoHoursAhead = (hours) => new Date(NOW_MS + hours * HOUR_MS).toISOString();
const pad = (value, width) => String(value).padStart(width, '0');

// Staff who can author a broadcast or own a template. Deactivated accounts are
// excluded - attributing a message that went to 3,000 members to somebody who
// cannot sign in makes the audit trail useless.
const commsStaff = adminUsers.filter((user) => user.status === 'active');

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const BROADCAST_STATUSES = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'partially_failed',
  'cancelled',
  'failed',
];

export const BROADCAST_CATEGORIES = [
  'policy',
  'rate_change',
  'outage',
  'festive',
  'feature',
  'compliance',
];

export const AUDIENCE_SEGMENTS = [
  'all_members',
  'all_manufacturers',
  'all_jewellers',
  'city',
  'category',
  'custom',
];

export const CHANNELS = ['in_app', 'email', 'sms', 'whatsapp'];

export const TEMPLATE_STATES = ['active', 'draft', 'archived'];

export const TEMPLATE_LOCALES = ['en', 'hi', 'gu'];

export const DELIVERY_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'opened',
  'bounced',
  'failed',
  'suppressed',
];

export const FAILURE_CODES = [
  'invalid_number',
  'mailbox_full',
  'handset_unreachable',
  'gateway_timeout',
  'blocked',
  'dnd_registry',
  'template_not_approved',
  'opted_out',
];

// A failure the platform may push again versus one it may not. DND registration
// and an unapproved WhatsApp template are regulatory refusals, and a member who
// opted out or blocked the sender has said no in words - resending any of the
// four is a breach, not a retry. A timeout, a full mailbox or a handset that was
// off are transient and get another attempt.
export const NON_RETRYABLE_FAILURE_CODES = [
  'dnd_registry',
  'template_not_approved',
  'opted_out',
  'blocked',
];

export const isRetryableFailure = (failureCode) =>
  Boolean(failureCode) && !NON_RETRYABLE_FAILURE_CODES.includes(failureCode);

// Statuses past which a broadcast is settled history. It cannot be edited and
// it cannot be sent again - a correction goes out as a follow-up that says so.
export const IMMUTABLE_BROADCAST_STATUSES = ['sending', 'sent', 'partially_failed', 'failed'];

// A scheduled broadcast can still be called back. Once the first batch has left
// the queue there is nothing to call back for the members already reached.
export const CANCELLABLE_BROADCAST_STATUSES = ['draft', 'scheduled'];

// ---------------------------------------------------------------------------
// Broadcasts - ADM-085 and ADM-086
// ---------------------------------------------------------------------------

const TRADE_CENTRES = ['Rajkot', 'Coimbatore', 'Jaipur', 'Surat', 'Kolkata', 'Mumbai', 'Hyderabad'];

const BROADCAST_SEEDS = [
  ['policy', 'Revised commission slabs from 1 October', 'The commission slab for bridal sets above 60g moves from 5.5 per cent to 4.9 per cent. Orders confirmed before 1 October settle at the old slab.'],
  ['rate_change', 'IBJA feed switching to the afternoon quote', 'From Monday the rate board reads the 3 pm IBJA quote rather than the morning one. Rate locks already held are unaffected.'],
  ['outage', 'Settlement runs paused on Saturday night', 'The nodal account partner has a maintenance window from 11 pm to 3 am. Payouts queued in that window release on Sunday morning.'],
  ['festive', 'Akshaya Tritiya stock windows open today', 'List your festive stock before 12 September to appear in the Akshaya Tritiya edit sent to every jeweller on the platform.'],
  ['feature', 'Rate lock now holds for 45 minutes', 'A quote held during checkout now survives 45 minutes rather than 20, so a jeweller can finish a large basket without repricing.'],
  ['compliance', 'HUID is mandatory on every listing from 1 November', 'Listings without a HUID will be delisted from the public catalogue on 1 November. Private catalogue pieces are unaffected.'],
  ['policy', 'Dispatch promise tightened to 5 working days', 'The on-time dispatch measure now counts working days from confirmation rather than from payment capture.'],
  ['feature', 'Bulk price refresh is live for every manufacturer', 'A single refresh now reprices an entire catalogue against the current rate board. Confirmed orders are never touched.'],
  ['outage', 'Image uploads were slow on Tuesday morning', 'Uploads between 9 am and 11 am on Tuesday queued rather than failed. Everything queued has since been processed.'],
  ['compliance', 'GST invoice series resets on 1 April', 'Your invoice series restarts on 1 April. Nothing needs doing - the platform handles the series for you.'],
  ['festive', 'Diwali despatch cut-off is 28 October', 'Orders confirmed after 28 October cannot be promised for Diwali delivery. The checkout will say so to the jeweller.'],
  ['rate_change', 'Silver 925 conversion factor corrected', 'The 925 factor was reading 0.918 and now reads 0.925. Silver prices moved by roughly 0.8 per cent as a result.'],
];

// Which statuses the 44 rows carry. Written out rather than computed because a
// queue that never shows a cancelled or a failed broadcast has not been tested.
const BROADCAST_STATUS_PLAN = [
  'draft', 'draft', 'draft', 'draft',
  'scheduled', 'scheduled', 'scheduled', 'scheduled', 'scheduled',
  'sending', 'sending',
  'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent',
  'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent', 'sent',
  'sent', 'sent', 'sent',
  'partially_failed', 'partially_failed', 'partially_failed', 'partially_failed',
  'cancelled', 'cancelled', 'cancelled',
  'failed', 'failed',
  'draft',
];

const CHANNEL_SETS = [
  ['in_app'],
  ['in_app', 'email'],
  ['in_app', 'email', 'sms'],
  ['in_app', 'email', 'whatsapp'],
  ['email'],
  ['in_app', 'email', 'sms', 'whatsapp'],
];

function audienceFor(index) {
  const segment = AUDIENCE_SEGMENTS[index % AUDIENCE_SEGMENTS.length];
  const city = TRADE_CENTRES[index % TRADE_CENTRES.length];
  const memberCategory = ['Bangles', 'Necklaces', 'Rings', 'Chains'][index % 4];

  if (segment === 'all_members') {
    return {
      segment,
      label: 'Every manufacturer and jeweller',
      city: null,
      memberCategory: null,
      recipientCount: manufacturers.length + jewellers.length,
    };
  }
  if (segment === 'all_manufacturers') {
    return { segment, label: 'Every manufacturer', city: null, memberCategory: null, recipientCount: manufacturers.length };
  }
  if (segment === 'all_jewellers') {
    return { segment, label: 'Every jeweller', city: null, memberCategory: null, recipientCount: jewellers.length };
  }
  if (segment === 'city') {
    const inCity = [...manufacturers, ...jewellers].filter((member) => member.city === city);
    return { segment, label: `Members in ${city}`, city, memberCategory: null, recipientCount: inCity.length };
  }
  if (segment === 'category') {
    const listing = manufacturers.filter((member) => member.categories.includes(memberCategory));
    return { segment, label: `Manufacturers listing ${memberCategory}`, city: null, memberCategory, recipientCount: listing.length };
  }
  // custom - a hand-picked list, kept small on purpose
  const picked = jewellers.slice(index % 6, (index % 6) + 4);
  return {
    segment,
    label: `${picked.length} hand-picked jewellers`,
    city: null,
    memberCategory: null,
    recipientCount: picked.length,
    memberIds: picked.map((member) => member.id),
  };
}

// Send statistics that add up. A row where delivered plus failed plus
// suppressed does not equal sent is the first thing an operator spots.
function statsFor(status, recipientCount, index) {
  if (status === 'draft') {
    return { queued: 0, sent: 0, delivered: 0, failed: 0, suppressed: 0, opened: 0 };
  }
  if (status === 'scheduled') {
    return { queued: recipientCount, sent: 0, delivered: 0, failed: 0, suppressed: 0, opened: 0 };
  }
  if (status === 'cancelled') {
    return { queued: 0, sent: 0, delivered: 0, failed: 0, suppressed: 0, opened: 0 };
  }
  if (status === 'failed') {
    return { queued: recipientCount, sent: 0, delivered: 0, failed: recipientCount, suppressed: 0, opened: 0 };
  }
  if (status === 'sending') {
    const sent = Math.floor(recipientCount * 0.4) + (index % 3);
    const delivered = Math.max(0, sent - 2);
    return { queued: recipientCount - sent, sent, delivered, failed: 1, suppressed: 1, opened: Math.floor(delivered * 0.3) };
  }

  const suppressed = 2 + (index % 3);
  const failed = status === 'partially_failed' ? 4 + (index % 5) : index % 2;
  const delivered = Math.max(0, recipientCount - suppressed - failed);
  return {
    queued: 0,
    sent: recipientCount - suppressed,
    delivered,
    failed,
    suppressed,
    opened: Math.floor(delivered * (0.35 + (index % 4) * 0.1)),
  };
}

export const broadcastRows = BROADCAST_STATUS_PLAN.map((status, index) => {
  const [category, title, body] = BROADCAST_SEEDS[index % BROADCAST_SEEDS.length];
  const author = commsStaff[index % commsStaff.length];
  const audience = index === BROADCAST_STATUS_PLAN.length - 1
    // The zero-state row: a draft nobody has chosen an audience for yet.
    ? { segment: '', label: null, city: null, memberCategory: null, recipientCount: 0 }
    : audienceFor(index);
  const channels = CHANNEL_SETS[index % CHANNEL_SETS.length];
  const createdAt = isoHoursAgo(720 - index * 15);
  const stats = statsFor(status, audience.recipientCount, index);
  const requiresAcknowledgement = category === 'policy' || category === 'compliance';

  return {
    id: `BRD-${pad(index + 1, 3)}`,
    title: index === BROADCAST_STATUS_PLAN.length - 1 ? 'Untitled announcement' : title,
    body: index === BROADCAST_STATUS_PLAN.length - 1 ? '' : body,
    category,
    audience,
    channels,
    status,
    requiresAcknowledgement,
    acknowledgedCount: requiresAcknowledgement ? Math.floor(stats.delivered * 0.6) : 0,
    createdById: author.id,
    createdByName: author.name,
    createdAt,
    scheduledFor: status === 'scheduled' ? isoHoursAhead(6 + index * 3) : status === 'draft' ? null : createdAt,
    sentAt: ['sent', 'partially_failed'].includes(status) ? isoHoursAgo(700 - index * 15) : null,
    cancelledAt: status === 'cancelled' ? isoHoursAgo(690 - index * 15) : null,
    cancellationReason: status === 'cancelled'
      ? ['Superseded by a corrected notice', 'Slab change deferred by a month', 'Wrong audience segment picked'][index % 3]
      : null,
    failureReason: status === 'failed' ? 'The gateway rejected the batch - sender id not registered for this header' : null,
    stats,
  };
});

export const broadcastById = Object.fromEntries(broadcastRows.map((row) => [row.id, row]));

// The audience segments the composer offers, with the reach behind each one so
// the form can show a count before anything is estimated.
export const audienceOptions = [
  { id: 'all_members', segment: 'all_members', label: 'Every manufacturer and jeweller', memberCount: manufacturers.length + jewellers.length },
  { id: 'all_manufacturers', segment: 'all_manufacturers', label: 'Every manufacturer', memberCount: manufacturers.length },
  { id: 'all_jewellers', segment: 'all_jewellers', label: 'Every jeweller', memberCount: jewellers.length },
  { id: 'city', segment: 'city', label: 'Members in one city', memberCount: null },
  { id: 'category', segment: 'category', label: 'Manufacturers listing a category', memberCount: null },
  { id: 'custom', segment: 'custom', label: 'A hand-picked list', memberCount: null },
];

export const audienceCityOptions = TRADE_CENTRES.map((city) => ({
  value: city,
  label: city,
  memberCount: [...manufacturers, ...jewellers].filter((member) => member.city === city).length,
}));

export const audienceCategoryOptions = [...new Set(manufacturers.flatMap((member) => member.categories))]
  .sort()
  .map((category) => ({
    value: category,
    label: category,
    memberCount: manufacturers.filter((member) => member.categories.includes(category)).length,
  }));

// ---------------------------------------------------------------------------
// Templates - ADM-089
// ---------------------------------------------------------------------------

// [eventKey, name, audience, channels, variables]
// mandatory is derived below: a transactional template tells a member something
// happened to their money or their goods, and they cannot opt out of it.
const TRANSACTIONAL_SEEDS = [
  ['order.placed', 'Order placed', 'manufacturer', ['in_app', 'email', 'sms'], ['orderId', 'jewellerName', 'orderTotal']],
  ['order.confirmed', 'Order confirmed', 'jeweller', ['in_app', 'email', 'sms', 'whatsapp'], ['orderId', 'orderTotal', 'metalRate']],
  ['order.dispatched', 'Order dispatched', 'jeweller', ['in_app', 'email', 'sms', 'whatsapp'], ['orderId', 'awb', 'carrier', 'expectedAt']],
  ['order.delivered', 'Order delivered', 'jeweller', ['in_app', 'email'], ['orderId', 'deliveredAt']],
  ['order.cancelled', 'Order cancelled', 'jeweller', ['in_app', 'email', 'sms'], ['orderId', 'cancellationReason']],
  ['payment.captured', 'Payment captured', 'jeweller', ['in_app', 'email'], ['orderId', 'amount', 'method']],
  ['payment.failed', 'Payment failed', 'jeweller', ['in_app', 'email', 'sms'], ['orderId', 'amount', 'failureReason']],
  ['settlement.initiated', 'Settlement initiated', 'manufacturer', ['in_app', 'email'], ['payoutAmount', 'nodalReference', 'orderCount']],
  ['settlement.paid', 'Settlement paid', 'manufacturer', ['in_app', 'email', 'sms'], ['payoutAmount', 'nodalReference', 'settledAt']],
  ['settlement.failed', 'Settlement failed', 'manufacturer', ['in_app', 'email', 'sms'], ['payoutAmount', 'failureReason']],
  ['return.raised', 'Return raised', 'manufacturer', ['in_app', 'email'], ['orderId', 'returnReason']],
  ['return.verified', 'Return verified', 'jeweller', ['in_app', 'email'], ['orderId', 'verifiedAt']],
  ['refund.processed', 'Refund processed', 'jeweller', ['in_app', 'email', 'sms'], ['orderId', 'refundAmount']],
  ['kyc.approved', 'KYC approved', 'manufacturer', ['in_app', 'email', 'sms'], ['businessName', 'approvedAt']],
  ['kyc.rejected', 'KYC rejected', 'manufacturer', ['in_app', 'email'], ['businessName', 'rejectionReason']],
  ['kyc.info_requested', 'More information needed', 'manufacturer', ['in_app', 'email', 'whatsapp'], ['businessName', 'requestedDocuments']],
  ['product.approved', 'Listing approved', 'manufacturer', ['in_app', 'email'], ['productTitle', 'sku']],
  ['product.rejected', 'Listing rejected', 'manufacturer', ['in_app', 'email'], ['productTitle', 'sku', 'rejectionReason']],
  ['enquiry.received', 'New enquiry', 'manufacturer', ['in_app', 'email', 'whatsapp'], ['jewellerName', 'productTitle']],
  ['enquiry.reply', 'Reply on an enquiry', 'jeweller', ['in_app', 'email'], ['manufacturerName', 'enquiryId']],
  ['ticket.created', 'Support ticket raised', 'jeweller', ['in_app', 'email'], ['ticketId', 'subject']],
  ['ticket.resolved', 'Support ticket resolved', 'jeweller', ['in_app', 'email'], ['ticketId', 'resolution']],
  ['dispute.raised', 'Dispute raised', 'manufacturer', ['in_app', 'email', 'sms'], ['orderId', 'disputeReason']],
  ['dispute.resolved', 'Dispute resolved', 'manufacturer', ['in_app', 'email'], ['orderId', 'outcome']],
  ['rate.locked', 'Rate locked for your basket', 'jeweller', ['in_app'], ['metalRate', 'expiresAt']],
  ['rate.lock_expiring', 'Rate lock expiring', 'jeweller', ['in_app', 'sms'], ['expiresAt', 'basketTotal']],
  ['invoice.generated', 'Tax invoice ready', 'jeweller', ['in_app', 'email'], ['orderId', 'irn', 'invoiceNumber']],
  ['account.suspended', 'Account suspended', 'manufacturer', ['in_app', 'email', 'sms'], ['businessName', 'suspensionReason']],
  ['account.reactivated', 'Account reactivated', 'manufacturer', ['in_app', 'email'], ['businessName']],
  ['shipment.exception', 'Shipment exception', 'jeweller', ['in_app', 'email', 'sms'], ['awb', 'exceptionType']],
];

const MARKETING_SEEDS = [
  ['digest.weekly_manufacturer', 'Weekly manufacturer digest', 'manufacturer', ['email'], ['orderCount', 'gmv', 'topCategory']],
  ['digest.weekly_jeweller', 'Weekly jeweller digest', 'jeweller', ['email'], ['newListings', 'topManufacturer']],
  ['campaign.festive_diwali', 'Diwali edit', 'jeweller', ['email', 'whatsapp'], ['jewellerName', 'cutOffDate']],
  ['campaign.akshaya_tritiya', 'Akshaya Tritiya edit', 'jeweller', ['email', 'whatsapp'], ['jewellerName', 'listingCount']],
  ['promo.new_categories', 'New categories on the platform', 'jeweller', ['in_app', 'email'], ['categoryNames']],
  ['promo.credit_limit_offer', 'Higher credit limit available', 'jeweller', ['in_app', 'email'], ['creditLimit', 'paymentTermsDays']],
  ['nudge.stalled_enquiry', 'An enquiry is waiting on you', 'manufacturer', ['in_app', 'sms', 'whatsapp'], ['enquiryId', 'daysWaiting']],
  ['nudge.cart_abandoned', 'Your basket is still held', 'jeweller', ['in_app', 'email'], ['basketTotal', 'expiresAt']],
  ['survey.csat', 'How did we do', 'jeweller', ['in_app', 'email'], ['ticketId', 'agentName']],
  ['survey.nps', 'Would you recommend Elanzia', 'manufacturer', ['email'], ['businessName']],
  ['announcement.feature_launch', 'Something new on the platform', 'manufacturer', ['in_app', 'email'], ['featureName']],
  ['reengage.dormant_jeweller', 'It has been a while', 'jeweller', ['email', 'whatsapp'], ['jewellerName', 'lastOrderAt']],
  ['report.monthly_gmv', 'Your month on Elanzia', 'manufacturer', ['email'], ['gmv', 'orderCount', 'onTimeDispatchPercent']],
  ['recommendation.trending_stock', 'Moving fast this week', 'jeweller', ['in_app', 'email'], ['productTitles']],
  ['alert.low_stock', 'Stock running low', 'manufacturer', ['in_app', 'sms'], ['productTitle', 'stockQuantity']],
  ['alert.credit_utilisation', 'Credit nearly used', 'jeweller', ['in_app', 'email', 'sms'], ['creditUsed', 'creditLimit']],
];

const TEMPLATE_SEEDS = [
  ...TRANSACTIONAL_SEEDS.map((seed) => [...seed, 'transactional']),
  ...MARKETING_SEEDS.map((seed) => [...seed, 'marketing']),
];

export const templateRows = TEMPLATE_SEEDS.map(([eventKey, name, audience, channels, variables, kind], index) => {
  const owner = commsStaff[(index + 3) % commsStaff.length];
  // A transactional template is the message that says the money moved or the
  // parcel left. A member cannot opt out of it, so it cannot be archived.
  const mandatory = kind === 'transactional';
  const state = mandatory ? 'active' : ['active', 'active', 'active', 'draft', 'archived'][index % 5];
  const sentLast30Days = mandatory ? 400 + index * 37 : 80 + index * 11;

  return {
    id: `TPL-${pad(index + 1, 3)}`,
    eventKey,
    name,
    description: `Sent to the ${audience} when ${eventKey.replace('.', ' ').replace(/_/g, ' ')} happens.`,
    kind,
    audience,
    mandatory,
    state,
    channels,
    locales: index % 4 === 0 ? ['en', 'hi', 'gu'] : index % 3 === 0 ? ['en', 'hi'] : ['en'],
    variables,
    version: 1 + (index % 5),
    updatedAt: isoHoursAgo(48 + index * 9),
    updatedById: owner.id,
    updatedByName: owner.name,
    sentLast30Days,
    deliveryRate: Number((99.4 - (index % 9) * 0.7).toFixed(1)),
  };
});

export const templateById = Object.fromEntries(templateRows.map((row) => [row.id, row]));

const SUBJECT_BY_CHANNEL = {
  email: (name) => name,
  in_app: () => null,
  sms: () => null,
  whatsapp: () => null,
};

function bodyFor(template, channel) {
  const tokens = template.variables.map((variable) => `{${variable}}`);
  if (channel === 'sms') {
    return `Elanzia: ${template.name} - ${tokens.slice(0, 2).join(' ')}. Reply STOP to opt out.`;
  }
  if (channel === 'whatsapp') {
    return `*${template.name}*\n${tokens.slice(0, 3).join('\n')}\nOpen the Elanzia app for the full record.`;
  }
  if (channel === 'in_app') {
    return `${template.name} - ${tokens.slice(0, 2).join(', ')}`;
  }
  return `Hello {recipientName},\n\n${template.name}.\n\n${tokens.map((token) => `- ${token}`).join('\n')}\n\nElanzia Trade`;
}

// ---------------------------------------------------------------------------
// Template approval
//
// SMS and WhatsApp are not ours to send on. An Indian SMS template has to be
// registered with TRAI DLT through the operator, and a WhatsApp template has
// to clear Meta review. Both take days, and until one is approved that channel
// cannot carry that message in that language at all - which is why
// `template_not_approved` is a delivery failure code rather than a warning.
//
// In-app and email need nobody's permission, so their variants carry
// `required: false` rather than a pretend approval.
// ---------------------------------------------------------------------------

export const APPROVAL_AUTHORITIES = {
  sms: { id: 'TRAI_DLT', label: 'TRAI DLT', leadDays: 3, referencePrefix: 'DLT' },
  whatsapp: { id: 'META', label: 'Meta', leadDays: 2, referencePrefix: 'META' },
};

export const APPROVAL_STATUSES = ['not_required', 'draft', 'pending', 'approved', 'rejected'];

// A channel may only send when its variant in that language is approved, or
// needs no approval at all.
export function canSendOn(variant) {
  return !variant.approval.required || variant.approval.status === 'approved';
}

const DLT_REJECTIONS = [
  'Variable count exceeds the registered header. Re-register with the operator.',
  'Promotional wording found in a template registered as transactional.',
  'Sender ID does not match the registered entity.',
];

const META_REJECTIONS = [
  'Template contains a URL shortener, which Meta does not accept.',
  'Sample values were not supplied for every variable.',
];

function buildApproval({ channel, body, seq }) {
  const authority = APPROVAL_AUTHORITIES[channel];

  // In-app and email are ours to send. Nothing to approve.
  if (!authority) {
    return {
      required: false,
      authority: null,
      authorityLabel: null,
      status: 'not_required',
      reference: null,
      submittedAt: null,
      expectedBy: null,
      approvedAt: null,
      rejectionReason: null,
      // What the authority actually signed off. Null here because there is no
      // authority; see the reset rule in saveTemplate for why it is stored.
      approvedBody: null,
      leadDays: null,
    };
  }

  // The WhatsApp spread is exactly what this fixture has always produced, so
  // the derived `whatsappApproval` alias below is unchanged and anything
  // already reading it keeps working.
  const status = ['approved', 'approved', 'approved', 'pending', 'rejected'][seq % 5];
  const submittedHoursAgo = 40 + seq * 11;
  const submittedAt = isoHoursAgo(submittedHoursAgo);

  return {
    required: true,
    authority: authority.id,
    authorityLabel: authority.label,
    status,
    reference:
      status === 'approved'
        ? `${authority.referencePrefix}-${pad(1107000000000 + seq * 977, 13)}`
        : null,
    submittedAt,
    // The lead time is the point. A rejected SMS template costs three more
    // days before that language can be sent in again.
    expectedBy: new Date(Date.parse(submittedAt) + authority.leadDays * DAY_MS).toISOString(),
    approvedAt: status === 'approved' ? isoHoursAgo(submittedHoursAgo - authority.leadDays * 24) : null,
    rejectionReason:
      status === 'rejected'
        ? (channel === 'sms' ? DLT_REJECTIONS : META_REJECTIONS)[seq % (channel === 'sms' ? 3 : 2)]
        : null,
    approvedBody: status === 'approved' ? body : null,
    leadDays: authority.leadDays,
  };
}

// One variant per template, channel and locale, each carrying the approval it
// needs on its own channel and in its own language.
export const templateVariants = templateRows.flatMap((template) =>
  template.channels.flatMap((channel, channelIndex) =>
    template.locales.map((locale, localeIndex) => {
      const seq = channelIndex * 3 + localeIndex;
      const body = bodyFor(template, channel);
      const approval = buildApproval({ channel, body, seq });

      return {
        id: `${template.id}-${channel}-${locale}`,
        templateId: template.id,
        channel,
        locale,
        subject: SUBJECT_BY_CHANNEL[channel](template.name),
        body,
        state: template.state === 'archived' ? 'archived' : locale === 'en' ? 'active' : seq % 5 === 0 ? 'draft' : 'active',
        approval,
        // Kept as a derived alias so everything already reading it is
        // untouched. New code should read `approval` instead - it is the only
        // one that says anything about SMS.
        whatsappApproval: channel === 'whatsapp' ? approval.status : null,
        canSend: !approval.required || approval.status === 'approved',
        characterCount: body.length,
        updatedAt: isoHoursAgo(50 + seq * 7),
      };
    }),
  ),
);

export const templateVariantsByTemplateId = templateVariants.reduce((map, variant) => {
  (map[variant.templateId] ??= []).push(variant);
  return map;
}, {});

// A short version trail so the library can show that a template is not the
// first thing anybody wrote. Derived, never authored.
export const templateVersionsByTemplateId = Object.fromEntries(
  templateRows.map((template) => [
    template.id,
    Array.from({ length: template.version }).map((_, versionIndex) => {
      const editor = commsStaff[(versionIndex + template.version) % commsStaff.length];
      return {
        id: `${template.id}-v${versionIndex + 1}`,
        version: versionIndex + 1,
        editedById: editor.id,
        editedByName: editor.name,
        editedAt: isoHoursAgo(48 + (template.version - versionIndex) * 240),
        note: versionIndex === 0 ? 'First version' : 'Copy tightened after a support ticket',
      };
    }).reverse(),
  ]),
);

// The sample context a preview renders with. Real members, so a preview shows
// what a jeweller in Coimbatore actually receives.
export const previewContext = {
  recipientName: jewellers[0].contactName,
  jewellerName: jewellers[0].businessName,
  manufacturerName: manufacturers[0].businessName,
  businessName: manufacturers[0].businessName,
  orderId: 'ORD-0001',
  orderTotal: '₹6,06,187',
  amount: '₹6,06,187',
  refundAmount: '₹21,966',
  payoutAmount: '₹5,74,281',
  metalRate: '₹7,195',
  awb: 'SEQ5481251',
  carrier: 'Sequel',
  expectedAt: '3 Sep 2026',
  deliveredAt: '25 Jul 2026',
  ticketId: 'TKT-0001',
  productTitle: '22K Antique Stud Nose Pin',
  sku: '006-NOS-0034',
};

// ---------------------------------------------------------------------------
// Deliveries - ADM-090
// ---------------------------------------------------------------------------

const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => `${phone.slice(0, 2)}****${phone.slice(-4)}`;

const destinationFor = (member, channel) =>
  channel === 'email' ? maskEmail(member.email) : channel === 'in_app' ? member.id : maskPhone(member.phone);

// How the 260 rows land. Written out so that every delivery status and every
// failure code is present, including the ones that break a layout.
const DELIVERY_OUTCOME_PLAN = [
  ...Array.from({ length: 150 }).map(() => ['delivered', null]),
  ...Array.from({ length: 34 }).map(() => ['opened', null]),
  ...Array.from({ length: 14 }).map(() => ['sent', null]),
  ...Array.from({ length: 10 }).map(() => ['queued', null]),
  ['bounced', 'mailbox_full'], ['bounced', 'mailbox_full'], ['bounced', 'mailbox_full'],
  ['bounced', 'mailbox_full'], ['bounced', 'mailbox_full'], ['bounced', 'mailbox_full'],
  ['bounced', 'invalid_number'], ['bounced', 'invalid_number'], ['bounced', 'invalid_number'],
  ['bounced', 'invalid_number'], ['bounced', 'invalid_number'],
  ...Array.from({ length: 9 }).map(() => ['failed', 'gateway_timeout']),
  ...Array.from({ length: 7 }).map(() => ['failed', 'handset_unreachable']),
  ...Array.from({ length: 12 }).map(() => ['suppressed', 'dnd_registry']),
  ...Array.from({ length: 6 }).map(() => ['suppressed', 'template_not_approved']),
  ...Array.from({ length: 5 }).map(() => ['suppressed', 'opted_out']),
  ...Array.from({ length: 4 }).map(() => ['suppressed', 'blocked']),
];

const FAILURE_DETAIL = {
  mailbox_full: 'The recipient mailbox is over quota',
  invalid_number: 'The number is not in service',
  gateway_timeout: 'The gateway did not answer within 30 seconds',
  handset_unreachable: 'The handset was switched off for the whole retry window',
  dnd_registry: 'The number is on the TRAI do-not-disturb registry for this header',
  template_not_approved: 'The operator has not approved this WhatsApp template',
  opted_out: 'The member opted out of this category',
  blocked: 'The member blocked the sender',
};

// Broadcasts that actually left the building. Draft, scheduled and cancelled
// broadcasts have no delivery rows, which is the point of keeping them apart.
const sentBroadcasts = broadcastRows.filter((row) =>
  ['sending', 'sent', 'partially_failed'].includes(row.status),
);

const activeTemplates = templateRows.filter((row) => row.state === 'active');
const allMembers = [
  ...manufacturers.map((member) => ({ ...member, recipientType: 'manufacturer' })),
  ...jewellers.map((member) => ({ ...member, recipientType: 'jeweller' })),
];

// The plan above is written in blocks so the counts are easy to read, but a log
// where every failure sits on the last page is not a log anybody has worked.
// Stepping through the plan by a stride coprime with its length scatters the
// outcomes across the whole time range while keeping every count exactly as
// written - so the newest page shows failures and suppressions too.
const OUTCOME_STRIDE = 97;

export const deliveryRows = DELIVERY_OUTCOME_PLAN.map((_, index) => {
  const [status, failureCode] = DELIVERY_OUTCOME_PLAN[(index * OUTCOME_STRIDE) % DELIVERY_OUTCOME_PLAN.length];
  const member = allMembers[index % allMembers.length];
  const fromBroadcast = index % 3 === 0;
  const source = fromBroadcast
    ? sentBroadcasts[index % sentBroadcasts.length]
    : activeTemplates[index % activeTemplates.length];
  const channel = source.channels[index % source.channels.length];
  const attemptedAt = isoHoursAgo(1 + index * 2);

  return {
    id: `DLV-${pad(index + 1, 6)}`,
    sourceType: fromBroadcast ? 'broadcast' : 'transactional',
    sourceId: source.id,
    sourceLabel: fromBroadcast ? source.title : source.name,
    recipientType: member.recipientType,
    recipientId: member.id,
    recipientName: member.businessName,
    recipientCity: member.city,
    channel,
    destination: destinationFor(member, channel),
    status,
    attemptedAt,
    deliveredAt: ['delivered', 'opened'].includes(status) ? isoHoursAgo(1 + index * 2 - 0.05) : null,
    openedAt: status === 'opened' ? isoHoursAgo(1 + index * 2 - 0.4) : null,
    failureCode,
    failureDetail: failureCode ? FAILURE_DETAIL[failureCode] : null,
    // Computed here rather than in a screen, so the retry button and the API
    // that refuses the retry can never disagree about which rows qualify.
    retryable: isRetryableFailure(failureCode),
    retryCount: failureCode === 'gateway_timeout' ? 1 + (index % 2) : 0,
    providerRef: `PRV${pad(910000 + index * 7, 7)}`,
  };
});

export const deliveryById = Object.fromEntries(deliveryRows.map((row) => [row.id, row]));

export const deliveriesBySourceId = deliveryRows.reduce((map, row) => {
  (map[row.sourceId] ??= []).push(row);
  return map;
}, {});
