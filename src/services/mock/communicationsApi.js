// Mock API for the broadcast console, the composer, the template library and
// the delivery log - ADM-085, ADM-086, ADM-089, ADM-090.
//
// ENTITY SHAPES referenced by the contracts below:
//
// Broadcast: { id, title, body,
//              category: 'policy'|'rate_change'|'outage'|'festive'|'feature'
//                        |'compliance',
//              audience: Audience,
//              channels: Channel[],
//              status: 'draft'|'scheduled'|'sending'|'sent'|'partially_failed'
//                      |'cancelled'|'failed',
//              requiresAcknowledgement: boolean, acknowledgedCount,
//              createdById: AdminUser.id, createdByName, createdAt: ISO,
//              scheduledFor: ISO|null, sentAt: ISO|null,
//              cancelledAt: ISO|null, cancellationReason: string|null,
//              failureReason: string|null,
//              stats: BroadcastStats,
//              editable: boolean, cancellable: boolean }
//   editable and cancellable are server-derived. A sent broadcast is settled
//   history: it can be superseded by a follow-up but never edited or resent.
//
// Audience: { segment: 'all_members'|'all_manufacturers'|'all_jewellers'
//                      |'city'|'category'|'custom',
//             label: string|null, city: string|null,
//             memberCategory: string|null, recipientCount,
//             memberIds?: string[] }
//
// BroadcastStats: { queued, sent, delivered, failed, suppressed, opened }
//   delivered + failed + suppressed equals sent for a finished broadcast.
//
// Channel: 'in_app'|'email'|'sms'|'whatsapp'
//
// Template: { id, eventKey, name, description,
//             kind: 'transactional'|'marketing',
//             audience: 'manufacturer'|'jeweller'|'admin',
//             mandatory: boolean,
//             state: 'active'|'draft'|'archived',
//             channels: Channel[], locales: ('en'|'hi'|'gu')[],
//             variables: string[], version,
//             updatedAt: ISO, updatedById: AdminUser.id, updatedByName,
//             sentLast30Days, deliveryRate }
//   mandatory is true for every transactional template. A member cannot opt out
//   of the message that says their money moved, so it cannot be archived.
//
// TemplateVariant: { id, templateId, channel, locale,
//                    subject: string|null, body,
//                    state: 'active'|'draft'|'archived',
//                    whatsappApproval: 'approved'|'pending'|'rejected'|null,
//                    characterCount, updatedAt: ISO }
//
// TemplateVersion: { id, version, editedById, editedByName, editedAt: ISO,
//                    note }
//
// Delivery: { id, sourceType: 'broadcast'|'transactional',
//             sourceId: Broadcast.id|Template.id, sourceLabel,
//             recipientType: 'manufacturer'|'jeweller',
//             recipientId: Manufacturer.id|Jeweller.id, recipientName,
//             recipientCity, channel: Channel, destination,
//             status: 'queued'|'sent'|'delivered'|'opened'|'bounced'|'failed'
//                     |'suppressed',
//             attemptedAt: ISO, deliveredAt: ISO|null, openedAt: ISO|null,
//             failureCode: FailureCode|null, failureDetail: string|null,
//             retryable: boolean, retryCount, providerRef }
//   destination is masked. The real API must mask it too - an operator does not
//   need a member's full mobile number to read a delivery log.
//
// FailureCode: 'invalid_number'|'mailbox_full'|'handset_unreachable'
//              |'gateway_timeout'|'blocked'|'dnd_registry'
//              |'template_not_approved'|'opted_out'
//   The last four are regulatory or explicit refusals and are NEVER retried.

import { MockApiError, applyFilters, applySearch, applySort, mockRequest, paginate } from './_client';
import {
  AUDIENCE_SEGMENTS,
  BROADCAST_CATEGORIES,
  BROADCAST_STATUSES,
  CANCELLABLE_BROADCAST_STATUSES,
  CHANNELS,
  COMMS_NOW,
  DELIVERY_STATUSES,
  FAILURE_CODES,
  IMMUTABLE_BROADCAST_STATUSES,
  NON_RETRYABLE_FAILURE_CODES,
  TEMPLATE_LOCALES,
  TEMPLATE_STATES,
  audienceCategoryOptions,
  audienceCityOptions,
  audienceOptions,
  broadcastRows,
  isRetryableFailure,
  deliveryRows,
  previewContext,
  templateRows,
  templateVariants,
  templateVersionsByTemplateId,
} from '@/data/communicationsFixtures';
import { jewellers, manufacturers } from '@/data/core';

// ---------------------------------------------------------------------------
// Session-scoped mutable copies. A page refresh resets them, which is correct
// for a prototype: the fixtures are the source of truth, not the browser.
// ---------------------------------------------------------------------------

let broadcastRecords = broadcastRows.map((row) => ({ ...row }));
let templateRecords = templateRows.map((row) => ({ ...row }));
// Variants carry a nested `approval` object. A shallow copy would share that
// object with the fixture and with Redux, which freezes whatever it stores -
// and a frozen approval cannot be reset when somebody edits the body.
const cloneVariant = (row) => ({ ...row, approval: { ...row.approval } });
let variantRecords = templateVariants.map(cloneVariant);
let deliveryRecords = deliveryRows.map((row) => ({ ...row }));

const NOW_MS = Date.parse(COMMS_NOW);

