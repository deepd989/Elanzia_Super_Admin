// Marketplace oversight - ADM-042 to ADM-047.
//
// Five sections, each with its own status and error. They do not share a
// loading flag because they do not share a screen: the enquiry queue must stay
// on screen while the conversation thread beside it is still arriving, and the
// sourcing workspace must keep the brief visible while a routing call fails.
//
// Selectors at the foot of the file are the seam - a screen reads exactly one
// of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { STATUS, listViewState } from '@/store/createListSlice';
import * as marketplaceApi from '@/services/mock/marketplaceApi';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code (private_piece_featured
// renders against the flag list, not as a page error) and render the message.
function apiThunk(name, fetcher) {
  return createAsyncThunk(`marketplace/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fetcher(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// A list thunk reads its own query out of the store, so a screen dispatches
// fetchX() with no argument and cannot accidentally page with stale filters.
function queryThunk(name, fetcher, pickQuery) {
  return createAsyncThunk(`marketplace/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fetcher(pickQuery(getState().marketplace));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchEnquiries = queryThunk(
  'fetchEnquiries',
  marketplaceApi.listEnquiries,
  (state) => state.enquiries.query,
);

export const fetchEnquiryOverview = queryThunk(
  'fetchEnquiryOverview',
  marketplaceApi.getEnquiryOverview,
  (state) => ({ filters: state.enquiries.query.filters }),
);

export const fetchEnquiryThread = apiThunk('fetchEnquiryThread', marketplaceApi.getEnquiryThread);
export const closeEnquiry = apiThunk('closeEnquiry', marketplaceApi.closeEnquiry);
export const nudgeEnquiries = apiThunk('nudgeEnquiries', marketplaceApi.nudgeEnquiries);

export const fetchStalled = queryThunk(
  'fetchStalled',
  marketplaceApi.listStalledEnquiries,
  (state) => state.stalled.query,
);

export const fetchMicrositeSubmissions = queryThunk(
  'fetchMicrositeSubmissions',
  marketplaceApi.listMicrositeSubmissions,
  (state) => state.microsites.query,
);

export const fetchMicrositeSubmission = apiThunk(
  'fetchMicrositeSubmission',
  marketplaceApi.getMicrositeSubmission,
);

export const reviewMicrosite = apiThunk('reviewMicrosite', marketplaceApi.reviewMicrosite);

export const fetchDemandInsights = queryThunk(
  'fetchDemandInsights',
  marketplaceApi.getDemandInsights,
  (state) => ({ rangeDays: state.demand.rangeDays }),
);

export const fetchSearchTerms = queryThunk(
  'fetchSearchTerms',
  marketplaceApi.listSearchTerms,
  (state) => state.demand.terms.query,
);

export const raiseSourcingBrief = apiThunk('raiseSourcingBrief', marketplaceApi.raiseSourcingBrief);

export const fetchSourcingRequests = queryThunk(
  'fetchSourcingRequests',
  marketplaceApi.listSourcingRequests,
  (state) => state.sourcing.query,
);

export const fetchSourcingSummary = apiThunk('fetchSourcingSummary', marketplaceApi.getSourcingSummary);
export const fetchSourcingRequest = apiThunk('fetchSourcingRequest', marketplaceApi.getSourcingRequest);
export const routeSourcingRequest = apiThunk('routeSourcingRequest', marketplaceApi.routeSourcingRequest);
export const shortlistSourcingResponse = apiThunk(
  'shortlistSourcingResponse',
  marketplaceApi.shortlistSourcingResponse,
);
export const recordSourcingOutcome = apiThunk('recordSourcingOutcome', marketplaceApi.recordSourcingOutcome);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

// The filters each queue opens on. Held as constants because clearFilters has
// to return to exactly these, not to an empty object.
export const DEFAULT_ENQUIRY_FILTERS = {
  manufacturerId: '',
  jewellerId: '',
  status: '',
  ageBucket: '',
  valueBand: '',
};

export const DEFAULT_STALLED_FILTERS = {
  thresholdDays: '3',
  stalledReason: '',
  manufacturerId: '',
};

export const DEFAULT_MICROSITE_FILTERS = { status: '', city: '', manufacturerId: '' };

// The gap list is what this screen is for, so it opens on zero-result terms.
export const DEFAULT_TERM_FILTERS = { zeroResult: 'true', category: '', trend: '' };

export const DEFAULT_SOURCING_FILTERS = { status: '', ownerId: '', category: '', slaBreached: '' };

const initialState = {
  // ADM-042. The queue, its tiles, and the thread of whichever row is open.
  enquiries: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'lastMessageAt',
      sortDir: 'desc',
      filters: { ...DEFAULT_ENQUIRY_FILTERS },
    },
    overview: null,
    facets: { manufacturers: [], jewellers: [] },
    overviewStatus: STATUS.IDLE,
    overviewError: null,

    // The open conversation. Its own status, so reading a thread never blanks
    // the queue it was opened from.
    openId: null,
    thread: null,
    threadStatus: STATUS.IDLE,
    threadError: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-043.
  stalled: {
    items: [],
    total: 0,
    thresholdDays: 3,
    facets: { manufacturers: [] },
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'idleDays',
      sortDir: 'desc',
      filters: { ...DEFAULT_STALLED_FILTERS },
    },
    selectedIds: [],
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-044.
  microsites: {
    items: [],
    total: 0,
    awaitingDecision: 0,
    slaBreached: 0,
    facets: { cities: [], manufacturers: [] },
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'asc',
      filters: { ...DEFAULT_MICROSITE_FILTERS },
    },
    openId: null,
    current: null,
    currentStatus: STATUS.IDLE,
    currentError: null,
    decisionStatus: STATUS.IDLE,
    decisionError: null,
  },

  // ADM-045. The charts and the gap table load separately: a failing insights
  // call must not take the supply-gap list down with it, since that list is the
  // part the desk actually works from.
  demand: {
    insights: null,
    facets: { categories: [] },
    rangeDays: 30,
    status: STATUS.IDLE,
    error: null,
    terms: {
      items: [],
      total: 0,
      status: STATUS.IDLE,
      error: null,
      query: {
        page: 1,
        pageSize: 20,
        search: '',
        sortBy: 'searches30d',
        sortDir: 'desc',
        filters: { ...DEFAULT_TERM_FILTERS },
      },
    },
    actionStatus: STATUS.IDLE,
    actionError: null,
    lastRaisedRequestId: null,
  },

  // ADM-046 and ADM-047.
  sourcing: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'postedAt',
      sortDir: 'desc',
      filters: { ...DEFAULT_SOURCING_FILTERS },
    },
    summary: null,
    facets: { owners: [], categories: [] },
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    current: null,
    currentStatus: STATUS.IDLE,
    currentError: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },
};

