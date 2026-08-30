// Onboarding - ADM-013, 014, 015, 016.
//
// Four sections, one per screen, each with its own status and error. The two
// halves are deliberately symmetrical: a manufacturer application and a
// jeweller application are the same workflow over different paperwork, and
// keeping the shapes identical is what lets the two workspaces stay separate
// screens without either drifting.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as onboardingApi from '@/services/mock/onboardingApi';
import { listViewState } from '@/store/createListSlice';

function apiThunk(name, fn) {
  return createAsyncThunk(`onboarding/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

function queryThunk(name, fn, pickQuery) {
  return createAsyncThunk(`onboarding/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fn(pickQuery(getState().onboarding));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchManufacturerApplications = queryThunk(
  'fetchManufacturerApplications',
  onboardingApi.listManufacturerApplications,
  (state) => state.manufacturerQueue.query,
);
export const fetchManufacturerCounts = apiThunk(
  'fetchManufacturerCounts',
  onboardingApi.getManufacturerApplicationCounts,
);
export const fetchManufacturerApplication = apiThunk(
  'fetchManufacturerApplication',
  onboardingApi.getManufacturerApplication,
);
export const decideManufacturerApplication = apiThunk(
  'decideManufacturerApplication',
  onboardingApi.decideManufacturerApplication,
);

export const fetchJewellerApplications = queryThunk(
  'fetchJewellerApplications',
  onboardingApi.listJewellerApplications,
  (state) => state.jewellerQueue.query,
);
export const fetchJewellerCounts = apiThunk(
  'fetchJewellerCounts',
  onboardingApi.getJewellerApplicationCounts,
);
export const fetchJewellerApplication = apiThunk(
  'fetchJewellerApplication',
  onboardingApi.getJewellerApplication,
);
export const decideJewellerApplication = apiThunk(
  'decideJewellerApplication',
  onboardingApi.decideJewellerApplication,
);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

// Oldest first. A verification queue is worked from the top of the ageing
// list, so the default sort is the opposite of every other queue in the portal.
const queueState = (filters) => ({
  items: [],
  total: 0,
  status: 'idle',
  error: null,
  query: {
    page: 1,
    pageSize: 20,
    search: '',
    sortBy: 'submittedAt',
    sortDir: 'asc',
    filters: { queue: 'pending', ...filters },
  },
  counts: null,
  countsStatus: 'idle',
});

const workspaceState = {
  application: null,
  checks: [],
  documents: [],
  timeline: [],
  status: 'idle',
  error: null,
  decisionStatus: 'idle',
  decisionError: null,
};

const initialState = {
  manufacturerQueue: queueState({ status: '', city: '' }),
  manufacturerWorkspace: { ...workspaceState },
  jewellerQueue: queueState({ status: '', city: '', acquisitionMode: '' }),
  jewellerWorkspace: { ...workspaceState },
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

const pickManufacturerQueue = (state) => state.manufacturerQueue;
const pickManufacturerWorkspace = (state) => state.manufacturerWorkspace;
const pickJewellerQueue = (state) => state.jewellerQueue;
const pickJewellerWorkspace = (state) => state.jewellerWorkspace;

const slice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setManufacturerSearch(state, action) {
      state.manufacturerQueue.query.search = action.payload;
      state.manufacturerQueue.query.page = 1;
    },
    setManufacturerFilters(state, action) {
      state.manufacturerQueue.query.filters = action.payload;
      state.manufacturerQueue.query.page = 1;
    },
    setManufacturerSort(state, action) {
      state.manufacturerQueue.query.sortBy = action.payload.sortBy;
      state.manufacturerQueue.query.sortDir = action.payload.sortDir;
    },
    setManufacturerPage(state, action) {
      state.manufacturerQueue.query.page = action.payload;
    },
    setManufacturerPageSize(state, action) {
      state.manufacturerQueue.query.pageSize = action.payload;
      state.manufacturerQueue.query.page = 1;
    },
    clearManufacturerFilters(state) {
      // The tab survives a filter clear. Clearing the filters on the pending
      // tab and landing on every application ever decided is not what the
      // button says it does.
      const { queue } = state.manufacturerQueue.query.filters;
      state.manufacturerQueue.query = {
        ...initialState.manufacturerQueue.query,
        filters: { ...initialState.manufacturerQueue.query.filters, queue },
      };
    },
    clearManufacturerWorkspace(state) {
      state.manufacturerWorkspace = { ...workspaceState };
    },

    setJewellerSearch(state, action) {
      state.jewellerQueue.query.search = action.payload;
      state.jewellerQueue.query.page = 1;
    },
    setJewellerFilters(state, action) {
      state.jewellerQueue.query.filters = action.payload;
      state.jewellerQueue.query.page = 1;
    },
    setJewellerSort(state, action) {
      state.jewellerQueue.query.sortBy = action.payload.sortBy;
      state.jewellerQueue.query.sortDir = action.payload.sortDir;
    },
    setJewellerPage(state, action) {
      state.jewellerQueue.query.page = action.payload;
    },
    setJewellerPageSize(state, action) {
      state.jewellerQueue.query.pageSize = action.payload;
      state.jewellerQueue.query.page = 1;
    },
    clearJewellerFilters(state) {
      const { queue } = state.jewellerQueue.query.filters;
      state.jewellerQueue.query = {
        ...initialState.jewellerQueue.query,
        filters: { ...initialState.jewellerQueue.query.filters, queue },
      };
    },
    clearJewellerWorkspace(state) {
      state.jewellerWorkspace = { ...workspaceState };
    },
  },

  extraReducers: (builder) => {
    wire(builder, fetchManufacturerApplications, pickManufacturerQueue, (state, action) => {
      state.manufacturerQueue.items = action.payload.items;
      state.manufacturerQueue.total = action.payload.total;
    });
    wire(builder, fetchManufacturerCounts, pickManufacturerQueue, (state, action) => {
      state.manufacturerQueue.counts = action.payload;
    }, 'countsStatus');
    wire(builder, fetchManufacturerApplication, pickManufacturerWorkspace, (state, action) => {
      const { checks, documents, timeline, ...application } = action.payload;
      Object.assign(state.manufacturerWorkspace, { application, checks, documents, timeline });
    });
    wire(builder, decideManufacturerApplication, pickManufacturerWorkspace, (state, action) => {
      state.manufacturerWorkspace.application = action.payload;
    }, 'decisionStatus');

    wire(builder, fetchJewellerApplications, pickJewellerQueue, (state, action) => {
      state.jewellerQueue.items = action.payload.items;
      state.jewellerQueue.total = action.payload.total;
    });
    wire(builder, fetchJewellerCounts, pickJewellerQueue, (state, action) => {
      state.jewellerQueue.counts = action.payload;
    }, 'countsStatus');
    wire(builder, fetchJewellerApplication, pickJewellerWorkspace, (state, action) => {
      const { checks, documents, timeline, ...application } = action.payload;
      Object.assign(state.jewellerWorkspace, { application, checks, documents, timeline });
    });
    wire(builder, decideJewellerApplication, pickJewellerWorkspace, (state, action) => {
      state.jewellerWorkspace.application = action.payload;
    }, 'decisionStatus');
  },
});

