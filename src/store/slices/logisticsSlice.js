// Logistics and returns - ADM-063, 064, 068, 069.
//
// Four sections, one per screen, each with its own status and error. The
// selectors at the foot of the file are the seam: a screen reads exactly one
// of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as logisticsApi from '@/services/mock/logisticsApi';
import { listViewState } from '@/store/createListSlice';
import { CARRIERS, HIGH_VALUE_THRESHOLD, RETURN_WEIGHT_TOLERANCE_GRAMS } from '@/data/logisticsFixtures';

// Screens branch on the code, so it travels with the message. `not_verified`
// renders a different thing from `blocked_by_dispute`, and both are refusals
// to refund.
function apiThunk(name, fn) {
  return createAsyncThunk(`logistics/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

function queryThunk(name, fn, pickQuery) {
  return createAsyncThunk(`logistics/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fn(pickQuery(getState().logistics));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchShipments = queryThunk('fetchShipments', logisticsApi.listShipments, (s) => s.shipments.query);
export const fetchShipmentCounts = queryThunk('fetchShipmentCounts', logisticsApi.getShipmentCounts, (s) => s.shipments.query);
export const fetchShipment = apiThunk('fetchShipment', logisticsApi.getShipment);
export const refreshTracking = apiThunk('refreshTracking', logisticsApi.refreshTracking);
export const markDispatched = apiThunk('markDispatched', logisticsApi.markDispatched);

export const fetchExceptions = queryThunk('fetchExceptions', logisticsApi.listShipmentExceptions, (s) => s.exceptions.query);
export const fetchExceptionCounts = apiThunk('fetchExceptionCounts', logisticsApi.getExceptionCounts);
export const assignException = apiThunk('assignException', logisticsApi.assignException);
export const resolveException = apiThunk('resolveException', logisticsApi.resolveException);

export const fetchClaims = queryThunk('fetchClaims', logisticsApi.listInsuranceClaims, (s) => s.claims.query);
export const fetchClaim = apiThunk('fetchClaim', logisticsApi.getInsuranceClaim);
export const raiseClaim = apiThunk('raiseClaim', logisticsApi.raiseInsuranceClaim);
export const updateClaimStatus = apiThunk('updateClaimStatus', logisticsApi.updateClaimStatus);

export const fetchReturns = queryThunk('fetchReturns', logisticsApi.listReturns, (s) => s.returns.query);
export const fetchReturnCounts = apiThunk('fetchReturnCounts', logisticsApi.getReturnCounts);
export const fetchReturnWorkspace = apiThunk('fetchReturnWorkspace', logisticsApi.getReturnWorkspace);
export const verifyReturn = apiThunk('verifyReturn', logisticsApi.verifyReturn);
export const processRefund = apiThunk('processRefund', logisticsApi.processRefund);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  shipments: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'dispatchedAt', sortDir: 'desc',
      filters: { status: '', carrierId: '', manufacturerId: '', destinationCity: '', exceptionsOnly: '' },
    },
    counts: null, countsStatus: 'idle',
    detail: { shipment: null, events: [], order: null, exceptions: [], status: 'idle', error: null },
    actionStatus: 'idle', actionError: null,
  },

  exceptions: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'raisedAt', sortDir: 'asc',
      filters: { type: '', severity: '', state: '', assigneeId: '' },
    },
    counts: null, countsStatus: 'idle',
    selectedIds: [],
    actionStatus: 'idle', actionError: null,
  },

  claims: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'raisedAt', sortDir: 'desc',
      filters: { status: '', insurerId: '', lossType: '' },
    },
    detail: { claim: null, shipment: null, exception: null, documents: [], status: 'idle', error: null },
    draft: { shipmentId: '', lossType: '', claimedValue: '', note: '' },
    actionStatus: 'idle', actionError: null,
  },

  returns: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'raisedAt', sortDir: 'asc',
      filters: { state: '', reasonCode: '', manufacturerId: '' },
    },
    counts: null, countsStatus: 'idle',
    workspace: {
      returnRecord: null, order: null, line: null, media: [], weighIn: null, history: [],
      status: 'idle', error: null,
      decision: { receivedNetWeight: '', mediaChecked: false, note: '' },
      decisionStatus: 'idle', decisionError: null,
      // Set when a verification opened a dispute. The screen shows it rather
      // than the operator finding out later that the refund is blocked.
      disputeCreated: null,
      refundStatus: 'idle', refundError: null,
    },
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

