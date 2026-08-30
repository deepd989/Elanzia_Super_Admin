// Feature fixtures for the ticket queue, the ticket workspace and the support
// performance board - ADM-087, ADM-088, ADM-091.
//
// Every member who raised a ticket references src/data/core by id, and every
// linked order is a real order. A ticket about ORD-0031 has to open the same
// ORD-0031 the order console shows, or support and operations are looking at
// two different marketplaces.
//
// Every row is derived by index maths off a fixed anchor rather than
// Math.random(), so the queue shows the same rows on every reload.
//
// THE RULE THIS FILE EXISTS UNDER
//
// The SLA clock stops while a ticket is awaiting the member. A ticket parked
// for four days on a jeweller's photograph of a damaged clasp has not breached
// anything - the agent did their part and is waiting. Wall-clock age would mark
// it red, an agent would be measured on it, and the queue would fill with false
// breaches until nobody read the colour any more. That is why every row carries
// `awaitingMemberMins` and why `firstResponseBreached` and `resolutionBreached`
// are computed off the running clock rather than off `createdAt`.

import { adminUsers, jewellerById, jewellers, manufacturerById, manufacturers, orders } from '@/data/core';

// The anchor. Matches ordersFixtures.js and communicationsFixtures.js so every
// area agrees about "now".
export const SUPPORT_NOW = '2026-08-29T10:00:00+05:30';

const NOW_MS = Date.parse(SUPPORT_NOW);
const MINUTE_MS = 60000;
const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

const isoMinutesAgo = (minutes) => new Date(NOW_MS - minutes * MINUTE_MS).toISOString();
const isoDaysAgo = (days) => new Date(NOW_MS - days * DAY_MS).toISOString();
const pad = (value, width) => String(value).padStart(width, '0');

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export const TICKET_STATUSES = [
  'new',
  'open',
  'awaiting_member',
  'escalated',
  'resolved',
  'closed',
  'reopened',
];

export const TICKET_CATEGORIES = [
  'order_delay',
  'payment',
  'settlement',
  'catalogue',
  'quality',
  'kyc',
  'returns',
  'account',
  'app_issue',
];

export const TICKET_CHANNELS = ['email', 'phone', 'whatsapp', 'in_app', 'web_form'];

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

// Where a ticket goes when the support desk cannot close it alone. The queue is
// a handoff, not a status - the ticket keeps its assignee so nothing lands in an
// unowned bucket while two teams each assume the other has it.
export const ESCALATION_QUEUES = ['finance', 'catalogue', 'logistics', 'trust', 'engineering'];

// A ticket in one of these is finished. Replying to it, assigning it or moving
// its status is refused rather than silently ignored.
export const CLOSED_TICKET_STATUSES = ['resolved', 'closed'];

// The statuses in which the SLA clock is not running. The member owes us
// something, so the time is theirs and not the agent's.
export const CLOCK_STOPPED_STATUSES = ['awaiting_member'];

// First response in minutes, resolution in hours, by priority. These are the
// promises the desk is measured against and the only place they are stated.
export const SLA_TARGETS = {
  urgent: { firstResponseMins: 30, resolutionHours: 8 },
  high: { firstResponseMins: 60, resolutionHours: 24 },
  normal: { firstResponseMins: 240, resolutionHours: 72 },
  low: { firstResponseMins: 480, resolutionHours: 120 },
};

// ---------------------------------------------------------------------------
// The desk
// ---------------------------------------------------------------------------

// Staff who work tickets. Deactivated accounts are excluded - a queue that can
// assign work to somebody who cannot sign in loses the ticket.
export const supportAgents = adminUsers.filter(
  (user) =>
    user.status === 'active' &&
    ['support', 'regional_support_lead', 'ops'].includes(user.roleId),
);

// ---------------------------------------------------------------------------
// Tickets - ADM-087 and ADM-088
// ---------------------------------------------------------------------------

