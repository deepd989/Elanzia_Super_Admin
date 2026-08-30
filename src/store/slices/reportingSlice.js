// Reporting, exports, privacy and platform settings - ADM-092 to ADM-099.
//
// Nine sections, each with its own status and error. They do not share a
// loading flag because they do not share a screen, and the two compliance
// sections must never be blocked by a dashboard that is still drawing.
//
// Selectors at the foot of the file are the seam - a screen reads exactly one
// of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { STATUS, listViewState } from '@/store/createListSlice';
import * as reportingApi from '@/services/mock/reportingApi';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code (export_expired renders
// against one row's download button, not as a page error) and render the
// message. fieldErrors rides along for the settings form, which needs to put
// the failure next to the field that caused it.
function apiThunk(name, fetcher) {
  return createAsyncThunk(`reporting/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fetcher(arg);
    } catch (error) {
      return rejectWithValue({
        code: error.code ?? 'unknown',
        message: error.message,
        fieldErrors: error.fieldErrors ?? null,
      });
    }
  });
}

function queryThunk(name, fetcher, pickQuery) {
  return createAsyncThunk(`reporting/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fetcher(pickQuery(getState().reporting));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchOverview = queryThunk('fetchOverview', reportingApi.getReportsOverview, (s) => ({
  period: s.overview.period,
}));

export const fetchMarketplaceMetrics = queryThunk(
  'fetchMarketplaceMetrics',
  reportingApi.getMarketplaceMetrics,
  (s) => s.marketplace.query,
);

export const fetchFinancialReport = queryThunk(
  'fetchFinancialReport',
  reportingApi.getFinancialReport,
  (s) => s.financial.query,
);

export const fetchManufacturerPerformance = queryThunk(
  'fetchManufacturerPerformance',
  reportingApi.listManufacturerPerformance,
  (s) => s.manufacturerPerformance.query,
);
export const fetchPerformanceSummary = apiThunk(
  'fetchPerformanceSummary',
  reportingApi.getManufacturerPerformanceSummary,
);

export const fetchExportDatasets = apiThunk('fetchExportDatasets', reportingApi.getExportDatasets);
export const fetchExportJobs = queryThunk('fetchExportJobs', reportingApi.listExportJobs, (s) => s.exports.query);
export const submitExportRequest = apiThunk('submitExportRequest', reportingApi.requestExport);
export const cancelExport = apiThunk('cancelExport', reportingApi.cancelExportJob);
export const retryExport = apiThunk('retryExport', reportingApi.retryExportJob);
export const requestExportDownload = apiThunk('requestExportDownload', reportingApi.getExportDownloadUrl);

export const fetchDataRequests = queryThunk('fetchDataRequests', reportingApi.listDataRequests, (s) => s.dataRequests.query);
export const fetchDataRequestSummary = apiThunk('fetchDataRequestSummary', reportingApi.getDataRequestSummary);
export const submitDataRequestDecision = apiThunk('submitDataRequestDecision', reportingApi.recordDataRequestDecision);
export const fetchConsents = queryThunk('fetchConsents', reportingApi.listConsentRecords, (s) => s.consents.query);

export const fetchAuditEntries = queryThunk('fetchAuditEntries', reportingApi.listAuditEntries, (s) => s.auditLog.query);
export const fetchAuditEntry = apiThunk('fetchAuditEntry', reportingApi.getAuditEntry);

export const fetchSystemSettings = apiThunk('fetchSystemSettings', reportingApi.getSystemSettings);
export const saveSettings = apiThunk('saveSettings', reportingApi.saveSystemSettings);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const DEFAULT_MARKETPLACE_FILTERS = { city: '', category: '' };
export const DEFAULT_FINANCIAL_FILTERS = { basis: 'accrual' };
export const DEFAULT_PERFORMANCE_FILTERS = { city: '', badgeState: '', gmvBand: '' };
export const DEFAULT_EXPORT_FILTERS = { datasetId: '', status: '', requestedById: '' };
// The privacy queue opens on everything, sorted by deadline. Filtering it to
// breached by default would hide the ones that are about to breach, which is
// the only group where acting today still helps.
export const DEFAULT_DATA_REQUEST_FILTERS = { type: '', status: '', subjectType: '', slaState: '' };
export const DEFAULT_CONSENT_FILTERS = { purpose: '', state: '', subjectType: '' };
export const DEFAULT_AUDIT_FILTERS = { module: '', action: '', actorId: '', severity: '', from: '', to: '' };

const initialState = {
  // ADM-092
  overview: {
    period: 'last_90_days',
    headline: null,
    gmvSeries: [],
    funnel: [],
    attention: [],
    savedReports: [],
    refreshedAt: null,
    status: STATUS.IDLE,
    error: null,
  },

  // ADM-093
  marketplace: {
    metrics: null,
    gmvByMonth: [],
    listingCounts: null,
    topCategories: [],
    cityBreakdown: [],
    facets: null,
    query: { period: 'last_12_months', filters: { ...DEFAULT_MARKETPLACE_FILTERS } },
    status: STATUS.IDLE,
    error: null,
  },

  // ADM-094
  financial: {
    summary: null,
    periods: [],
    settlementAgeing: [],
    gstSummary: null,
    query: { period: 'financial_ytd', filters: { ...DEFAULT_FINANCIAL_FILTERS } },
    status: STATUS.IDLE,
    error: null,
  },

  // ADM-098
  manufacturerPerformance: {
    items: [],
    total: 0,
    facets: null,
    thresholds: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'desc',
      filters: { ...DEFAULT_PERFORMANCE_FILTERS },
    },
    summary: null,
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    status: STATUS.IDLE,
    error: null,
  },

  // ADM-095
  exports: {
    items: [],
    total: 0,
    facets: null,
    retentionDays: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'desc',
      filters: { ...DEFAULT_EXPORT_FILTERS },
    },
    datasets: [],
    datasetsStatus: STATUS.IDLE,
    datasetsError: null,
    draft: { datasetId: '', period: '', format: 'csv' },
    // The URL the last download handed back. It is short lived, so it is not
    // persisted anywhere - the screen opens it and forgets it.
    lastDownload: null,
    status: STATUS.IDLE,
    error: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-096 - two tabs, two independent lists, one decision
  dataRequests: {
    items: [],
    total: 0,
    facets: null,
    responseDays: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'asc',
      filters: { ...DEFAULT_DATA_REQUEST_FILTERS },
    },
    summary: null,
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    openId: null,
    decisionDraft: { outcome: '', note: '', identityVerified: false },
    status: STATUS.IDLE,
    error: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },
  consents: {
    items: [],
    total: 0,
    facets: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'desc',
      filters: { ...DEFAULT_CONSENT_FILTERS },
    },
    status: STATUS.IDLE,
    error: null,
  },

  // ADM-099
  auditLog: {
    items: [],
    total: 0,
    facets: null,
    retentionMonths: null,
    query: {
      page: 1,
      pageSize: 25,
      search: '',
      sortBy: null,
      sortDir: 'desc',
      filters: { ...DEFAULT_AUDIT_FILTERS },
    },
    openId: null,
    entry: null,
    entryStatus: STATUS.IDLE,
    entryError: null,
    status: STATUS.IDLE,
    error: null,
  },

  // ADM-097
  settings: {
    groups: [],
    values: null,
    draft: {},
    changeReason: '',
    fieldErrors: {},
    updatedAt: null,
    updatedByName: null,
    lastAuditEntryId: null,
    status: STATUS.IDLE,
    error: null,
    saveStatus: STATUS.IDLE,
    saveError: null,
  },
};

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

