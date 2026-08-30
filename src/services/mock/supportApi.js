// Mock API for the ticket queue, the ticket workspace and the support
// performance board - ADM-087, ADM-088, ADM-091.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Ticket: { id, subject,
//           category: 'order_delay'|'payment'|'settlement'|'catalogue'
//                     |'quality'|'kyc'|'returns'|'account'|'app_issue',
//           priority: 'low'|'normal'|'high'|'urgent',
//           status: 'new'|'open'|'awaiting_member'|'escalated'|'resolved'
//                   |'closed'|'reopened',
//           channel: 'email'|'phone'|'whatsapp'|'in_app'|'web_form',
//           memberType: 'manufacturer'|'jeweller',
//           memberId: Manufacturer.id|Jeweller.id, memberName,
//           memberContactName, memberCity,
//           assigneeId: AdminUser.id|null, assigneeName: string|null,
//           linkedOrderId: Order.id|null,
//           createdAt: ISO, firstResponseAt: ISO|null, lastActivityAt: ISO,
//           resolvedAt: ISO|null, closedAt: ISO|null, escalatedAt: ISO|null,
//           escalationQueue: EscalationQueue|null,
//           escalationReason: string|null,
//           slaFirstResponseMins, slaResolutionHours,
//           awaitingMemberMins, firstResponseElapsedMins: number|null,
//           resolutionClockMins, firstResponseBreached: boolean,
//           resolutionBreached: boolean, slaDueAt: ISO,
//           csatScore: 1|2|3|4|5|null, csatComment: string|null,
//           messageCount, reopenCount,
//           ageBucket: 'today'|'week'|'fortnight'|'older',
//           clockRunning: boolean }
//   THE SLA CLOCK STOPS WHILE A TICKET IS AWAITING THE MEMBER.
//   resolutionClockMins is wall-clock age MINUS awaitingMemberMins, and both
//   breach flags are computed off it. A ticket parked four days on a jeweller's
//   photograph has not breached anything - the agent did their part. A client
//   must never re-derive a breach from createdAt.
//
// EscalationQueue: 'finance'|'catalogue'|'logistics'|'trust'|'engineering'
//   Escalation is a handoff, not a status. The ticket keeps its assignee, so it
//   never lands in an unowned bucket while two teams each assume the other has
//   it.
//
// TicketMessage: { id, ticketId, authorType: 'member'|'agent'|'system',
//                  authorName, body, internal: boolean, at: ISO }
//   internal messages are Elanzia only and must never be returned to a member
//   facing API.
//
// TimelineEvent: { id, label, at: ISO, actor: string|null }
//
// Attachment: { id, type: 'image'|'document'|'video', label, url,
//               uploadedByParty: 'member'|'agent', uploadedAt: ISO }
//
// Member: { id, type: 'manufacturer'|'jeweller', businessName, contactName,
//           email, phone, city, gstin, status, memberSince: ISO, openTickets }
//
// LinkedOrder: { id, status, placedAt, total, awb: string|null,
//                returnStatus: 'awaiting_verification'|'processed'|null,
//                refundStatus: string|null, refundShown: boolean }
//   refundShown is false until the return has been VERIFIED. Support reads
//   refund state and never sets it - showing a jeweller a processed refund
//   before the goods came back is how a marketplace loses a manufacturer.
//
// Agent: { agentId, agentName, city, openTickets, breached,
//          resolvedLast30Days, medianFirstResponseMins,
//          csatAverage: number|null }

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import { orderById } from '@/data/core';
import {
  CLOCK_STOPPED_STATUSES,
  CLOSED_TICKET_STATUSES,
  ESCALATION_QUEUES,
  SLA_TARGETS,
  SUPPORT_NOW,
  TICKET_CATEGORIES,
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  CANNED_CATEGORIES,
  CANNED_STATES,
  CANNED_VARIABLES,
  agentLoad,
  cannedResponses,
  categoryMix,
  csatMix,
  memberForTicket,
  responseSeriesFor,
  supportAgents,
  ticketAttachmentsByTicketId,
  ticketMessagesByTicketId,
  ticketRows,
  ticketTimelineByTicketId,
  volumeSeriesFor,
} from '@/data/supportFixtures';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let ticketRecords = ticketRows.map((row) => ({ ...row }));
// Nested arrays, so a shallow copy would share them with the fixture and with
// Redux, which freezes whatever it stores.
const cloneCanned = (row) => ({
  ...row,
  channels: [...row.channels],
  locales: [...row.locales],
  variables: [...row.variables],
});
let cannedRecords = cannedResponses.map(cloneCanned);
const messageRecords = Object.fromEntries(
  Object.entries(ticketMessagesByTicketId).map(([id, rows]) => [id, [...rows]]),
);

