// Support and service - ADM-087, 088, 091.
//
// Three sections, one per screen, each with its own status and error.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as supportApi from '@/services/mock/supportApi';
import { listViewState } from '@/store/createListSlice';

function apiThunk(name, fn) {
  return createAsyncThunk(`support/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

function queryThunk(name, fn, pickQuery) {
  return createAsyncThunk(`support/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fn(pickQuery(getState().support));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchTickets = queryThunk('fetchTickets', supportApi.listTickets, (s) => s.tickets.query);
export const fetchTicketSummary = queryThunk('fetchTicketSummary', supportApi.getTicketSummary, (s) => ({
  filters: s.tickets.query.filters,
}));
export const fetchAgents = apiThunk('fetchAgents', supportApi.listAgents);
export const assignTickets = apiThunk('assignTickets', supportApi.assignTickets);

export const fetchTicket = apiThunk('fetchTicket', supportApi.getTicket);
export const replyToTicket = apiThunk('replyToTicket', supportApi.replyToTicket);
export const updateTicketStatus = apiThunk('updateTicketStatus', supportApi.updateTicketStatus);
export const escalateTicket = apiThunk('escalateTicket', supportApi.escalateTicket);

export const fetchSupportPerformance = queryThunk(
  'fetchSupportPerformance',
  supportApi.getSupportPerformance,
  (s) => ({ range: s.performance.range }),
);

export const fetchCannedResponses = queryThunk(
  'fetchCannedResponses',
  supportApi.listCannedResponses,
  (s) => s.canned.query,
);
export const fetchCannedCounts = apiThunk('fetchCannedCounts', supportApi.getCannedResponseCounts);
export const saveCannedResponse = apiThunk('saveCannedResponse', supportApi.saveCannedResponse);
export const archiveCannedResponse = apiThunk('archiveCannedResponse', supportApi.archiveCannedResponse);
export const recordCannedUsage = apiThunk('recordCannedUsage', supportApi.recordCannedUsage);
// The picker inside ADM-088. Published rows only - an agent must not be able
// to paste retired wording into a live reply.
export const fetchCannedForPicker = createAsyncThunk(
  'support/fetchCannedForPicker',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await supportApi.listCannedResponses({
        search: getState().support.ticketDetail.cannedPicker.search,
        filters: { state: 'published' },
        pageSize: 8,
      });
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  },
);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  tickets: {
    items: [], total: 0, status: 'idle', error: null,
    // Sorted by the promise rather than by age. A support queue is worked
    // against the SLA, so the ticket closest to breaching is read first.
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'slaDueAt', sortDir: 'asc',
      filters: {
        status: '', priority: '', category: '', channel: '', assigneeId: '',
        memberType: '', ageBucket: '', breachedOnly: '', unassignedOnly: '',
      },
    },
    summary: null, summaryStatus: 'idle', summaryError: null,
    agents: [], agentsStatus: 'idle', agentsError: null,
    selectedIds: [],
    actionStatus: 'idle', actionError: null, lastAssignment: null,
  },

  ticketDetail: {
    ticket: null, member: null, linkedOrder: null,
    messages: [], timeline: [], attachments: [], relatedTickets: [],
    escalationQueues: [],
    activeAttachmentId: null,
    status: 'idle', error: null,
    replyDraft: { body: '', internal: false, nextStatus: '' },
    replyStatus: 'idle', replyError: null,
    escalationDraft: { queue: '', reason: '' },
    // The seam with ADM-092: an agent inserts a canned response into the reply
    // they are already writing, and the insertion is what counts as usage.
    cannedPicker: { open: false, search: '', items: [], status: 'idle', error: null },
    actionStatus: 'idle', actionError: null,
  },

  // ADM-092. The shared library agents reach for mid-reply.
  canned: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'usageCount', sortDir: 'desc',
      filters: { category: '', channel: '', locale: '', state: '' },
    },
    counts: null, countsStatus: 'idle',
    draft: null, dirty: false,
    saveStatus: 'idle', saveError: null,
    actionStatus: 'idle', actionError: null,
  },

  performance: {
    range: '30d',
    metrics: null,
    volumeSeries: [], responseSeries: [], categoryMix: [], csatMix: [], agentLoad: [],
    status: 'idle', error: null,
  },
};

function wire(builder, thunk, pick, onSuccess, field = 'status') {
  const errorField = field === 'status' ? 'error' : `${field.replace(/Status$/, '')}Error`;
  builder
    .addCase(thunk.pending, (state) => {
      const section = pick(state);
      section[field] = 'loading';
      section[errorField] = null;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      pick(state)[field] = 'succeeded';
      onSuccess?.(state, action);
    })
    .addCase(thunk.rejected, (state, action) => {
      const section = pick(state);
      section[field] = 'failed';
      section[errorField] = action.payload ?? { code: 'unknown', message: action.error.message };
    });
}