const pickOverview = (s) => s.overview;
const pickMarketplace = (s) => s.marketplace;
const pickFinancial = (s) => s.financial;
const pickPerformance = (s) => s.manufacturerPerformance;
const pickExports = (s) => s.exports;
const pickDataRequests = (s) => s.dataRequests;
const pickConsents = (s) => s.consents;
const pickAudit = (s) => s.auditLog;
const pickSettings = (s) => s.settings;

function queryReducers(section, defaults) {
  return {
    setFilters: (state, action) => {
      section(state).query.filters = action.payload;
      section(state).query.page = 1;
    },
    setSearch: (state, action) => {
      section(state).query.search = action.payload;
      section(state).query.page = 1;
    },
    setSort: (state, action) => {
      section(state).query.sortBy = action.payload.sortBy;
      section(state).query.sortDir = action.payload.sortDir;
    },
    setPage: (state, action) => {
      section(state).query.page = action.payload;
    },
    setPageSize: (state, action) => {
      section(state).query.pageSize = action.payload;
      section(state).query.page = 1;
    },
    clear: (state) => {
      section(state).query.filters = { ...defaults };
      section(state).query.search = '';
      section(state).query.page = 1;
    },
  };
}

const performanceQ = queryReducers(pickPerformance, DEFAULT_PERFORMANCE_FILTERS);
const exportQ = queryReducers(pickExports, DEFAULT_EXPORT_FILTERS);
const dataRequestQ = queryReducers(pickDataRequests, DEFAULT_DATA_REQUEST_FILTERS);
const consentQ = queryReducers(pickConsents, DEFAULT_CONSENT_FILTERS);
const auditQ = queryReducers(pickAudit, DEFAULT_AUDIT_FILTERS);

