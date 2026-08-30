// GST, e-invoicing and tax reporting - ADM-053, ADM-059, ADM-060, ADM-061.
//
// Four sections, each with its own status and error. They do not share a
// loading flag because they do not share a screen.
//
// Selectors at the foot of the file are the seam - a screen reads exactly one
// of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { STATUS, listViewState } from '@/store/createListSlice';
import * as taxApi from '@/services/mock/taxApi';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code
// (irn_cancellation_window_closed renders against the cancel button, not as a
// page error) and render the message.
function apiThunk(name, fetcher) {
  return createAsyncThunk(`tax/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fetcher(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

function queryThunk(name, fetcher, pickQuery) {
  return createAsyncThunk(`tax/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fetcher(pickQuery(getState().tax));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchEinvoices = queryThunk('fetchEinvoices', taxApi.listEinvoices, (s) => s.einvoices.query);
export const fetchEinvoiceSummary = queryThunk('fetchEinvoiceSummary', taxApi.getEinvoiceSummary, (s) => ({
  period: s.einvoices.query.filters.period,
}));
export const fetchEinvoice = apiThunk('fetchEinvoice', taxApi.getEinvoice);
export const cancelIrn = apiThunk('cancelIrn', taxApi.cancelIrn);

export const fetchIrnFailures = queryThunk('fetchIrnFailures', taxApi.listIrnFailures, (s) => s.irnFailures.query);
export const retryIrn = apiThunk('retryIrn', taxApi.retryIrn);

export const fetchEwayBills = queryThunk('fetchEwayBills', taxApi.listEwayBills, (s) => s.ewayBills.query);
export const fetchEwayBillSummary = apiThunk('fetchEwayBillSummary', taxApi.getEwayBillSummary);
export const extendEwayBill = apiThunk('extendEwayBill', taxApi.extendEwayBill);

export const fetchTaxPeriods = apiThunk('fetchTaxPeriods', taxApi.listTaxPeriods);
export const fetchTcsReport = queryThunk('fetchTcsReport', taxApi.getTcsReport, (s) => ({ period: s.reports.period }));
export const fetchGstSummary = queryThunk('fetchGstSummary', taxApi.getGstSummary, (s) => ({ period: s.reports.period }));
export const exportTaxReport = apiThunk('exportTaxReport', taxApi.exportTaxReport);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const DEFAULT_EINVOICE_FILTERS = { status: '', manufacturerId: '', supplyType: '', period: '' };
export const DEFAULT_IRN_FILTERS = { failureCode: '', manufacturerId: '' };
// The e-way screen opens on what is about to lapse, because that is the only
// bucket where acting today still helps.
export const DEFAULT_EWAY_FILTERS = { state: 'expiring', transportMode: '', manufacturerId: '' };

const initialState = {
  // ADM-053
  einvoices: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'desc',
      filters: { ...DEFAULT_EINVOICE_FILTERS },
    },
    facets: { manufacturers: [], periods: [] },
    summary: null,
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    openId: null,
    current: null,
    currentStatus: STATUS.IDLE,
    currentError: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-059
  irnFailures: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'desc',
      filters: { ...DEFAULT_IRN_FILTERS },
    },
    failedValue: 0,
    facets: { failureCodes: [] },
    selectedIds: [],
    actionStatus: STATUS.IDLE,
    actionError: null,
    // The portal rejects a recipient GSTIN problem again however many times it
    // is asked, so the screen has to be able to say which retries did nothing.
    stillFailing: [],
  },

  // ADM-060
  ewayBills: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: null,
      sortDir: 'asc',
      filters: { ...DEFAULT_EWAY_FILTERS },
    },
    facets: { manufacturers: [] },
    summary: null,
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    extendingId: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-061
  reports: {
    period: null,
    periods: [],
    periodsStatus: STATUS.IDLE,
    periodsError: null,
    tcs: null,
    tcsStatus: STATUS.IDLE,
    tcsError: null,
    gst: null,
    gstStatus: STATUS.IDLE,
    gstError: null,
    exportStatus: STATUS.IDLE,
    exportError: null,
    lastExport: null,
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

const pickEinvoices = (s) => s.einvoices;
const pickIrn = (s) => s.irnFailures;
const pickEway = (s) => s.ewayBills;
const pickReports = (s) => s.reports;

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

const invoiceQ = queryReducers(pickEinvoices, DEFAULT_EINVOICE_FILTERS);
const irnQ = queryReducers(pickIrn, DEFAULT_IRN_FILTERS);
const ewayQ = queryReducers(pickEway, DEFAULT_EWAY_FILTERS);

const slice = createSlice({
  name: 'tax',
  initialState,
  reducers: {
    setEinvoiceFilters: invoiceQ.setFilters,
    setEinvoiceSearch: invoiceQ.setSearch,
    setEinvoiceSort: invoiceQ.setSort,
    setEinvoicePage: invoiceQ.setPage,
    setEinvoicePageSize: invoiceQ.setPageSize,
    clearEinvoiceFilters: invoiceQ.clear,
    openEinvoice(state, action) {
      state.einvoices.openId = action.payload;
      state.einvoices.actionError = null;
      if (action.payload === null) {
        state.einvoices.current = null;
        state.einvoices.currentStatus = STATUS.IDLE;
      }
    },

    setIrnFilters: irnQ.setFilters,
    setIrnSearch: irnQ.setSearch,
    setIrnPage: irnQ.setPage,
    setIrnPageSize: irnQ.setPageSize,
    clearIrnFilters: irnQ.clear,
    toggleIrnSelection(state, action) {
      const id = action.payload;
      state.irnFailures.selectedIds = state.irnFailures.selectedIds.includes(id)
        ? state.irnFailures.selectedIds.filter((row) => row !== id)
        : [...state.irnFailures.selectedIds, id];
    },
    setIrnSelection(state, action) {
      state.irnFailures.selectedIds = action.payload;
    },
    dismissStillFailing(state) {
      state.irnFailures.stillFailing = [];
    },

    setEwayFilters: ewayQ.setFilters,
    setEwaySearch: ewayQ.setSearch,
    setEwaySort: ewayQ.setSort,
    setEwayPage: ewayQ.setPage,
    setEwayPageSize: ewayQ.setPageSize,
    clearEwayFilters: ewayQ.clear,
    extendBill(state, action) {
      state.ewayBills.extendingId = action.payload;
      state.ewayBills.actionError = null;
    },

    setReportPeriod(state, action) {
      state.reports.period = action.payload;
    },
  },

  extraReducers: (builder) => {
    // ADM-053
    wire(builder, fetchEinvoices, pickEinvoices, (state, action) => {
      state.einvoices.items = action.payload.items;
      state.einvoices.total = action.payload.total;
      state.einvoices.facets = action.payload.facets;
    });
    wire(builder, fetchEinvoiceSummary, pickEinvoices, (state, action) => {
      state.einvoices.summary = action.payload;
    }, 'summaryStatus');
    wire(builder, fetchEinvoice, pickEinvoices, (state, action) => {
      state.einvoices.current = action.payload;
    }, 'currentStatus');
    wire(builder, cancelIrn, pickEinvoices, (state, action) => {
      state.einvoices.items = state.einvoices.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
      if (state.einvoices.current?.einvoice.id === action.payload.id) {
        state.einvoices.current.einvoice = action.payload;
      }
    }, 'actionStatus');

    // ADM-059
    wire(builder, fetchIrnFailures, pickIrn, (state, action) => {
      state.irnFailures.items = action.payload.items;
      state.irnFailures.total = action.payload.total;
      state.irnFailures.failedValue = action.payload.failedValue;
      state.irnFailures.facets = action.payload.facets;
      const visible = action.payload.items.map((row) => row.id);
      state.irnFailures.selectedIds = state.irnFailures.selectedIds.filter((id) => visible.includes(id));
    });
    wire(builder, retryIrn, pickIrn, (state, action) => {
      const updated = action.payload.updated;
      state.irnFailures.items = state.irnFailures.items.map(
        (row) => updated.find((next) => next.id === row.id) ?? row,
      );
      state.irnFailures.selectedIds = [];
      // Kept so the screen can say which retries changed nothing, rather than
      // reporting a success the portal did not give.
      state.irnFailures.stillFailing = action.payload.stillFailing;
    }, 'actionStatus');

    // ADM-060
    wire(builder, fetchEwayBills, pickEway, (state, action) => {
      state.ewayBills.items = action.payload.items;
      state.ewayBills.total = action.payload.total;
      state.ewayBills.facets = action.payload.facets;
    });
    wire(builder, fetchEwayBillSummary, pickEway, (state, action) => {
      state.ewayBills.summary = action.payload;
    }, 'summaryStatus');
    wire(builder, extendEwayBill, pickEway, (state, action) => {
      state.ewayBills.items = state.ewayBills.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
      state.ewayBills.extendingId = null;
    }, 'actionStatus');

    // ADM-061
    wire(builder, fetchTaxPeriods, pickReports, (state, action) => {
      state.reports.periods = action.payload.periods;
      state.reports.period = state.reports.period ?? action.payload.currentPeriod;
    }, 'periodsStatus');
    wire(builder, fetchTcsReport, pickReports, (state, action) => {
      state.reports.tcs = action.payload;
    }, 'tcsStatus');
    wire(builder, fetchGstSummary, pickReports, (state, action) => {
      state.reports.gst = action.payload;
    }, 'gstStatus');
    wire(builder, exportTaxReport, pickReports, (state, action) => {
      state.reports.lastExport = action.payload;
    }, 'exportStatus');
  },
});

export const {
  setEinvoiceFilters, setEinvoiceSearch, setEinvoiceSort, setEinvoicePage, setEinvoicePageSize,
  clearEinvoiceFilters, openEinvoice,
  setIrnFilters, setIrnSearch, setIrnPage, setIrnPageSize, clearIrnFilters,
  toggleIrnSelection, setIrnSelection, dismissStillFailing,
  setEwayFilters, setEwaySearch, setEwaySort, setEwayPage, setEwayPageSize, clearEwayFilters, extendBill,
  setReportPeriod,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectTax = (state) => state.tax;

// The e-way queue opens on 'expiring', so an empty result under that default
// means nothing is about to lapse rather than that the filters are too narrow.
function viewStateIgnoringDefaults(section, defaults, ignoredKeys) {
  const narrowed = Object.entries(section.query.filters).some(([key, value]) =>
    ignoredKeys.includes(key) ? value !== defaults[key] : Boolean(value),
  );

  return listViewState({
    status: section.status,
    items: section.items,
    query: { search: section.query.search, filters: narrowed ? section.query.filters : {} },
  });
}

export const selectEinvoiceConsole = createSelector([selectTax], ({ einvoices }) => ({
  einvoices: einvoices.items,
  total: einvoices.total,
  query: einvoices.query,
  error: einvoices.error,
  facets: einvoices.facets,
  summary: einvoices.summary,
  summaryState: einvoices.summaryStatus,
  viewState: listViewState(einvoices),

  openId: einvoices.openId,
  current: einvoices.current,
  currentState:
    einvoices.openId === null
      ? 'prompt'
      : listViewState({
          status: einvoices.currentStatus,
          items: einvoices.current ? [einvoices.current] : [],
          query: { search: '', filters: {} },
        }),
  actionStatus: einvoices.actionStatus,
  actionError: einvoices.actionError,

  // An order is only fully invoiced when every supplier on it has registered.
  // Anything else is partly, and a green tick over a missing document is how a
  // consignment leaves without its paperwork.
  partiallyRegistered: einvoices.summary
    ? einvoices.summary.failed + einvoices.summary.pending
    : 0,
}));

export const selectIrnFailures = createSelector([selectTax], ({ irnFailures }) => ({
  failures: irnFailures.items,
  total: irnFailures.total,
  query: irnFailures.query,
  error: irnFailures.error,
  failedValue: irnFailures.failedValue,
  facets: irnFailures.facets,
  selectedIds: irnFailures.selectedIds,
  actionStatus: irnFailures.actionStatus,
  actionError: irnFailures.actionError,
  stillFailing: irnFailures.stillFailing,
  viewState: listViewState(irnFailures),

  allSelected: irnFailures.items.length > 0 && irnFailures.selectedIds.length === irnFailures.items.length,
  someSelected: irnFailures.selectedIds.length > 0 && irnFailures.selectedIds.length < irnFailures.items.length,

  // A recipient GSTIN problem is not fixed by asking the portal again, so the
  // screen warns before the desk spends a morning retrying.
  selectedNeedingJeweller: irnFailures.items.filter(
    (row) => irnFailures.selectedIds.includes(row.id) && ['2172', '3028'].includes(row.failureCode),
  ).length,
}));

export const selectEwayBills = createSelector([selectTax], ({ ewayBills }) => ({
  bills: ewayBills.items,
  total: ewayBills.total,
  query: ewayBills.query,
  error: ewayBills.error,
  facets: ewayBills.facets,
  summary: ewayBills.summary,
  summaryState: ewayBills.summaryStatus,
  extendingId: ewayBills.extendingId,
  actionStatus: ewayBills.actionStatus,
  actionError: ewayBills.actionError,
  viewState: viewStateIgnoringDefaults(ewayBills, DEFAULT_EWAY_FILTERS, ['state']),

  // A bill can only be extended inside eight hours of expiry, so the button is
  // offered on exactly those rows and nowhere else.
  extendableIds: ewayBills.items.filter((row) => row.state === 'expiring').map((row) => row.id),
}));

export const selectTaxReports = createSelector([selectTax], ({ reports }) => ({
  period: reports.period,
  periods: reports.periods,
  periodsState: reports.periodsStatus,
  tcs: reports.tcs,
  tcsState: reports.tcsStatus,
  tcsError: reports.tcsError,
  gst: reports.gst,
  gstState: reports.gstStatus,
  gstError: reports.gstError,
  exportStatus: reports.exportStatus,
  exportError: reports.exportError,
  lastExport: reports.lastExport,

  viewState: reports.tcs ? 'populated' : reports.tcsStatus === STATUS.FAILED ? 'error' : 'loading',

  // A month that can still take supplies cannot be filed from, and the screen
  // needs to know before it offers the button.
  canFile: reports.tcs?.period?.gstr8Status !== 'open',
  outstandingTcs: reports.tcs ? reports.tcs.period.tcsCollected - reports.tcs.period.tcsRemitted : 0,
}));

export default slice.reducer;