// [category, subject, memberType]
const TICKET_SEEDS = [
  ['order_delay', 'Order confirmed nine days ago and still not dispatched', 'jeweller'],
  ['payment', 'Net banking payment debited but the order shows payment failed', 'jeweller'],
  ['settlement', 'Payout for last week has not reached the nodal account', 'manufacturer'],
  ['catalogue', 'Three listings rejected without a reason I can act on', 'manufacturer'],
  ['quality', 'Clasp on the bridal necklace broke on the second wear', 'jeweller'],
  ['kyc', 'BIS licence uploaded twice and still shows as pending', 'manufacturer'],
  ['returns', 'Return raised eleven days ago and the refund has not moved', 'jeweller'],
  ['account', 'Cannot add a second user to our jeweller account', 'jeweller'],
  ['app_issue', 'Rate board shows yesterday quote on the mobile web', 'jeweller'],
  ['order_delay', 'Split order - two consignments landed, the third has no AWB', 'jeweller'],
  ['payment', 'Credit limit shows fully used but we settled on Monday', 'jeweller'],
  ['settlement', 'Commission deducted twice on a single settlement line', 'manufacturer'],
  ['catalogue', 'Bulk upload stopped at row 240 with no error shown', 'manufacturer'],
  ['quality', 'Net weight on delivery is 0.6g under the listing', 'jeweller'],
  ['kyc', 'GSTIN changed after a partnership restructure', 'manufacturer'],
  ['returns', 'Manufacturer refusing to accept a verified return', 'jeweller'],
  ['account', 'Locked out after changing the authenticator phone', 'manufacturer'],
  ['app_issue', 'Images upload but never appear on the listing', 'manufacturer'],
  ['order_delay', 'Festive order will miss the Diwali cut-off', 'jeweller'],
  ['payment', 'Refund shows processed but nothing has hit our account', 'jeweller'],
  ['settlement', 'Nodal reference on the payout does not match our statement', 'manufacturer'],
  ['catalogue', 'HUID field will not accept a valid six character code', 'manufacturer'],
];

// How the 48 rows land. Written out rather than computed because a queue that
// never shows an unassigned, an escalated or a reopened ticket has not been
// tested against the rows that break the layout.
const TICKET_STATUS_PLAN = [
  'new', 'new', 'new', 'new', 'new',
  'open', 'open', 'open', 'open', 'open', 'open', 'open',
  'open', 'open', 'open', 'open', 'open', 'open', 'open',
  'awaiting_member', 'awaiting_member', 'awaiting_member', 'awaiting_member',
  'awaiting_member', 'awaiting_member', 'awaiting_member',
  'escalated', 'escalated', 'escalated', 'escalated',
  'resolved', 'resolved', 'resolved', 'resolved', 'resolved',
  'resolved', 'resolved', 'resolved', 'resolved',
  'closed', 'closed', 'closed', 'closed', 'closed', 'closed', 'closed',
  'reopened', 'reopened',
];

const PRIORITY_PLAN = ['normal', 'high', 'normal', 'urgent', 'low', 'normal', 'high', 'normal'];

/**
 * How long the SLA clock has actually run on a ticket: wall-clock age minus the
 * time the member owed us something. This is the number every breach flag is
 * computed from, and the reason a four-day wait on a photograph is not a breach.
 */
function runningClockMins(createdAtMs, endedAtMs, awaitingMemberMins) {
  const elapsed = Math.round((endedAtMs - createdAtMs) / MINUTE_MS);
  return Math.max(0, elapsed - awaitingMemberMins);
}

/**
 * The order a ticket is about, chosen from the orders that could actually have
 * produced it. A return query pointing at an order with no return would put a
 * refund panel on the workspace with nothing behind it, and an agent would
 * answer from a record that does not exist. A KYC or an account ticket has no
 * order at all, and pretending otherwise is the same mistake in reverse.
 */
const ordersWithReturn = orders.filter((order) => order.return !== null);
const ordersWithPaymentTrouble = orders.filter((order) => order.payment.status !== 'captured');
const ordersAwaitingSettlement = orders.filter((order) => order.settlement.status !== 'not_due');

function orderFor(category, index) {
  const pick = (rows) => (rows.length === 0 ? null : rows[index % rows.length]);

  if (category === 'returns' || category === 'quality') return pick(ordersWithReturn);
  if (category === 'payment') return pick(ordersWithPaymentTrouble);
  if (category === 'settlement') return pick(ordersAwaitingSettlement);
  if (category === 'order_delay') return pick(orders);
  return null;
}

