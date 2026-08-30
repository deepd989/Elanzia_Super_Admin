// Trust and issue resolution - ADM-065, 066, 067, 070, 071.
//
// Five sections, one per screen, each with its own status and error.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as trustApi from '@/services/mock/trustApi';
import { listViewState } from '@/store/createListSlice';

function apiThunk(name, fn) {
  return createAsyncThunk(`trust/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

function queryThunk(name, fn, pickQuery) {
  return createAsyncThunk(`trust/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fn(pickQuery(getState().trust));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchDisputes = queryThunk('fetchDisputes', trustApi.listDisputes, (s) => s.disputes.query);
export const fetchDisputeCounts = apiThunk('fetchDisputeCounts', trustApi.getDisputeCounts);
export const assignDispute = apiThunk('assignDispute', trustApi.assignDispute);

export const fetchDispute = apiThunk('fetchDispute', trustApi.getDispute);
export const addDisputeNote = apiThunk('addDisputeNote', trustApi.addDisputeNote);
export const requestEvidence = apiThunk('requestEvidence', trustApi.requestEvidence);
export const reopenDispute = apiThunk('reopenDispute', trustApi.reopenDispute);

export const fetchOutcomes = apiThunk('fetchOutcomes', trustApi.listResolutionOutcomes);
export const previewResolution = apiThunk('previewResolution', trustApi.previewResolution);
export const recordResolution = apiThunk('recordResolution', trustApi.recordResolution);
export const fetchResolutions = queryThunk('fetchResolutions', trustApi.listResolutions, (s) => s.resolution.history.query);

export const fetchCertificates = queryThunk('fetchCertificates', trustApi.listCertificates, (s) => s.certificates.query);
export const fetchCertificateCounts = apiThunk('fetchCertificateCounts', trustApi.getCertificateCounts);
export const fetchCertificate = apiThunk('fetchCertificate', trustApi.getCertificate);
export const flagCertificate = apiThunk('flagCertificate', trustApi.flagCertificate);
export const clearCertificateFlag = apiThunk('clearCertificateFlag', trustApi.clearCertificateFlag);

export const fetchReviews = queryThunk('fetchReviews', trustApi.listReviews, (s) => s.reviews.query);
export const fetchReviewCounts = apiThunk('fetchReviewCounts', trustApi.getReviewCounts);
export const moderateReviews = apiThunk('moderateReviews', trustApi.moderateReviews);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  disputes: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'raisedAt', sortDir: 'asc',
      filters: { status: '', type: '', severity: '', assigneeId: '', slaBreached: '' },
    },
    counts: null, countsStatus: 'idle',
    selectedIds: [],
    actionStatus: 'idle', actionError: null,
  },

  disputeDetail: {
    dispute: null, order: null, parties: null,
    evidence: [], messages: [], timeline: [], linkedReturn: null,
    activeEvidenceId: null,
    status: 'idle', error: null,
    noteDraft: { note: '', internal: true },
    noteStatus: 'idle', noteError: null,
  },

  resolution: {
    outcomes: [], outcomesStatus: 'idle',
    draft: { outcome: '', refundAmount: '', creditAmount: '', note: '', notifyParties: true },
    preview: null, previewStatus: 'idle', previewError: null,
    saveStatus: 'idle', saveError: null,
    recorded: null,
    history: {
      items: [], total: 0, status: 'idle', error: null,
      query: { page: 1, pageSize: 10, sortBy: 'recordedAt', sortDir: 'desc', filters: {} },
    },
  },

  certificates: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'issuedAt', sortDir: 'desc',
      filters: { kind: '', state: '', manufacturerId: '', severity: '' },
    },
    counts: null, countsStatus: 'idle',
    detail: { certificate: null, product: null, relatedCertificates: [], status: 'idle', error: null },
    actionStatus: 'idle', actionError: null,
  },

  reviews: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'submittedAt', sortDir: 'desc',
      filters: { state: '', rating: '', targetType: '', flaggedOnly: '' },
    },
    counts: null, countsStatus: 'idle',
    selectedIds: [],
    actionStatus: 'idle', actionError: null,
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