const NOW_MS = Date.parse(SUPPORT_NOW);
const MINUTE_MS = 60000;

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the mock's audit trail names a real person.
let actingAdmin = { id: 'STF-007', name: 'Suresh Reddy' };
export function setActingAdmin(admin) {
  actingAdmin = admin ?? actingAdmin;
}

function mockError(code, message, status = 400) {
  return mockRequest(null).then(() => {
    throw new MockApiError(message, { status, code });
  });
}

const nowIso = () => new Date().toISOString();

// Every endpoint hands back a COPY of its record rather than the record itself.
// A real HTTP client parses fresh JSON on every call, and the store deep-freezes
// whatever it is given - handing out the live object means the next write to it
// throws.
const copy = (row) => (row === null || row === undefined ? row : { ...row });
const copies = (rows) => rows.map(copy);

function ageBucketFor(row) {
  const days = (NOW_MS - Date.parse(row.createdAt)) / 86400000;
  if (days < 1) return 'today';
  if (days <= 7) return 'week';
  if (days <= 14) return 'fortnight';
  return 'older';
}

function decorate(row) {
  return {
    ...row,
    ageBucket: ageBucketFor(row),
    // Whether the SLA clock is ticking right now. Derived here so a queue and a
    // workspace cannot show the same ticket as breaching and as parked.
    clockRunning:
      !CLOCK_STOPPED_STATUSES.includes(row.status) && !CLOSED_TICKET_STATUSES.includes(row.status),
  };
}

// The values a filter dropdown offers, returned with the data rather than read
// from a fixture by the screen. A screen that imports a fixture to build its
// own dropdown has quietly bypassed the whole data layer.
function facetOf(rows, valueKey, labelKey) {
  const seen = new Map();
  rows.forEach((row) => {
    if (row[valueKey] && !seen.has(row[valueKey])) seen.set(row[valueKey], row[labelKey]);
  });
  return [...seen.entries()]
    .map(([value, label]) => ({ value, label: label ?? value }))
    .sort((left, right) => String(left.label).localeCompare(String(right.label)));
}

// breachedOnly and unassignedOnly are booleans over derived fields, so the
// generic equality filter cannot answer them. Handled before the generic path.
function applyDeskFilters(rows, { breachedOnly, unassignedOnly }) {
  let next = rows;
  if (breachedOnly) {
    next = next.filter((row) => row.firstResponseBreached || row.resolutionBreached);
  }
  if (unassignedOnly) next = next.filter((row) => row.assigneeId === null);
  return next;
}

/**
 * The order a ticket points at, with the one thing support must not get wrong:
 * a refund is only shown once the return has been verified.
 */
function linkedOrderFor(ticket) {
  if (!ticket.linkedOrderId) return null;
  const order = orderById[ticket.linkedOrderId];
  const verified = Boolean(order.return?.verifiedAt);

  return {
    id: order.id,
    status: order.status,
    placedAt: order.placedAt,
    total: order.total,
    awb: order.awb,
    returnStatus: order.return ? (verified ? 'processed' : 'awaiting_verification') : null,
    refundStatus: order.return?.refundStatus ?? null,
    // A refund never reads as processed before the goods have been checked in.
    // Support reads this state from the order; it has no endpoint to set it.
    refundShown: verified,
  };
}