export const ticketRows = TICKET_STATUS_PLAN.map((status, index) => {
  const [category, subject, memberType] = TICKET_SEEDS[index % TICKET_SEEDS.length];
  const member = memberType === 'manufacturer'
    ? manufacturers[index % manufacturers.length]
    : jewellers[index % jewellers.length];
  const priority = PRIORITY_PLAN[index % PRIORITY_PLAN.length];
  const targets = SLA_TARGETS[priority];

  // The first two new tickets are deliberately unassigned - the queue has to
  // show what nobody has picked up.
  const assignee = status === 'new' && index < 2 ? null : supportAgents[index % supportAgents.length];

  const ageMins = status === 'new' ? 12 + index * 9 : 90 + index * 210;
  const createdAtMs = NOW_MS - ageMins * MINUTE_MS;
  const createdAt = new Date(createdAtMs).toISOString();

  // Time the member owed us a reply. Only awaiting_member tickets are still
  // accruing it; the finished ones carry what they accrued on the way.
  const awaitingMemberMins = status === 'awaiting_member'
    ? 900 + index * 260
    : ['resolved', 'closed', 'reopened'].includes(status)
      ? 240 + (index % 5) * 180
      : 0;

  // A new ticket has not been answered yet. Everything else has, except the two
  // oldest open ones, which is exactly the state a first-response breach is.
  const firstResponseMins = status === 'new'
    ? null
    : index % 11 === 0
      ? targets.firstResponseMins + 90 + index
      : Math.max(4, Math.round(targets.firstResponseMins * (0.2 + (index % 6) * 0.12)));

  const firstResponseAt = firstResponseMins === null
    ? null
    : new Date(createdAtMs + firstResponseMins * MINUTE_MS).toISOString();

  const resolvedAt = ['resolved', 'closed'].includes(status)
    ? new Date(createdAtMs + (targets.resolutionHours * (0.4 + (index % 7) * 0.14)) * HOUR_MS).toISOString()
    : null;
  const closedAt = status === 'closed'
    ? new Date(Date.parse(resolvedAt) + 48 * HOUR_MS).toISOString()
    : null;

  const clockEndsAtMs = resolvedAt ? Date.parse(resolvedAt) : NOW_MS;
  const resolutionClockMins = runningClockMins(createdAtMs, clockEndsAtMs, awaitingMemberMins);

  const firstResponseBreached = firstResponseMins === null
    ? runningClockMins(createdAtMs, NOW_MS, awaitingMemberMins) > targets.firstResponseMins
    : firstResponseMins > targets.firstResponseMins;

  const resolutionBreached = resolutionClockMins > targets.resolutionHours * 60;

  const linkedOrder = orderFor(category, index);

  const escalated = status === 'escalated';

  return {
    id: `TKT-${pad(index + 1, 4)}`,
    subject,
    category,
    priority,
    status,
    channel: TICKET_CHANNELS[index % TICKET_CHANNELS.length],
    memberType,
    memberId: member.id,
    memberName: member.businessName,
    memberContactName: member.contactName,
    memberCity: member.city,
    assigneeId: assignee?.id ?? null,
    assigneeName: assignee?.name ?? null,
    linkedOrderId: linkedOrder?.id ?? null,
    createdAt,
    firstResponseAt,
    lastActivityAt: isoMinutesAgo(Math.max(5, ageMins - 60 - index * 3)),
    resolvedAt,
    closedAt,
    escalatedAt: escalated ? new Date(createdAtMs + 6 * HOUR_MS).toISOString() : null,
    escalationQueue: escalated ? ESCALATION_QUEUES[index % ESCALATION_QUEUES.length] : null,
    escalationReason: escalated
      ? [
        'Needs a finance decision on a double commission deduction',
        'Catalogue rules question the desk cannot answer',
        'Carrier has to be chased at branch level',
        'Return refused by the manufacturer - trust to arbitrate',
        'Reproducible bug in the mobile rate board',
      ][index % 5]
      : null,
    // The clock-stopped numbers, and the flags computed off them. A screen never
    // recomputes a breach - it would need this whole rule to do it.
    slaFirstResponseMins: targets.firstResponseMins,
    slaResolutionHours: targets.resolutionHours,
    awaitingMemberMins,
    firstResponseElapsedMins: firstResponseMins,
    resolutionClockMins,
    firstResponseBreached,
    resolutionBreached,
    slaDueAt: new Date(createdAtMs + (targets.resolutionHours * HOUR_MS) + awaitingMemberMins * MINUTE_MS).toISOString(),
    // A CSAT score only exists once a member has been asked, which is at
    // resolution. A closed ticket nobody scored keeps a null rather than a zero.
    csatScore: ['resolved', 'closed'].includes(status) && index % 3 !== 0 ? 3 + (index % 3) : null,
    csatComment: ['resolved', 'closed'].includes(status) && index % 6 === 1
      ? 'Answered quickly and the refund came through the same week.'
      : null,
    // Filled in from the thread below rather than declared, so the count on the
    // queue row can never disagree with what the workspace actually renders.
    messageCount: 0,
    reopenCount: status === 'reopened' ? 1 + (index % 2) : 0,
  };
});

export const ticketById = Object.fromEntries(ticketRows.map((row) => [row.id, row]));

export const ticketsByMemberId = ticketRows.reduce((map, row) => {
  (map[row.memberId] ??= []).push(row);
  return map;
}, {});