const pickDisputes = (s) => s.disputes;
const pickDetail = (s) => s.disputeDetail;
const pickResolution = (s) => s.resolution;
const pickHistory = (s) => s.resolution.history;
const pickCertificates = (s) => s.certificates;
const pickCertDetail = (s) => s.certificates.detail;
const pickReviews = (s) => s.reviews;

const slice = createSlice({
  name: 'trust',
  initialState,
  reducers: {
    setDisputeSearch(state, action) { state.disputes.query.search = action.payload; state.disputes.query.page = 1; },
    setDisputeFilters(state, action) { state.disputes.query.filters = action.payload; state.disputes.query.page = 1; },
    setDisputePage(state, action) { state.disputes.query.page = action.payload; },
    setDisputePageSize(state, action) { state.disputes.query.pageSize = action.payload; state.disputes.query.page = 1; },
    clearDisputeFilters(state) { state.disputes.query = { ...initialState.disputes.query }; },
    toggleDisputeSelection(state, action) {
      const id = action.payload;
      state.disputes.selectedIds = state.disputes.selectedIds.includes(id)
        ? state.disputes.selectedIds.filter((row) => row !== id)
        : [...state.disputes.selectedIds, id];
    },
    setDisputeSelection(state, action) { state.disputes.selectedIds = action.payload; },

    setActiveEvidence(state, action) { state.disputeDetail.activeEvidenceId = action.payload; },
    setNoteDraft(state, action) {
      Object.assign(state.disputeDetail.noteDraft, action.payload);
      state.disputeDetail.noteError = null;
    },
    clearDisputeDetail(state) {
      state.disputeDetail = { ...initialState.disputeDetail, noteDraft: { ...initialState.disputeDetail.noteDraft } };
    },

    setResolutionField(state, action) {
      const { field, value } = action.payload;
      state.resolution.draft[field] = value;
      state.resolution.saveError = null;
      // The preview describes the outcome that was previewed, so it stops
      // being true the moment any input changes.
      state.resolution.preview = null;
      state.resolution.previewStatus = 'idle';
    },
    clearResolutionDraft(state) {
      state.resolution.draft = { ...initialState.resolution.draft };
      state.resolution.preview = null;
      state.resolution.previewStatus = 'idle';
      state.resolution.recorded = null;
    },

    setCertificateSearch(state, action) { state.certificates.query.search = action.payload; state.certificates.query.page = 1; },
    setCertificateFilters(state, action) { state.certificates.query.filters = action.payload; state.certificates.query.page = 1; },
    setCertificatePage(state, action) { state.certificates.query.page = action.payload; },
    setCertificatePageSize(state, action) { state.certificates.query.pageSize = action.payload; state.certificates.query.page = 1; },
    clearCertificateFilters(state) { state.certificates.query = { ...initialState.certificates.query }; },
    closeCertificateDetail(state) { state.certificates.detail = { ...initialState.certificates.detail }; },

    setReviewSearch(state, action) { state.reviews.query.search = action.payload; state.reviews.query.page = 1; },
    setReviewFilters(state, action) { state.reviews.query.filters = action.payload; state.reviews.query.page = 1; },
    setReviewPage(state, action) { state.reviews.query.page = action.payload; },
    setReviewPageSize(state, action) { state.reviews.query.pageSize = action.payload; state.reviews.query.page = 1; },
    clearReviewFilters(state) { state.reviews.query = { ...initialState.reviews.query }; },
    toggleReviewSelection(state, action) {
      const id = action.payload;
      state.reviews.selectedIds = state.reviews.selectedIds.includes(id)
        ? state.reviews.selectedIds.filter((row) => row !== id)
        : [...state.reviews.selectedIds, id];
    },
    setReviewSelection(state, action) { state.reviews.selectedIds = action.payload; },
  },

  extraReducers: (builder) => {
    wire(builder, fetchDisputes, pickDisputes, (state, action) => {
      state.disputes.items = action.payload.items;
      state.disputes.total = action.payload.total;
    });
    wire(builder, fetchDisputeCounts, pickDisputes, (state, action) => {
      state.disputes.counts = action.payload;
    }, 'countsStatus');
    wire(builder, assignDispute, pickDisputes, (state) => { state.disputes.selectedIds = []; }, 'actionStatus');

    wire(builder, fetchDispute, pickDetail, (state, action) => {
      Object.assign(state.disputeDetail, action.payload);
      state.disputeDetail.activeEvidenceId = action.payload.evidence[0]?.id ?? null;
    });
    wire(builder, addDisputeNote, pickDetail, (state, action) => {
      state.disputeDetail.messages = [...state.disputeDetail.messages, action.payload];
      state.disputeDetail.noteDraft = { note: '', internal: true };
    }, 'noteStatus');
    wire(builder, requestEvidence, pickDetail, (state, action) => {
      state.disputeDetail.dispute = action.payload;
    }, 'noteStatus');
    wire(builder, reopenDispute, pickDetail, (state, action) => {
      state.disputeDetail.dispute = action.payload;
    }, 'noteStatus');

    wire(builder, fetchOutcomes, pickResolution, (state, action) => {
      state.resolution.outcomes = action.payload.items;
    }, 'outcomesStatus');
    wire(builder, previewResolution, pickResolution, (state, action) => {
      state.resolution.preview = action.payload;
    }, 'previewStatus');
    wire(builder, recordResolution, pickResolution, (state, action) => {
      state.resolution.recorded = action.payload.resolution;
      state.disputeDetail.dispute = action.payload.dispute;
    }, 'saveStatus');
    wire(builder, fetchResolutions, pickHistory, (state, action) => {
      state.resolution.history.items = action.payload.items;
      state.resolution.history.total = action.payload.total;
    });

    wire(builder, fetchCertificates, pickCertificates, (state, action) => {
      state.certificates.items = action.payload.items;
      state.certificates.total = action.payload.total;
    });
    wire(builder, fetchCertificateCounts, pickCertificates, (state, action) => {
      state.certificates.counts = action.payload;
    }, 'countsStatus');
    wire(builder, fetchCertificate, pickCertDetail, (state, action) => {
      Object.assign(state.certificates.detail, action.payload);
    });
    wire(builder, flagCertificate, pickCertificates, (state, action) => {
      state.certificates.detail.certificate = action.payload;
    }, 'actionStatus');
    wire(builder, clearCertificateFlag, pickCertificates, (state, action) => {
      state.certificates.detail.certificate = action.payload;
    }, 'actionStatus');

    wire(builder, fetchReviews, pickReviews, (state, action) => {
      state.reviews.items = action.payload.items;
      state.reviews.total = action.payload.total;
    });
    wire(builder, fetchReviewCounts, pickReviews, (state, action) => {
      state.reviews.counts = action.payload;
    }, 'countsStatus');
    wire(builder, moderateReviews, pickReviews, (state) => { state.reviews.selectedIds = []; }, 'actionStatus');
  },
});