const pickTickets = (s) => s.tickets;
const pickDetail = (s) => s.ticketDetail;
const pickPerformance = (s) => s.performance;

// A ticket that changed in the workspace has to change in the queue behind it,
// or an operator goes back to a list that still shows the state they just left.
function patchQueueRow(state, ticket) {
  const index = state.tickets.items.findIndex((row) => row.id === ticket.id);
  if (index >= 0) state.tickets.items[index] = ticket;
}

const slice = createSlice({
  name: 'support',
  initialState,
  reducers: {
    setCannedSearch(state, action) { state.canned.query.search = action.payload; state.canned.query.page = 1; },
    setCannedFilters(state, action) { state.canned.query.filters = action.payload; state.canned.query.page = 1; },
    setCannedPage(state, action) { state.canned.query.page = action.payload; },
    setCannedPageSize(state, action) { state.canned.query.pageSize = action.payload; state.canned.query.page = 1; },
    clearCannedFilters(state) { state.canned.query = { ...initialState.canned.query }; },
    startCannedDraft(state, action) {
      state.canned.draft = action.payload ?? {
        id: null, shortcut: '', title: '', body: '',
        category: 'account', channels: ['email'], locales: ['en'], state: 'published',
      };
      state.canned.dirty = false;
      state.canned.saveError = null;
    },
    setCannedDraftField(state, action) {
      const { field, value } = action.payload;
      state.canned.draft[field] = value;
      state.canned.dirty = true;
      state.canned.saveError = null;
    },
    clearCannedDraft(state) { state.canned.draft = null; state.canned.dirty = false; state.canned.saveError = null; },

    openCannedPicker(state) { state.ticketDetail.cannedPicker.open = true; },
    closeCannedPicker(state) {
      state.ticketDetail.cannedPicker = { open: false, search: '', items: [], status: 'idle', error: null };
    },
    setCannedPickerSearch(state, action) { state.ticketDetail.cannedPicker.search = action.payload; },
    // Inserting resolves the variables against the ticket in front of the
    // agent, so what lands in the box is the message the member will read.
    insertCannedIntoReply(state, action) {
      const { body } = action.payload;
      const ticket = state.ticketDetail.ticket;
      const filled = body
        .replace(/\{contactName\}/g, ticket?.memberContactName ?? 'there')
        .replace(/\{memberName\}/g, ticket?.memberName ?? '')
        .replace(/\{ticketId\}/g, ticket?.id ?? '')
        .replace(/\{orderId\}/g, ticket?.linkedOrderId ?? 'your order')
        .replace(/\{city\}/g, ticket?.memberCity ?? '')
        .replace(/\{slaHours\}/g, String(ticket?.slaResolutionHours ?? 24));
      state.ticketDetail.replyDraft.body = state.ticketDetail.replyDraft.body
        ? `${state.ticketDetail.replyDraft.body}\n\n${filled}`
        : filled;
      state.ticketDetail.cannedPicker.open = false;
    },

    setTicketSearch(state, action) { state.tickets.query.search = action.payload; state.tickets.query.page = 1; },
    setTicketFilters(state, action) { state.tickets.query.filters = action.payload; state.tickets.query.page = 1; },
    setTicketSort(state, action) { state.tickets.query.sortBy = action.payload.sortBy; state.tickets.query.sortDir = action.payload.sortDir; },
    setTicketPage(state, action) { state.tickets.query.page = action.payload; },
    setTicketPageSize(state, action) { state.tickets.query.pageSize = action.payload; state.tickets.query.page = 1; },
    clearTicketFilters(state) {
      state.tickets.query = { ...initialState.tickets.query, filters: { ...initialState.tickets.query.filters } };
    },
    toggleTicketSelection(state, action) {
      const id = action.payload;
      state.tickets.selectedIds = state.tickets.selectedIds.includes(id)
        ? state.tickets.selectedIds.filter((row) => row !== id)
        : [...state.tickets.selectedIds, id];
    },
    setTicketSelection(state, action) { state.tickets.selectedIds = action.payload; },

    setActiveAttachment(state, action) { state.ticketDetail.activeAttachmentId = action.payload; },
    setReplyDraft(state, action) {
      Object.assign(state.ticketDetail.replyDraft, action.payload);
      state.ticketDetail.replyError = null;
    },
    setEscalationDraft(state, action) {
      Object.assign(state.ticketDetail.escalationDraft, action.payload);
      state.ticketDetail.actionError = null;
    },
    clearTicketDetail(state) {
      state.ticketDetail = {
        ...initialState.ticketDetail,
        replyDraft: { ...initialState.ticketDetail.replyDraft },
        escalationDraft: { ...initialState.ticketDetail.escalationDraft },
      };
    },

    setPerformanceRange(state, action) { state.performance.range = action.payload; },
  },

  extraReducers: (builder) => {
    // ---- canned responses, ADM-092 -------------------------------------
    wire(builder, fetchCannedResponses, (st) => st.canned, (st, action) => {
      st.canned.items = action.payload.items;
      st.canned.total = action.payload.total;
    });
    wire(builder, fetchCannedCounts, (st) => st.canned, (st, action) => {
      st.canned.counts = action.payload;
    }, 'countsStatus');
    wire(builder, saveCannedResponse, (st) => st.canned, (st) => {
      st.canned.draft = null;
      st.canned.dirty = false;
    }, 'saveStatus');
    wire(builder, archiveCannedResponse, (st) => st.canned, () => {}, 'actionStatus');
    builder.addCase(recordCannedUsage.fulfilled, (st, action) => {
      st.canned.items = st.canned.items.map((row) =>
        row.id === action.payload.id
          ? { ...row, usageCount: action.payload.usageCount, lastUsedAt: action.payload.lastUsedAt }
          : row,
      );
    });
    wire(builder, fetchCannedForPicker, (st) => st.ticketDetail.cannedPicker, (st, action) => {
      st.ticketDetail.cannedPicker.items = action.payload.items;
    });

    wire(builder, fetchTickets, pickTickets, (state, action) => {
      state.tickets.items = action.payload.items;
      state.tickets.total = action.payload.total;
    });
    wire(builder, fetchTicketSummary, pickTickets, (state, action) => {
      state.tickets.summary = action.payload;
    }, 'summaryStatus');
    wire(builder, fetchAgents, pickTickets, (state, action) => {
      state.tickets.agents = action.payload.items;
    }, 'agentsStatus');
    wire(builder, assignTickets, pickTickets, (state, action) => {
      action.payload.updated.forEach((ticket) => patchQueueRow(state, ticket));
      state.tickets.lastAssignment = action.payload;
      state.tickets.selectedIds = [];
    }, 'actionStatus');

    wire(builder, fetchTicket, pickDetail, (state, action) => {
      Object.assign(state.ticketDetail, action.payload);
      state.ticketDetail.activeAttachmentId = action.payload.attachments[0]?.id ?? null;
    });
    wire(builder, replyToTicket, pickDetail, (state, action) => {
      state.ticketDetail.messages = [...state.ticketDetail.messages, action.payload.message];
      state.ticketDetail.ticket = action.payload.ticket;
      state.ticketDetail.replyDraft = { body: '', internal: false, nextStatus: '' };
      patchQueueRow(state, action.payload.ticket);
    }, 'replyStatus');
    wire(builder, updateTicketStatus, pickDetail, (state, action) => {
      state.ticketDetail.ticket = action.payload;
      patchQueueRow(state, action.payload);
    }, 'actionStatus');
    wire(builder, escalateTicket, pickDetail, (state, action) => {
      state.ticketDetail.ticket = action.payload;
      state.ticketDetail.escalationDraft = { queue: '', reason: '' };
      patchQueueRow(state, action.payload);
    }, 'actionStatus');

    wire(builder, fetchSupportPerformance, pickPerformance, (state, action) => {
      Object.assign(state.performance, action.payload);
    });
  },
});