const pickShipments = (s) => s.shipments;
const pickShipDetail = (s) => s.shipments.detail;
const pickExceptions = (s) => s.exceptions;
const pickClaims = (s) => s.claims;
const pickClaimDetail = (s) => s.claims.detail;
const pickReturns = (s) => s.returns;
const pickWorkspace = (s) => s.returns.workspace;

const slice = createSlice({
  name: 'logistics',
  initialState,
  reducers: {
    setShipmentSearch(state, action) { state.shipments.query.search = action.payload; state.shipments.query.page = 1; },
    setShipmentFilters(state, action) { state.shipments.query.filters = action.payload; state.shipments.query.page = 1; },
    setShipmentSort(state, action) { Object.assign(state.shipments.query, action.payload); },
    setShipmentPage(state, action) { state.shipments.query.page = action.payload; },
    setShipmentPageSize(state, action) { state.shipments.query.pageSize = action.payload; state.shipments.query.page = 1; },
    clearShipmentFilters(state) { state.shipments.query = { ...initialState.shipments.query }; },
    closeShipmentDetail(state) { state.shipments.detail = { ...initialState.shipments.detail }; },

    setExceptionSearch(state, action) { state.exceptions.query.search = action.payload; state.exceptions.query.page = 1; },
    setExceptionFilters(state, action) { state.exceptions.query.filters = action.payload; state.exceptions.query.page = 1; },
    setExceptionPage(state, action) { state.exceptions.query.page = action.payload; },
    setExceptionPageSize(state, action) { state.exceptions.query.pageSize = action.payload; state.exceptions.query.page = 1; },
    clearExceptionFilters(state) { state.exceptions.query = { ...initialState.exceptions.query }; },
    toggleExceptionSelection(state, action) {
      const id = action.payload;
      state.exceptions.selectedIds = state.exceptions.selectedIds.includes(id)
        ? state.exceptions.selectedIds.filter((row) => row !== id)
        : [...state.exceptions.selectedIds, id];
    },
    setExceptionSelection(state, action) { state.exceptions.selectedIds = action.payload; },

    setClaimSearch(state, action) { state.claims.query.search = action.payload; state.claims.query.page = 1; },
    setClaimFilters(state, action) { state.claims.query.filters = action.payload; state.claims.query.page = 1; },
    setClaimPage(state, action) { state.claims.query.page = action.payload; },
    setClaimPageSize(state, action) { state.claims.query.pageSize = action.payload; state.claims.query.page = 1; },
    clearClaimFilters(state) { state.claims.query = { ...initialState.claims.query }; },
    setClaimDraftField(state, action) {
      const { field, value } = action.payload;
      state.claims.draft[field] = value;
      state.claims.actionError = null;
    },
    resetClaimDraft(state) { state.claims.draft = { ...initialState.claims.draft }; state.claims.actionError = null; },
    closeClaimDetail(state) { state.claims.detail = { ...initialState.claims.detail }; },

    setReturnSearch(state, action) { state.returns.query.search = action.payload; state.returns.query.page = 1; },
    setReturnFilters(state, action) { state.returns.query.filters = action.payload; state.returns.query.page = 1; },
    setReturnPage(state, action) { state.returns.query.page = action.payload; },
    setReturnPageSize(state, action) { state.returns.query.pageSize = action.payload; state.returns.query.page = 1; },
    clearReturnFilters(state) { state.returns.query = { ...initialState.returns.query }; },
    setDecisionField(state, action) {
      const { field, value } = action.payload;
      state.returns.workspace.decision[field] = value;
      state.returns.workspace.decisionError = null;
    },
    closeReturnWorkspace(state) { state.returns.workspace = { ...initialState.returns.workspace, decision: { ...initialState.returns.workspace.decision } }; },
  },

  extraReducers: (builder) => {
    wire(builder, fetchShipments, pickShipments, (state, action) => {
      state.shipments.items = action.payload.items;
      state.shipments.total = action.payload.total;
    });
    wire(builder, fetchShipmentCounts, pickShipments, (state, action) => {
      state.shipments.counts = action.payload;
    }, 'countsStatus');
    wire(builder, fetchShipment, pickShipDetail, (state, action) => {
      Object.assign(state.shipments.detail, action.payload);
    });
    wire(builder, refreshTracking, pickShipDetail, (state, action) => {
      state.shipments.detail.shipment = action.payload.shipment;
      state.shipments.detail.events = action.payload.events;
    });
    wire(builder, markDispatched, pickShipments, () => {}, 'actionStatus');

    wire(builder, fetchExceptions, pickExceptions, (state, action) => {
      state.exceptions.items = action.payload.items;
      state.exceptions.total = action.payload.total;
    });
    wire(builder, fetchExceptionCounts, pickExceptions, (state, action) => {
      state.exceptions.counts = action.payload;
    }, 'countsStatus');
    wire(builder, assignException, pickExceptions, (state) => { state.exceptions.selectedIds = []; }, 'actionStatus');
    wire(builder, resolveException, pickExceptions, () => {}, 'actionStatus');

    wire(builder, fetchClaims, pickClaims, (state, action) => {
      state.claims.items = action.payload.items;
      state.claims.total = action.payload.total;
    });
    wire(builder, fetchClaim, pickClaimDetail, (state, action) => {
      Object.assign(state.claims.detail, action.payload);
    });
    wire(builder, raiseClaim, pickClaims, (state) => {
      state.claims.draft = { ...initialState.claims.draft };
    }, 'actionStatus');
    wire(builder, updateClaimStatus, pickClaims, (state, action) => {
      state.claims.detail.claim = action.payload;
    }, 'actionStatus');

    wire(builder, fetchReturns, pickReturns, (state, action) => {
      state.returns.items = action.payload.items;
      state.returns.total = action.payload.total;
    });
    wire(builder, fetchReturnCounts, pickReturns, (state, action) => {
      state.returns.counts = action.payload;
    }, 'countsStatus');
    wire(builder, fetchReturnWorkspace, pickWorkspace, (state, action) => {
      Object.assign(state.returns.workspace, action.payload);
      state.returns.workspace.decision = {
        receivedNetWeight: action.payload.returnRecord.receivedNetWeight ?? '',
        mediaChecked: Boolean(action.payload.returnRecord.mediaChecked),
        note: '',
      };
      state.returns.workspace.disputeCreated = null;
    });
    wire(builder, verifyReturn, pickWorkspace, (state, action) => {
      state.returns.workspace.returnRecord = action.payload.returnRecord;
      state.returns.workspace.weighIn = action.payload.weighIn;
      state.returns.workspace.disputeCreated = action.payload.disputeCreated;
    }, 'decisionStatus');
    wire(builder, processRefund, pickWorkspace, (state, action) => {
      state.returns.workspace.returnRecord = action.payload.returnRecord;
    }, 'refundStatus');
  },
});