// Wires the three async states onto one section. Spelling this out for all
// seventeen thunks would bury the parts that actually differ.
function wire(builder, thunk, pick, onSuccess, field = 'status') {
  const errorField = field === 'status' ? 'error' : `${field.replace(/Status$/, '')}Error`;

  builder
    .addCase(thunk.pending, (state) => {
      const section = pick(state);
      section[field] = STATUS.LOADING;
      section[errorField] = null;
    })
    .addCase(thunk.fulfilled, (state, action) => {
      pick(state)[field] = STATUS.SUCCEEDED;
      onSuccess?.(state, action);
    })
    .addCase(thunk.rejected, (state, action) => {
      const section = pick(state);
      section[field] = STATUS.FAILED;
      section[errorField] = action.payload ?? { code: 'unknown', message: action.error.message };
    });
}

const pickEnquiries = (state) => state.enquiries;
const pickStalled = (state) => state.stalled;
const pickMicrosites = (state) => state.microsites;
const pickDemand = (state) => state.demand;
const pickTerms = (state) => state.demand.terms;
const pickSourcing = (state) => state.sourcing;

// Any filter change resets to page one. Landing on page 4 of a three page
// result is the classic queue-screen bug.
function queryReducers(section) {
  return {
    setFilters(state, action) {
      section(state).query.filters = action.payload;
      section(state).query.page = 1;
    },
    setSearch(state, action) {
      section(state).query.search = action.payload;
      section(state).query.page = 1;
    },
    setSort(state, action) {
      section(state).query.sortBy = action.payload.sortBy;
      section(state).query.sortDir = action.payload.sortDir;
    },
    setPage(state, action) {
      section(state).query.page = action.payload;
    },
    setPageSize(state, action) {
      section(state).query.pageSize = action.payload;
      section(state).query.page = 1;
    },
  };
}

