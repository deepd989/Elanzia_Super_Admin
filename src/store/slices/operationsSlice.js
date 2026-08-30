// Operations overview - ADM-010, ADM-011, ADM-012.
//
// Four sections, each with its own status and error, because a control room
// cannot share one loading flag: the dashboard has to stay on screen precisely
// when the feed poll behind it is failing. Selectors at the foot of the file
// are the seam - a screen reads exactly one of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { STATUS, listViewState } from '@/store/createListSlice';
import * as operationsApi from '@/services/mock/operationsApi';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code (resolution_note_required
// renders against the note field, not as a page error) and render the message.
function apiThunk(name, fetcher) {
  return createAsyncThunk(`operations/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fetcher(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchDashboard = apiThunk('fetchDashboard', operationsApi.getOperationsSummary);
export const fetchGoldRate = apiThunk('fetchGoldRate', operationsApi.getGoldRate);
export const fetchFeeds = apiThunk('fetchFeeds', operationsApi.listFeedStatus);
export const refreshFeed = apiThunk('refreshFeed', operationsApi.refreshFeed);

export const runSearch = createAsyncThunk(
  'operations/runSearch',
  async (_, { getState, rejectWithValue }) => {
    const { term, entityType } = getState().operations.search;
    try {
      return await operationsApi.searchEverything({ term, entityType });
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  },
);

export const fetchAlerts = createAsyncThunk(
  'operations/fetchAlerts',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await operationsApi.listAlerts(getState().operations.alerts.query);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  },
);

export const fetchAlertCounts = createAsyncThunk(
  'operations/fetchAlertCounts',
  async (_, { getState, rejectWithValue }) => {
    const { search, filters } = getState().operations.alerts.query;
    try {
      return await operationsApi.getAlertCounts({ search, filters });
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  },
);

export const acknowledgeAlerts = apiThunk('acknowledgeAlerts', operationsApi.acknowledgeAlerts);
export const snoozeAlerts = apiThunk('snoozeAlerts', operationsApi.snoozeAlerts);
export const resolveAlerts = apiThunk('resolveAlerts', operationsApi.resolveAlerts);
export const assignAlert = apiThunk('assignAlert', operationsApi.assignAlert);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

// The filters a control room opens on: what is still broken, everything else
// put aside. Held as a constant because clearFilters has to return to exactly
// this, not to an empty object.
export const DEFAULT_ALERT_FILTERS = {
  severity: '',
  category: '',
  status: 'open',
  assigneeId: '',
};

const initialState = {
  // ADM-010. One fetch fills the whole control room.
  dashboard: {
    metrics: null,
    workQueues: [],
    gmvSeries: [],
    activity: [],
    refreshedAt: null,
    status: STATUS.IDLE,
    error: null,
  },

  // Its own section because the rate ticks and the rest of the dashboard does
  // not. Re-polling the rate must not blank the work queues.
  goldRate: { data: null, status: STATUS.IDLE, error: null },

  // Also its own section: a dead IRP feed is exactly when the dashboard has to
  // stay up, so a failed feed poll cannot take the page down with it.
  feeds: {
    items: [],
    status: STATUS.IDLE,
    error: null,
    refreshingId: null,
    actionError: null,
  },

  // ADM-011.
  search: {
    term: '',
    entityType: 'all',
    groups: [],
    countsByType: {},
    total: 0,
    truncated: false,
    recent: [],
    status: STATUS.IDLE,
    error: null,
  },

  // ADM-012.
  alerts: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'raisedAt',
      sortDir: 'desc',
      filters: { ...DEFAULT_ALERT_FILTERS },
    },
    counts: null,
    countsStatus: STATUS.IDLE,
    countsError: null,
    selectedIds: [],
    actionStatus: STATUS.IDLE,
    actionError: null,
  },
};

// Wires the three async states onto one section. Spelling this out for all
// eleven thunks would bury the parts that actually differ.
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

const pickDashboard = (state) => state.dashboard;
const pickGoldRate = (state) => state.goldRate;
const pickFeeds = (state) => state.feeds;
const pickSearch = (state) => state.search;
const pickAlerts = (state) => state.alerts;

const MAX_RECENT_SEARCHES = 8;

const slice = createSlice({
  name: 'operations',
  initialState,
  reducers: {
    setSearchTerm(state, action) {
      state.search.term = action.payload;
    },
    setSearchEntityType(state, action) {
      state.search.entityType = action.payload;
    },
    clearSearch(state) {
      state.search.term = '';
      state.search.entityType = 'all';
      state.search.groups = [];
      state.search.countsByType = {};
      state.search.total = 0;
      state.search.truncated = false;
      state.search.status = STATUS.IDLE;
      state.search.error = null;
    },

    // Any filter change resets to page one. Landing on page 4 of a three page
    // result is the classic queue-screen bug.
    setAlertFilters(state, action) {
      state.alerts.query.filters = action.payload;
      state.alerts.query.page = 1;
      state.alerts.selectedIds = [];
    },
    setAlertSearch(state, action) {
      state.alerts.query.search = action.payload;
      state.alerts.query.page = 1;
      state.alerts.selectedIds = [];
    },
    setAlertSort(state, action) {
      state.alerts.query.sortBy = action.payload.sortBy;
      state.alerts.query.sortDir = action.payload.sortDir;
    },
    setAlertPage(state, action) {
      state.alerts.query.page = action.payload;
      state.alerts.selectedIds = [];
    },
    setAlertPageSize(state, action) {
      state.alerts.query.pageSize = action.payload;
      state.alerts.query.page = 1;
      state.alerts.selectedIds = [];
    },
    clearAlertFilters(state) {
      state.alerts.query.filters = { ...DEFAULT_ALERT_FILTERS };
      state.alerts.query.search = '';
      state.alerts.query.page = 1;
      state.alerts.selectedIds = [];
    },
    toggleAlertSelection(state, action) {
      const id = action.payload;
      state.alerts.selectedIds = state.alerts.selectedIds.includes(id)
        ? state.alerts.selectedIds.filter((candidate) => candidate !== id)
        : [...state.alerts.selectedIds, id];
    },
    setAlertSelection(state, action) {
      state.alerts.selectedIds = action.payload;
    },
    dismissAlertActionError(state) {
      state.alerts.actionError = null;
    },
  },

  extraReducers: (builder) => {
    wire(builder, fetchDashboard, pickDashboard, (state, action) => {
      const { metrics, workQueues, gmvSeries, activity, refreshedAt } = action.payload;
      state.dashboard.metrics = metrics;
      state.dashboard.workQueues = workQueues;
      state.dashboard.gmvSeries = gmvSeries;
      state.dashboard.activity = activity;
      state.dashboard.refreshedAt = refreshedAt;
    });

    wire(builder, fetchGoldRate, pickGoldRate, (state, action) => {
      state.goldRate.data = action.payload;
    });

    wire(builder, fetchFeeds, pickFeeds, (state, action) => {
      state.feeds.items = action.payload.items;
    });

    // A per-feed re-sync, so the row spins rather than the panel.
    builder
      .addCase(refreshFeed.pending, (state, action) => {
        state.feeds.refreshingId = action.meta.arg?.feedId ?? null;
        state.feeds.actionError = null;
      })
      .addCase(refreshFeed.fulfilled, (state, action) => {
        state.feeds.refreshingId = null;
        state.feeds.items = state.feeds.items.map((feed) =>
          feed.id === action.payload.id ? action.payload : feed,
        );
      })
      .addCase(refreshFeed.rejected, (state, action) => {
        state.feeds.refreshingId = null;
        state.feeds.actionError = action.payload ?? { code: 'unknown', message: action.error.message };
      });

    wire(builder, runSearch, pickSearch, (state, action) => {
      const { term, groups, countsByType, total, truncated } = action.payload;
      state.search.groups = groups;
      state.search.countsByType = countsByType;
      state.search.total = total;
      state.search.truncated = truncated;

      // Recent searches are what an operator working a single incident comes
      // back to, so a repeat moves to the front rather than being added twice.
      if (term) {
        state.search.recent = [term, ...state.search.recent.filter((row) => row !== term)].slice(
          0,
          MAX_RECENT_SEARCHES,
        );
      }
    });

    wire(builder, fetchAlerts, pickAlerts, (state, action) => {
      state.alerts.items = action.payload.items;
      state.alerts.total = action.payload.total;
    });

    wire(
      builder,
      fetchAlertCounts,
      pickAlerts,
      (state, action) => {
        state.alerts.counts = action.payload;
      },
      'countsStatus',
    );

    // The three bulk mutations and the assign all land the same way: patch the
    // rows in place so the table does not flash, and drop the selection.
    [acknowledgeAlerts, snoozeAlerts, resolveAlerts].forEach((thunk) => {
      wire(
        builder,
        thunk,
        pickAlerts,
        (state, action) => {
          const updated = action.payload.updated;
          state.alerts.items = state.alerts.items.map(
            (alert) => updated.find((row) => row.id === alert.id) ?? alert,
          );
          state.alerts.selectedIds = [];
        },
        'actionStatus',
      );
    });

    wire(
      builder,
      assignAlert,
      pickAlerts,
      (state, action) => {
        state.alerts.items = state.alerts.items.map((alert) =>
          alert.id === action.payload.id ? action.payload : alert,
        );
      },
      'actionStatus',
    );
  },
});

export const {
  setSearchTerm,
  setSearchEntityType,
  clearSearch,
  setAlertFilters,
  setAlertSearch,
  setAlertSort,
  setAlertPage,
  setAlertPageSize,
  clearAlertFilters,
  toggleAlertSelection,
  setAlertSelection,
  dismissAlertActionError,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectOperations = (state) => state.operations;

// listViewState() calls any non-empty filter "filtered", which is right on the
// other 98 screens and wrong on this one. The alerts queue opens with
// status 'open' already applied, so an empty result would render "no records
// match the current filters" - an invitation to widen the search - when what
// actually happened is that nothing is broken. That deserves the all-clear.
//
// So: the default status filter does not count as filtering. Everything else
// does, and is handed straight to listViewState.
export function alertsViewState({ status, items, query }) {
  const { status: statusFilter, ...rest } = query.filters;
  const narrowedBeyondDefault =
    statusFilter !== DEFAULT_ALERT_FILTERS.status || Object.values(rest).some(Boolean);

  return listViewState({
    status,
    items,
    // Narrowed at all - including to a different status - and the empty result
    // is a filter result. Only the untouched default queue earns the all-clear.
    query: { search: query.search, filters: narrowedBeyondDefault ? query.filters : {} },
  });
}

export const selectOperationsDashboard = createSelector(
  [selectOperations],
  ({ dashboard, goldRate, feeds }) => ({
    metrics: dashboard.metrics,
    workQueues: dashboard.workQueues,
    gmvSeries: dashboard.gmvSeries,
    activity: dashboard.activity,
    refreshedAt: dashboard.refreshedAt,
    error: dashboard.error,

    // The dashboard's own state. A failing gold rate or feed poll degrades its
    // own panel and leaves the rest of the control room up.
    viewState: listViewState({
      status: dashboard.status,
      items: dashboard.workQueues,
      query: { search: '', filters: {} },
    }),

    goldRate: goldRate.data,
    goldRateState: goldRate.status,
    goldRateError: goldRate.error,

    feeds: feeds.items,
    feedsState: feeds.status,
    feedsError: feeds.error,
    refreshingFeedId: feeds.refreshingId,
    feedActionError: feeds.actionError,

    // The single worst feed decides the badge in the page header. An operator
    // needs to know something is wrong before they know which thing.
    feedHealth:
      feeds.items.find((feed) => feed.status === 'down')?.status ??
      feeds.items.find((feed) => feed.status === 'degraded')?.status ??
      'healthy',
  }),
);

export const selectGlobalSearch = createSelector([selectOperations], ({ search }) => ({
  term: search.term,
  entityType: search.entityType,
  groups: search.groups,
  countsByType: search.countsByType,
  total: search.total,
  truncated: search.truncated,
  recent: search.recent,
  error: search.error,

  // Search has a fifth state the other screens do not: no term yet. That is not
  // an empty result, it is an unasked question, and it gets the recent-searches
  // prompt rather than "nothing here yet".
  viewState:
    search.term.trim().length === 0
      ? 'prompt'
      : listViewState({
          status: search.status,
          items: search.groups,
          query: { search: search.term, filters: {} },
        }),
}));

export const selectAlertsQueue = createSelector([selectOperations], ({ alerts }) => ({
  alerts: alerts.items,
  total: alerts.total,
  query: alerts.query,
  counts: alerts.counts,
  countsState: alerts.countsStatus,
  selectedIds: alerts.selectedIds,
  error: alerts.error,
  actionStatus: alerts.actionStatus,
  actionError: alerts.actionError,
  viewState: alertsViewState(alerts),

  // Selection lives in the store, but "are these all selected" is a question
  // about the page on screen, so it is answered here rather than in the screen.
  allSelected: alerts.items.length > 0 && alerts.selectedIds.length === alerts.items.length,
  someSelected: alerts.selectedIds.length > 0 && alerts.selectedIds.length < alerts.items.length,
}));

export default slice.reducer;
