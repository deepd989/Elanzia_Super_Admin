// Payments, settlements and revenue configuration - ADM-050, ADM-051, ADM-052,
// ADM-054 to ADM-058, ADM-062.
//
// Nine sections, each with its own status and error. They do not share a
// loading flag because they do not share a screen, and a finance desk cannot
// have the nodal position blank itself because an unrelated poll failed.
//
// Selectors at the foot of the file are the seam - a screen reads exactly one
// of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { STATUS, listViewState } from '@/store/createListSlice';
import * as paymentsApi from '@/services/mock/paymentsApi';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code (settlement_window_open
// renders against the release button, nodal_insufficient against the balance)
// and render the message.
function apiThunk(name, fetcher) {
  return createAsyncThunk(`payments/${name}`, async (arg, { rejectWithValue }) => {
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
  return createAsyncThunk(`payments/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fetcher(pickQuery(getState().payments));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchBatches = queryThunk('fetchBatches', paymentsApi.listGatewayBatches, (s) => s.reconciliation.query);
export const fetchReconciliationSummary = apiThunk('fetchReconciliationSummary', paymentsApi.getReconciliationSummary);
export const fetchBatch = apiThunk('fetchBatch', paymentsApi.getBatch);

export const fetchExceptions = queryThunk('fetchExceptions', paymentsApi.listPaymentExceptions, (s) => s.exceptions.query);
export const resolveExceptions = apiThunk('resolveExceptions', paymentsApi.resolveExceptions);

export const fetchManualPayments = queryThunk('fetchManualPayments', paymentsApi.listManualPayments, (s) => s.manual.query);
export const findMatchCandidates = apiThunk('findMatchCandidates', paymentsApi.findMatchCandidates);
export const recordManualPayment = apiThunk('recordManualPayment', paymentsApi.recordManualPayment);

export const fetchSettlementRuns = queryThunk('fetchSettlementRuns', paymentsApi.listSettlementRuns, (s) => s.runs.query);
export const fetchSettlementSummary = apiThunk('fetchSettlementSummary', paymentsApi.getSettlementSummary);
export const fetchSettlement = apiThunk('fetchSettlement', paymentsApi.getSettlement);
export const releaseSettlementRun = apiThunk('releaseSettlementRun', paymentsApi.releaseSettlementRun);
export const holdSettlementLine = apiThunk('holdSettlementLine', paymentsApi.holdSettlementLine);

export const fetchPayoutFailures = queryThunk('fetchPayoutFailures', paymentsApi.listPayoutFailures, (s) => s.payouts.query);
export const retryPayouts = apiThunk('retryPayouts', paymentsApi.retryPayouts);
export const updateBeneficiary = apiThunk('updateBeneficiary', paymentsApi.updateBeneficiary);

export const fetchRefunds = queryThunk('fetchRefunds', paymentsApi.listRefunds, (s) => s.refunds.query);
export const fetchCreditNotes = queryThunk('fetchCreditNotes', paymentsApi.listCreditNotes, (s) => s.refunds.query);
export const issueRefund = apiThunk('issueRefund', paymentsApi.issueRefund);
export const issueCreditNote = apiThunk('issueCreditNote', paymentsApi.issueCreditNote);

export const fetchCommissionConfig = apiThunk('fetchCommissionConfig', paymentsApi.getCommissionConfig);
export const saveCommissionConfig = apiThunk('saveCommissionConfig', paymentsApi.updateCommissionConfig);
export const fetchCommissionAudit = queryThunk('fetchCommissionAudit', paymentsApi.getCommissionAudit, (s) => s.commission.auditQuery);

export const fetchMembershipPlans = apiThunk('fetchMembershipPlans', paymentsApi.listMembershipPlans);
export const saveMembershipPlan = apiThunk('saveMembershipPlan', paymentsApi.updateMembershipPlan);
export const fetchPlanSubscriptions = queryThunk('fetchPlanSubscriptions', paymentsApi.listPlanSubscriptions, (s) => s.plans.query);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

// The filters each queue opens on. Held as constants because clearFilters has
// to return to exactly these, not to an empty object.
export const DEFAULT_BATCH_FILTERS = { status: '' };
// The exception queue opens on what is still outstanding. Resolved rows are
// history.
export const DEFAULT_EXCEPTION_FILTERS = { kind: '', severity: '', status: 'open' };
export const DEFAULT_MANUAL_FILTERS = { method: '' };
export const DEFAULT_RUN_FILTERS = { status: '', manufacturerId: '' };
// The payout queue opens on failures for the same reason.
export const DEFAULT_PAYOUT_FILTERS = { status: 'failed', failureCode: '', manufacturerId: '' };
export const DEFAULT_REFUND_FILTERS = { status: '', reason: '', partyType: '' };
export const DEFAULT_SUBSCRIPTION_FILTERS = { planId: '', status: '', memberType: '' };

const listSection = (overrides = {}) => ({
  items: [],
  total: 0,
  status: STATUS.IDLE,
  error: null,
  query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: {} },
  ...overrides,
});

const initialState = {
  // ADM-050
  reconciliation: {
    ...listSection({ query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: { ...DEFAULT_BATCH_FILTERS } } }),
    summary: null,
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    openBatchId: null,
    batch: null,
    batchStatus: STATUS.IDLE,
    batchError: null,
  },

  // ADM-051
  exceptions: {
    ...listSection({ query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: { ...DEFAULT_EXCEPTION_FILTERS } } }),
    openCount: 0,
    openValue: 0,
    facets: { kinds: [] },
    selectedIds: [],
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-052
  manual: {
    ...listSection({ query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: { ...DEFAULT_MANUAL_FILTERS } } }),
    recordedToday: 0,
    recordedValue: 0,
    candidates: [],
    candidateStatus: STATUS.IDLE,
    candidateError: null,
    saveStatus: STATUS.IDLE,
    saveError: null,
    lastRecorded: null,
  },

  // ADM-054
  runs: {
    ...listSection({ query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: { ...DEFAULT_RUN_FILTERS } } }),
    summary: null,
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    facets: { manufacturers: [], statuses: [] },
  },

  // ADM-055
  runDetail: {
    run: null,
    lines: [],
    payouts: [],
    manufacturer: null,
    beneficiary: null,
    nodal: null,
    status: STATUS.IDLE,
    error: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-056
  payouts: {
    ...listSection({ query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: { ...DEFAULT_PAYOUT_FILTERS } } }),
    failedCount: 0,
    failedValue: 0,
    queuedCount: 0,
    facets: { failureCodes: [], manufacturers: [] },
    selectedIds: [],
    actionStatus: STATUS.IDLE,
    actionError: null,
    editingBeneficiaryId: null,
  },

  // ADM-057. One screen, two documents: a refund sends money back, a credit
  // note reduces what is owed. They share a screen and never a list.
  refunds: {
    tab: 'refunds',
    ...listSection({ query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: { ...DEFAULT_REFUND_FILTERS } } }),
    awaitingCount: 0,
    awaitingValue: 0,
    issuedValue: 0,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-058
  commission: {
    saved: null,
    draft: null,
    dirty: false,
    overrides: [],
    noticeDays: 30,
    effectiveFrom: null,
    ordersAffected: null,
    status: STATUS.IDLE,
    error: null,
    saveStatus: STATUS.IDLE,
    saveError: null,
    audit: [],
    auditTotal: 0,
    retainedValue: 0,
    auditStatus: STATUS.IDLE,
    auditError: null,
    auditQuery: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: {} },
  },

  // ADM-062
  plans: {
    plans: [],
    subscriptionCounts: {},
    mrr: 0,
    arr: 0,
    pastDueCount: 0,
    status: STATUS.IDLE,
    error: null,
    editingId: null,
    draft: null,
    dirty: false,
    saveStatus: STATUS.IDLE,
    saveError: null,
    subscribersAffected: null,
    ...listSection({ query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'asc', filters: { ...DEFAULT_SUBSCRIPTION_FILTERS } } }),
  },
};

// Wires the three async states onto one section. Spelling this out for all
// twenty six thunks would bury the parts that actually differ.
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

const pickReconciliation = (s) => s.reconciliation;
const pickExceptions = (s) => s.exceptions;
const pickManual = (s) => s.manual;
const pickRuns = (s) => s.runs;
const pickRunDetail = (s) => s.runDetail;
const pickPayouts = (s) => s.payouts;
const pickRefunds = (s) => s.refunds;
const pickCommission = (s) => s.commission;
const pickPlans = (s) => s.plans;

// Any filter change resets to page one. Landing on page 4 of a three page
// result is the classic queue-screen bug.
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

const batchQ = queryReducers(pickReconciliation, DEFAULT_BATCH_FILTERS);
const exceptionQ = queryReducers(pickExceptions, DEFAULT_EXCEPTION_FILTERS);
const manualQ = queryReducers(pickManual, DEFAULT_MANUAL_FILTERS);
const runQ = queryReducers(pickRuns, DEFAULT_RUN_FILTERS);
const payoutQ = queryReducers(pickPayouts, DEFAULT_PAYOUT_FILTERS);
const refundQ = queryReducers(pickRefunds, DEFAULT_REFUND_FILTERS);
const subscriptionQ = queryReducers(pickPlans, DEFAULT_SUBSCRIPTION_FILTERS);

const slice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setBatchFilters: batchQ.setFilters,
    setBatchSearch: batchQ.setSearch,
    setBatchPage: batchQ.setPage,
    setBatchPageSize: batchQ.setPageSize,
    clearBatchFilters: batchQ.clear,
    openBatch(state, action) {
      state.reconciliation.openBatchId = action.payload;
      if (action.payload === null) {
        state.reconciliation.batch = null;
        state.reconciliation.batchStatus = STATUS.IDLE;
      }
    },

    setExceptionFilters: exceptionQ.setFilters,
    setExceptionSearch: exceptionQ.setSearch,
    setExceptionSort: exceptionQ.setSort,
    setExceptionPage: exceptionQ.setPage,
    setExceptionPageSize: exceptionQ.setPageSize,
    clearExceptionFilters: exceptionQ.clear,
    toggleExceptionSelection(state, action) {
      const id = action.payload;
      state.exceptions.selectedIds = state.exceptions.selectedIds.includes(id)
        ? state.exceptions.selectedIds.filter((row) => row !== id)
        : [...state.exceptions.selectedIds, id];
    },
    setExceptionSelection(state, action) {
      state.exceptions.selectedIds = action.payload;
    },

    setManualFilters: manualQ.setFilters,
    setManualSearch: manualQ.setSearch,
    setManualPage: manualQ.setPage,
    setManualPageSize: manualQ.setPageSize,
    clearManualFilters: manualQ.clear,
    clearManualForm(state) {
      state.manual.candidates = [];
      state.manual.candidateStatus = STATUS.IDLE;
      state.manual.saveError = null;
      state.manual.lastRecorded = null;
    },

    setRunFilters: runQ.setFilters,
    setRunSearch: runQ.setSearch,
    setRunSort: runQ.setSort,
    setRunPage: runQ.setPage,
    setRunPageSize: runQ.setPageSize,
    clearRunFilters: runQ.clear,

    setPayoutFilters: payoutQ.setFilters,
    setPayoutSearch: payoutQ.setSearch,
    setPayoutSort: payoutQ.setSort,
    setPayoutPage: payoutQ.setPage,
    setPayoutPageSize: payoutQ.setPageSize,
    clearPayoutFilters: payoutQ.clear,
    togglePayoutSelection(state, action) {
      const id = action.payload;
      state.payouts.selectedIds = state.payouts.selectedIds.includes(id)
        ? state.payouts.selectedIds.filter((row) => row !== id)
        : [...state.payouts.selectedIds, id];
    },
    setPayoutSelection(state, action) {
      state.payouts.selectedIds = action.payload;
    },
    editBeneficiary(state, action) {
      state.payouts.editingBeneficiaryId = action.payload;
      state.payouts.actionError = null;
    },

    setRefundTab(state, action) {
      state.refunds.tab = action.payload;
      state.refunds.query.page = 1;
      state.refunds.items = [];
    },
    setRefundFilters: refundQ.setFilters,
    setRefundSearch: refundQ.setSearch,
    setRefundPage: refundQ.setPage,
    setRefundPageSize: refundQ.setPageSize,
    clearRefundFilters: refundQ.clear,

    setCommissionDraftField(state, action) {
      const { field, value } = action.payload;
      state.commission.draft[field] = value;
      state.commission.dirty = true;
    },
    setCategoryCommission(state, action) {
      const { category, percent } = action.payload;
      const rule = state.commission.draft.categoryRules.find((row) => row.category === category);
      if (rule) rule.percent = percent;
      state.commission.dirty = true;
    },
    setVolumeSlab(state, action) {
      const { index, field, value } = action.payload;
      state.commission.draft.volumeSlabs[index][field] = value;
      state.commission.dirty = true;
    },
    resetCommissionDraft(state) {
      state.commission.draft = JSON.parse(JSON.stringify(state.commission.saved));
      state.commission.dirty = false;
      state.commission.saveError = null;
    },
    setAuditPage(state, action) {
      state.commission.auditQuery.page = action.payload;
    },

    editPlan(state, action) {
      const plan = state.plans.plans.find((row) => row.id === action.payload);
      state.plans.editingId = action.payload;
      state.plans.draft = plan ? { ...plan } : null;
      state.plans.dirty = false;
      state.plans.saveError = null;
      state.plans.subscribersAffected = null;
    },
    setPlanDraftField(state, action) {
      const { field, value } = action.payload;
      if (!state.plans.draft) return;
      state.plans.draft[field] = value;
      state.plans.dirty = true;
    },
    closePlanEditor(state) {
      state.plans.editingId = null;
      state.plans.draft = null;
      state.plans.dirty = false;
      state.plans.saveError = null;
    },
    setSubscriptionFilters: subscriptionQ.setFilters,
    setSubscriptionSearch: subscriptionQ.setSearch,
    setSubscriptionPage: subscriptionQ.setPage,
    setSubscriptionPageSize: subscriptionQ.setPageSize,
    clearSubscriptionFilters: subscriptionQ.clear,
  },

  extraReducers: (builder) => {
    // ADM-050
    wire(builder, fetchBatches, pickReconciliation, (state, action) => {
      state.reconciliation.items = action.payload.items;
      state.reconciliation.total = action.payload.total;
    });
    wire(builder, fetchReconciliationSummary, pickReconciliation, (state, action) => {
      state.reconciliation.summary = action.payload;
    }, 'summaryStatus');
    wire(builder, fetchBatch, pickReconciliation, (state, action) => {
      state.reconciliation.batch = action.payload;
    }, 'batchStatus');

    // ADM-051
    wire(builder, fetchExceptions, pickExceptions, (state, action) => {
      state.exceptions.items = action.payload.items;
      state.exceptions.total = action.payload.total;
      state.exceptions.openCount = action.payload.openCount;
      state.exceptions.openValue = action.payload.openValue;
      state.exceptions.facets = action.payload.facets;
      // A row no longer on the page cannot stay selected, or a bulk resolve
      // fires at exceptions the operator can no longer see.
      const visible = action.payload.items.map((row) => row.id);
      state.exceptions.selectedIds = state.exceptions.selectedIds.filter((id) => visible.includes(id));
    });
    wire(builder, resolveExceptions, pickExceptions, (state, action) => {
      const updated = action.payload.updated;
      state.exceptions.items = state.exceptions.items.map(
        (row) => updated.find((next) => next.id === row.id) ?? row,
      );
      state.exceptions.selectedIds = [];
    }, 'actionStatus');

    // ADM-052
    wire(builder, fetchManualPayments, pickManual, (state, action) => {
      state.manual.items = action.payload.items;
      state.manual.total = action.payload.total;
      state.manual.recordedToday = action.payload.recordedToday;
      state.manual.recordedValue = action.payload.recordedValue;
    });
    wire(builder, findMatchCandidates, pickManual, (state, action) => {
      state.manual.candidates = action.payload.candidates;
    }, 'candidateStatus');
    wire(builder, recordManualPayment, pickManual, (state, action) => {
      state.manual.items = [action.payload.payment, ...state.manual.items];
      state.manual.total += 1;
      state.manual.lastRecorded = action.payload.payment;
      state.manual.candidates = [];
    }, 'saveStatus');

    // ADM-054
    wire(builder, fetchSettlementRuns, pickRuns, (state, action) => {
      state.runs.items = action.payload.items;
      state.runs.total = action.payload.total;
    });
    wire(builder, fetchSettlementSummary, pickRuns, (state, action) => {
      state.runs.summary = action.payload;
      state.runs.facets = action.payload.facets;
    }, 'summaryStatus');

    // ADM-055
    wire(builder, fetchSettlement, pickRunDetail, (state, action) => {
      Object.assign(state.runDetail, action.payload);
    });
    wire(builder, releaseSettlementRun, pickRunDetail, (state, action) => {
      state.runDetail.run = action.payload.run;
      state.runDetail.payouts = [...state.runDetail.payouts, ...action.payload.payouts];
      state.runDetail.nodal = action.payload.nodal;
      state.runs.items = state.runs.items.map((row) =>
        row.id === action.payload.run.id ? action.payload.run : row,
      );
    }, 'actionStatus');
    wire(builder, holdSettlementLine, pickRunDetail, (state, action) => {
      state.runDetail.lines = state.runDetail.lines.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'actionStatus');

    // ADM-056
    wire(builder, fetchPayoutFailures, pickPayouts, (state, action) => {
      state.payouts.items = action.payload.items;
      state.payouts.total = action.payload.total;
      state.payouts.failedCount = action.payload.failedCount;
      state.payouts.failedValue = action.payload.failedValue;
      state.payouts.queuedCount = action.payload.queuedCount;
      state.payouts.facets = action.payload.facets;
      const visible = action.payload.items.map((row) => row.id);
      state.payouts.selectedIds = state.payouts.selectedIds.filter((id) => visible.includes(id));
    });
    wire(builder, retryPayouts, pickPayouts, (state) => {
      state.payouts.selectedIds = [];
    }, 'actionStatus');
    wire(builder, updateBeneficiary, pickPayouts, (state) => {
      state.payouts.editingBeneficiaryId = null;
    }, 'actionStatus');

    // ADM-057
    wire(builder, fetchRefunds, pickRefunds, (state, action) => {
      state.refunds.items = action.payload.items;
      state.refunds.total = action.payload.total;
      state.refunds.awaitingCount = action.payload.awaitingCount;
      state.refunds.awaitingValue = action.payload.awaitingValue;
    });
    wire(builder, fetchCreditNotes, pickRefunds, (state, action) => {
      state.refunds.items = action.payload.items;
      state.refunds.total = action.payload.total;
      state.refunds.issuedValue = action.payload.issuedValue;
    });
    [issueRefund, issueCreditNote].forEach((thunk) => {
      wire(builder, thunk, pickRefunds, (state, action) => {
        state.refunds.items = [action.payload, ...state.refunds.items];
        state.refunds.total += 1;
      }, 'actionStatus');
    });

    // ADM-058
    wire(builder, fetchCommissionConfig, pickCommission, (state, action) => {
      state.commission.saved = action.payload.config;
      state.commission.draft = JSON.parse(JSON.stringify(action.payload.config));
      state.commission.dirty = false;
      state.commission.overrides = action.payload.overrides;
      state.commission.noticeDays = action.payload.noticeDays;
      state.commission.effectiveFrom = action.payload.effectiveFrom;
    });
    wire(builder, saveCommissionConfig, pickCommission, (state, action) => {
      state.commission.saved = action.payload.config;
      state.commission.draft = JSON.parse(JSON.stringify(action.payload.config));
      state.commission.dirty = false;
      state.commission.effectiveFrom = action.payload.effectiveFrom;
      // Always zero, and kept so the screen can say so out loud rather than
      // leaving the reader to assume a rate change restated something.
      state.commission.ordersAffected = action.payload.ordersAffected;
    }, 'saveStatus');
    wire(builder, fetchCommissionAudit, pickCommission, (state, action) => {
      state.commission.audit = action.payload.items;
      state.commission.auditTotal = action.payload.total;
      state.commission.retainedValue = action.payload.retainedValue;
    }, 'auditStatus');

    // ADM-062
    wire(builder, fetchMembershipPlans, pickPlans, (state, action) => {
      state.plans.plans = action.payload.plans;
      state.plans.subscriptionCounts = action.payload.subscriptionCounts;
      state.plans.mrr = action.payload.mrr;
      state.plans.arr = action.payload.arr;
      state.plans.pastDueCount = action.payload.pastDueCount;
    });
    wire(builder, saveMembershipPlan, pickPlans, (state, action) => {
      state.plans.plans = state.plans.plans.map((row) =>
        row.id === action.payload.plan.id ? action.payload.plan : row,
      );
      state.plans.subscribersAffected = action.payload.subscribersAffected;
      state.plans.dirty = false;
      state.plans.editingId = null;
      state.plans.draft = null;
    }, 'saveStatus');
    wire(builder, fetchPlanSubscriptions, pickPlans, (state, action) => {
      state.plans.items = action.payload.items;
      state.plans.total = action.payload.total;
    });
  },
});

export const {
  setBatchFilters, setBatchSearch, setBatchPage, setBatchPageSize, clearBatchFilters, openBatch,
  setExceptionFilters, setExceptionSearch, setExceptionSort, setExceptionPage, setExceptionPageSize,
  clearExceptionFilters, toggleExceptionSelection, setExceptionSelection,
  setManualFilters, setManualSearch, setManualPage, setManualPageSize, clearManualFilters, clearManualForm,
  setRunFilters, setRunSearch, setRunSort, setRunPage, setRunPageSize, clearRunFilters,
  setPayoutFilters, setPayoutSearch, setPayoutSort, setPayoutPage, setPayoutPageSize, clearPayoutFilters,
  togglePayoutSelection, setPayoutSelection, editBeneficiary,
  setRefundTab, setRefundFilters, setRefundSearch, setRefundPage, setRefundPageSize, clearRefundFilters,
  setCommissionDraftField, setCategoryCommission, setVolumeSlab, resetCommissionDraft, setAuditPage,
  editPlan, setPlanDraftField, closePlanEditor,
  setSubscriptionFilters, setSubscriptionSearch, setSubscriptionPage, setSubscriptionPageSize,
  clearSubscriptionFilters,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectPayments = (state) => state.payments;

// listViewState() treats any non-empty filter as "filtered", which is right on
// most queues and wrong on the two that open with a filter already applied. An
// empty exception queue under its default means the desk is clear, and an empty
// payout queue means nothing is broken. Both deserve the all-clear rather than
// an invitation to widen a search nobody typed.
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

export const selectReconciliation = createSelector([selectPayments], ({ reconciliation }) => ({
  batches: reconciliation.items,
  total: reconciliation.total,
  query: reconciliation.query,
  error: reconciliation.error,
  viewState: listViewState(reconciliation),
  summary: reconciliation.summary,
  summaryState: reconciliation.summaryStatus,
  openBatchId: reconciliation.openBatchId,
  batch: reconciliation.batch,
  batchState:
    reconciliation.openBatchId === null
      ? 'prompt'
      : listViewState({
          status: reconciliation.batchStatus,
          items: reconciliation.batch ? [reconciliation.batch] : [],
          query: { search: '', filters: {} },
        }),

  // What the platform took against what the aggregator actually credited. The
  // gap is the fee plus anything unreconciled, and it is the number this screen
  // exists to keep honest.
  unreconciledGap: reconciliation.summary
    ? reconciliation.summary.capturedValue -
      reconciliation.summary.creditedValue -
      reconciliation.summary.feesRetained
    : 0,
}));

export const selectPaymentExceptions = createSelector([selectPayments], ({ exceptions }) => ({
  exceptions: exceptions.items,
  total: exceptions.total,
  query: exceptions.query,
  error: exceptions.error,
  openCount: exceptions.openCount,
  openValue: exceptions.openValue,
  facets: exceptions.facets,
  selectedIds: exceptions.selectedIds,
  actionStatus: exceptions.actionStatus,
  actionError: exceptions.actionError,
  viewState: viewStateIgnoringDefaults(exceptions, DEFAULT_EXCEPTION_FILTERS, ['status']),

  allSelected: exceptions.items.length > 0 && exceptions.selectedIds.length === exceptions.items.length,
  someSelected: exceptions.selectedIds.length > 0 && exceptions.selectedIds.length < exceptions.items.length,
  selectedValue: exceptions.items
    .filter((row) => exceptions.selectedIds.includes(row.id))
    .reduce((sum, row) => sum + Math.abs(row.varianceAmount ?? 0), 0),
}));

export const selectManualPayment = createSelector([selectPayments], ({ manual }) => ({
  payments: manual.items,
  total: manual.total,
  query: manual.query,
  error: manual.error,
  viewState: listViewState(manual),
  recordedToday: manual.recordedToday,
  recordedValue: manual.recordedValue,
  candidates: manual.candidates,
  candidateState: manual.candidateStatus,
  saveStatus: manual.saveStatus,
  saveError: manual.saveError,
  lastRecorded: manual.lastRecorded,
}));

export const selectSettlementRuns = createSelector([selectPayments], ({ runs }) => ({
  runs: runs.items,
  total: runs.total,
  query: runs.query,
  error: runs.error,
  viewState: listViewState(runs),
  summary: runs.summary,
  summaryState: runs.summaryStatus,
  facets: runs.facets,
}));

export const selectSettlementDetail = createSelector([selectPayments], ({ runDetail }) => {
  const run = runDetail.run;
  const releasable = runDetail.lines.filter((line) => !line.held);
  const windowOpen = releasable.find((line) => line.dueAt && Date.parse(line.dueAt) > Date.now());

  return {
    run,
    lines: runDetail.lines,
    payouts: runDetail.payouts,
    manufacturer: runDetail.manufacturer,
    beneficiary: runDetail.beneficiary,
    nodal: runDetail.nodal,
    error: runDetail.error,
    actionStatus: runDetail.actionStatus,
    actionError: runDetail.actionError,
    viewState: listViewState({
      status: runDetail.status,
      items: run ? [run] : [],
      query: { search: '', filters: {} },
    }),

    heldCount: runDetail.lines.filter((line) => line.held).length,
    releasableValue: releasable.reduce((sum, line) => sum + line.payout, 0),

    // Why the release button is disabled, decided here so the button and the
    // endpoint cannot disagree about it. The endpoint enforces all of these
    // again; this is so the reason is on screen BEFORE somebody clicks.
    releaseBlockedBy:
      !run || run.status === 'completed' || run.status === 'released'
        ? 'already_released'
        : releasable.length === 0
          ? 'fully_held'
          : windowOpen
            ? 'window_open'
            : !runDetail.beneficiary?.verified
              ? 'beneficiary_unverified'
              : runDetail.nodal && releasable.reduce((sum, line) => sum + line.payout, 0) > runDetail.nodal.balance
                ? 'nodal_insufficient'
                : null,
    windowOpenUntil: windowOpen?.dueAt ?? null,
  };
});

export const selectPayoutFailures = createSelector([selectPayments], ({ payouts }) => ({
  payouts: payouts.items,
  total: payouts.total,
  query: payouts.query,
  error: payouts.error,
  failedCount: payouts.failedCount,
  failedValue: payouts.failedValue,
  queuedCount: payouts.queuedCount,
  facets: payouts.facets,
  selectedIds: payouts.selectedIds,
  actionStatus: payouts.actionStatus,
  actionError: payouts.actionError,
  editingBeneficiaryId: payouts.editingBeneficiaryId,
  viewState: viewStateIgnoringDefaults(payouts, DEFAULT_PAYOUT_FILTERS, ['status']),

  allSelected: payouts.items.length > 0 && payouts.selectedIds.length === payouts.items.length,
  someSelected: payouts.selectedIds.length > 0 && payouts.selectedIds.length < payouts.items.length,
  selectedValue: payouts.items
    .filter((row) => payouts.selectedIds.includes(row.id))
    .reduce((sum, row) => sum + row.amount, 0),

  // Retrying against bank details that do not resolve is guaranteed to fail
  // again, so the screen says so before the desk spends a day on it.
  selectedNeedingBankFix: payouts.items.filter(
    (row) => payouts.selectedIds.includes(row.id) && row.failureCode === 'invalid_ifsc',
  ).length,
}));

export const selectRefundsConsole = createSelector([selectPayments], ({ refunds }) => ({
  tab: refunds.tab,
  rows: refunds.items,
  total: refunds.total,
  query: refunds.query,
  error: refunds.error,
  viewState: listViewState(refunds),
  awaitingCount: refunds.awaitingCount,
  awaitingValue: refunds.awaitingValue,
  issuedValue: refunds.issuedValue,
  actionStatus: refunds.actionStatus,
  actionError: refunds.actionError,
}));

export const selectCommissionConfig = createSelector([selectPayments], ({ commission }) => ({
  saved: commission.saved,
  draft: commission.draft,
  dirty: commission.dirty,
  overrides: commission.overrides,
  noticeDays: commission.noticeDays,
  effectiveFrom: commission.effectiveFrom,
  ordersAffected: commission.ordersAffected,
  error: commission.error,
  saveStatus: commission.saveStatus,
  saveError: commission.saveError,
  viewState: commission.draft
    ? 'populated'
    : commission.status === STATUS.FAILED
      ? 'error'
      : 'loading',

  audit: commission.audit,
  auditTotal: commission.auditTotal,
  auditQuery: commission.auditQuery,
  retainedValue: commission.retainedValue,
  auditState: listViewState({
    status: commission.auditStatus,
    items: commission.audit,
    query: commission.auditQuery,
  }),
}));

export const selectMembershipPlans = createSelector([selectPayments], ({ plans }) => ({
  plans: plans.plans,
  subscriptionCounts: plans.subscriptionCounts,
  mrr: plans.mrr,
  arr: plans.arr,
  pastDueCount: plans.pastDueCount,
  error: plans.error,
  viewState: plans.plans.length > 0 ? 'populated' : plans.status === STATUS.FAILED ? 'error' : 'loading',

  editingId: plans.editingId,
  draft: plans.draft,
  dirty: plans.dirty,
  saveStatus: plans.saveStatus,
  saveError: plans.saveError,
  subscribersAffected: plans.subscribersAffected,

  subscriptions: plans.items,
  subscriptionTotal: plans.total,
  subscriptionQuery: plans.query,
  subscriptionState: listViewState({ status: plans.status, items: plans.items, query: plans.query }),
}));

export default slice.reducer;