export const {
  setCannedSearch, setCannedFilters, setCannedPage, setCannedPageSize, clearCannedFilters,
  startCannedDraft, setCannedDraftField, clearCannedDraft,
  openCannedPicker, closeCannedPicker, setCannedPickerSearch, insertCannedIntoReply,
  setTicketSearch, setTicketFilters, setTicketSort, setTicketPage, setTicketPageSize,
  clearTicketFilters, toggleTicketSelection, setTicketSelection,
  setActiveAttachment, setReplyDraft, setEscalationDraft, clearTicketDetail,
  setPerformanceRange,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectSupport = (state) => state.support;

const simpleViewState = (status, hasData) =>
  status === 'failed' ? 'error'
    : status === 'loading' || status === 'idle' ? 'loading'
      : hasData ? 'populated' : 'empty';

const CLOSED_STATUSES = ['resolved', 'closed'];

export const selectTicketQueue = createSelector([selectSupport], ({ tickets }) => ({
  tickets: tickets.items,
  total: tickets.total,
  query: tickets.query,
  summary: tickets.summary,
  facets: tickets.summary?.facets ?? null,
  selectedIds: tickets.selectedIds,
  agents: tickets.agents,
  agentOptions: tickets.agents.map((agent) => ({
    value: agent.agentId,
    label: `${agent.agentName} (${agent.openTickets})`,
  })),
  // Only rows that are still open can be assigned. Offering a bulk assign that
  // silently skips half the selection is worse than not offering it.
  assignableIds: tickets.selectedIds.filter((id) => {
    const row = tickets.items.find((item) => item.id === id);
    return row ? !CLOSED_STATUSES.includes(row.status) : false;
  }),
  viewState: listViewState({
    status: tickets.status,
    items: tickets.items,
    query: { search: tickets.query.search, filters: tickets.query.filters },
  }),
  actionStatus: tickets.actionStatus,
  actionError: tickets.actionError,
  lastAssignment: tickets.lastAssignment,
  error: tickets.error,
}));

export const selectTicketWorkspace = createSelector([selectSupport], ({ ticketDetail }) => {
  const { ticket, attachments } = ticketDetail;
  const isClosed = CLOSED_STATUSES.includes(ticket?.status);

  return {
    ticket,
    member: ticketDetail.member,
    linkedOrder: ticketDetail.linkedOrder,
    // Internal notes are Elanzia only. The screen renders them differently, so
    // the split is made here rather than in markup.
    messages: ticketDetail.messages.filter((message) => !message.internal),
    internalNotes: ticketDetail.messages.filter((message) => message.internal),
    thread: ticketDetail.messages,
    timeline: ticketDetail.timeline,
    relatedTickets: ticketDetail.relatedTickets,
    attachments,
    // Shaped for MediaViewer, which takes { id, type, label, caption }.
    mediaItems: attachments.map((item) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      label: item.label,
      caption: `Supplied by the ${item.uploadedByParty}`,
    })),
    activeAttachmentId: ticketDetail.activeAttachmentId,
    replyDraft: ticketDetail.replyDraft,
    escalationDraft: ticketDetail.escalationDraft,
    escalationQueues: ticketDetail.escalationQueues,
    escalationQueueOptions: ticketDetail.escalationQueues.map((queue) => ({ value: queue, label: queue })),
    isClosed,
    canReply: Boolean(ticket) && !isClosed,
    // Escalation is a handoff. A ticket already with another team goes nowhere
    // by being escalated again, and a closed one has nothing to hand over.
    canEscalate: Boolean(ticket) && !isClosed && ticket.status !== 'escalated',
    canResolve: Boolean(ticket) && !isClosed && Boolean(ticket.firstResponseAt),
    canSendReply: Boolean(ticketDetail.replyDraft.body.trim()) && Boolean(ticket) && !isClosed,
    canEscalateNow: Boolean(ticketDetail.escalationDraft.queue)
      && Boolean(ticketDetail.escalationDraft.reason.trim()),
    viewState: simpleViewState(ticketDetail.status, Boolean(ticket)),
    replyStatus: ticketDetail.replyStatus,
    replyError: ticketDetail.replyError,
    actionStatus: ticketDetail.actionStatus,
    actionError: ticketDetail.actionError,
    error: ticketDetail.error,
  };
});