// NOT AN ENDPOINT - deliberately carries no BACKEND CONTRACT block.
// The real API derives the acting admin from the bearer token on the request.
// This exists only so the mock's audit trail names a real person.
let actingAdmin = { id: 'STF-001', name: 'Elanzia desk' };
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
// throws. Cheap here, and it keeps the mock honest about what the wire does.
const copy = (row) => (row === null || row === undefined ? row : { ...row });
const copies = (rows) => rows.map(copy);
const variantCopies = (rows) => rows.map(cloneVariant);

// Whether this broadcast may still be edited or called back. Derived here so
// the button that offers the action and the endpoint that refuses it can never
// disagree.
function decorateBroadcast(row) {
  return {
    ...row,
    editable: !IMMUTABLE_BROADCAST_STATUSES.includes(row.status) && row.status !== 'cancelled',
    cancellable: CANCELLABLE_BROADCAST_STATUSES.includes(row.status),
    reach: row.audience.recipientCount * row.channels.length,
  };
}

// The values a filter dropdown offers, returned with the data rather than read
// from a fixture by the screen. A screen that imports a fixture to build its
// own dropdown has quietly bypassed the whole data layer.
function facetOf(rows, valueKey) {
  return [...new Set(rows.map((row) => row[valueKey]).filter(Boolean))]
    .sort()
    .map((value) => ({ value, label: value }));
}

// channels is an array on the row, so the generic equality filter cannot answer
// "broadcasts that went out over WhatsApp". Handled before the generic path.
function applyChannelFilter(rows, channel) {
  if (!channel) return rows;
  return rows.filter((row) => row.channels.includes(channel));
}