const enquiryQuery = queryReducers(pickEnquiries);
const stalledQuery = queryReducers(pickStalled);
const micrositeQuery = queryReducers(pickMicrosites);
const termQuery = queryReducers(pickTerms);
const sourcingQuery = queryReducers(pickSourcing);

const slice = createSlice({
  name: 'marketplace',
  initialState,
  reducers: {
    setEnquiryFilters: enquiryQuery.setFilters,
    setEnquirySearch: enquiryQuery.setSearch,
    setEnquirySort: enquiryQuery.setSort,
    setEnquiryPage: enquiryQuery.setPage,
    setEnquiryPageSize: enquiryQuery.setPageSize,
    clearEnquiryFilters(state) {
      state.enquiries.query.filters = { ...DEFAULT_ENQUIRY_FILTERS };
      state.enquiries.query.search = '';
      state.enquiries.query.page = 1;
    },
    openEnquiry(state, action) {
      state.enquiries.openId = action.payload;
      state.enquiries.actionError = null;
    },
    closeEnquiryPanel(state) {
      state.enquiries.openId = null;
      state.enquiries.thread = null;
      state.enquiries.threadStatus = STATUS.IDLE;
      state.enquiries.threadError = null;
      state.enquiries.actionError = null;
    },

    setStalledFilters: stalledQuery.setFilters,
    setStalledSearch: stalledQuery.setSearch,
    setStalledSort: stalledQuery.setSort,
    setStalledPage: stalledQuery.setPage,
    setStalledPageSize: stalledQuery.setPageSize,
    clearStalledFilters(state) {
      state.stalled.query.filters = { ...DEFAULT_STALLED_FILTERS };
      state.stalled.query.search = '';
      state.stalled.query.page = 1;
    },
    toggleStalledSelection(state, action) {
      const id = action.payload;
      state.stalled.selectedIds = state.stalled.selectedIds.includes(id)
        ? state.stalled.selectedIds.filter((row) => row !== id)
        : [...state.stalled.selectedIds, id];
    },
    setStalledSelection(state, action) {
      state.stalled.selectedIds = action.payload;
    },

    setMicrositeFilters: micrositeQuery.setFilters,
    setMicrositeSearch: micrositeQuery.setSearch,
    setMicrositeSort: micrositeQuery.setSort,
    setMicrositePage: micrositeQuery.setPage,
    setMicrositePageSize: micrositeQuery.setPageSize,
    clearMicrositeFilters(state) {
      state.microsites.query.filters = { ...DEFAULT_MICROSITE_FILTERS };
      state.microsites.query.search = '';
      state.microsites.query.page = 1;
    },
    openMicrositeSubmission(state, action) {
      state.microsites.openId = action.payload;
      state.microsites.decisionError = null;
      if (action.payload === null) {
        state.microsites.current = null;
        state.microsites.currentStatus = STATUS.IDLE;
        state.microsites.currentError = null;
      }
    },

    setDemandRange(state, action) {
      state.demand.rangeDays = action.payload;
    },
    setTermFilters: termQuery.setFilters,
    setTermSearch: termQuery.setSearch,
    setTermSort: termQuery.setSort,
    setTermPage: termQuery.setPage,
    setTermPageSize: termQuery.setPageSize,
    clearTermFilters(state) {
      state.demand.terms.query.filters = { ...DEFAULT_TERM_FILTERS };
      state.demand.terms.query.search = '';
      state.demand.terms.query.page = 1;
    },
    dismissDemandAction(state) {
      state.demand.actionError = null;
      state.demand.lastRaisedRequestId = null;
    },

    setSourcingFilters: sourcingQuery.setFilters,
    setSourcingSearch: sourcingQuery.setSearch,
    setSourcingSort: sourcingQuery.setSort,
    setSourcingPage: sourcingQuery.setPage,
    setSourcingPageSize: sourcingQuery.setPageSize,
    clearSourcingFilters(state) {
      state.sourcing.query.filters = { ...DEFAULT_SOURCING_FILTERS };
      state.sourcing.query.search = '';
      state.sourcing.query.page = 1;
    },
    dismissSourcingActionError(state) {
      state.sourcing.actionError = null;
    },
  },

  extraReducers: (builder) => {
    // ADM-042
    wire(builder, fetchEnquiries, pickEnquiries, (state, action) => {
      state.enquiries.items = action.payload.items;
      state.enquiries.total = action.payload.total;
    });

    wire(
      builder,
      fetchEnquiryOverview,
      pickEnquiries,
      (state, action) => {
        state.enquiries.overview = action.payload;
        state.enquiries.facets = action.payload.facets;
      },
      'overviewStatus',
    );

    wire(
      builder,
      fetchEnquiryThread,
      pickEnquiries,
      (state, action) => {
        state.enquiries.thread = action.payload;
      },
      'threadStatus',
    );

    // The nudge is dispatched from ADM-042 and from ADM-043, so it lands on
    // both sections in one place. Wiring it twice would register two reducers
    // for one action type, which Redux Toolkit refuses outright.
    //
    // The rows are patched in place so neither queue flashes, and the open
    // thread gains the message that was just posted rather than needing a
    // re-open to show it.
    builder
      .addCase(nudgeEnquiries.pending, (state) => {
        state.enquiries.actionStatus = STATUS.LOADING;
        state.enquiries.actionError = null;
        state.stalled.actionStatus = STATUS.LOADING;
        state.stalled.actionError = null;
      })
      .addCase(nudgeEnquiries.fulfilled, (state, action) => {
        const { updated, messages } = action.payload;
        const patch = (rows) => rows.map((row) => updated.find((next) => next.id === row.id) ?? row);

        state.enquiries.actionStatus = STATUS.SUCCEEDED;
        state.enquiries.items = patch(state.enquiries.items);
        if (state.enquiries.thread) {
          const openId = state.enquiries.thread.enquiry.id;
          state.enquiries.thread.messages.push(
            ...messages.filter((message) => message.enquiryId === openId),
          );
          state.enquiries.thread.enquiry =
            updated.find((row) => row.id === openId) ?? state.enquiries.thread.enquiry;
        }

        state.stalled.actionStatus = STATUS.SUCCEEDED;
        state.stalled.items = patch(state.stalled.items);
        state.stalled.selectedIds = [];
      })
      .addCase(nudgeEnquiries.rejected, (state, action) => {
        const error = action.payload ?? { code: 'unknown', message: action.error.message };
        state.enquiries.actionStatus = STATUS.FAILED;
        state.enquiries.actionError = error;
        state.stalled.actionStatus = STATUS.FAILED;
        state.stalled.actionError = error;
      });

    wire(
      builder,
      closeEnquiry,
      pickEnquiries,
      (state, action) => {
        state.enquiries.items = state.enquiries.items.map((row) =>
          row.id === action.payload.id ? action.payload : row,
        );
        if (state.enquiries.thread?.enquiry.id === action.payload.id) {
          state.enquiries.thread.enquiry = action.payload;
        }
      },
      'actionStatus',
    );

    // ADM-043
    wire(builder, fetchStalled, pickStalled, (state, action) => {
      state.stalled.items = action.payload.items;
      state.stalled.total = action.payload.total;
      state.stalled.thresholdDays = action.payload.thresholdDays;
      state.stalled.facets = action.payload.facets;
      // A row that is no longer on the page cannot stay selected, or a bulk
      // nudge fires at conversations the operator can no longer see.
      const visible = action.payload.items.map((row) => row.id);
      state.stalled.selectedIds = state.stalled.selectedIds.filter((id) => visible.includes(id));
    });

    // ADM-044
    wire(builder, fetchMicrositeSubmissions, pickMicrosites, (state, action) => {
      state.microsites.items = action.payload.items;
      state.microsites.total = action.payload.total;
      state.microsites.awaitingDecision = action.payload.awaitingDecision;
      state.microsites.slaBreached = action.payload.slaBreached;
      state.microsites.facets = action.payload.facets;
    });

    wire(
      builder,
      fetchMicrositeSubmission,
      pickMicrosites,
      (state, action) => {
        state.microsites.current = action.payload;
      },
      'currentStatus',
    );

    wire(
      builder,
      reviewMicrosite,
      pickMicrosites,
      (state, action) => {
        state.microsites.items = state.microsites.items.map((row) =>
          row.id === action.payload.submission.id ? action.payload.submission : row,
        );
        state.microsites.awaitingDecision = Math.max(0, state.microsites.awaitingDecision - 1);
        if (state.microsites.current?.submission.id === action.payload.submission.id) {
          state.microsites.current.submission = action.payload.submission;
          state.microsites.current.microsite = action.payload.microsite;
        }
      },
      'decisionStatus',
    );

    // ADM-045
    wire(builder, fetchDemandInsights, pickDemand, (state, action) => {
      state.demand.insights = action.payload;
      state.demand.facets = action.payload.facets;
    });

    wire(builder, fetchSearchTerms, pickTerms, (state, action) => {
      state.demand.terms.items = action.payload.items;
      state.demand.terms.total = action.payload.total;
    });

    wire(
      builder,
      raiseSourcingBrief,
      pickDemand,
      (state, action) => {
        state.demand.terms.items = state.demand.terms.items.map((row) =>
          row.id === action.payload.searchTerm.id ? action.payload.searchTerm : row,
        );
        state.demand.lastRaisedRequestId = action.payload.request.id;
      },
      'actionStatus',
    );

    // ADM-046
    wire(builder, fetchSourcingRequests, pickSourcing, (state, action) => {
      state.sourcing.items = action.payload.items;
      state.sourcing.total = action.payload.total;
    });

    wire(
      builder,
      fetchSourcingSummary,
      pickSourcing,
      (state, action) => {
        state.sourcing.summary = action.payload;
        state.sourcing.facets = action.payload.facets;
      },
      'summaryStatus',
    );

    // ADM-047
    wire(
      builder,
      fetchSourcingRequest,
      pickSourcing,
      (state, action) => {
        state.sourcing.current = action.payload;
      },
      'currentStatus',
    );

    wire(
      builder,
      routeSourcingRequest,
      pickSourcing,
      (state, action) => {
        if (!state.sourcing.current) return;
        state.sourcing.current.request = action.payload.request;
        state.sourcing.current.responses = action.payload.responses;
        // A workshop that now holds the brief is no longer a suggestion.
        state.sourcing.current.suggestedManufacturers =
          state.sourcing.current.suggestedManufacturers.filter(
            (row) => !action.payload.request.routedManufacturerIds.includes(row.manufacturerId),
          );
      },
      'actionStatus',
    );

    wire(
      builder,
      shortlistSourcingResponse,
      pickSourcing,
      (state, action) => {
        if (!state.sourcing.current) return;
        state.sourcing.current.responses = state.sourcing.current.responses.map((row) =>
          row.id === action.payload.id ? action.payload : row,
        );
      },
      'actionStatus',
    );

    wire(
      builder,
      recordSourcingOutcome,
      pickSourcing,
      (state, action) => {
        if (state.sourcing.current) state.sourcing.current.request = action.payload;
        state.sourcing.items = state.sourcing.items.map((row) =>
          row.id === action.payload.id ? action.payload : row,
        );
      },
      'actionStatus',
    );
  },
});