export const selectSupportPerformance = createSelector([selectSupport], ({ performance }) => ({
  range: performance.range,
  metrics: performance.metrics,
  volumeSeries: performance.volumeSeries,
  responseSeries: performance.responseSeries,
  categoryMix: performance.categoryMix,
  csatMix: performance.csatMix,
  agentLoad: performance.agentLoad,
  // ChartCard takes a redux-free status, so the mapping happens here.
  chartStatus: performance.status === 'idle' ? 'loading' : performance.status,
  viewState: simpleViewState(performance.status, Boolean(performance.metrics)),
  error: performance.error,
}));

// ADM-092. A library is judged by what agents actually reach for, so the
// never-used and stale counts sit next to the list rather than buried.
export const selectCannedLibrary = createSelector([selectSupport], ({ canned }) => ({
  responses: canned.items,
  total: canned.total,
  query: canned.query,
  counts: canned.counts,
  draft: canned.draft,
  dirty: canned.dirty,
  viewState: listViewState({
    status: canned.status,
    items: canned.items,
    query: { search: canned.query.search, filters: canned.query.filters },
  }),
  saveStatus: canned.saveStatus,
  saveError: canned.saveError,
  actionStatus: canned.actionStatus,
  actionError: canned.actionError,
}));

// The picker inside the ticket workspace - ADM-088.
export const selectCannedPicker = createSelector([selectSupport], ({ ticketDetail }) => ({
  ...ticketDetail.cannedPicker,
  hasResults: ticketDetail.cannedPicker.items.length > 0,
}));


export default slice.reducer;