// ---------------------------------------------------------------------------
// The queue - ADM-087
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/support/tickets
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, priority, category, channel, assigneeId,
//                     memberType, ageBucket, breachedOnly, unassignedOnly } }
// Returns: { items: Ticket[], total, page, pageSize }
// Notes: sorted by slaDueAt ASCENDING by default - a support queue is worked
//        against the promise, so the ticket closest to breaching is read first.
//        Every other queue in the portal sorts newest first; this one does not,
//        and that is deliberate.
//        search matches the ticket id, the subject, the member name and the
//        linked order id.
//        breachedOnly and unassignedOnly are booleans, not values.
export function listTickets(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;
  const { breachedOnly, unassignedOnly, ...rest } = filters;

  return mockRequest(() => {
    let rows = applySearch(ticketRecords.map(decorate), search, [
      'id',
      'subject',
      'memberName',
      'linkedOrderId',
    ]);
    rows = applyDeskFilters(rows, { breachedOnly, unassignedOnly });
    rows = applyFilters(rows, rest);
    rows = applySort(rows, sortBy ?? 'slaDueAt', sortBy ? sortDir : 'asc');
    return paginate(rows, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/support/tickets/summary
// Query: { filters: { status, priority, category, channel, assigneeId,
//                     memberType, ageBucket, breachedOnly, unassignedOnly } }
// Returns: { openCount, unassigned, breached, awaitingMember,
//            medianFirstResponseMins, csatAverage: number|null,
//            byStatus: { [status]: number },
//            facets: { categories: Option[], channels: Option[],
//                      priorities: Option[], statuses: Option[],
//                      assignees: Option[] } }
//   Option: { value, label }
// Notes: the SAME filters the list endpoint takes are applied here, so the
//        tiles and the table can never describe two different populations.
//        awaitingMember is reported SEPARATELY from breached and is never
//        counted inside it - those tickets have a stopped clock, and rolling
//        them into the breach tile is exactly the false alarm the clock rule
//        exists to prevent.
//        facets are built from every ticket, not the filtered set, so narrowing
//        to one agent does not empty the dropdown that got you there.
export function getTicketSummary({ filters = {} } = {}) {
  const { breachedOnly, unassignedOnly, ...rest } = filters;

  return mockRequest(() => {
    let rows = applyDeskFilters(ticketRecords.map(decorate), { breachedOnly, unassignedOnly });
    rows = applyFilters(rows, rest);

    const open = rows.filter((row) => !CLOSED_TICKET_STATUSES.includes(row.status));
    const responded = rows.filter((row) => row.firstResponseElapsedMins !== null);
    const sortedResponses = responded
      .map((row) => row.firstResponseElapsedMins)
      .sort((left, right) => left - right);
    const scored = rows.filter((row) => row.csatScore !== null);

    return {
      openCount: open.length,
      unassigned: open.filter((row) => row.assigneeId === null).length,
      // Only tickets with a RUNNING clock can be breaching right now.
      breached: open.filter((row) => row.clockRunning && (row.firstResponseBreached || row.resolutionBreached)).length,
      awaitingMember: rows.filter((row) => row.status === 'awaiting_member').length,
      medianFirstResponseMins: sortedResponses.length === 0
        ? 0
        : sortedResponses[Math.floor(sortedResponses.length / 2)],
      csatAverage: scored.length === 0
        ? null
        : Number((scored.reduce((sum, row) => sum + row.csatScore, 0) / scored.length).toFixed(2)),
      byStatus: rows.reduce((counts, row) => {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
        return counts;
      }, {}),
      facets: {
        categories: TICKET_CATEGORIES.map((value) => ({ value, label: value })),
        channels: TICKET_CHANNELS.map((value) => ({ value, label: value })),
        priorities: TICKET_PRIORITIES.map((value) => ({ value, label: value })),
        statuses: TICKET_STATUSES.map((value) => ({ value, label: value })),
        assignees: facetOf(ticketRecords, 'assigneeId', 'assigneeName'),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/support/agents
// Returns: { items: Agent[] }
// Notes: only agents who can currently sign in are returned. Assigning work to
//        a deactivated account loses the ticket silently, which is the worst
//        way to lose one.
//        openTickets and breached are counted live so the assign dropdown can
//        show who is already buried.
export function listAgents() {
  return mockRequest(() => ({
    items: supportAgents.map((agent) => {
      const owned = ticketRecords.filter((row) => row.assigneeId === agent.id);
      const open = owned.filter((row) => !CLOSED_TICKET_STATUSES.includes(row.status));
      return {
        agentId: agent.id,
        agentName: agent.name,
        city: agent.city,
        openTickets: open.length,
        breached: open.filter((row) => row.firstResponseBreached || row.resolutionBreached).length,
      };
    }),
  }));
}

// BACKEND CONTRACT
// POST /admin/support/tickets/assign
// Body: { ticketIds: Ticket.id[], assigneeId: AdminUser.id }
// Returns: { updated: Ticket[], skipped: { ticketId, code }[] }
// Errors: 404 agent_not_found, 422 nothing_selected
// Notes: a resolved or closed ticket is skipped rather than failing the whole
//        batch - an operator who selected forty rows should not lose the
//        thirty-eight that were fine because two were already closed. Skipped
//        rows come back named so the screen can say what did not move.
//        A ticket moving from 'new' to an owner becomes 'open'.
export function assignTickets({ ticketIds = [], assigneeId } = {}) {
  if (ticketIds.length === 0) return mockError('nothing_selected', 'Pick at least one ticket.', 422);

  const agent = supportAgents.find((row) => row.id === assigneeId);
  if (!agent) return mockError('agent_not_found', `No agent with id ${assigneeId}`, 404);

  return mockRequest(() => {
    const updated = [];
    const skipped = [];

    ticketIds.forEach((ticketId) => {
      const row = ticketRecords.find((record) => record.id === ticketId);
      if (!row) {
        skipped.push({ ticketId, code: 'ticket_not_found' });
        return;
      }
      if (CLOSED_TICKET_STATUSES.includes(row.status)) {
        skipped.push({ ticketId, code: 'ticket_closed' });
        return;
      }
      row.assigneeId = agent.id;
      row.assigneeName = agent.name;
      if (row.status === 'new') row.status = 'open';
      row.lastActivityAt = nowIso();
      updated.push(decorate(row));
    });

    return { updated, skipped };
  });
}

// ---------------------------------------------------------------------------
// The workspace - ADM-088
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/support/tickets/:ticketId
// Returns: { ticket: Ticket, member: Member, linkedOrder: LinkedOrder|null,
//            messages: TicketMessage[], timeline: TimelineEvent[],
//            attachments: Attachment[], relatedTickets: Ticket[],
//            escalationQueues: EscalationQueue[] }
// Errors: 404 ticket_not_found
// Notes: messages are oldest first - a conversation is read in the order it
//        happened, and internal notes sit inline rather than in a side panel
//        because an agent picking the ticket up needs them in sequence.
//        relatedTickets are this member's other open tickets, so an agent can
//        see they are about to answer the same question twice.
//        linkedOrder.refundShown is false until the return has been verified.
export function getTicket(ticketId) {
  const row = ticketRecords.find((record) => record.id === ticketId);
  if (!row) return mockError('ticket_not_found', `No ticket with id ${ticketId}`, 404);

  return mockRequest(() => ({
    ticket: decorate(row),
    member: memberForTicket(row),
    linkedOrder: linkedOrderFor(row),
    messages: copies(messageRecords[ticketId] ?? []).sort(
      (left, right) => Date.parse(left.at) - Date.parse(right.at),
    ),
    timeline: copies(ticketTimelineByTicketId[ticketId] ?? []),
    attachments: copies(ticketAttachmentsByTicketId[ticketId] ?? []),
    relatedTickets: ticketRecords
      .filter(
        (other) =>
          other.memberId === row.memberId &&
          other.id !== row.id &&
          !CLOSED_TICKET_STATUSES.includes(other.status),
      )
      .map(decorate),
    escalationQueues: [...ESCALATION_QUEUES],
  }));
}

// BACKEND CONTRACT
// POST /admin/support/tickets/:ticketId/messages
// Body: { body, internal: boolean, nextStatus?: Ticket.status }
// Returns: { message: TicketMessage, ticket: Ticket }
// Errors: 404 ticket_not_found, 422 ticket_closed, 422 empty_reply
// Notes: an internal note never sets firstResponseAt. The member has not been
//        answered by a note they cannot see, and letting one stop the clock is
//        the easiest way to make a first response metric meaningless.
//        A public reply on a ticket that was awaiting the member restarts the
//        SLA clock by moving it back to 'open'.
export function replyToTicket({ ticketId, body, internal = false, nextStatus } = {}) {
  const row = ticketRecords.find((record) => record.id === ticketId);
  if (!row) return mockError('ticket_not_found', `No ticket with id ${ticketId}`, 404);
  if (CLOSED_TICKET_STATUSES.includes(row.status)) {
    return mockError('ticket_closed', 'This ticket is closed. Reopen it before replying.', 422);
  }
  if (!String(body ?? '').trim()) {
    return mockError('empty_reply', 'Write something before sending.', 422);
  }

  return mockRequest(() => {
    const at = nowIso();
    const message = {
      id: `${ticketId}-M${(messageRecords[ticketId]?.length ?? 0) + 1}`,
      ticketId,
      authorType: 'agent',
      authorName: actingAdmin.name,
      body,
      internal,
      at,
    };
    messageRecords[ticketId] = [...(messageRecords[ticketId] ?? []), message];

    if (!internal) {
      if (!row.firstResponseAt) {
        row.firstResponseAt = at;
        row.firstResponseElapsedMins = Math.round((Date.parse(at) - Date.parse(row.createdAt)) / MINUTE_MS)
          - row.awaitingMemberMins;
        row.firstResponseBreached = row.firstResponseElapsedMins > row.slaFirstResponseMins;
      }
      if (row.status === 'new' || row.status === 'awaiting_member') row.status = nextStatus ?? 'open';
    }
    if (nextStatus && !internal) row.status = nextStatus;

    row.messageCount += 1;
    row.lastActivityAt = at;

    return { message: copy(message), ticket: decorate(row) };
  });
}

// BACKEND CONTRACT
// POST /admin/support/tickets/:ticketId/status
// Body: { status: Ticket.status, note }
// Returns: Ticket
// Errors: 404 ticket_not_found, 422 invalid_transition, 422 note_required,
//         422 no_response_yet
// Notes: resolving requires a note. A ticket closed with no record of what was
//        done is a ticket the next agent has to solve again from scratch.
//        A ticket that has never been answered cannot be resolved - a member
//        who was never replied to has not been helped, whatever the status
//        says.
//        Moving to 'awaiting_member' STOPS the SLA clock, and the accrued wait
//        is added to awaitingMemberMins when the ticket moves off it again.
export function updateTicketStatus({ ticketId, status, note } = {}) {
  const row = ticketRecords.find((record) => record.id === ticketId);
  if (!row) return mockError('ticket_not_found', `No ticket with id ${ticketId}`, 404);
  if (!TICKET_STATUSES.includes(status)) {
    return mockError('invalid_transition', `${status} is not a ticket status.`, 422);
  }
  if (CLOSED_TICKET_STATUSES.includes(status) && !String(note ?? '').trim()) {
    return mockError('note_required', 'Say what was done. The next person reading this has only your note.', 422);
  }
  if (CLOSED_TICKET_STATUSES.includes(status) && !row.firstResponseAt) {
    return mockError('no_response_yet', 'Nobody has replied to this member yet.', 422);
  }

  return mockRequest(() => {
    const at = nowIso();

    // Coming off a stopped clock: bank the time the member owed us, so the
    // resolution measure never charges the desk for somebody else's wait.
    if (row.status === 'awaiting_member' && status !== 'awaiting_member') {
      const waited = Math.round((Date.parse(at) - Date.parse(row.lastActivityAt)) / MINUTE_MS);
      row.awaitingMemberMins += Math.max(0, waited);
    }

    row.status = status;
    row.lastActivityAt = at;
    if (status === 'resolved') row.resolvedAt = at;
    if (status === 'closed') row.closedAt = at;
    if (status === 'reopened') {
      row.reopenCount += 1;
      row.resolvedAt = null;
      row.closedAt = null;
    }

    if (note) {
      messageRecords[ticketId] = [
        ...(messageRecords[ticketId] ?? []),
        {
          id: `${ticketId}-M${(messageRecords[ticketId]?.length ?? 0) + 1}`,
          ticketId,
          authorType: 'system',
          authorName: actingAdmin.name,
          body: note,
          internal: false,
          at,
        },
      ];
      row.messageCount += 1;
    }

    return decorate(row);
  });
}

// BACKEND CONTRACT
// POST /admin/support/tickets/:ticketId/escalate
// Body: { queue: EscalationQueue, reason }
// Returns: Ticket
// Errors: 404 ticket_not_found, 422 already_escalated, 422 unknown_queue,
//         422 reason_required, 422 ticket_closed
// Notes: escalation KEEPS the assignee. It is a handoff to a team that can
//        answer the question, not a way to put a ticket down - an escalated
//        ticket with no owner is how one sits untouched for a fortnight while
//        two teams each assume the other has it.
//        The SLA clock keeps running through an escalation. The member is still
//        waiting, and whose desk it sits on is not their problem.
export function escalateTicket({ ticketId, queue, reason } = {}) {
  const row = ticketRecords.find((record) => record.id === ticketId);
  if (!row) return mockError('ticket_not_found', `No ticket with id ${ticketId}`, 404);
  if (CLOSED_TICKET_STATUSES.includes(row.status)) {
    return mockError('ticket_closed', 'This ticket is closed. Reopen it before escalating.', 422);
  }
  if (row.status === 'escalated') {
    return mockError('already_escalated', `This is already with the ${row.escalationQueue} queue.`, 422);
  }
  if (!ESCALATION_QUEUES.includes(queue)) {
    return mockError('unknown_queue', `${queue} is not an escalation queue.`, 422);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Say what the other team needs to decide.', 422);
  }

  return mockRequest(() => {
    const at = nowIso();
    row.status = 'escalated';
    row.escalationQueue = queue;
    row.escalationReason = reason;
    row.escalatedAt = at;
    row.lastActivityAt = at;
    return decorate(row);
  });
}

// ---------------------------------------------------------------------------
// Performance - ADM-091
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/support/performance
// Query: { range: '7d'|'30d'|'90d' }
// Returns: { range,
//            metrics: { openCount, backlogChangePercent, medianFirstResponseMins,
//                       firstResponseAttainmentPercent, medianResolutionHours,
//                       resolutionAttainmentPercent, csatAverage,
//                       reopenRatePercent },
//            volumeSeries: { date: ISO, raised, resolved, backlog }[],
//            responseSeries: { date: ISO, medianFirstResponseMins,
//                              medianResolutionHours }[],
//            categoryMix: { category, raised, breached }[],
//            csatMix: { score: 1|2|3|4|5, count }[],
//            agentLoad: Agent[] }
// Errors: 422 unknown_range
// Notes: attainment is measured against the SLA_TARGETS for each ticket's own
//        priority, on the CLOCK-STOPPED elapsed time. Measuring against
//        wall-clock age would show a desk missing targets it actually met.
//        reopenRatePercent counts tickets reopened at least once over tickets
//        resolved - it is the honest counterweight to a good resolution time,
//        because closing fast and closing properly are different things.
export function getSupportPerformance({ range = '30d' } = {}) {
  if (!['7d', '30d', '90d'].includes(range)) {
    return mockError('unknown_range', `${range} is not a reporting range.`, 422);
  }

  return mockRequest(() => {
    const rows = ticketRecords.map(decorate);
    const open = rows.filter((row) => !CLOSED_TICKET_STATUSES.includes(row.status));
    const responded = rows.filter((row) => row.firstResponseElapsedMins !== null);
    const resolved = rows.filter((row) => row.resolvedAt !== null);
    const scored = rows.filter((row) => row.csatScore !== null);

    const median = (values) => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((left, right) => left - right);
      return sorted[Math.floor(sorted.length / 2)];
    };

    const metAttainment = (subset, predicate) =>
      subset.length === 0 ? 100 : Number(((subset.filter(predicate).length / subset.length) * 100).toFixed(1));

    return {
      range,
      metrics: {
        openCount: open.length,
        backlogChangePercent: Number(((open.length / Math.max(1, rows.length)) * 100 - 45).toFixed(1)),
        medianFirstResponseMins: median(responded.map((row) => row.firstResponseElapsedMins)),
        firstResponseAttainmentPercent: metAttainment(responded, (row) => !row.firstResponseBreached),
        medianResolutionHours: Number((median(resolved.map((row) => row.resolutionClockMins)) / 60).toFixed(1)),
        resolutionAttainmentPercent: metAttainment(resolved, (row) => !row.resolutionBreached),
        csatAverage: scored.length === 0
          ? null
          : Number((scored.reduce((sum, row) => sum + row.csatScore, 0) / scored.length).toFixed(2)),
        reopenRatePercent: resolved.length === 0
          ? 0
          : Number(((rows.filter((row) => row.reopenCount > 0).length / resolved.length) * 100).toFixed(1)),
      },
      volumeSeries: volumeSeriesFor(range),
      responseSeries: responseSeriesFor(range),
      categoryMix: copies(categoryMix),
      csatMix: copies(csatMix),
      agentLoad: copies(agentLoad),
    };
  });
}

// ---------------------------------------------------------------------------
// Canned responses - ADM-092, and the picker inside ADM-088
//
// CannedResponse: { id, shortcut, title, body, category, channels: string[],
//                   locales: string[], state: 'published'|'draft'|'archived',
//                   variables: string[], usageCount, lastUsedAt: ISO|null,
//                   createdAt, updatedAt, updatedById, updatedByName,
//                   archivedReason: string|null }
//   A canned response is not a notification template. It goes out inside a
//   conversation the member already started, so it needs no TRAI or Meta
//   approval - only a shortcut an agent can type and variables that resolve
//   against the ticket in front of them.
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/support/canned-responses
// Query: { search, category, channel, locale, state, page, pageSize,
//          sortBy, sortDir }
// Returns: { items: CannedResponse[], total, page, pageSize }
// Notes: sorted by usageCount descending by default, because the library is
//        read to find the one an agent actually wants. Archived rows are
//        included only when state is asked for explicitly - an agent picking
//        mid-reply should never be offered retired wording.
export function listCannedResponses({ search, filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const needle = String(search ?? '').trim().toLowerCase();

  const rows = cannedRecords
    .filter((row) => (filters.state ? row.state === filters.state : row.state !== 'archived'))
    .filter((row) => !filters.category || row.category === filters.category)
    .filter((row) => !filters.channel || row.channels.includes(filters.channel))
    .filter((row) => !filters.locale || row.locales.includes(filters.locale))
    .filter(
      (row) =>
        !needle ||
        row.title.toLowerCase().includes(needle) ||
        row.shortcut.toLowerCase().includes(needle) ||
        row.body.toLowerCase().includes(needle),
    );

  const key = sortBy ?? 'usageCount';
  const direction = (sortDir ?? 'desc') === 'desc' ? -1 : 1;
  const sorted = [...rows].sort((a, b) => {
    if (typeof a[key] === 'number') return (a[key] - b[key]) * direction;
    return String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * direction;
  });

  const size = pageSize ?? 20;
  const current = page ?? 1;

  return mockRequest(() => ({
    items: sorted.slice((current - 1) * size, current * size).map(cloneCanned),
    total: sorted.length,
    page: current,
    pageSize: size,
  }));
}

// BACKEND CONTRACT
// GET /admin/support/canned-responses/counts
// Returns: { total, published, draft, archived, byCategory, byChannel,
//            byLocale, neverUsed, staleCount }
// Notes: neverUsed and staleCount are the point of the screen. A response
//        nobody has reached for in ninety days is either badly written or
//        answering a question members stopped asking, and either way somebody
//        should look at it rather than let the library grow forever.
export function getCannedResponseCounts() {
  const ninetyDaysAgo = Date.now() - 90 * 86400000;
  const tally = (rows, pick) =>
    rows.reduce((map, row) => {
      [].concat(pick(row)).forEach((key) => {
        map[key] = (map[key] ?? 0) + 1;
      });
      return map;
    }, {});

  return mockRequest(() => ({
    total: cannedRecords.length,
    published: cannedRecords.filter((row) => row.state === 'published').length,
    draft: cannedRecords.filter((row) => row.state === 'draft').length,
    archived: cannedRecords.filter((row) => row.state === 'archived').length,
    byCategory: tally(cannedRecords, (row) => row.category),
    byChannel: tally(cannedRecords, (row) => row.channels),
    byLocale: tally(cannedRecords, (row) => row.locales),
    neverUsed: cannedRecords.filter((row) => row.usageCount === 0).length,
    staleCount: cannedRecords.filter(
      (row) => row.lastUsedAt && Date.parse(row.lastUsedAt) < ninetyDaysAgo,
    ).length,
  }));
}

// BACKEND CONTRACT
// POST /admin/support/canned-responses
// PUT  /admin/support/canned-responses/:id
// Body: { id?, shortcut, title, body, category, channels, locales, state }
// Returns: CannedResponse
// Errors: 404 canned_not_found, 422 title_required, 422 body_required,
//         422 shortcut_required, 409 shortcut_taken, 422 unknown_variable,
//         422 category_unknown
// Notes: the shortcut is what an agent types mid-reply, so it has to be unique
//        across the library or the picker cannot resolve it. Variables are
//        checked against the registered set - a response that references a
//        field the ticket does not carry renders as a literal brace to the
//        member, which is worse than no canned response at all.
export function saveCannedResponse({ id, shortcut, title, body, category, channels = [], locales = [], state = 'published' } = {}) {
  if (!String(title ?? '').trim()) return mockError('title_required', 'Give it a title.', 422);
  if (!String(body ?? '').trim()) return mockError('body_required', 'There is nothing to say.', 422);
  if (!String(shortcut ?? '').trim()) {
    return mockError('shortcut_required', 'A shortcut is what an agent types to reach this.', 422);
  }
  if (category && !CANNED_CATEGORIES.includes(category)) {
    return mockError('category_unknown', 'That is not a support category.', 422);
  }

  const normalised = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;
  const clash = cannedRecords.find((row) => row.shortcut === normalised && row.id !== id);
  if (clash) {
    return mockError('shortcut_taken', `${normalised} already belongs to "${clash.title}".`, 409);
  }

  const used = [...String(body).matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
  const unknown = used.filter((name) => !CANNED_VARIABLES.includes(name));
  if (unknown.length > 0) {
    return mockError(
      'unknown_variable',
      `A ticket has no ${unknown[0]} to fill in, so members would see the brace.`,
      422,
    );
  }

  const existing = id ? cannedRecords.find((row) => row.id === id) : null;
  if (id && !existing) return mockError('canned_not_found', 'That response no longer exists.', 404);

  const next = {
    ...(existing ?? {
      id: `CAN-${String(cannedRecords.length + 1).padStart(3, '0')}`,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: nowIso(),
      archivedReason: null,
    }),
    shortcut: normalised,
    title,
    body,
    category: category ?? existing?.category ?? 'account',
    channels: [...channels],
    locales: locales.length > 0 ? [...locales] : ['en'],
    state,
    variables: used,
    updatedAt: nowIso(),
    updatedById: actingAdmin.id,
    updatedByName: actingAdmin.name,
  };

  cannedRecords = existing
    ? cannedRecords.map((row) => (row.id === id ? next : row))
    : [next, ...cannedRecords];

  return mockRequest(cloneCanned(next));
}

// BACKEND CONTRACT
// POST /admin/support/canned-responses/:id/archive
// Body: { reason }
// Returns: CannedResponse with state 'archived'
// Errors: 404 canned_not_found, 409 already_archived, 422 reason_required
// Notes: archived rather than deleted. Replies already sent using it are part
//        of ticket history, and the reason is what stops the next person
//        writing the same wording again six months later.
export function archiveCannedResponse({ id, reason } = {}) {
  const row = cannedRecords.find((candidate) => candidate.id === id);
  if (!row) return mockError('canned_not_found', 'That response no longer exists.', 404);
  if (row.state === 'archived') return mockError('already_archived', 'That one is already retired.', 409);
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Say why it is being retired.', 422);
  }

  Object.assign(row, {
    state: 'archived',
    archivedReason: reason,
    updatedAt: nowIso(),
    updatedById: actingAdmin.id,
    updatedByName: actingAdmin.name,
  });
  return mockRequest(cloneCanned(row));
}

// BACKEND CONTRACT
// POST /admin/support/canned-responses/:id/usage
// Body: { ticketId }
// Returns: { id, usageCount, lastUsedAt }
// Errors: 404 canned_not_found, 409 not_published
// Notes: recorded when an agent actually inserts one into a reply, not when
//        they browse the library. A draft or archived response cannot be
//        inserted, so it cannot accrue usage.
export function recordCannedUsage({ id, ticketId } = {}) {
  const row = cannedRecords.find((candidate) => candidate.id === id);
  if (!row) return mockError('canned_not_found', 'That response no longer exists.', 404);
  if (row.state !== 'published') {
    return mockError('not_published', 'Only a published response can be inserted into a reply.', 409);
  }

  row.usageCount += 1;
  row.lastUsedAt = nowIso();
  return mockRequest({ id: row.id, usageCount: row.usageCount, lastUsedAt: row.lastUsedAt, ticketId });
}

// ---------------------------------------------------------------------------
// Vocabulary, re-exported so a screen never imports a fixture.
// ---------------------------------------------------------------------------

export {
  CANNED_CATEGORIES,
  CANNED_STATES,
  CANNED_VARIABLES,
  ESCALATION_QUEUES,
  SLA_TARGETS,
  TICKET_CATEGORIES,
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
};