// ---------------------------------------------------------------------------
// The conversation - ADM-088
// ---------------------------------------------------------------------------

const MEMBER_OPENERS = {
  order_delay: 'The order was confirmed on the 14th and there is still no AWB against two of the three consignments. My customer is asking every day.',
  payment: 'The amount left our account on Monday morning but the portal still shows the payment as failed. Reference is on the statement.',
  settlement: 'Last week payout has not reached us. Our bank shows nothing against the nodal reference on the settlement page.',
  catalogue: 'Three of my listings came back rejected. The reason just says media standards and I cannot tell which photograph is the problem.',
  quality: 'The clasp gave way on the second wear. I have the piece with me and photographs of the break.',
  kyc: 'I have uploaded the BIS licence twice now. The application still sits at pending and nobody has come back to me.',
  returns: 'The return was picked up eleven days ago and verified. The refund has not moved since.',
  account: 'I need to add my son to the account so he can place orders. There is no option anywhere in settings.',
  app_issue: 'On the phone browser the rate board shows yesterday gold rate. On the laptop it is correct.',
};

const AGENT_REPLIES = [
  'Thank you for writing in. I have pulled up the order and can see what you are describing. Let me check with the manufacturer and come back to you today.',
  'I have raised this with the team that owns it. I will keep this ticket open and update you as soon as I hear back.',
  'Could you send a photograph of the piece against a plain background? That is what the manufacturer will be asked for, so it saves a round trip.',
  'Checked with finance. The payout went out on the nodal rail on Tuesday and should reflect within one working day.',
];

const SYSTEM_LINES = {
  escalated: 'Escalated to the {queue} queue',
  resolved: 'Marked resolved',
  closed: 'Closed automatically after 48 hours with no reply',
  reopened: 'Reopened by the member',
  awaiting_member: 'Waiting on the member - SLA clock stopped',
};

export const ticketMessagesByTicketId = Object.fromEntries(
  ticketRows.map((ticket) => {
    const createdAtMs = Date.parse(ticket.createdAt);
    const messages = [
      {
        id: `${ticket.id}-M1`,
        ticketId: ticket.id,
        authorType: 'member',
        authorName: ticket.memberContactName,
        body: MEMBER_OPENERS[ticket.category],
        internal: false,
        at: ticket.createdAt,
      },
    ];

    if (ticket.firstResponseAt) {
      messages.push({
        id: `${ticket.id}-M2`,
        ticketId: ticket.id,
        authorType: 'agent',
        authorName: ticket.assigneeName ?? 'Elanzia support',
        body: AGENT_REPLIES[messages.length % AGENT_REPLIES.length],
        internal: false,
        at: ticket.firstResponseAt,
      });

      // An internal note is Elanzia only. It sits in the same thread because an
      // agent picking the ticket up needs it in order, not in a side panel.
      messages.push({
        id: `${ticket.id}-M3`,
        ticketId: ticket.id,
        authorType: 'agent',
        authorName: ticket.assigneeName ?? 'Elanzia support',
        body: `Internal - ${ticket.memberName} has ${ticket.reopenCount > 0 ? 'reopened this once already' : 'been patient here'}. Worth a call rather than another email.`,
        internal: true,
        at: new Date(Date.parse(ticket.firstResponseAt) + 20 * MINUTE_MS).toISOString(),
      });
    }

    if (SYSTEM_LINES[ticket.status]) {
      messages.push({
        id: `${ticket.id}-M4`,
        ticketId: ticket.id,
        authorType: 'system',
        authorName: 'Elanzia',
        body: SYSTEM_LINES[ticket.status].replace('{queue}', ticket.escalationQueue ?? ''),
        internal: false,
        at: ticket.lastActivityAt,
      });
    }

    return [ticket.id, messages];
  }),
);

// The count the queue shows is the length of the thread the workspace renders.
ticketRows.forEach((ticket) => {
  ticket.messageCount = ticketMessagesByTicketId[ticket.id].length;
});

export const ticketTimelineByTicketId = Object.fromEntries(
  ticketRows.map((ticket) => {
    const events = [
      { id: `${ticket.id}-T1`, label: 'Raised', at: ticket.createdAt, actor: ticket.memberContactName },
    ];
    if (ticket.assigneeName) {
      events.push({ id: `${ticket.id}-T2`, label: 'Assigned', at: ticket.createdAt, actor: ticket.assigneeName });
    }
    if (ticket.firstResponseAt) {
      events.push({ id: `${ticket.id}-T3`, label: 'First response', at: ticket.firstResponseAt, actor: ticket.assigneeName });
    }
    if (ticket.escalatedAt) {
      events.push({ id: `${ticket.id}-T4`, label: 'Escalated', at: ticket.escalatedAt, actor: ticket.assigneeName });
    }
    if (ticket.resolvedAt) {
      events.push({ id: `${ticket.id}-T5`, label: 'Resolved', at: ticket.resolvedAt, actor: ticket.assigneeName });
    }
    if (ticket.closedAt) {
      events.push({ id: `${ticket.id}-T6`, label: 'Closed', at: ticket.closedAt, actor: 'Elanzia' });
    }
    return [ticket.id, events];
  }),
);