export const {
  setShipmentSearch, setShipmentFilters, setShipmentSort, setShipmentPage, setShipmentPageSize,
  clearShipmentFilters, closeShipmentDetail,
  setExceptionSearch, setExceptionFilters, setExceptionPage, setExceptionPageSize,
  clearExceptionFilters, toggleExceptionSelection, setExceptionSelection,
  setClaimSearch, setClaimFilters, setClaimPage, setClaimPageSize, clearClaimFilters,
  setClaimDraftField, resetClaimDraft, closeClaimDetail,
  setReturnSearch, setReturnFilters, setReturnPage, setReturnPageSize, clearReturnFilters,
  setDecisionField, closeReturnWorkspace,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectLogistics = (state) => state.logistics;

const simpleViewState = (status, hasData) =>
  status === 'failed' ? 'error'
    : status === 'loading' || status === 'idle' ? 'loading'
      : hasData ? 'populated' : 'empty';

export const selectShipmentConsole = createSelector([selectLogistics], ({ shipments }) => ({
  shipments: shipments.items,
  total: shipments.total,
  query: shipments.query,
  counts: shipments.counts,
  detail: shipments.detail,
  carrierOptions: CARRIERS.map((carrier) => ({ value: carrier.id, label: carrier.name })),
  highValueThreshold: HIGH_VALUE_THRESHOLD,
  viewState: listViewState({
    status: shipments.status,
    items: shipments.items,
    query: { search: shipments.query.search, filters: shipments.query.filters },
  }),
  actionStatus: shipments.actionStatus,
  actionError: shipments.actionError,
  error: shipments.error,
}));

export const selectExceptionQueue = createSelector([selectLogistics], ({ exceptions }) => ({
  exceptions: exceptions.items,
  total: exceptions.total,
  query: exceptions.query,
  counts: exceptions.counts,
  selectedIds: exceptions.selectedIds,
  viewState: listViewState({
    status: exceptions.status,
    items: exceptions.items,
    query: { search: exceptions.query.search, filters: exceptions.query.filters },
  }),
  actionStatus: exceptions.actionStatus,
  actionError: exceptions.actionError,
  error: exceptions.error,
}));

export const selectInsuranceClaims = createSelector([selectLogistics], ({ claims }) => ({
  claims: claims.items,
  total: claims.total,
  query: claims.query,
  draft: claims.draft,
  detail: claims.detail,
  viewState: listViewState({
    status: claims.status,
    items: claims.items,
    query: { search: claims.query.search, filters: claims.query.filters },
  }),
  actionStatus: claims.actionStatus,
  actionError: claims.actionError,
  error: claims.error,
}));

export const selectReturnsQueue = createSelector([selectLogistics], ({ returns }) => ({
  returns: returns.items,
  total: returns.total,
  query: returns.query,
  counts: returns.counts,
  toleranceGrams: RETURN_WEIGHT_TOLERANCE_GRAMS,
  viewState: listViewState({
    status: returns.status,
    items: returns.items,
    query: { search: returns.query.search, filters: returns.query.filters },
  }),
  error: returns.error,
}));

export const selectReturnWorkspace = createSelector([selectLogistics], ({ returns }) => {
  const workspace = returns.workspace;
  const record = workspace.returnRecord;
  const typed = Number(workspace.decision.receivedNetWeight);

  // The shortfall as the reviewer types, so they see what the weigh-in will
  // decide before they commit to it rather than after.
  const previewShortfall =
    record && Number.isFinite(typed) && typed > 0
      ? Number((record.declaredNetWeight - typed).toFixed(3))
      : null;

  return {
    returnRecord: record,
    order: workspace.order,
    line: workspace.line,
    media: workspace.media,
    weighIn: workspace.weighIn,
    history: workspace.history,
    decision: workspace.decision,
    disputeCreated: workspace.disputeCreated,
    toleranceGrams: RETURN_WEIGHT_TOLERANCE_GRAMS,
    previewShortfall,
    previewWithinTolerance:
      previewShortfall === null ? null : previewShortfall <= RETURN_WEIGHT_TOLERANCE_GRAMS,
    // No refund before verification, and the button says so rather than
    // failing when it is pressed.
    canRefund: record?.state === 'verified',
    isBlocked: record?.state === 'disputed',
    viewState: simpleViewState(workspace.status, Boolean(record)),
    decisionStatus: workspace.decisionStatus,
    decisionError: workspace.decisionError,
    refundStatus: workspace.refundStatus,
    refundError: workspace.refundError,
    error: workspace.error,
  };
});

export default slice.reducer;