function membersFor(audience) {
  const { segment, city, memberCategory, memberIds } = audience ?? {};
  if (segment === 'all_members') return [...manufacturers, ...jewellers];
  if (segment === 'all_manufacturers') return manufacturers;
  if (segment === 'all_jewellers') return jewellers;
  if (segment === 'city') return [...manufacturers, ...jewellers].filter((member) => member.city === city);
  if (segment === 'category') return manufacturers.filter((member) => member.categories.includes(memberCategory));
  if (segment === 'custom') {
    const wanted = new Set(memberIds ?? []);
    return [...manufacturers, ...jewellers].filter((member) => wanted.has(member.id));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Broadcasts - ADM-085 and ADM-086
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/communications/broadcasts
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { status, category, segment, channel } }
// Returns: { items: Broadcast[], total, page, pageSize }
// Notes: sorted by createdAt descending by default - a broadcast console reads
//        newest first, and the scheduled ones are found by filter rather than
//        by a special sort, so the ordering stays predictable.
//        search matches the id, the title and the author name.
//        channel matches any channel the broadcast went out over, not just the
//        first - almost every announcement uses two or three.
//        segment filters on audience.segment.
export function listBroadcasts(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;
  const { channel, segment, ...rest } = filters;

  return mockRequest(() => {
    let rows = applySearch(broadcastRecords.map(decorateBroadcast), search, [
      'id',
      'title',
      'createdByName',
    ]);
    rows = applyChannelFilter(rows, channel);
    if (segment) rows = rows.filter((row) => row.audience.segment === segment);
    rows = applyFilters(rows, rest);
    rows = applySort(rows, sortBy ?? 'createdAt', sortBy ? sortDir : 'desc');
    return paginate(rows, { page, pageSize });
  });
}

// BACKEND CONTRACT
// GET /admin/communications/broadcasts/summary
// Query: { filters: { status, category, segment, channel } }
// Returns: { scheduled, sentThisMonth, recipientsReached, failureRate,
//            awaitingAcknowledgement, byStatus: { [status]: number },
//            facets: { categories: Option[], segments: Option[],
//                      channels: Option[], statuses: Option[] } }
//   Option: { value, label }
// Notes: the SAME filters the list endpoint takes are applied here, so the
//        tiles and the table can never describe two different populations.
//        recipientsReached counts DELIVERED messages, not queued ones - a
//        member the gateway never reached was not told anything.
//        failureRate excludes suppressions. A message the DND registry refused
//        did not fail on the way out, and counting it as a failure would have
//        the desk chasing a gateway that is working perfectly.
//        facets are built from every broadcast, not the filtered set, so
//        narrowing to one category does not empty the dropdown that got you
//        there.
export function getBroadcastSummary({ filters = {} } = {}) {
  const { channel, segment, ...rest } = filters;

  return mockRequest(() => {
    let rows = applyChannelFilter(broadcastRecords, channel);
    if (segment) rows = rows.filter((row) => row.audience.segment === segment);
    rows = applyFilters(rows, rest);

    const sent = rows.filter((row) => ['sent', 'partially_failed', 'sending'].includes(row.status));
    const delivered = sent.reduce((sum, row) => sum + row.stats.delivered, 0);
    const failed = sent.reduce((sum, row) => sum + row.stats.failed, 0);
    const attempted = delivered + failed;

    return {
      scheduled: rows.filter((row) => row.status === 'scheduled').length,
      sentThisMonth: sent.filter((row) => NOW_MS - Date.parse(row.sentAt ?? row.createdAt) < 30 * 86400000).length,
      recipientsReached: delivered,
      failureRate: attempted === 0 ? 0 : Number(((failed / attempted) * 100).toFixed(2)),
      awaitingAcknowledgement: rows
        .filter((row) => row.requiresAcknowledgement)
        .reduce((sum, row) => sum + Math.max(0, row.stats.delivered - row.acknowledgedCount), 0),
      byStatus: rows.reduce((counts, row) => {
        counts[row.status] = (counts[row.status] ?? 0) + 1;
        return counts;
      }, {}),
      facets: {
        categories: BROADCAST_CATEGORIES.map((value) => ({ value, label: value })),
        segments: AUDIENCE_SEGMENTS.map((value) => ({ value, label: value })),
        channels: CHANNELS.map((value) => ({ value, label: value })),
        statuses: BROADCAST_STATUSES.map((value) => ({ value, label: value })),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/communications/broadcasts/:broadcastId
// Returns: { broadcast: Broadcast, deliveries: Delivery[] }
// Errors: 404 broadcast_not_found
// Notes: deliveries are the first 50 rows for this broadcast, newest first. The
//        full log is paginated at GET /admin/communications/deliveries with
//        filters.sourceId set.
export function getBroadcast(broadcastId) {
  const row = broadcastRecords.find((record) => record.id === broadcastId);
  if (!row) return mockError('broadcast_not_found', `No broadcast with id ${broadcastId}`, 404);

  return mockRequest(() => ({
    broadcast: decorateBroadcast(row),
    deliveries: copies(deliveryRecords)
      .filter((delivery) => delivery.sourceId === broadcastId)
      .sort((left, right) => Date.parse(right.attemptedAt) - Date.parse(left.attemptedAt))
      .slice(0, 50),
  }));
}

// BACKEND CONTRACT
// GET /admin/communications/audiences
// Returns: { segments: AudienceOption[], cities: CityOption[],
//            categories: CategoryOption[] }
//   AudienceOption: { id, segment, label, memberCount: number|null }
//   CityOption:     { value, label, memberCount }
//   CategoryOption: { value, label, memberCount }
// Notes: memberCount is null on the segments that need a second choice before
//        a count exists - city and category cannot be counted until one is
//        picked, and custom is counted from the picked list.
export function listAudiences() {
  return mockRequest(() => ({
    segments: copies(audienceOptions),
    cities: copies(audienceCityOptions),
    categories: copies(audienceCategoryOptions),
  }));
}

// BACKEND CONTRACT
// POST /admin/communications/broadcasts/estimate
// Body: { audience: Audience, channels: Channel[] }
// Returns: { recipientCount, messageCount,
//            byChannel: { channel, count, suppressed }[],
//            suppressedCount,
//            suppressionReasons: { reason: FailureCode, count }[] }
// Errors: 422 empty_audience
// Notes: suppressions are estimated from the DND registry and the WhatsApp
//        template approval state BEFORE anything is sent, because a composer
//        that says "3,000 members" and then reaches 2,400 has misled the person
//        who pressed send.
//        messageCount is recipients times channels - the number of messages
//        that will actually leave, which is what the gateway bill is based on.
export function estimateAudience({ audience, channels = [] } = {}) {
  const members = membersFor(audience);
  if (members.length === 0) {
    return mockError('empty_audience', 'This audience reaches nobody. Pick a segment first.', 422);
  }

  return mockRequest(() => {
    const byChannel = channels.map((channel, index) => {
      // Roughly one member in twelve is on the DND registry for a promotional
      // header, and WhatsApp needs an approved template. In-app and email have
      // no such gate.
      const suppressed = channel === 'sms'
        ? Math.round(members.length / 12)
        : channel === 'whatsapp'
          ? Math.round(members.length / 20) + index
          : 0;
      return { channel, count: members.length - suppressed, suppressed };
    });

    const suppressedCount = byChannel.reduce((sum, row) => sum + row.suppressed, 0);

    return {
      recipientCount: members.length,
      messageCount: byChannel.reduce((sum, row) => sum + row.count, 0),
      byChannel,
      suppressedCount,
      suppressionReasons: [
        { reason: 'dnd_registry', count: byChannel.find((row) => row.channel === 'sms')?.suppressed ?? 0 },
        { reason: 'template_not_approved', count: byChannel.find((row) => row.channel === 'whatsapp')?.suppressed ?? 0 },
      ].filter((row) => row.count > 0),
    };
  });
}

// BACKEND CONTRACT
// POST /admin/communications/broadcasts
// Body: { id: string|null, title, body, category, audience: Audience,
//         channels: Channel[], requiresAcknowledgement: boolean }
// Returns: Broadcast
// Errors: 404 broadcast_not_found, 422 broadcast_immutable, 422 title_required,
//         422 body_required, 422 empty_audience, 422 no_channel
// Notes: an id in the body updates that draft; no id creates one. A broadcast
//        that has started sending is settled history and is refused with
//        broadcast_immutable - a correction goes out as a follow-up that says
//        it corrects the earlier one, so the record of what members were told
//        stays honest.
export function saveBroadcastDraft(body = {}) {
  const { id, title, body: message, category, audience, channels = [], requiresAcknowledgement = false } = body;

  const existing = id ? broadcastRecords.find((record) => record.id === id) : null;
  if (id && !existing) return mockError('broadcast_not_found', `No broadcast with id ${id}`, 404);
  if (existing && IMMUTABLE_BROADCAST_STATUSES.includes(existing.status)) {
    return mockError('broadcast_immutable', 'This announcement has already gone out. Send a follow-up instead.', 422);
  }
  if (!String(title ?? '').trim()) return mockError('title_required', 'An announcement needs a title.', 422);
  if (!String(message ?? '').trim()) return mockError('body_required', 'An announcement needs something to say.', 422);
  if (channels.length === 0) return mockError('no_channel', 'Pick at least one channel.', 422);
  if (membersFor(audience).length === 0) {
    return mockError('empty_audience', 'This audience reaches nobody. Pick a segment first.', 422);
  }

  return mockRequest(() => {
    const recipientCount = membersFor(audience).length;
    const nextAudience = { ...audience, recipientCount };

    if (existing) {
      Object.assign(existing, {
        title, body: message, category, audience: nextAudience, channels, requiresAcknowledgement,
      });
      return decorateBroadcast(existing);
    }

    const created = {
      id: `BRD-${String(broadcastRecords.length + 1).padStart(3, '0')}`,
      title,
      body: message,
      category,
      audience: nextAudience,
      channels,
      status: 'draft',
      requiresAcknowledgement,
      acknowledgedCount: 0,
      createdById: actingAdmin.id,
      createdByName: actingAdmin.name,
      createdAt: nowIso(),
      scheduledFor: null,
      sentAt: null,
      cancelledAt: null,
      cancellationReason: null,
      failureReason: null,
      stats: { queued: 0, sent: 0, delivered: 0, failed: 0, suppressed: 0, opened: 0 },
    };
    broadcastRecords = [created, ...broadcastRecords];
    return decorateBroadcast(created);
  });
}

// BACKEND CONTRACT
// POST /admin/communications/broadcasts/:broadcastId/schedule
// Body: { scheduledFor: ISO|null }
// Returns: Broadcast
// Errors: 404 broadcast_not_found, 422 broadcast_immutable, 422 schedule_in_past
// Notes: a null scheduledFor sends immediately and the broadcast lands in
//        'sending'. A time in the past is refused rather than silently sent
//        now - somebody who typed yesterday's date meant a different date.
export function scheduleBroadcast({ broadcastId, scheduledFor = null } = {}) {
  const row = broadcastRecords.find((record) => record.id === broadcastId);
  if (!row) return mockError('broadcast_not_found', `No broadcast with id ${broadcastId}`, 404);
  if (IMMUTABLE_BROADCAST_STATUSES.includes(row.status)) {
    return mockError('broadcast_immutable', 'This announcement has already gone out. Send a follow-up instead.', 422);
  }
  if (scheduledFor && Date.parse(scheduledFor) < Date.now()) {
    return mockError('schedule_in_past', 'That time has already passed. Pick a time in the future.', 422);
  }

  return mockRequest(() => {
    row.status = scheduledFor ? 'scheduled' : 'sending';
    row.scheduledFor = scheduledFor;
    row.stats = { ...row.stats, queued: row.audience.recipientCount };
    return decorateBroadcast(row);
  });
}

// BACKEND CONTRACT
// POST /admin/communications/broadcasts/:broadcastId/cancel
// Body: { reason }
// Returns: Broadcast
// Errors: 404 broadcast_not_found, 422 already_sending, 422 reason_required
// Notes: only a draft or a scheduled broadcast can be cancelled. Once the first
//        batch has left there is nothing to call back for the members already
//        reached, so 'sending' is refused with already_sending rather than
//        pretending a partial recall happened.
export function cancelBroadcast({ broadcastId, reason } = {}) {
  const row = broadcastRecords.find((record) => record.id === broadcastId);
  if (!row) return mockError('broadcast_not_found', `No broadcast with id ${broadcastId}`, 404);
  if (!CANCELLABLE_BROADCAST_STATUSES.includes(row.status)) {
    return mockError('already_sending', 'This announcement has already started going out and cannot be called back.', 422);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Say why this was called back. The next person reading the log has only your note.', 422);
  }

  return mockRequest(() => {
    row.status = 'cancelled';
    row.cancelledAt = nowIso();
    row.cancellationReason = reason;
    row.stats = { ...row.stats, queued: 0 };
    return decorateBroadcast(row);
  });
}

// ---------------------------------------------------------------------------
// Templates - ADM-089
// ---------------------------------------------------------------------------

// BACKEND CONTRACT
// GET /admin/communications/templates
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { audience, kind, state, channel, locale } }
// Returns: { items: Template[], total, page, pageSize,
//            counts: { active, mandatory, draft, archived },
//            facets: { audiences: Option[], kinds: Option[], states: Option[],
//                      channels: Option[], locales: Option[] } }
// Notes: sorted by updatedAt descending by default - the library is read to
//        find what changed recently.
//        search matches the id, the event key and the name.
//        channel and locale match any entry in the row's arrays.
//        counts describe the whole FILTERED set, not the page. Tiles counted
//        off one page of twenty would say something different from the table
//        they sit above the moment anybody turned a page.
export function listTemplates(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;
  const { channel, locale, ...rest } = filters;

  return mockRequest(() => {
    let rows = applySearch(copies(templateRecords), search, ['id', 'eventKey', 'name']);
    if (channel) rows = rows.filter((row) => row.channels.includes(channel));
    if (locale) rows = rows.filter((row) => row.locales.includes(locale));
    rows = applyFilters(rows, rest);
    rows = applySort(rows, sortBy ?? 'updatedAt', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      counts: {
        active: rows.filter((row) => row.state === 'active').length,
        mandatory: rows.filter((row) => row.mandatory).length,
        draft: rows.filter((row) => row.state === 'draft').length,
        archived: rows.filter((row) => row.state === 'archived').length,
      },
      facets: {
        audiences: facetOf(templateRecords, 'audience'),
        kinds: facetOf(templateRecords, 'kind'),
        states: TEMPLATE_STATES.map((value) => ({ value, label: value })),
        channels: CHANNELS.map((value) => ({ value, label: value })),
        locales: TEMPLATE_LOCALES.map((value) => ({ value, label: value })),
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/communications/templates/:templateId
// Returns: { template: Template, variants: TemplateVariant[],
//            versions: TemplateVersion[] }
// Errors: 404 template_not_found
// Notes: versions are newest first. They are a trail, not an undo - restoring
//        an old version is a new edit that says so.
export function getTemplate(templateId) {
  const template = templateRecords.find((record) => record.id === templateId);
  if (!template) return mockError('template_not_found', `No template with id ${templateId}`, 404);

  return mockRequest(() => ({
    template: copy(template),
    variants: variantCopies(variantRecords.filter((variant) => variant.templateId === templateId)),
    versions: copies(templateVersionsByTemplateId[templateId] ?? []),
  }));
}

// BACKEND CONTRACT
// PUT /admin/communications/templates/:templateId
// Body: { state?: 'active'|'draft'|'archived',
//         variant?: { channel, locale, subject, body } }
// Returns: { template: Template, variants: TemplateVariant[] }
// Errors: 404 template_not_found, 404 variant_not_found,
//         422 mandatory_template, 422 unknown_variable, 422 body_required
// Notes: a transactional template cannot be archived or moved out of 'active'.
//        A member cannot opt out of the message that tells them their order
//        shipped or their payout failed, so switching one off would leave them
//        with no way to learn either - refused with mandatory_template.
//        Every {placeholder} in the body must be declared in template.variables
//        or the send would put a literal brace in front of a member.
export function saveTemplate({ templateId, state, variant } = {}) {
  const template = templateRecords.find((record) => record.id === templateId);
  if (!template) return mockError('template_not_found', `No template with id ${templateId}`, 404);

  if (state && state !== 'active' && template.mandatory) {
    return mockError(
      'mandatory_template',
      'This message tells a member their money moved. It cannot be switched off.',
      422,
    );
  }

  if (variant) {
    if (!String(variant.body ?? '').trim()) {
      return mockError('body_required', 'A template variant needs a body.', 422);
    }
    const used = [...String(variant.body).matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
    const unknown = used.filter((name) => !template.variables.includes(name));
    if (unknown.length > 0) {
      return mockError('unknown_variable', `This template has no ${unknown[0]} to fill in.`, 422);
    }
  }

  return mockRequest(() => {
    if (state) template.state = state;

    if (variant) {
      const target = variantRecords.find(
        (row) => row.templateId === templateId && row.channel === variant.channel && row.locale === variant.locale,
      );
      if (target) {
        // THE RESET RULE. TRAI DLT and Meta approve specific words, so changed
        // words are unapproved words. Editing the body of a variant that is
        // approved, or is mid-review, drops it back to draft: the reference is
        // void, the channel stops sending on it, and somebody has to spend the
        // lead time again. Anything less would have the platform sending
        // content no authority ever saw.
        const bodyChanged = variant.body !== target.body;
        const resets =
          bodyChanged &&
          target.approval.required &&
          ['approved', 'pending'].includes(target.approval.status);

        Object.assign(target, {
          subject: variant.subject ?? target.subject,
          body: variant.body,
          characterCount: variant.body.length,
          updatedAt: nowIso(),
          ...(resets
            ? {
                approval: {
                  ...target.approval,
                  status: 'draft',
                  reference: null,
                  submittedAt: null,
                  expectedBy: null,
                  approvedAt: null,
                  rejectionReason: null,
                  approvedBody: null,
                },
                whatsappApproval: target.channel === 'whatsapp' ? 'draft' : null,
                canSend: false,
              }
            : {}),
        });
      }
    }

    template.version += 1;
    template.updatedAt = nowIso();
    template.updatedById = actingAdmin.id;
    template.updatedByName = actingAdmin.name;

    return {
      template: copy(template),
      variants: variantCopies(variantRecords.filter((row) => row.templateId === templateId)),
    };
  });
}

// BACKEND CONTRACT
// POST /admin/communications/templates/:templateId/preview
// Body: { channel, locale }
// Returns: { channel, locale, subject: string|null, body, characterCount,
//            sampleContext: { [variable]: string },
//            unresolved: string[] }
// Errors: 404 template_not_found, 404 variant_not_found
// Notes: the preview fills placeholders from a real member and a real order, so
//        an operator sees the message a jeweller in Coimbatore actually gets.
//        unresolved names any placeholder the sample context could not fill -
//        it is the cheapest way to catch a typo before a send.
export function previewTemplate({ templateId, channel, locale = 'en' } = {}) {
  const template = templateRecords.find((record) => record.id === templateId);
  if (!template) return mockError('template_not_found', `No template with id ${templateId}`, 404);

  const variant = variantRecords.find(
    (row) => row.templateId === templateId && row.channel === channel && row.locale === locale,
  );
  if (!variant) return mockError('variant_not_found', `No ${channel} variant in ${locale}`, 404);

  return mockRequest(() => {
    const unresolved = [];
    const body = variant.body.replace(/\{(\w+)\}/g, (match, name) => {
      if (previewContext[name] === undefined) {
        unresolved.push(name);
        return match;
      }
      return previewContext[name];
    });

    return {
      channel,
      locale,
      subject: variant.subject,
      body,
      characterCount: body.length,
      sampleContext: previewContext,
      unresolved,
    };
  });
}

// ---------------------------------------------------------------------------
// Deliveries - ADM-090
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Template approval - ADM-089 library, and the editor inside it
//
// TemplateApproval: { templateId, templateName, variantId, channel, locale,
//                     required: boolean, authority: 'TRAI_DLT'|'META'|null,
//                     authorityLabel, status: 'not_required'|'draft'|'pending'
//                     |'approved'|'rejected', reference: string|null,
//                     submittedAt: ISO|null, expectedBy: ISO|null,
//                     approvedAt: ISO|null, rejectionReason: string|null,
//                     leadDays: number|null, overdue: boolean }
// ---------------------------------------------------------------------------

function findVariant(templateId, channel, locale) {
  return variantRecords.find(
    (row) => row.templateId === templateId && row.channel === channel && row.locale === locale,
  );
}

function approvalRow(variant) {
  const template = templateRecords.find((row) => row.id === variant.templateId);
  return {
    templateId: variant.templateId,
    templateName: template?.name ?? null,
    variantId: variant.id,
    channel: variant.channel,
    locale: variant.locale,
    ...variant.approval,
    canSend: !variant.approval.required || variant.approval.status === 'approved',
    // Past the date the authority was expected to answer by. The desk chases
    // these rather than waiting another week.
    overdue:
      variant.approval.status === 'pending' &&
      Boolean(variant.approval.expectedBy) &&
      Date.parse(variant.approval.expectedBy) < Date.now(),
  };
}

// BACKEND CONTRACT
// POST /admin/communications/templates/:templateId/variants/:channel/:locale/submit
// Returns: TemplateApproval with status 'pending'
// Errors: 404 variant_not_found, 409 no_approval_required, 409 already_submitted,
//         409 already_approved, 422 body_empty
// Notes: registers the variant with TRAI DLT (SMS) or Meta (WhatsApp). In-app
//        and email are ours to send and return 409 no_approval_required rather
//        than pretending to submit. `expectedBy` is the authority's published
//        turnaround - three days for DLT, two for Meta - and it is the whole
//        reason the reset rule on an edit matters.
export function submitTemplateForApproval({ templateId, channel, locale } = {}) {
  const variant = findVariant(templateId, channel, locale);
  if (!variant) return mockError('variant_not_found', 'No such template variant.', 404);
  if (!variant.approval.required) {
    return mockError(
      'no_approval_required',
      `${channel === 'email' ? 'Email' : 'In-app'} messages do not need anyone's approval.`,
      409,
    );
  }
  if (variant.approval.status === 'pending') {
    return mockError('already_submitted', 'That variant is already with the authority.', 409);
  }
  if (variant.approval.status === 'approved') {
    return mockError('already_approved', 'That variant is already approved.', 409);
  }
  if (!String(variant.body ?? '').trim()) {
    return mockError('body_empty', 'There is nothing to submit.', 422);
  }

  const leadDays = variant.approval.leadDays ?? 3;
  const submittedAt = nowIso();

  variant.approval = {
    ...variant.approval,
    status: 'pending',
    submittedAt,
    expectedBy: new Date(Date.parse(submittedAt) + leadDays * 86400000).toISOString(),
    approvedAt: null,
    rejectionReason: null,
    reference: null,
  };
  variant.whatsappApproval = variant.channel === 'whatsapp' ? 'pending' : null;
  variant.canSend = false;

  return mockRequest(approvalRow(variant));
}

// BACKEND CONTRACT
// POST /admin/communications/templates/:templateId/variants/:channel/:locale/submit/refresh
// Returns: TemplateApproval
// Errors: 404 variant_not_found, 409 not_submitted, 502 authority_unreachable
// Notes: polls the authority for a decision. Nothing here decides the outcome
//        on the authority's behalf - a submission that is still inside its
//        lead time comes back unchanged and still pending, which is what
//        waiting actually looks like.
export function refreshApprovalStatus({ templateId, channel, locale } = {}) {
  const variant = findVariant(templateId, channel, locale);
  if (!variant) return mockError('variant_not_found', 'No such template variant.', 404);
  if (variant.approval.status !== 'pending') {
    return mockError('not_submitted', 'That variant is not waiting on anybody.', 409);
  }

  const decided = Date.parse(variant.approval.expectedBy) <= Date.now();
  if (!decided) return mockRequest(approvalRow(variant));

  // Past the published turnaround, the authority has answered. Most clear.
  const approved = variant.body.length % 7 !== 0;
  variant.approval = {
    ...variant.approval,
    status: approved ? 'approved' : 'rejected',
    approvedAt: approved ? nowIso() : null,
    reference: approved
      ? `${variant.approval.authority === 'META' ? 'META' : 'DLT'}-${Date.now()}`
      : null,
    rejectionReason: approved ? null : 'The authority rejected the registered content.',
    approvedBody: approved ? variant.body : null,
  };
  variant.whatsappApproval = variant.channel === 'whatsapp' ? variant.approval.status : null;
  variant.canSend = approved;

  return mockRequest(approvalRow(variant));
}

// BACKEND CONTRACT
// POST /admin/communications/templates/:templateId/variants/:channel/:locale/submit/withdraw
// Body: { reason }
// Returns: TemplateApproval with status 'draft'
// Errors: 404 variant_not_found, 409 not_pending, 422 reason_required
// Notes: pulls a submission back before the authority rules on it. The variant
//        returns to draft and the lead time starts over on resubmission.
export function withdrawApproval({ templateId, channel, locale, reason } = {}) {
  const variant = findVariant(templateId, channel, locale);
  if (!variant) return mockError('variant_not_found', 'No such template variant.', 404);
  if (variant.approval.status !== 'pending') {
    return mockError('not_pending', 'Only a submission still under review can be withdrawn.', 409);
  }
  if (!String(reason ?? '').trim()) {
    return mockError('reason_required', 'Say why this is being withdrawn.', 422);
  }

  variant.approval = {
    ...variant.approval,
    status: 'draft',
    submittedAt: null,
    expectedBy: null,
    reference: null,
    rejectionReason: null,
    withdrawnAt: nowIso(),
    withdrawnReason: reason,
  };
  variant.whatsappApproval = variant.channel === 'whatsapp' ? 'draft' : null;
  variant.canSend = false;

  return mockRequest(approvalRow(variant));
}

// BACKEND CONTRACT
// GET /admin/communications/templates/approvals
// Query: { authority, status, channel, locale, page, pageSize, sortBy, sortDir }
// Returns: { items: TemplateApproval[], total, page, pageSize,
//            summary: { pending, overdue, rejected, blockedChannels } }
// Notes: only variants that need an approval appear. `blockedChannels` counts
//        the channel-and-language combinations that cannot currently send at
//        all, which is the number worth putting on the library screen.
export function listApprovalQueue({ filters = {}, page, pageSize, sortBy, sortDir } = {}) {
  const rows = variantRecords.filter((row) => row.approval.required).map(approvalRow);
  const filtered = rows.filter(
    (row) =>
      (!filters.authority || row.authority === filters.authority) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.channel || row.channel === filters.channel) &&
      (!filters.locale || row.locale === filters.locale),
  );

  const sorted = [...filtered].sort((a, b) => {
    const key = sortBy ?? 'submittedAt';
    const left = a[key] ?? '';
    const right = b[key] ?? '';
    return (sortDir === 'desc' ? -1 : 1) * String(left).localeCompare(String(right));
  });

  const size = pageSize ?? 20;
  const current = page ?? 1;

  return mockRequest(() => ({
    items: sorted.slice((current - 1) * size, current * size),
    total: sorted.length,
    page: current,
    pageSize: size,
    summary: {
      pending: rows.filter((row) => row.status === 'pending').length,
      overdue: rows.filter((row) => row.overdue).length,
      rejected: rows.filter((row) => row.status === 'rejected').length,
      blockedChannels: rows.filter((row) => !row.canSend).length,
    },
  }));
}

// BACKEND CONTRACT
// POST /admin/communications/deliveries/retry
// Body: { deliveryIds: string[] }
// Returns: { retried: number, skipped: number, items: Delivery[],
//            skippedReasons: { [failureCode]: number } }
// Errors: 422 no_selection, 409 none_retryable
// Notes: a failure queue is worked in bulk. Non-retryable codes are skipped
//        and counted rather than silently dropped - a DND registration or an
//        unapproved template will fail again on every attempt, and the
//        operator needs to see that it was not tried rather than assume it was.
export function bulkRetryDeliveries({ deliveryIds = [] } = {}) {
  if (deliveryIds.length === 0) {
    return mockError('no_selection', 'Select at least one failed delivery.', 422);
  }

  const targets = deliveryRecords.filter((row) => deliveryIds.includes(row.id));
  const retryable = targets.filter((row) => isRetryableFailure(row.failureCode));

  if (retryable.length === 0) {
    return mockError(
      'none_retryable',
      'None of those can be retried. A blocked number or an unapproved template fails again every time.',
      409,
    );
  }

  const skippedReasons = targets
    .filter((row) => !isRetryableFailure(row.failureCode))
    .reduce((map, row) => ({ ...map, [row.failureCode]: (map[row.failureCode] ?? 0) + 1 }), {});

  retryable.forEach((row) => {
    Object.assign(row, {
      status: 'queued',
      retryCount: (row.retryCount ?? 0) + 1,
      attemptedAt: nowIso(),
      failureCode: null,
      failureDetail: null,
    });
  });

  return mockRequest(() => ({
    retried: retryable.length,
    skipped: targets.length - retryable.length,
    skippedReasons,
    items: copies(retryable),
  }));
}

// BACKEND CONTRACT
// GET /admin/communications/deliveries
// Query: { search, page, pageSize, sortBy, sortDir,
//          filters: { channel, status, sourceType, sourceId, failureCode,
//                     recipientType } }
// Returns: { items: Delivery[], total, page, pageSize,
//            facets: { channels: Option[], statuses: Option[],
//                      failureCodes: Option[], sourceTypes: Option[] } }
// Notes: sorted by attemptedAt descending by default - a delivery log is read
//        newest first when something has just gone wrong.
//        search matches the delivery id, the recipient name, the masked
//        destination and the provider reference.
export function listDeliveries(query = {}) {
  const { search, filters = {}, sortBy, sortDir, page, pageSize } = query;

  return mockRequest(() => {
    let rows = applySearch(copies(deliveryRecords), search, [
      'id',
      'recipientName',
      'destination',
      'providerRef',
    ]);
    rows = applyFilters(rows, filters);
    rows = applySort(rows, sortBy ?? 'attemptedAt', sortBy ? sortDir : 'desc');

    return {
      ...paginate(rows, { page, pageSize }),
      facets: {
        channels: CHANNELS.map((value) => ({ value, label: value })),
        statuses: DELIVERY_STATUSES.map((value) => ({ value, label: value })),
        failureCodes: FAILURE_CODES.map((value) => ({ value, label: value })),
        sourceTypes: [
          { value: 'broadcast', label: 'broadcast' },
          { value: 'transactional', label: 'transactional' },
        ],
      },
    };
  });
}

// BACKEND CONTRACT
// GET /admin/communications/deliveries/health
// Query: { filters: { channel, status, sourceType, sourceId, failureCode,
//                     recipientType } }
// Returns: { byChannel: { channel, attempted, delivered, failed, suppressed,
//                         deliveryRate }[],
//            topFailures: { failureCode, count, retryable }[],
//            suppressedCount, retryableCount, windowHours }
// Notes: deliveryRate is delivered over ATTEMPTED, where attempted excludes
//        suppressions. A channel that is refused by the DND registry for a
//        third of its list is not an unhealthy channel, and mixing the two
//        numbers sends the desk chasing a gateway that is working.
//        topFailures carries retryable so the log and the retry endpoint agree
//        about which failures may be pushed again.
export function getDeliveryHealth({ filters = {} } = {}) {
  return mockRequest(() => {
    const rows = applyFilters(deliveryRecords, filters);

    const byChannel = CHANNELS.map((channel) => {
      const onChannel = rows.filter((row) => row.channel === channel);
      const suppressed = onChannel.filter((row) => row.status === 'suppressed').length;
      const attempted = onChannel.length - suppressed;
      const delivered = onChannel.filter((row) => ['delivered', 'opened'].includes(row.status)).length;
      const failed = onChannel.filter((row) => ['failed', 'bounced'].includes(row.status)).length;

      return {
        channel,
        attempted,
        delivered,
        failed,
        suppressed,
        deliveryRate: attempted === 0 ? 0 : Number(((delivered / attempted) * 100).toFixed(1)),
      };
    });

    const failureCounts = rows.reduce((counts, row) => {
      if (row.failureCode) counts[row.failureCode] = (counts[row.failureCode] ?? 0) + 1;
      return counts;
    }, {});

    return {
      byChannel,
      topFailures: Object.entries(failureCounts)
        .map(([failureCode, count]) => ({
          failureCode,
          count,
          retryable: !NON_RETRYABLE_FAILURE_CODES.includes(failureCode),
        }))
        .sort((left, right) => right.count - left.count),
      suppressedCount: rows.filter((row) => row.status === 'suppressed').length,
      retryableCount: rows.filter((row) => row.retryable).length,
      windowHours: 24,
    };
  });
}

// BACKEND CONTRACT
// POST /admin/communications/deliveries/:deliveryId/retry
// Returns: Delivery
// Errors: 404 delivery_not_found, 422 not_retryable, 422 nothing_to_retry
// Notes: a message the TRAI do-not-disturb registry refused, one whose WhatsApp
//        template the operator has not approved, one the member opted out of
//        and one from a blocked sender are NEVER retried. Sending them again is
//        a regulatory breach rather than a second attempt, so the endpoint
//        refuses rather than queueing something the gateway will reject anyway.
//        A row that did not fail has nothing to retry.
export function retryDelivery({ deliveryId } = {}) {
  const row = deliveryRecords.find((record) => record.id === deliveryId);
  if (!row) return mockError('delivery_not_found', `No delivery with id ${deliveryId}`, 404);
  if (!row.failureCode) {
    return mockError('nothing_to_retry', 'This message did not fail.', 422);
  }
  if (!row.retryable) {
    return mockError(
      'not_retryable',
      'This member is on the do-not-disturb registry or has opted out. Sending again is not allowed.',
      422,
    );
  }

  return mockRequest(() => {
    row.status = 'delivered';
    row.deliveredAt = nowIso();
    row.failureCode = null;
    row.failureDetail = null;
    row.retryable = false;
    row.retryCount += 1;
    return copy(row);
  });
}

// ---------------------------------------------------------------------------
// Vocabulary, re-exported so a screen never imports a fixture.
// ---------------------------------------------------------------------------

export {
  AUDIENCE_SEGMENTS,
  BROADCAST_CATEGORIES,
  BROADCAST_STATUSES,
  CHANNELS,
  DELIVERY_STATUSES,
  FAILURE_CODES,
  NON_RETRYABLE_FAILURE_CODES,
  TEMPLATE_LOCALES,
  TEMPLATE_STATES,
};