// Photographs and documents a member attached. Only the categories where a
// member would actually send one, so the workspace does not show an empty
// viewer next to a billing question.
export const ticketAttachmentsByTicketId = Object.fromEntries(
  ticketRows.map((ticket, index) => {
    const hasEvidence = ['quality', 'returns', 'kyc', 'app_issue'].includes(ticket.category);
    if (!hasEvidence) return [ticket.id, []];

    return [
      ticket.id,
      [
        {
          id: `${ticket.id}-A1`,
          type: 'image',
          label: ticket.category === 'kyc' ? 'BIS licence' : 'Photograph from the member',
          url: `https://placehold.co/900x1200?text=${encodeURIComponent(ticket.id)}`,
          uploadedByParty: 'member',
          uploadedAt: ticket.createdAt,
        },
        ...(index % 2 === 0
          ? [{
            id: `${ticket.id}-A2`,
            type: 'image',
            label: 'Second angle',
            url: `https://placehold.co/900x1200?text=${encodeURIComponent(`${ticket.id}-2`)}`,
            uploadedByParty: 'member',
            uploadedAt: ticket.lastActivityAt,
          }]
          : []),
      ],
    ];
  }),
);

/**
 * The member behind a ticket, joined from core. Support reads the member
 * record; it never holds a copy of one.
 */
export function memberForTicket(ticket) {
  const member = ticket.memberType === 'manufacturer'
    ? manufacturerById[ticket.memberId]
    : jewellerById[ticket.memberId];

  return {
    id: member.id,
    type: ticket.memberType,
    businessName: member.businessName,
    contactName: member.contactName,
    email: member.email,
    phone: member.phone,
    city: member.city,
    gstin: member.gstin,
    status: member.status,
    memberSince: member.appliedAt ?? member.registeredAt,
    openTickets: (ticketsByMemberId[member.id] ?? []).filter(
      (row) => !CLOSED_TICKET_STATUSES.includes(row.status),
    ).length,
  };
}

// ---------------------------------------------------------------------------
// Support performance - ADM-091
// ---------------------------------------------------------------------------

const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

/**
 * Daily ticket volume for the board. Derived from a fixed seed so the chart is
 * the same shape on every reload, with a festive bump because Akshaya Tritiya
 * genuinely doubles the desk's load and a flat line would teach the wrong thing.
 */
export function volumeSeriesFor(range = '30d') {
  const days = RANGE_DAYS[range] ?? 30;
  return Array.from({ length: days }).map((_, index) => {
    const dayIndex = days - index;
    const festiveBump = dayIndex % 17 === 0 ? 14 : 0;
    const weekendDip = dayIndex % 7 === 0 ? -6 : 0;
    const raised = 18 + (dayIndex % 9) + festiveBump + weekendDip;
    return {
      date: isoDaysAgo(dayIndex),
      raised,
      resolved: Math.max(0, raised - 2 + (dayIndex % 4)),
      backlog: 34 + (dayIndex % 11) - weekendDip,
    };
  });
}

export function responseSeriesFor(range = '30d') {
  const days = RANGE_DAYS[range] ?? 30;
  return Array.from({ length: days }).map((_, index) => {
    const dayIndex = days - index;
    return {
      date: isoDaysAgo(dayIndex),
      medianFirstResponseMins: 38 + (dayIndex % 13) * 3,
      medianResolutionHours: Number((11 + (dayIndex % 7) * 1.4).toFixed(1)),
    };
  });
}

export const categoryMix = TICKET_CATEGORIES.map((category) => ({
  category,
  raised: ticketRows.filter((row) => row.category === category).length * 9 + 12,
  breached: ticketRows.filter((row) => row.category === category && row.resolutionBreached).length * 2,
}));

export const csatMix = [5, 4, 3, 2, 1].map((score) => ({
  score,
  count: ticketRows.filter((row) => row.csatScore === score).length * 7 + (6 - score) * 3,
}));