export const {
  setDisputeSearch, setDisputeFilters, setDisputePage, setDisputePageSize, clearDisputeFilters,
  toggleDisputeSelection, setDisputeSelection,
  setActiveEvidence, setNoteDraft, clearDisputeDetail,
  setResolutionField, clearResolutionDraft,
  setCertificateSearch, setCertificateFilters, setCertificatePage, setCertificatePageSize,
  clearCertificateFilters, closeCertificateDetail,
  setReviewSearch, setReviewFilters, setReviewPage, setReviewPageSize, clearReviewFilters,
  toggleReviewSelection, setReviewSelection,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectTrust = (state) => state.trust;

const simpleViewState = (status, hasData) =>
  status === 'failed' ? 'error'
    : status === 'loading' || status === 'idle' ? 'loading'
      : hasData ? 'populated' : 'empty';

export const selectDisputeConsole = createSelector([selectTrust], ({ disputes }) => ({
  disputes: disputes.items,
  total: disputes.total,
  query: disputes.query,
  counts: disputes.counts,
  selectedIds: disputes.selectedIds,
  viewState: listViewState({
    status: disputes.status,
    items: disputes.items,
    query: { search: disputes.query.search, filters: disputes.query.filters },
  }),
  actionStatus: disputes.actionStatus,
  actionError: disputes.actionError,
  error: disputes.error,
}));

export const selectDisputeDetail = createSelector([selectTrust], ({ disputeDetail }) => {
  const evidence = disputeDetail.evidence;

  return {
    dispute: disputeDetail.dispute,
    order: disputeDetail.order,
    parties: disputeDetail.parties,
    // Shaped for MediaViewer, which takes { id, type, label, caption }.
    mediaItems: evidence.map((item) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      label: item.label,
      caption: `Supplied by the ${item.uploadedByParty}`,
    })),
    evidence,
    activeEvidenceId: disputeDetail.activeEvidenceId,
    // Internal notes are Elanzia only. The screen renders them differently, so
    // the split is made here rather than in markup.
    messages: disputeDetail.messages.filter((message) => !message.internal),
    internalNotes: disputeDetail.messages.filter((message) => message.internal),
    timeline: disputeDetail.timeline,
    linkedReturn: disputeDetail.linkedReturn,
    noteDraft: disputeDetail.noteDraft,
    isResolved: ['resolved', 'closed'].includes(disputeDetail.dispute?.status),
    viewState: simpleViewState(disputeDetail.status, Boolean(disputeDetail.dispute)),
    noteStatus: disputeDetail.noteStatus,
    noteError: disputeDetail.noteError,
    error: disputeDetail.error,
  };
});