const slice = createSlice({
  name: 'reporting',
  initialState,
  reducers: {
    setOverviewPeriod(state, action) {
      state.overview.period = action.payload;
    },
    setMarketplacePeriod(state, action) {
      state.marketplace.query.period = action.payload;
    },
    setMarketplaceFilters(state, action) {
      state.marketplace.query.filters = action.payload;
    },
    clearMarketplaceFilters(state) {
      state.marketplace.query.filters = { ...DEFAULT_MARKETPLACE_FILTERS };
    },
    setFinancialPeriod(state, action) {
      state.financial.query.period = action.payload;
    },
    setFinancialBasis(state, action) {
      state.financial.query.filters.basis = action.payload;
    },

    setPerformanceFilters: performanceQ.setFilters,
    setPerformanceSearch: performanceQ.setSearch,
    setPerformanceSort: performanceQ.setSort,
    setPerformancePage: performanceQ.setPage,
    setPerformancePageSize: performanceQ.setPageSize,
    clearPerformanceFilters: performanceQ.clear,

    setExportFilters: exportQ.setFilters,
    setExportSearch: exportQ.setSearch,
    setExportSort: exportQ.setSort,
    setExportPage: exportQ.setPage,
    setExportPageSize: exportQ.setPageSize,
    clearExportFilters: exportQ.clear,
    setExportDraft(state, action) {
      Object.assign(state.exports.draft, action.payload);
      state.exports.actionError = null;
    },
    resetExportDraft(state) {
      state.exports.draft = { datasetId: '', period: '', format: 'csv' };
      state.exports.actionError = null;
    },
    dismissDownload(state) {
      state.exports.lastDownload = null;
    },

    setDataRequestFilters: dataRequestQ.setFilters,
    setDataRequestSearch: dataRequestQ.setSearch,
    setDataRequestSort: dataRequestQ.setSort,
    setDataRequestPage: dataRequestQ.setPage,
    setDataRequestPageSize: dataRequestQ.setPageSize,
    clearDataRequestFilters: dataRequestQ.clear,
    openDataRequest(state, action) {
      state.dataRequests.openId = action.payload;
      state.dataRequests.actionError = null;
      state.dataRequests.decisionDraft = { outcome: '', note: '', identityVerified: false };
    },
    setDecisionDraft(state, action) {
      Object.assign(state.dataRequests.decisionDraft, action.payload);
      state.dataRequests.actionError = null;
    },

    setConsentFilters: consentQ.setFilters,
    setConsentSearch: consentQ.setSearch,
    setConsentSort: consentQ.setSort,
    setConsentPage: consentQ.setPage,
    setConsentPageSize: consentQ.setPageSize,
    clearConsentFilters: consentQ.clear,

    setAuditFilters: auditQ.setFilters,
    setAuditSearch: auditQ.setSearch,
    setAuditSort: auditQ.setSort,
    setAuditPage: auditQ.setPage,
    setAuditPageSize: auditQ.setPageSize,
    clearAuditFilters: auditQ.clear,
    openAuditEntry(state, action) {
      state.auditLog.openId = action.payload;
      if (action.payload === null) {
        state.auditLog.entry = null;
        state.auditLog.entryStatus = STATUS.IDLE;
      }
    },

    setSettingValue(state, action) {
      const { key, value } = action.payload;
      state.settings.draft[key] = value;
      delete state.settings.fieldErrors[key];
      state.settings.saveError = null;
    },
    setChangeReason(state, action) {
      state.settings.changeReason = action.payload;
      state.settings.saveError = null;
    },
    resetSettingsDraft(state) {
      state.settings.draft = {};
      state.settings.changeReason = '';
      state.settings.fieldErrors = {};
      state.settings.saveError = null;
    },
  },

  extraReducers: (builder) => {
    // ADM-092
    wire(builder, fetchOverview, pickOverview, (state, action) => {
      Object.assign(state.overview, action.payload);
    });

    // ADM-093
    wire(builder, fetchMarketplaceMetrics, pickMarketplace, (state, action) => {
      const { period, ...rest } = action.payload;
      Object.assign(state.marketplace, rest);
    });

    // ADM-094
    wire(builder, fetchFinancialReport, pickFinancial, (state, action) => {
      const { period, basis, ...rest } = action.payload;
      Object.assign(state.financial, rest);
    });

    // ADM-098
    wire(builder, fetchManufacturerPerformance, pickPerformance, (state, action) => {
      state.manufacturerPerformance.items = action.payload.items;
      state.manufacturerPerformance.total = action.payload.total;
      state.manufacturerPerformance.facets = action.payload.facets;
      state.manufacturerPerformance.thresholds = action.payload.thresholds;
    });
    wire(builder, fetchPerformanceSummary, pickPerformance, (state, action) => {
      state.manufacturerPerformance.summary = action.payload;
    }, 'summaryStatus');

    // ADM-095
    wire(builder, fetchExportJobs, pickExports, (state, action) => {
      state.exports.items = action.payload.items;
      state.exports.total = action.payload.total;
      state.exports.facets = action.payload.facets;
      state.exports.retentionDays = action.payload.retentionDays;
    });
    wire(builder, fetchExportDatasets, pickExports, (state, action) => {
      state.exports.datasets = action.payload.items;
    }, 'datasetsStatus');
    wire(builder, submitExportRequest, pickExports, (state, action) => {
      state.exports.items = [action.payload, ...state.exports.items];
      state.exports.total += 1;
      state.exports.draft = { datasetId: '', period: '', format: 'csv' };
    }, 'actionStatus');
    wire(builder, cancelExport, pickExports, (state, action) => {
      state.exports.items = state.exports.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'actionStatus');
    wire(builder, retryExport, pickExports, (state, action) => {
      state.exports.items = state.exports.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'actionStatus');
    wire(builder, requestExportDownload, pickExports, (state, action) => {
      state.exports.lastDownload = action.payload;
    }, 'actionStatus');

    // ADM-096
    wire(builder, fetchDataRequests, pickDataRequests, (state, action) => {
      state.dataRequests.items = action.payload.items;
      state.dataRequests.total = action.payload.total;
      state.dataRequests.facets = action.payload.facets;
      state.dataRequests.responseDays = action.payload.responseDays;
    });
    wire(builder, fetchDataRequestSummary, pickDataRequests, (state, action) => {
      state.dataRequests.summary = action.payload;
    }, 'summaryStatus');
    wire(builder, submitDataRequestDecision, pickDataRequests, (state, action) => {
      state.dataRequests.items = state.dataRequests.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
      state.dataRequests.openId = null;
      state.dataRequests.decisionDraft = { outcome: '', note: '', identityVerified: false };
    }, 'actionStatus');
    wire(builder, fetchConsents, pickConsents, (state, action) => {
      state.consents.items = action.payload.items;
      state.consents.total = action.payload.total;
      state.consents.facets = action.payload.facets;
    });

    // ADM-099
    wire(builder, fetchAuditEntries, pickAudit, (state, action) => {
      state.auditLog.items = action.payload.items;
      state.auditLog.total = action.payload.total;
      state.auditLog.facets = action.payload.facets;
      state.auditLog.retentionMonths = action.payload.retentionMonths;
    });
    wire(builder, fetchAuditEntry, pickAudit, (state, action) => {
      state.auditLog.entry = action.payload;
    }, 'entryStatus');

    // ADM-097
    wire(builder, fetchSystemSettings, pickSettings, (state, action) => {
      state.settings.groups = action.payload.groups;
      state.settings.values = action.payload.values;
      state.settings.updatedAt = action.payload.updatedAt;
      state.settings.updatedByName = action.payload.updatedByName;
      state.settings.draft = {};
      state.settings.fieldErrors = {};
    });
    builder
      .addCase(saveSettings.pending, (state) => {
        state.settings.saveStatus = STATUS.LOADING;
        state.settings.saveError = null;
        state.settings.fieldErrors = {};
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.settings.saveStatus = STATUS.SUCCEEDED;
        state.settings.values = action.payload.values;
        state.settings.updatedAt = action.payload.updatedAt;
        state.settings.updatedByName = action.payload.updatedByName;
        state.settings.lastAuditEntryId = action.payload.auditEntryId;
        state.settings.draft = {};
        state.settings.changeReason = '';
      })
      .addCase(saveSettings.rejected, (state, action) => {
        state.settings.saveStatus = STATUS.FAILED;
        state.settings.saveError = action.payload ?? {
          code: 'unknown',
          message: action.error.message,
        };
        // A per-field failure belongs against the field, not in a banner the
        // operator has to map back onto twenty-seven inputs themselves.
        state.settings.fieldErrors = action.payload?.fieldErrors ?? {};
      });
  },
});

export const {
  setOverviewPeriod,
  setMarketplacePeriod, setMarketplaceFilters, clearMarketplaceFilters,
  setFinancialPeriod, setFinancialBasis,
  setPerformanceFilters, setPerformanceSearch, setPerformanceSort, setPerformancePage,
  setPerformancePageSize, clearPerformanceFilters,
  setExportFilters, setExportSearch, setExportSort, setExportPage, setExportPageSize,
  clearExportFilters, setExportDraft, resetExportDraft, dismissDownload,
  setDataRequestFilters, setDataRequestSearch, setDataRequestSort, setDataRequestPage,
  setDataRequestPageSize, clearDataRequestFilters, openDataRequest, setDecisionDraft,
  setConsentFilters, setConsentSearch, setConsentSort, setConsentPage, setConsentPageSize,
  clearConsentFilters,
  setAuditFilters, setAuditSearch, setAuditSort, setAuditPage, setAuditPageSize,
  clearAuditFilters, openAuditEntry,
  setSettingValue, setChangeReason, resetSettingsDraft,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectReporting = (state) => state.reporting;

// A dashboard section has no items array and no filters, so listViewState has
// nothing to read. This collapses the same statuses into the same four words
// so a dashboard and a queue never drift apart in what 'empty' means.
function simpleViewState(status, hasData) {
  if (status === STATUS.FAILED) return 'error';
  if (hasData) return 'populated';
  if (status === STATUS.SUCCEEDED) return 'empty';
  return 'loading';
}

export const selectReportsOverview = createSelector([selectReporting], ({ overview }) => ({
  period: overview.period,
  headline: overview.headline,
  gmvSeries: overview.gmvSeries,
  funnel: overview.funnel,
  attention: overview.attention,
  savedReports: overview.savedReports,
  refreshedAt: overview.refreshedAt,
  error: overview.error,
  viewState: simpleViewState(overview.status, Boolean(overview.headline)),

  // Only the queues with something in them are worth putting in front of
  // somebody. A row reading zero is noise on a landing screen.
  attentionNeeded: overview.attention.filter((item) => item.count > 0),
}));

export const selectMarketplaceMetrics = createSelector([selectReporting], ({ marketplace }) => ({
  metrics: marketplace.metrics,
  gmvByMonth: marketplace.gmvByMonth,
  listingCounts: marketplace.listingCounts,
  topCategories: marketplace.topCategories,
  cityBreakdown: marketplace.cityBreakdown,
  facets: marketplace.facets,
  query: marketplace.query,
  error: marketplace.error,
  viewState: simpleViewState(marketplace.status, Boolean(marketplace.metrics)),
}));

export const selectFinancialReport = createSelector([selectReporting], ({ financial }) => ({
  summary: financial.summary,
  periods: financial.periods,
  settlementAgeing: financial.settlementAgeing,
  gstSummary: financial.gstSummary,
  query: financial.query,
  error: financial.error,
  viewState: simpleViewState(financial.status, Boolean(financial.summary)),

  // Commission is the only figure on this screen Elanzia may call revenue.
  // Everything else is other people's money in transit, and the tile that
  // shows the nodal balance says so.
  commissionByMonth: financial.periods.map((row) => ({
    month: row.month,
    label: row.label,
    gmv: row.gmv,
    commission: row.commission,
  })),
}));

export const selectManufacturerPerformance = createSelector(
  [selectReporting],
  ({ manufacturerPerformance }) => ({
    rows: manufacturerPerformance.items,
    total: manufacturerPerformance.total,
    query: manufacturerPerformance.query,
    facets: manufacturerPerformance.facets,
    thresholds: manufacturerPerformance.thresholds,
    summary: manufacturerPerformance.summary,
    summaryState: manufacturerPerformance.summaryStatus,
    error: manufacturerPerformance.error,
    viewState: listViewState(manufacturerPerformance),
  }),
);

export const selectExportCentre = createSelector([selectReporting], ({ exports }) => {
  const dataset = exports.datasets.find((row) => row.id === exports.draft.datasetId) ?? null;

  return {
    jobs: exports.items,
    total: exports.total,
    query: exports.query,
    facets: exports.facets,
    retentionDays: exports.retentionDays,
    datasets: exports.datasets,
    datasetsState: exports.datasetsStatus,
    draft: exports.draft,
    selectedDataset: dataset,
    lastDownload: exports.lastDownload,
    error: exports.error,
    actionStatus: exports.actionStatus,
    actionError: exports.actionError,
    viewState: listViewState(exports),

    // A dataset that supports a period needs one before the request is worth
    // sending. An unbounded pull of the order book is how an export times out
    // at three in the morning.
    canSubmit: Boolean(dataset) && (!dataset.supportsPeriod || Boolean(exports.draft.period)),
  };
});

export const selectDataRequestQueue = createSelector([selectReporting], ({ dataRequests, consents }) => {
  const open = dataRequests.items.find((row) => row.id === dataRequests.openId) ?? null;
  const draft = dataRequests.decisionDraft;
  // Rejecting without a written reason leaves a data principal who cannot tell
  // what to do next, so the note is required for everything except a clean
  // fulfil. Identity is required before either.
  const noteRequired = draft.outcome !== '' && draft.outcome !== 'fulfil';
  const identityRequired = ['fulfil', 'reject'].includes(draft.outcome);

  return {
    requests: dataRequests.items,
    total: dataRequests.total,
    query: dataRequests.query,
    facets: dataRequests.facets,
    responseDays: dataRequests.responseDays,
    summary: dataRequests.summary,
    summaryState: dataRequests.summaryStatus,
    error: dataRequests.error,
    viewState: listViewState(dataRequests),

    openRequest: open,
    decisionDraft: draft,
    actionStatus: dataRequests.actionStatus,
    actionError: dataRequests.actionError,
    canDecide:
      Boolean(open) &&
      draft.outcome !== '' &&
      (!noteRequired || draft.note.trim().length > 0) &&
      (!identityRequired || draft.identityVerified),

    consents: consents.items,
    consentTotal: consents.total,
    consentQuery: consents.query,
    consentFacets: consents.facets,
    consentError: consents.error,
    consentViewState: listViewState(consents),
  };
});

export const selectAuditLog = createSelector([selectReporting], ({ auditLog }) => ({
  entries: auditLog.items,
  total: auditLog.total,
  query: auditLog.query,
  facets: auditLog.facets,
  retentionMonths: auditLog.retentionMonths,
  error: auditLog.error,
  viewState: listViewState(auditLog),

  openId: auditLog.openId,
  entry: auditLog.entry,
  entryState: simpleViewState(auditLog.entryStatus, Boolean(auditLog.entry)),
  entryError: auditLog.entryError,
}));

export const selectSystemSettings = createSelector([selectReporting], ({ settings }) => {
  const dirtyKeys = Object.keys(settings.draft).filter(
    (key) => settings.values && settings.draft[key] !== settings.values[key],
  );
  const flatSettings = settings.groups.flatMap((group) => group.settings);

  return {
    groups: settings.groups,
    values: settings.values,
    draft: settings.draft,
    dirtyKeys,
    changeReason: settings.changeReason,
    fieldErrors: settings.fieldErrors,
    updatedAt: settings.updatedAt,
    updatedByName: settings.updatedByName,
    lastAuditEntryId: settings.lastAuditEntryId,
    error: settings.error,
    saveStatus: settings.saveStatus,
    saveError: settings.saveError,
    viewState: simpleViewState(settings.status, Boolean(settings.values)),

    // Every save writes an audit entry, and an entry that cannot say why is
    // half a record. The reason is required rather than encouraged.
    canSave: dirtyKeys.length > 0 && settings.changeReason.trim().length > 0,

    // Changing one of these moves money, changes who can do what, or shortens
    // how long the platform can answer for itself, so the screen puts a
    // confirm in front of the save rather than after it.
    dirtySensitiveKeys: dirtyKeys.filter(
      (key) => flatSettings.find((setting) => setting.key === key)?.sensitive,
    ),
  };
});

export default slice.reducer;