export const agentLoad = supportAgents.map((agent) => {
  const owned = ticketRows.filter((row) => row.assigneeId === agent.id);
  const open = owned.filter((row) => !CLOSED_TICKET_STATUSES.includes(row.status));
  const scored = owned.filter((row) => row.csatScore !== null);

  return {
    agentId: agent.id,
    agentName: agent.name,
    city: agent.city,
    openTickets: open.length,
    breached: open.filter((row) => row.resolutionBreached).length,
    resolvedLast30Days: owned.filter((row) => row.resolvedAt !== null).length * 6,
    medianFirstResponseMins: 32 + (owned.length % 5) * 9,
    csatAverage: scored.length
      ? Number((scored.reduce((sum, row) => sum + row.csatScore, 0) / scored.length).toFixed(2))
      : null,
  };
});

// ---------------------------------------------------------------------------
// Canned responses - ADM-092
//
// The shared library an agent reaches for mid-reply. A canned response is not
// a notification template: nothing here needs TRAI or Meta approval, because
// it goes out inside a conversation the member already started rather than as
// an unsolicited message. What it does need is a shortcut an agent can type,
// and variables that resolve against the ticket in front of them.
//
// `usageCount` is the honest measure of a library. A response nobody has used
// in six months is either badly written or answering a question members have
// stopped asking, and either way somebody should look at it.
// ---------------------------------------------------------------------------

export const CANNED_CATEGORIES = TICKET_CATEGORIES;
export const CANNED_STATES = ['published', 'draft', 'archived'];

// Resolved against the ticket and its member when an agent inserts one.
export const CANNED_VARIABLES = [
  'memberName', 'contactName', 'ticketId', 'orderId', 'agentName', 'slaHours', 'city',
];

