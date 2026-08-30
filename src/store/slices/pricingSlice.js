// Pricing control - ADM-035 to ADM-041.
//
// Seven sections, one per screen, each with its own status and error. The
// selectors at the foot of the file are the seam: a screen reads exactly one
// of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as pricingApi from '@/services/mock/pricingApi';
import { listViewState } from '@/store/createListSlice';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code (rates_stale renders a link
// to the feed, deviation_too_large renders next to the rate field).
function apiThunk(name, fn) {
  return createAsyncThunk(`pricing/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

function queryThunk(name, fn, pickQuery) {
  return createAsyncThunk(`pricing/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fn(pickQuery(getState().pricing));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchMetalRates = apiThunk('fetchMetalRates', pricingApi.listMetalRates);
export const refreshRates = apiThunk('refreshRates', pricingApi.refreshRatesFromFeed);

export const fetchRateFeeds = apiThunk('fetchRateFeeds', pricingApi.listRateFeeds);
export const testFeed = apiThunk('testFeed', pricingApi.testRateFeed);
export const fetchRateHistory = queryThunk(
  'fetchRateHistory',
  pricingApi.getRateHistory,
  (state) => state.feedHealth.historyQuery,
);
export const fetchFeedIncidents = queryThunk(
  'fetchFeedIncidents',
  pricingApi.listFeedIncidents,
  (state) => state.feedHealth.incidents.query,
);

export const fetchOverrides = queryThunk(
  'fetchOverrides',
  pricingApi.listRateOverrides,
  (state) => state.overrides.query,
);
export const createOverride = apiThunk('createOverride', pricingApi.createRateOverride);
export const endOverride = apiThunk('endOverride', pricingApi.endRateOverride);

export const fetchPurityFactors = apiThunk('fetchPurityFactors', pricingApi.listPurityFactors);
export const savePurityFactors = apiThunk('savePurityFactors', pricingApi.updatePurityFactors);

export const fetchChargeRules = apiThunk('fetchChargeRules', pricingApi.getChargeRules);
export const saveChargeRules = apiThunk('saveChargeRules', pricingApi.updateChargeRules);
export const fetchViolations = apiThunk('fetchViolations', pricingApi.listRuleViolations);

export const fetchTreasuryPolicy = apiThunk('fetchTreasuryPolicy', pricingApi.getTreasuryPolicy);
export const saveTreasuryPolicy = apiThunk('saveTreasuryPolicy', pricingApi.updateTreasuryPolicy);
export const runSimulation = apiThunk('runSimulation', pricingApi.simulateRateMove);

export const previewRefresh = queryThunk(
  'previewRefresh',
  pricingApi.previewBulkRefresh,
  (state) => state.bulkRefresh.scope,
);
export const startRefresh = queryThunk(
  'startRefresh',
  pricingApi.startBulkRefresh,
  (state) => state.bulkRefresh.scope,
);
export const pollRefreshJob = apiThunk('pollRefreshJob', pricingApi.getBulkRefreshJob);
export const cancelRefresh = apiThunk('cancelRefresh', pricingApi.cancelBulkRefresh);
export const fetchRefreshJobs = queryThunk(
  'fetchRefreshJobs',
  pricingApi.listBulkRefreshJobs,
  (state) => state.bulkRefresh.jobs.query,
);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  // ADM-035
  rateBoard: {
    items: [],
    source: null,
    capturedAt: null,
    nextRefreshAt: null,
    refreshIntervalMinutes: null,
    stale: false,
    activeOverrideCount: 0,
    status: 'idle',
    error: null,
    refreshStatus: 'idle',
    refreshError: null,
    selectedMetal: '',
  },

  // ADM-036
  feedHealth: {
    feeds: [],
    status: 'idle',
    error: null,
    history: [],
    historySummary: null,
    historyQuery: { metal: 'gold', purity: 24, range: '30d' },
    historyStatus: 'idle',
    historyError: null,
    incidents: {
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      query: {
        page: 1,
        pageSize: 20,
        sortBy: 'startedAt',
        sortDir: 'desc',
        filters: { feedId: '', cause: '' },
      },
    },
    testingFeedId: null,
    testStatus: 'idle',
    testError: null,
  },

  // ADM-037
  overrides: {
    items: [],
    total: 0,
    status: 'idle',
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'createdAt',
      sortDir: 'desc',
      filters: { metal: '', state: '' },
    },
    draft: { metal: 'gold', purity: 24, ratePerGram: '', reason: '', expiresInHours: 6 },
    saveStatus: 'idle',
    saveError: null,
  },

  // ADM-038
  purityFactors: {
    items: [],
    referenceRates: [],
    status: 'idle',
    error: null,
    draft: null,
    dirty: false,
    saveStatus: 'idle',
    saveError: null,
  },

  // ADM-039
  chargeRules: {
    defaults: null,
    categories: [],
    status: 'idle',
    error: null,
    draft: null,
    dirty: false,
    saveStatus: 'idle',
    saveError: null,
    violations: { items: [], total: 0, status: 'idle', error: null },
  },

  // ADM-040
  treasuryPolicy: {
    data: null,
    status: 'idle',
    error: null,
    draft: null,
    dirty: false,
    saveStatus: 'idle',
    saveError: null,
    movePercent: 2.4,
    simulation: null,
    simulationStatus: 'idle',
    simulationError: null,
  },

  // ADM-041
  bulkRefresh: {
    scope: { type: 'all', category: '', manufacturerId: '', purity: '' },
    preview: null,
    previewStatus: 'idle',
    previewError: null,
    activeJob: null,
    jobs: {
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      query: { page: 1, pageSize: 20, sortBy: 'startedAt', sortDir: 'desc', filters: { status: '' } },
    },
    actionStatus: 'idle',
    actionError: null,
  },
};

// Wires the three async states onto one section. Spelling this out for all 22
// thunks would bury the parts that actually differ.
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

const pickBoard = (state) => state.rateBoard;
const pickFeeds = (state) => state.feedHealth;
const pickIncidents = (state) => state.feedHealth.incidents;
const pickOverrides = (state) => state.overrides;
const pickFactors = (state) => state.purityFactors;
const pickRules = (state) => state.chargeRules;
const pickViolations = (state) => state.chargeRules.violations;
const pickPolicy = (state) => state.treasuryPolicy;
const pickRefresh = (state) => state.bulkRefresh;
const pickJobs = (state) => state.bulkRefresh.jobs;

function applyRateEnvelope(state, payload) {
  Object.assign(state.rateBoard, {
    items: payload.items,
    source: payload.source,
    capturedAt: payload.capturedAt,
    nextRefreshAt: payload.nextRefreshAt,
    refreshIntervalMinutes: payload.refreshIntervalMinutes,
    stale: payload.stale,
    activeOverrideCount: payload.activeOverrideCount,
  });
}

const slice = createSlice({
  name: 'pricing',
  initialState,
  reducers: {
    setSelectedMetal(state, action) {
      state.rateBoard.selectedMetal = action.payload;
    },

    setHistoryQuery(state, action) {
      state.feedHealth.historyQuery = { ...state.feedHealth.historyQuery, ...action.payload };
    },
    setIncidentFilters(state, action) {
      state.feedHealth.incidents.query.filters = action.payload;
      state.feedHealth.incidents.query.page = 1;
    },
    setIncidentPage(state, action) {
      state.feedHealth.incidents.query.page = action.payload;
    },
    setIncidentPageSize(state, action) {
      state.feedHealth.incidents.query.pageSize = action.payload;
      state.feedHealth.incidents.query.page = 1;
    },

    setOverrideSearch(state, action) {
      state.overrides.query.search = action.payload;
      state.overrides.query.page = 1;
    },
    setOverrideFilters(state, action) {
      state.overrides.query.filters = action.payload;
      state.overrides.query.page = 1;
    },
    setOverridePage(state, action) {
      state.overrides.query.page = action.payload;
    },
    setOverridePageSize(state, action) {
      state.overrides.query.pageSize = action.payload;
      state.overrides.query.page = 1;
    },
    clearOverrideFilters(state) {
      state.overrides.query = { ...initialState.overrides.query };
    },
    setOverrideDraftField(state, action) {
      const { field, value } = action.payload;
      state.overrides.draft[field] = value;
      state.overrides.saveError = null;
    },
    resetOverrideDraft(state) {
      state.overrides.draft = { ...initialState.overrides.draft };
      state.overrides.saveError = null;
    },

    // ADM-038. Factors are edited as a local draft and saved in one go, so an
    // admin can rework the table without every keystroke moving a live price.
    setFactorDraftValue(state, action) {
      const { metal, purity, factor } = action.payload;
      state.purityFactors.draft = state.purityFactors.draft.map((row) =>
        row.metal === metal && row.purity === purity ? { ...row, factor } : row,
      );
      state.purityFactors.dirty = true;
    },
    resetFactorDraft(state) {
      state.purityFactors.draft = state.purityFactors.items.map((row) => ({ ...row }));
      state.purityFactors.dirty = false;
    },

    setDefaultsDraftField(state, action) {
      const { field, value } = action.payload;
      state.chargeRules.draft.defaults[field] = value;
      state.chargeRules.dirty = true;
    },
    setCategoryDraftField(state, action) {
      const { category, field, value } = action.payload;
      state.chargeRules.draft.categories = state.chargeRules.draft.categories.map((row) =>
        row.category === category ? { ...row, [field]: value } : row,
      );
      state.chargeRules.dirty = true;
    },
    resetChargeDraft(state) {
      state.chargeRules.draft = {
        defaults: { ...state.chargeRules.defaults },
        categories: state.chargeRules.categories.map((row) => ({ ...row })),
      };
      state.chargeRules.dirty = false;
    },

    setPolicyDraftField(state, action) {
      const { field, value } = action.payload;
      state.treasuryPolicy.draft[field] = value;
      state.treasuryPolicy.dirty = true;
    },
    resetPolicyDraft(state) {
      state.treasuryPolicy.draft = { ...state.treasuryPolicy.data };
      state.treasuryPolicy.dirty = false;
    },
    setMovePercent(state, action) {
      state.treasuryPolicy.movePercent = action.payload;
    },

    setRefreshScope(state, action) {
      state.bulkRefresh.scope = { ...state.bulkRefresh.scope, ...action.payload };
      // The preview describes the old scope, so it stops being true the moment
      // the scope changes.
      state.bulkRefresh.preview = null;
      state.bulkRefresh.previewStatus = 'idle';
    },
    setJobFilters(state, action) {
      state.bulkRefresh.jobs.query.filters = action.payload;
      state.bulkRefresh.jobs.query.page = 1;
    },
    setJobPage(state, action) {
      state.bulkRefresh.jobs.query.page = action.payload;
    },
    setJobPageSize(state, action) {
      state.bulkRefresh.jobs.query.pageSize = action.payload;
      state.bulkRefresh.jobs.query.page = 1;
    },
    clearActiveJob(state) {
      state.bulkRefresh.activeJob = null;
    },
  },

  extraReducers: (builder) => {
    // ---- rate board ----------------------------------------------------
    wire(builder, fetchMetalRates, pickBoard, (state, action) =>
      applyRateEnvelope(state, action.payload),
    );
    wire(
      builder,
      refreshRates,
      pickBoard,
      (state, action) => applyRateEnvelope(state, action.payload),
      'refreshStatus',
    );

    // ---- feed health ---------------------------------------------------
    wire(builder, fetchRateFeeds, pickFeeds, (state, action) => {
      state.feedHealth.feeds = action.payload.items;
    });
    wire(
      builder,
      testFeed,
      pickFeeds,
      (state, action) => {
        state.feedHealth.feeds = state.feedHealth.feeds.map((feed) =>
          feed.id === action.payload.id ? action.payload : feed,
        );
        state.feedHealth.testingFeedId = null;
      },
      'testStatus',
    );
    wire(
      builder,
      fetchRateHistory,
      pickFeeds,
      (state, action) => {
        const { items, ...summary } = action.payload;
        state.feedHealth.history = items;
        state.feedHealth.historySummary = summary;
      },
      'historyStatus',
    );
    wire(builder, fetchFeedIncidents, pickIncidents, (state, action) => {
      state.feedHealth.incidents.items = action.payload.items;
      state.feedHealth.incidents.total = action.payload.total;
    });

    // ---- overrides -----------------------------------------------------
    wire(builder, fetchOverrides, pickOverrides, (state, action) => {
      state.overrides.items = action.payload.items;
      state.overrides.total = action.payload.total;
    });
    wire(
      builder,
      createOverride,
      pickOverrides,
      (state) => {
        state.overrides.draft = { ...initialState.overrides.draft };
      },
      'saveStatus',
    );
    wire(builder, endOverride, pickOverrides, () => {}, 'saveStatus');

    // ---- purity factors ------------------------------------------------
    wire(builder, fetchPurityFactors, pickFactors, (state, action) => {
      state.purityFactors.items = action.payload.items;
      state.purityFactors.referenceRates = action.payload.referenceRates;
      state.purityFactors.draft = action.payload.items.map((row) => ({ ...row }));
      state.purityFactors.dirty = false;
    });
    wire(
      builder,
      savePurityFactors,
      pickFactors,
      (state, action) => {
        state.purityFactors.items = action.payload.items;
        state.purityFactors.draft = action.payload.items.map((row) => ({ ...row }));
        state.purityFactors.dirty = false;
        // The board is derived from these, so it is stale the moment they change.
        state.rateBoard.items = action.payload.ratesPreview;
      },
      'saveStatus',
    );

    // ---- charge rules --------------------------------------------------
    wire(builder, fetchChargeRules, pickRules, (state, action) => {
      state.chargeRules.defaults = action.payload.defaults;
      state.chargeRules.categories = action.payload.categories;
      state.chargeRules.draft = {
        defaults: { ...action.payload.defaults },
        categories: action.payload.categories.map((row) => ({ ...row })),
      };
      state.chargeRules.dirty = false;
    });
    wire(
      builder,
      saveChargeRules,
      pickRules,
      (state, action) => {
        state.chargeRules.defaults = action.payload.defaults;
        state.chargeRules.categories = action.payload.categories;
        state.chargeRules.dirty = false;
      },
      'saveStatus',
    );
    wire(builder, fetchViolations, pickViolations, (state, action) => {
      state.chargeRules.violations.items = action.payload.items;
      state.chargeRules.violations.total = action.payload.total;
    });

    // ---- treasury policy -----------------------------------------------
    wire(builder, fetchTreasuryPolicy, pickPolicy, (state, action) => {
      state.treasuryPolicy.data = action.payload;
      state.treasuryPolicy.draft = { ...action.payload };
      state.treasuryPolicy.dirty = false;
    });
    wire(
      builder,
      saveTreasuryPolicy,
      pickPolicy,
      (state, action) => {
        state.treasuryPolicy.data = action.payload;
        state.treasuryPolicy.draft = { ...action.payload };
        state.treasuryPolicy.dirty = false;
      },
      'saveStatus',
    );
    wire(
      builder,
      runSimulation,
      pickPolicy,
      (state, action) => {
        state.treasuryPolicy.simulation = action.payload;
      },
      'simulationStatus',
    );

    // ---- bulk refresh --------------------------------------------------
    wire(
      builder,
      previewRefresh,
      pickRefresh,
      (state, action) => {
        state.bulkRefresh.preview = action.payload;
      },
      'previewStatus',
    );
    wire(
      builder,
      startRefresh,
      pickRefresh,
      (state, action) => {
        state.bulkRefresh.activeJob = action.payload;
        state.bulkRefresh.preview = null;
      },
      'actionStatus',
    );
    wire(
      builder,
      cancelRefresh,
      pickRefresh,
      (state, action) => {
        state.bulkRefresh.activeJob = action.payload;
      },
      'actionStatus',
    );
    builder.addCase(pollRefreshJob.fulfilled, (state, action) => {
      state.bulkRefresh.activeJob = action.payload;
    });
    wire(builder, fetchRefreshJobs, pickJobs, (state, action) => {
      state.bulkRefresh.jobs.items = action.payload.items;
      state.bulkRefresh.jobs.total = action.payload.total;
    });
  },
});

export const {
  setSelectedMetal,
  setHistoryQuery,
  setIncidentFilters,
  setIncidentPage,
  setIncidentPageSize,
  setOverrideSearch,
  setOverrideFilters,
  setOverridePage,
  setOverridePageSize,
  clearOverrideFilters,
  setOverrideDraftField,
  resetOverrideDraft,
  setFactorDraftValue,
  resetFactorDraft,
  setDefaultsDraftField,
  setCategoryDraftField,
  resetChargeDraft,
  setPolicyDraftField,
  resetPolicyDraft,
  setMovePercent,
  setRefreshScope,
  setJobFilters,
  setJobPage,
  setJobPageSize,
  clearActiveJob,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectPricing = (state) => state.pricing;

const simpleViewState = (status, hasData) =>
  status === 'failed'
    ? 'error'
    : status === 'loading' || status === 'idle'
      ? 'loading'
      : hasData
        ? 'populated'
        : 'empty';

export const selectRateBoard = createSelector([selectPricing], ({ rateBoard }) => {
  const visible = rateBoard.selectedMetal
    ? rateBoard.items.filter((rate) => rate.metal === rateBoard.selectedMetal)
    : rateBoard.items;

  return {
    rates: visible,
    metalOptions: [...new Set(rateBoard.items.map((rate) => rate.metal))].map((metal) => ({
      value: metal,
      label: rateBoard.items.find((rate) => rate.metal === metal).metalLabel,
    })),
    selectedMetal: rateBoard.selectedMetal,
    source: rateBoard.source,
    capturedAt: rateBoard.capturedAt,
    nextRefreshAt: rateBoard.nextRefreshAt,
    stale: rateBoard.stale,
    activeOverrideCount: rateBoard.activeOverrideCount,
    // A quoted rate sitting far from its nominal purity ratio means the feed
    // is publishing something odd. Surfaced rather than passed through.
    flaggedCount: visible.filter((rate) => rate.beyondTolerance).length,
    viewState: simpleViewState(rateBoard.status, visible.length > 0),
    refreshStatus: rateBoard.refreshStatus,
    refreshError: rateBoard.refreshError,
    error: rateBoard.error,
  };
});

export const selectFeedHealth = createSelector([selectPricing], ({ feedHealth }) => {
  const primary = feedHealth.feeds.find((feed) => feed.isPrimary) ?? null;

  return {
    feeds: feedHealth.feeds,
    primary,
    history: feedHealth.history,
    historySummary: feedHealth.historySummary,
    historyQuery: feedHealth.historyQuery,
    historyViewState: simpleViewState(feedHealth.historyStatus, feedHealth.history.length > 0),
    incidents: feedHealth.incidents.items,
    incidentsTotal: feedHealth.incidents.total,
    incidentsQuery: feedHealth.incidents.query,
    incidentsViewState: listViewState({
      status: feedHealth.incidents.status,
      items: feedHealth.incidents.items,
      query: feedHealth.incidents.query,
    }),
    openIncidents: feedHealth.incidents.items.filter((incident) => !incident.endedAt).length,
    testingFeedId: feedHealth.testingFeedId,
    testStatus: feedHealth.testStatus,
    testError: feedHealth.testError,
    viewState: simpleViewState(feedHealth.status, feedHealth.feeds.length > 0),
    error: feedHealth.error,
  };
});

export const selectRateOverrides = createSelector(
  [selectPricing],
  ({ overrides, rateBoard }) => ({
    overrides: overrides.items,
    total: overrides.total,
    query: overrides.query,
    draft: overrides.draft,
    active: overrides.items.filter((row) => row.state === 'active'),
    // The rate the draft is measured against, so the form can show the
    // deviation before it is submitted rather than after it is rejected.
    currentRate:
      rateBoard.items.find(
        (rate) =>
          rate.metal === overrides.draft.metal &&
          String(rate.purity) === String(overrides.draft.purity),
      ) ?? null,
    rateOptions: rateBoard.items.map((rate) => ({
      value: `${rate.metal}:${rate.purity}`,
      label: `${rate.metalLabel} ${rate.purityLabel}`,
    })),
    viewState: listViewState({
      status: overrides.status,
      items: overrides.items,
      query: { search: overrides.query.search, filters: overrides.query.filters },
    }),
    saveStatus: overrides.saveStatus,
    saveError: overrides.saveError,
    error: overrides.error,
  }),
);

export const selectPurityFactors = createSelector([selectPricing], ({ purityFactors }) => ({
  factors: purityFactors.draft ?? [],
  saved: purityFactors.items,
  referenceRates: purityFactors.referenceRates,
  dirty: purityFactors.dirty,
  // A factor away from its nominal purity ratio silently moves every price
  // that uses it, so the count is surfaced at the top of the screen.
  customCount: (purityFactors.draft ?? []).filter(
    (row) => Number(row.factor).toFixed(6) !== Number(row.nominalFactor).toFixed(6),
  ).length,
  viewState: simpleViewState(purityFactors.status, (purityFactors.draft ?? []).length > 0),
  saveStatus: purityFactors.saveStatus,
  saveError: purityFactors.saveError,
  error: purityFactors.error,
}));

export const selectChargeRules = createSelector([selectPricing], ({ chargeRules }) => ({
  defaults: chargeRules.draft?.defaults ?? null,
  categories: chargeRules.draft?.categories ?? [],
  savedDefaults: chargeRules.defaults,
  dirty: chargeRules.dirty,
  violations: chargeRules.violations.items,
  violationsTotal: chargeRules.violations.total,
  violationsViewState: simpleViewState(
    chargeRules.violations.status,
    chargeRules.violations.items.length > 0,
  ),
  viewState: simpleViewState(chargeRules.status, Boolean(chargeRules.draft)),
  saveStatus: chargeRules.saveStatus,
  saveError: chargeRules.saveError,
  error: chargeRules.error,
}));

export const selectTreasuryPolicy = createSelector([selectPricing], ({ treasuryPolicy }) => ({
  policy: treasuryPolicy.draft,
  saved: treasuryPolicy.data,
  dirty: treasuryPolicy.dirty,
  movePercent: treasuryPolicy.movePercent,
  simulation: treasuryPolicy.simulation,
  simulationStatus: treasuryPolicy.simulationStatus,
  simulationError: treasuryPolicy.simulationError,
  viewState: simpleViewState(treasuryPolicy.status, Boolean(treasuryPolicy.draft)),
  saveStatus: treasuryPolicy.saveStatus,
  saveError: treasuryPolicy.saveError,
  error: treasuryPolicy.error,
}));

export const selectBulkRefresh = createSelector(
  [selectPricing],
  ({ bulkRefresh, rateBoard }) => ({
    scope: bulkRefresh.scope,
    preview: bulkRefresh.preview,
    previewStatus: bulkRefresh.previewStatus,
    previewError: bulkRefresh.previewError,
    activeJob: bulkRefresh.activeJob,
    isRunning: bulkRefresh.activeJob?.status === 'running',
    jobs: bulkRefresh.jobs.items,
    jobsTotal: bulkRefresh.jobs.total,
    jobsQuery: bulkRefresh.jobs.query,
    jobsViewState: listViewState({
      status: bulkRefresh.jobs.status,
      items: bulkRefresh.jobs.items,
      query: bulkRefresh.jobs.query,
    }),
    // Repricing off a stale quote is worse than leaving the catalogue alone,
    // so the screen blocks itself rather than letting the API refuse later.
    ratesStale: rateBoard.stale,
    actionStatus: bulkRefresh.actionStatus,
    actionError: bulkRefresh.actionError,
  }),
);

export default slice.reducer;