export const {
  setEnquiryFilters,
  setEnquirySearch,
  setEnquirySort,
  setEnquiryPage,
  setEnquiryPageSize,
  clearEnquiryFilters,
  openEnquiry,
  closeEnquiryPanel,
  setStalledFilters,
  setStalledSearch,
  setStalledSort,
  setStalledPage,
  setStalledPageSize,
  clearStalledFilters,
  toggleStalledSelection,
  setStalledSelection,
  setMicrositeFilters,
  setMicrositeSearch,
  setMicrositeSort,
  setMicrositePage,
  setMicrositePageSize,
  clearMicrositeFilters,
  openMicrositeSubmission,
  setDemandRange,
  setTermFilters,
  setTermSearch,
  setTermSort,
  setTermPage,
  setTermPageSize,
  clearTermFilters,
  dismissDemandAction,
  setSourcingFilters,
  setSourcingSearch,
  setSourcingSort,
  setSourcingPage,
  setSourcingPageSize,
  clearSourcingFilters,
  dismissSourcingActionError,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectMarketplace = (state) => state.marketplace;

// listViewState() treats any non-empty filter as "filtered". That is right on
// the enquiry queue and wrong on the two screens that open with a filter
// already applied: the supply-gap table opens on zero-result terms, and the
// stalled queue opens on a three day idle threshold. An empty result there
// means nothing is stuck, which deserves the all-clear rather than an
// invitation to widen a search the operator never typed.
function viewStateIgnoringDefaults({ status, items, query }, defaults, ignoredKeys) {
  const narrowed = Object.entries(query.filters).some(([key, value]) =>
    ignoredKeys.includes(key) ? value !== defaults[key] : Boolean(value),
  );

  return listViewState({
    status,
    items,
    query: { search: query.search, filters: narrowed ? query.filters : {} },
  });
}

export const selectEnquiryOversight = createSelector([selectMarketplace], ({ enquiries }) => ({
  enquiries: enquiries.items,
  total: enquiries.total,
  query: enquiries.query,
  error: enquiries.error,
  overview: enquiries.overview,
  overviewState: enquiries.overviewStatus,
  facets: enquiries.facets,
  viewState: listViewState(enquiries),

  openId: enquiries.openId,
  thread: enquiries.thread,
  // The panel has its own four states, and 'idle' is a fifth: no row picked
  // yet. That is an unasked question, not an empty result.
  threadState:
    enquiries.openId === null
      ? 'prompt'
      : listViewState({
          status: enquiries.threadStatus,
          items: enquiries.thread ? [enquiries.thread] : [],
          query: { search: '', filters: {} },
        }),
  actionStatus: enquiries.actionStatus,
  actionError: enquiries.actionError,
}));

export const selectStalledConversations = createSelector([selectMarketplace], ({ stalled }) => ({
  conversations: stalled.items,
  total: stalled.total,
  thresholdDays: stalled.thresholdDays,
  facets: stalled.facets,
  query: stalled.query,
  error: stalled.error,
  selectedIds: stalled.selectedIds,
  actionStatus: stalled.actionStatus,
  actionError: stalled.actionError,
  viewState: viewStateIgnoringDefaults(stalled, DEFAULT_STALLED_FILTERS, ['thresholdDays']),

  // Selection lives in the store, but "are these all selected" is a question
  // about the page on screen, so it is answered here rather than in the screen.
  allSelected: stalled.items.length > 0 && stalled.selectedIds.length === stalled.items.length,
  someSelected: stalled.selectedIds.length > 0 && stalled.selectedIds.length < stalled.items.length,

  // What the desk is about to chase, valued. A bulk nudge across ten silent
  // conversations worth eighty lakh is a different decision from ten worth two.
  selectedValue: stalled.items
    .filter((row) => stalled.selectedIds.includes(row.id))
    .reduce((total, row) => total + (row.latestQuotedValue ?? 0), 0),
}));

export const selectMicrositeModeration = createSelector([selectMarketplace], ({ microsites }) => ({
  submissions: microsites.items,
  total: microsites.total,
  awaitingDecision: microsites.awaitingDecision,
  slaBreached: microsites.slaBreached,
  facets: microsites.facets,
  query: microsites.query,
  error: microsites.error,
  viewState: listViewState(microsites),

  openId: microsites.openId,
  current: microsites.current,
  reviewState:
    microsites.openId === null
      ? 'prompt'
      : listViewState({
          status: microsites.currentStatus,
          items: microsites.current ? [microsites.current] : [],
          query: { search: '', filters: {} },
        }),
  decisionStatus: microsites.decisionStatus,
  decisionError: microsites.decisionError,

  // A private catalogue piece must never reach a public surface, so the screen
  // needs to know the page is blocked before the reviewer picks a decision -
  // not after the approve call comes back 409.
  blockingFlags: (microsites.current?.flags ?? []).filter(
    (flag) => flag.code === 'private_piece_featured',
  ),
}));

export const selectDemandInsights = createSelector([selectMarketplace], ({ demand }) => ({
  insights: demand.insights,
  rangeDays: demand.rangeDays,
  insightsState: demand.status,
  insightsError: demand.error,
  facets: demand.facets,

  terms: demand.terms.items,
  total: demand.terms.total,
  query: demand.terms.query,
  error: demand.terms.error,
  viewState: viewStateIgnoringDefaults(demand.terms, DEFAULT_TERM_FILTERS, ['zeroResult']),

  actionStatus: demand.actionStatus,
  actionError: demand.actionError,
  lastRaisedRequestId: demand.lastRaisedRequestId,
}));

export const selectSourcingQueue = createSelector([selectMarketplace], ({ sourcing }) => ({
  requests: sourcing.items,
  total: sourcing.total,
  query: sourcing.query,
  error: sourcing.error,
  summary: sourcing.summary,
  summaryState: sourcing.summaryStatus,
  facets: sourcing.facets,
  viewState: listViewState(sourcing),
}));

export const selectSourcingWorkspace = createSelector([selectMarketplace], ({ sourcing }) => {
  const request = sourcing.current?.request ?? null;
  const responses = sourcing.current?.responses ?? [];
  const quoted = responses.filter((row) => row.canMake);

  return {
    request,
    responses,
    suggestions: sourcing.current?.suggestedManufacturers ?? [],
    jeweller: sourcing.current?.jeweller ?? null,
    error: sourcing.currentError,
    actionStatus: sourcing.actionStatus,
    actionError: sourcing.actionError,
    viewState: listViewState({
      status: sourcing.currentStatus,
      items: request ? [request] : [],
      query: { search: '', filters: {} },
    }),

    quotedCount: quoted.length,
    shortlistedIds: responses.filter((row) => row.shortlisted).map((row) => row.id),
    awaitingCount: responses.filter((row) => row.status === 'no_response').length,

    // The brief can only be closed as matched against a workshop that actually
    // quoted, so the screen offers exactly those and nothing else.
    matchableManufacturers: quoted.map((row) => ({
      value: row.manufacturerId,
      label: row.manufacturerName,
    })),

    // A quote above what the jeweller said they would pay is the commonest
    // reason a brief ends in no_match, and the desk should see it in the list
    // rather than work it out per row.
    overBudgetCount:
      request?.targetUnitBudget === null || !request
        ? 0
        : quoted.filter((row) => row.quotedUnitPrice > request.targetUnitBudget).length,
  };
});

export default slice.reducer;