// [shortcut, category, title, body, channels]
const CANNED_SEEDS = [
  ['/delay', 'order_delay', 'Order delay, chasing the manufacturer',
    'Hello {contactName}, thank you for your patience on {orderId}. We have chased the manufacturer and they have committed to dispatch within {slaHours} hours. I will come back to you the moment there is an AWB.', ['email', 'in_app', 'whatsapp']],
  ['/delay-festival', 'order_delay', 'Order delay, festival season',
    'Hello {contactName}, {orderId} is running behind because every workshop is at capacity this season. Your piece is in production and I am tracking it daily. I will update you by tomorrow evening.', ['email', 'in_app']],
  ['/awb', 'order_delay', 'Dispatched, tracking shared',
    'Hello {contactName}, {orderId} has been dispatched and is with the carrier. You can follow it in the app under Orders. It is insured to full value for the whole journey.', ['email', 'in_app', 'whatsapp']],
  ['/pay-failed', 'payment', 'Payment failed, retry guidance',
    'Hello {contactName}, the bank declined the payment on {orderId} rather than us. Nothing has been debited. Please retry from the app, and if it declines again your bank will be able to say why.', ['email', 'in_app', 'whatsapp']],
  ['/pay-debited', 'payment', 'Debited but order not confirmed',
    'Hello {contactName}, when a payment is debited without the order confirming, the amount sits with the aggregator and returns to your account within five working days. I have raised it with them and will confirm once it is reversed.', ['email', 'in_app']],
  ['/pay-nodal', 'payment', 'Where the money sits before settlement',
    'Hello {contactName}, your payment is held in the payment aggregator nodal account, not with Elanzia. It releases to the manufacturer after delivery, less our commission. Nothing moves before your goods do.', ['email']],
  ['/settle-when', 'settlement', 'When settlement is released',
    'Hello {contactName}, settlement releases after delivery is confirmed. Yours is scheduled on the next run and you will see it against {orderId} in your statement.', ['email', 'in_app']],
  ['/settle-hold', 'settlement', 'Settlement held pending a dispute',
    'Hello {contactName}, settlement on {orderId} is held while the open dispute is resolved. As soon as it is settled the payout is released on the following run.', ['email']],
  ['/settle-short', 'settlement', 'Settlement lower than expected',
    'Hello {contactName}, the payout on {orderId} is the goods value less our commission at the rate agreed on your account. I have attached the breakup so you can see each line.', ['email']],
  ['/list-rejected', 'catalogue', 'Listing rejected, what to fix',
    'Hello {contactName}, your listing was not published because the images do not show the hallmark clearly enough to read. Re-shoot the hallmark close-up and resubmit, and we will review it the same day.', ['email', 'in_app']],
  ['/list-huid', 'catalogue', 'HUID missing on a 22K listing',
    'Hello {contactName}, anything at 22K or above cannot go live without BIS hallmarking and a HUID recorded against it. Add the HUID to the listing and it will clear moderation.', ['email', 'in_app']],
  ['/list-media', 'catalogue', 'Below the media standard',
    'Hello {contactName}, your listing needs the front, reverse, side profile and a hallmark close-up before it can publish. Add the missing angles and resubmit.', ['email', 'in_app']],
  ['/quality-assay', 'quality', 'Purity dispute, independent assay',
    'Hello {contactName}, I am sorry the piece did not read as declared. Please have it assayed at a BIS recognised lab and send us the report. If it confirms your reading we will make you whole and take it up with the manufacturer.', ['email', 'in_app']],
  ['/quality-return', 'quality', 'How to return a piece',
    'Hello {contactName}, raise the return in the app against {orderId} and record an unboxing video before you repack. We weigh every return in and the video is what we check the weigh-in against.', ['email', 'in_app', 'whatsapp']],
  ['/quality-finish', 'quality', 'Finish quality complaint',
    'Hello {contactName}, thank you for the photographs. I have sent them to the manufacturer and asked them to respond within {slaHours} hours. You do not need to do anything further for now.', ['email', 'in_app']],
  ['/kyc-docs', 'kyc', 'KYC documents needed',
    'Hello {contactName}, to finish your registration we need your GST certificate and a cancelled cheque in the business name. Upload them in the app under Account and we will verify within two working days.', ['email', 'in_app', 'whatsapp']],
  ['/kyc-gstin', 'kyc', 'GSTIN could not be verified',
    'Hello {contactName}, the GSTIN on your application does not match the trade name on the portal. Please check the number and resubmit, or send the registration certificate and we will verify by hand.', ['email']],
  ['/kyc-approved', 'kyc', 'KYC approved, next steps',
    'Hello {contactName}, your verification is complete and {memberName} is now live on the marketplace. You can start listing straight away.', ['email', 'in_app', 'whatsapp']],
  ['/ret-received', 'returns', 'Return received, being verified',
    'Hello {contactName}, your return has reached our hub and is being weighed and checked against the unboxing video. No refund is released before that is done, and I will confirm as soon as it clears.', ['email', 'in_app']],
  ['/ret-refunded', 'returns', 'Refund processed',
    'Hello {contactName}, the return on {orderId} has been verified and the refund is processed at the price the order was confirmed at. It reaches your account within five working days.', ['email', 'in_app', 'whatsapp']],
  ['/ret-short', 'returns', 'Return short on weight',
    'Hello {contactName}, the piece weighed back in below what it left at, beyond the tolerance we allow for two sets of scales. I have opened a case so we can look at it together before anything is refunded.', ['email']],
  ['/acct-locked', 'account', 'Account locked after failed sign-ins',
    'Hello {contactName}, the account locks for thirty minutes after repeated failed sign-ins. It will unlock on its own, and I can reset it sooner if you would like.', ['email', 'in_app', 'whatsapp']],
  ['/acct-user', 'account', 'Adding a user to your account',
    'Hello {contactName}, you can add colleagues under Account and Users. They receive an invite and set their own password, and you choose what each of them can see.', ['email', 'in_app']],
  ['/acct-credit', 'account', 'Credit limit enquiry',
    'Hello {contactName}, credit terms are reviewed after a trading history builds on the account. I have passed your request to the finance desk and they will come back within {slaHours} hours.', ['email']],
  ['/app-cache', 'app_issue', 'App not loading, first steps',
    'Hello {contactName}, please force close the app and sign in again. If it still does not load, tell me your device and app version and I will get engineering to look at it.', ['email', 'in_app', 'whatsapp']],
  ['/app-logged', 'app_issue', 'Reported to engineering',
    'Hello {contactName}, I have logged this with engineering under {ticketId}. They look at reports every morning and I will pass on whatever they find.', ['email', 'in_app']],
  ['/ack', 'account', 'Acknowledgement, working on it',
    'Hello {contactName}, thank you for writing in. I have your request and I am looking into it now. You will hear from me within {slaHours} hours.', ['email', 'in_app', 'whatsapp']],
  ['/wait-member', 'account', 'Waiting on the member',
    'Hello {contactName}, I need the information above before I can take this further. I will hold the ticket open for you and pick it straight back up when you reply.', ['email', 'in_app']],
  ['/closing', 'account', 'Closing, please reopen if needed',
    'Hello {contactName}, I am closing this as resolved. If anything is still outstanding just reply here and it comes straight back to me.', ['email', 'in_app', 'whatsapp']],
  ['/escalate', 'account', 'Escalated to a specialist desk',
    'Hello {contactName}, I have escalated this to the team that can settle it properly. They have the full history and will come back within {slaHours} hours.', ['email', 'in_app']],
  ['/dispatch-sla', 'order_delay', 'Dispatch promise explained',
    'Hello {contactName}, manufacturers commit to dispatch within five working days of confirmation. {orderId} is inside that window and I am watching it.', ['email', 'in_app']],
  ['/invoice', 'payment', 'Invoice copy sent',
    'Hello {contactName}, I have emailed the tax invoice for {orderId} to the address on your account. The GST breakup is on the second page.', ['email']],
  ['/dispute-open', 'quality', 'Dispute opened, what happens next',
    'Hello {contactName}, I have opened a case on {orderId}. Both you and the manufacturer can add evidence, and our trust desk decides within {slaHours} hours.', ['email', 'in_app']],
  ['/hallmark', 'quality', 'What the hallmark on your piece means',
    'Hello {contactName}, the six digit HUID stamped on the piece is unique to it and is registered with BIS. You can verify it in the BIS Care app.', ['email', 'in_app', 'whatsapp']],
  ['/bulk-upload', 'catalogue', 'Bulk listing upload help',
    'Hello {contactName}, download the template from the Listings screen, fill one row per piece and upload it back. Anything that fails validation comes back with the reason against the row.', ['email', 'in_app']],
  ['/pickup', 'returns', 'Arranging a return pickup',
    'Hello {contactName}, I have booked a pickup for {orderId} from the address on your account. Please keep the piece sealed and the unboxing video to hand.', ['email', 'in_app', 'whatsapp']],
];