export const selectResolutionForm = createSelector([selectTrust], ({ resolution, disputeDetail }) => {
  const selected = resolution.outcomes.find((row) => row.id === resolution.draft.outcome) ?? null;

  return {
    dispute: disputeDetail.dispute,
    outcomes: resolution.outcomes,
    outcomeOptions: resolution.outcomes.map((row) => ({ value: row.id, label: row.label })),
    selectedOutcome: selected,
    draft: resolution.draft,
    preview: resolution.preview,
    previewStatus: resolution.previewStatus,
    previewError: resolution.previewError,
    recorded: resolution.recorded,
    history: resolution.history.items,
    historyTotal: resolution.history.total,
    historyViewState: simpleViewState(resolution.history.status, resolution.history.items.length > 0),
    // An outcome that moves money will not save without an amount, and the
    // form says so before the button is pressed.
    needsAmount: Boolean(selected?.requiresAmount),
    canRecord:
      Boolean(selected) &&
      Boolean(String(resolution.draft.note ?? '').trim()) &&
      (!selected?.requiresAmount ||
        Number(resolution.draft.refundAmount || 0) + Number(resolution.draft.creditAmount || 0) > 0),
    viewState: simpleViewState(resolution.outcomesStatus, resolution.outcomes.length > 0),
    saveStatus: resolution.saveStatus,
    saveError: resolution.saveError,
  };
});

export const selectCertificateOversight = createSelector([selectTrust], ({ certificates }) => ({
  certificates: certificates.items,
  total: certificates.total,
  query: certificates.query,
  counts: certificates.counts,
  detail: certificates.detail,
  viewState: listViewState({
    status: certificates.status,
    items: certificates.items,
    query: { search: certificates.query.search, filters: certificates.query.filters },
  }),
  actionStatus: certificates.actionStatus,
  actionError: certificates.actionError,
  error: certificates.error,
}));

export const selectReviewModeration = createSelector([selectTrust], ({ reviews }) => ({
  reviews: reviews.items,
  total: reviews.total,
  query: reviews.query,
  counts: reviews.counts,
  selectedIds: reviews.selectedIds,
  viewState: listViewState({
    status: reviews.status,
    items: reviews.items,
    query: { search: reviews.query.search, filters: reviews.query.filters },
  }),
  actionStatus: reviews.actionStatus,
  actionError: reviews.actionError,
  error: reviews.error,
}));

export default slice.reducer;