export const {
  setManufacturerSearch, setManufacturerFilters, setManufacturerSort,
  setManufacturerPage, setManufacturerPageSize, clearManufacturerFilters,
  clearManufacturerWorkspace,
  setJewellerSearch, setJewellerFilters, setJewellerSort,
  setJewellerPage, setJewellerPageSize, clearJewellerFilters,
  clearJewellerWorkspace,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectOnboarding = (state) => state.onboarding;

// A filter clear must not offer to clear the tab, so `queue` is excluded when
// deciding whether the empty result is an empty queue or an over-filtered one.
function queueViewState({ status, items, query }) {
  const { queue, ...filters } = query.filters;
  return listViewState({ status, items, query: { search: query.search, filters } });
}

function workspaceSelection(section) {
  const { application, checks, documents } = section;

  const blockingFailures = checks.filter((check) => check.blocking && check.state === 'fail');
  const missingDocuments = documents.filter((document) => document.state === 'missing');

  return {
    application,
    checks,
    documents,
    timeline: section.timeline,
    // Shaped for MediaViewer, which takes { id, type, url, label, caption }.
    // A document that was never supplied has nothing to show, so it is not in
    // the viewer - it is in the blockers list instead.
    mediaItems: documents
      .filter((document) => document.state === 'received')
      .map((document) => ({
        id: document.id,
        type: document.type,
        url: document.url,
        label: document.label,
        caption: `${document.pageCount} page${document.pageCount === 1 ? '' : 's'}`,
      })),
    blockingFailures,
    missingDocuments,
    // The workspace disables approve rather than letting a reviewer press it
    // and read the 422 afterwards. The API refuses it either way.
    canApprove: blockingFailures.length === 0 && missingDocuments.length === 0,
    isDecided: Boolean(application) && !['applied', 'under_review', 'info_requested'].includes(application.status),
    viewState:
      section.status === 'failed' ? 'error'
        : section.status === 'loading' || section.status === 'idle' ? 'loading'
          : application ? 'populated' : 'empty',
    error: section.error,
    decisionStatus: section.decisionStatus,
    decisionError: section.decisionError,
  };
}

export const selectManufacturerApplicationQueue = createSelector(
  [selectOnboarding],
  ({ manufacturerQueue }) => ({
    applications: manufacturerQueue.items,
    total: manufacturerQueue.total,
    query: manufacturerQueue.query,
    counts: manufacturerQueue.counts,
    viewState: queueViewState(manufacturerQueue),
    error: manufacturerQueue.error,
  }),
);

export const selectManufacturerVerification = createSelector(
  [selectOnboarding],
  ({ manufacturerWorkspace }) => workspaceSelection(manufacturerWorkspace),
);

export const selectJewellerApplicationQueue = createSelector(
  [selectOnboarding],
  ({ jewellerQueue }) => ({
    applications: jewellerQueue.items,
    total: jewellerQueue.total,
    query: jewellerQueue.query,
    counts: jewellerQueue.counts,
    viewState: queueViewState(jewellerQueue),
    error: jewellerQueue.error,
  }),
);

export const selectJewellerVerification = createSelector(
  [selectOnboarding],
  ({ jewellerWorkspace }) => workspaceSelection(jewellerWorkspace),
);

export default slice.reducer;