// A handful of near-duplicates and dead entries, because a real library has
// them and ADM-092 exists partly to find them.
const CANNED_EXTRAS = [
  ['/delay-old', 'order_delay', 'Order delay (old wording)',
    'Dear Customer, your order is delayed. We regret the inconvenience caused.', ['email'], 'archived'],
  ['/pay-old', 'payment', 'Payment failed (old wording)',
    'Dear Customer, your payment has failed. Kindly retry.', ['email'], 'archived'],
  ['/gst-rate', 'payment', 'GST on jewellery',
    'Hello {contactName}, GST on jewellery is 3 percent and is shown as a separate line on every invoice. It is statutory and not something we set.', ['email'], 'published'],
  ['/rate-lock', 'order_delay', 'How long a quoted rate holds',
    'Hello {contactName}, a quoted rate is held for thirty minutes. If gold moves beyond our tolerance band before you confirm, we will show you the new price rather than change it quietly.', ['email', 'in_app'], 'published'],
  ['/private-range', 'catalogue', 'Private range visibility',
    'Hello {contactName}, pieces in a private range are visible only to the jewellers you name. They never appear in public search or on your microsite.', ['email'], 'published'],
  ['/draft-holiday', 'account', 'Holiday hours (draft)',
    'Hello {contactName}, our desk is closed for the holiday and reopens on {slaHours}. Urgent order issues are still monitored.', ['email'], 'draft'],
  ['/draft-survey', 'account', 'Post-resolution survey (draft)',
    'Hello {contactName}, if you have a moment, we would value your rating on how this was handled.', ['email', 'in_app'], 'draft'],
];

const CANNED_LOCALES = ['en', 'hi', 'gu'];

export const cannedResponses = [...CANNED_SEEDS, ...CANNED_EXTRAS].map((seed, index) => {
  const [shortcut, category, title, body, channels, forcedState] = seed;
  const owner = supportAgents[index % supportAgents.length];
  const state = forcedState ?? (index % 13 === 5 ? 'draft' : 'published');

  // Most are English only. The busiest few are translated, which is what a
  // real library looks like before somebody funds a translation round.
  const locales = index % 6 === 0 ? CANNED_LOCALES : index % 3 === 0 ? ['en', 'hi'] : ['en'];

  // A few have never been used at all. Those are the rows worth pruning.
  const neverUsed = index % 9 === 4 || state === 'draft';
  const usageCount = neverUsed ? 0 : 4 + ((index * 17) % 180);

  return {
    id: `CAN-${pad(index + 1, 3)}`,
    shortcut,
    title,
    body,
    category,
    channels,
    locales,
    state,
    variables: [...body.matchAll(/\{(\w+)\}/g)].map((match) => match[1]),
    usageCount,
    lastUsedAt: neverUsed ? null : isoDaysAgo(1 + (index % 40)),
    createdAt: isoDaysAgo(60 + index * 3),
    updatedAt: isoDaysAgo(index % 30),
    updatedById: owner.id,
    updatedByName: owner.name,
    archivedReason: state === 'archived' ? 'Superseded by the current wording' : null,
  };
});

export const cannedById = Object.fromEntries(cannedResponses.map((row) => [row.id, row]));
