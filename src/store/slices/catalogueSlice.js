// Catalogue control - ADM-023 to ADM-034.
//
// Twelve sections, each with its own status and error, because twelve screens
// cannot share one loading flag. Loads use `status`; saves use `saveStatus` and
// `saveError`, so a save in flight never swaps a form for a page skeleton and
// loses what the admin typed. Selectors at the foot of the file are the seam -
// a screen reads exactly one of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { STATUS, listViewState } from '@/store/createListSlice';
import * as catalogueApi from '@/services/mock/catalogueApi';

// Every thunk fails the same way: surface the API error's code alongside its
// message, because screens branch on the code (edit_reason_required renders
// against the reason field, not as a page error) and render the message.
function apiThunk(name, fetcher) {
  return createAsyncThunk(`catalogue/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fetcher(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// A thunk that reads its query straight off the slice, so a screen dispatches
// it with no argument and cannot pass a query that disagrees with the filters
// on screen.
function queryThunk(name, fetcher, pickQuery) {
  return createAsyncThunk(`catalogue/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fetcher(pickQuery(getState().catalogue));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

// ADM-023
export const fetchModerationQueue = queryThunk('fetchModerationQueue', catalogueApi.listModerationQueue, (s) => s.moderation.query);
export const fetchModerationCounts = queryThunk('fetchModerationCounts', catalogueApi.getModerationCounts, (s) => ({
  search: s.moderation.query.search,
  filters: s.moderation.query.filters,
}));
export const decideProducts = apiThunk('decideProducts', catalogueApi.bulkDecideProducts);

// ADM-024
export const fetchProduct = apiThunk('fetchProduct', catalogueApi.getProduct);
export const decideProduct = apiThunk('decideProduct', catalogueApi.decideProduct);
export const fetchProductAudit = apiThunk('fetchProductAudit', catalogueApi.getProductAuditTrail);

// ADM-025
export const fetchProductDraft = apiThunk('fetchProductDraft', catalogueApi.getProduct);
export const saveProduct = apiThunk('saveProduct', catalogueApi.updateProduct);

// ADM-026
export const fetchCategories = apiThunk('fetchCategories', catalogueApi.listCategories);
export const saveCategory = apiThunk('saveCategory', catalogueApi.saveCategory);
export const archiveCategory = apiThunk('archiveCategory', catalogueApi.archiveCategory);

// ADM-027
export const fetchAttributeSets = apiThunk('fetchAttributeSets', catalogueApi.listAttributeSets);
export const saveAttributeSet = apiThunk('saveAttributeSet', catalogueApi.saveAttributeSet);

// ADM-032
export const fetchMediaStandards = apiThunk('fetchMediaStandards', catalogueApi.getMediaStandards);
export const fetchMediaCompliance = apiThunk('fetchMediaCompliance', catalogueApi.getMediaCompliance);
export const saveMediaStandards = apiThunk('saveMediaStandards', catalogueApi.updateMediaStandards);

// ADM-033
export const fetchHsnCodes = queryThunk('fetchHsnCodes', catalogueApi.listHsnCodes, (s) => s.hsn.query);
export const saveHsnCode = apiThunk('saveHsnCode', catalogueApi.saveHsnCode);
export const assignHsnCode = apiThunk('assignHsnCode', catalogueApi.assignHsnCode);

// ADM-034
export const previewBulkAction = apiThunk('previewBulkAction', catalogueApi.previewBulkAction);
export const runBulkAction = apiThunk('runBulkAction', catalogueApi.runBulkAction);
export const fetchBulkRuns = apiThunk('fetchBulkRuns', catalogueApi.listBulkRuns);

// ADM-028
export const fetchAiJobs = queryThunk('fetchAiJobs', catalogueApi.listAiJobs, (s) => s.aiJobs.query);
export const fetchAiJobCounts = queryThunk('fetchAiJobCounts', catalogueApi.getAiJobCounts, (s) => ({
  search: s.aiJobs.query.search,
  filters: s.aiJobs.query.filters,
}));
export const retryAiJob = apiThunk('retryAiJob', catalogueApi.retryAiJob);

// ADM-029
export const fetchAiJob = apiThunk('fetchAiJob', catalogueApi.getAiJob);
export const decideAiJob = apiThunk('decideAiJob', catalogueApi.decideAiJob);

// ADM-030
export const fetchAiCredits = queryThunk('fetchAiCredits', catalogueApi.listAiCredits, (s) => s.aiCredits.query);
export const fetchAiCreditsSummary = apiThunk('fetchAiCreditsSummary', catalogueApi.getAiCreditsSummary);
export const grantAiCredits = apiThunk('grantAiCredits', catalogueApi.grantAiCredits);

// ADM-031
export const fetchPrivateRanges = queryThunk('fetchPrivateRanges', catalogueApi.listPrivateRanges, (s) => s.visibility.ranges.query);
export const fetchPrivateRange = apiThunk('fetchPrivateRange', catalogueApi.getPrivateRange);
export const revokeAccessGrant = apiThunk('revokeAccessGrant', catalogueApi.revokeAccessGrant);
export const unsealPrivateRange = apiThunk('unsealPrivateRange', catalogueApi.unsealPrivateRange);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

// A control desk opens on what needs a decision, not on the archive.
export const DEFAULT_MODERATION_FILTERS = {
  queue: 'awaiting',
  status: '',
  category: '',
  manufacturerId: '',
  visibility: '',
  flag: '',
};

const draftShape = { data: null, saveStatus: STATUS.IDLE, saveError: null, dirty: false };

const initialState = {
  // ADM-023
  moderation: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'listedAt',
      sortDir: 'desc',
      filters: { ...DEFAULT_MODERATION_FILTERS },
    },
    selectedIds: [],
    counts: null,
    countsStatus: STATUS.IDLE,
    countsError: null,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-024
  product: {
    data: null,
    status: STATUS.IDLE,
    error: null,
    decisionStatus: STATUS.IDLE,
    decisionError: null,
  },

  // ADM-025. Edited locally and saved in one go, so an admin correcting three
  // fields does not fire three requests at somebody else's listing.
  productDraft: { data: null, original: null, status: STATUS.IDLE, error: null, ...draftShape },

  // ADM-026
  categories: {
    items: [],
    status: STATUS.IDLE,
    error: null,
    draft: { ...draftShape },
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-027
  attributes: {
    sets: [],
    definitions: [],
    activeSetId: null,
    status: STATUS.IDLE,
    error: null,
    draft: { ...draftShape },
  },

  // ADM-032
  mediaStandards: {
    data: null,
    compliance: null,
    complianceStatus: STATUS.IDLE,
    status: STATUS.IDLE,
    error: null,
    saveStatus: STATUS.IDLE,
    saveError: null,
    dirty: false,
  },

  // ADM-033
  hsn: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'code',
      sortDir: 'asc',
      filters: { kind: '', gstRate: '' },
    },
    draft: { ...draftShape },
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-034. Nothing runs until a preview has been taken against these exact
  // filters - see the note on clearing the preview below.
  bulk: {
    action: '',
    params: {},
    filters: { status: '', category: '', manufacturerId: '', visibility: '', flag: '' },
    preview: { token: null, items: [], total: 0, blocked: [], status: STATUS.IDLE, error: null, previewedAt: null },
    runStatus: STATUS.IDLE,
    runError: null,
    lastRun: null,
    runs: [],
    runsStatus: STATUS.IDLE,
  },

  // ADM-028
  aiJobs: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'submittedAt',
      sortDir: 'desc',
      filters: { status: '', manufacturerId: '', failureCode: '' },
    },
    counts: null,
    countsStatus: STATUS.IDLE,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-029. `overrides` is only what the reviewer changed. Merging it into
  // the extraction would destroy the record of what the model actually said,
  // which is the only way to tell a model regression from a careless review.
  aiJob: {
    data: null,
    overrides: {},
    reviewed: [],
    status: STATUS.IDLE,
    error: null,
    decisionStatus: STATUS.IDLE,
    decisionError: null,
  },

  // ADM-030
  aiCredits: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'consumedThisMonth',
      sortDir: 'desc',
      filters: { state: '', plan: '' },
    },
    summary: null,
    summaryStatus: STATUS.IDLE,
    actionStatus: STATUS.IDLE,
    actionError: null,
  },

  // ADM-031. `revealed` holds an unsealed range for this session only. It is
  // never merged into `range.data`, so the sealed shape stays the default and
  // a refresh re-seals.
  visibility: {
    ranges: {
      items: [],
      total: 0,
      status: STATUS.IDLE,
      error: null,
      query: {
        page: 1,
        pageSize: 20,
        search: '',
        sortBy: 'pieceCount',
        sortDir: 'desc',
        filters: { grantState: '' },
      },
    },
    range: { data: null, grants: [], viewLogs: [], unsealHistory: [], status: STATUS.IDLE, error: null },
    unseal: { status: STATUS.IDLE, error: null, revealed: null, expiresAt: null },
    actionStatus: STATUS.IDLE,
    actionError: null,
  },
};

// Wires the three async states onto one section. Spelling this out for all
// thirty-three thunks would bury the parts that actually differ.
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

const pickModeration = (s) => s.moderation;
const pickProduct = (s) => s.product;
const pickProductDraft = (s) => s.productDraft;
const pickCategories = (s) => s.categories;
const pickCategoryDraft = (s) => s.categories.draft;
const pickAttributes = (s) => s.attributes;
const pickAttributeDraft = (s) => s.attributes.draft;
const pickMedia = (s) => s.mediaStandards;
const pickHsn = (s) => s.hsn;
const pickBulk = (s) => s.bulk;
const pickBulkPreview = (s) => s.bulk.preview;
const pickAiJobs = (s) => s.aiJobs;
const pickAiJob = (s) => s.aiJob;
const pickAiCredits = (s) => s.aiCredits;
const pickRanges = (s) => s.visibility.ranges;
const pickRange = (s) => s.visibility.range;
const pickUnseal = (s) => s.visibility.unseal;
const pickVisibility = (s) => s.visibility;

const slice = createSlice({
  name: 'catalogue',
  initialState,
  reducers: {
    // ADM-023. Any filter change resets to page one. Landing on page 4 of a
    // three page result is the classic queue-screen bug.
    setModerationFilters(state, action) {
      state.moderation.query.filters = action.payload;
      state.moderation.query.page = 1;
      state.moderation.selectedIds = [];
    },
    setModerationSearch(state, action) {
      state.moderation.query.search = action.payload;
      state.moderation.query.page = 1;
      state.moderation.selectedIds = [];
    },
    setModerationSort(state, action) {
      state.moderation.query.sortBy = action.payload.sortBy;
      state.moderation.query.sortDir = action.payload.sortDir;
    },
    setModerationPage(state, action) {
      state.moderation.query.page = action.payload;
      state.moderation.selectedIds = [];
    },
    setModerationPageSize(state, action) {
      state.moderation.query.pageSize = action.payload;
      state.moderation.query.page = 1;
      state.moderation.selectedIds = [];
    },
    clearModerationFilters(state) {
      state.moderation.query.filters = { ...DEFAULT_MODERATION_FILTERS };
      state.moderation.query.search = '';
      state.moderation.query.page = 1;
      state.moderation.selectedIds = [];
    },
    toggleModerationSelection(state, action) {
      const id = action.payload;
      state.moderation.selectedIds = state.moderation.selectedIds.includes(id)
        ? state.moderation.selectedIds.filter((candidate) => candidate !== id)
        : [...state.moderation.selectedIds, id];
    },
    setModerationSelection(state, action) {
      state.moderation.selectedIds = action.payload;
    },

    // ADM-025
    setProductDraftField(state, action) {
      const { field, value } = action.payload;
      state.productDraft.data[field] = value;
      state.productDraft.dirty = true;
    },
    clearProductDraft(state) {
      state.productDraft = { ...initialState.productDraft };
    },

    // ADM-026
    startCategoryDraft(state, action) {
      state.categories.draft = {
        ...initialState.categories.draft,
        data: action.payload ?? { id: null, name: '', parentId: null, defaultHsn: null, attributeSetId: null, status: 'active' },
      };
    },
    setCategoryDraftField(state, action) {
      const { field, value } = action.payload;
      state.categories.draft.data[field] = value;
      state.categories.draft.dirty = true;
    },
    clearCategoryDraft(state) {
      state.categories.draft = { ...initialState.categories.draft };
    },

    // ADM-027
    setActiveAttributeSet(state, action) {
      state.attributes.activeSetId = action.payload;
      const set = state.attributes.sets.find((row) => row.id === action.payload);
      state.attributes.draft = {
        ...initialState.attributes.draft,
        data: set ? { ...set, attributeIds: [...set.attributeIds], categoryIds: [...set.categoryIds] } : null,
      };
    },
    setAttributeDraftField(state, action) {
      const { field, value } = action.payload;
      state.attributes.draft.data[field] = value;
      state.attributes.draft.dirty = true;
    },
    toggleAttributeInSet(state, action) {
      const draft = state.attributes.draft.data;
      if (!draft) return;
      const id = action.payload;
      draft.attributeIds = draft.attributeIds.includes(id)
        ? draft.attributeIds.filter((candidate) => candidate !== id)
        : [...draft.attributeIds, id];
      state.attributes.draft.dirty = true;
    },

    // ADM-032
    setMediaStandardField(state, action) {
      const { field, value } = action.payload;
      state.mediaStandards.data[field] = value;
      state.mediaStandards.dirty = true;
    },

    // ADM-033
    setHsnSearch(state, action) {
      state.hsn.query.search = action.payload;
      state.hsn.query.page = 1;
    },
    setHsnFilters(state, action) {
      state.hsn.query.filters = action.payload;
      state.hsn.query.page = 1;
    },
    setHsnPage(state, action) {
      state.hsn.query.page = action.payload;
    },
    startHsnDraft(state, action) {
      state.hsn.draft = {
        ...initialState.hsn.draft,
        data: action.payload ?? { code: '', description: '', chapter: '71', kind: 'goods', gstRate: 3 },
      };
    },
    setHsnDraftField(state, action) {
      const { field, value } = action.payload;
      state.hsn.draft.data[field] = value;
      state.hsn.draft.dirty = true;
    },
    clearHsnDraft(state) {
      state.hsn.draft = { ...initialState.hsn.draft };
    },

    // ADM-034. Changing anything about the selection throws the preview away.
    // The token the server checks is bound to a filter set, so a preview that
    // no longer describes what is on screen is worse than none at all.
    setBulkAction(state, action) {
      state.bulk.action = action.payload;
      state.bulk.params = {};
      state.bulk.preview = { ...initialState.bulk.preview };
    },
    setBulkParams(state, action) {
      state.bulk.params = action.payload;
      state.bulk.preview = { ...initialState.bulk.preview };
    },
    setBulkFilters(state, action) {
      state.bulk.filters = action.payload;
      state.bulk.preview = { ...initialState.bulk.preview };
    },
    clearBulkPreview(state) {
      state.bulk.preview = { ...initialState.bulk.preview };
      state.bulk.runError = null;
    },

    // ADM-028
    setAiJobFilters(state, action) {
      state.aiJobs.query.filters = action.payload;
      state.aiJobs.query.page = 1;
    },
    setAiJobSearch(state, action) {
      state.aiJobs.query.search = action.payload;
      state.aiJobs.query.page = 1;
    },
    setAiJobPage(state, action) {
      state.aiJobs.query.page = action.payload;
    },
    setAiJobPageSize(state, action) {
      state.aiJobs.query.pageSize = action.payload;
      state.aiJobs.query.page = 1;
    },
    clearAiJobFilters(state) {
      state.aiJobs.query.filters = { status: '', manufacturerId: '', failureCode: '' };
      state.aiJobs.query.search = '';
      state.aiJobs.query.page = 1;
    },

    // ADM-029. Overriding a field and merely accepting it are different acts,
    // and the reviewer has to be able to see which they did.
    setAiFieldOverride(state, action) {
      const { field, value } = action.payload;
      state.aiJob.overrides[field] = value;
      if (!state.aiJob.reviewed.includes(field)) state.aiJob.reviewed.push(field);
    },
    acceptAiField(state, action) {
      const field = action.payload;
      delete state.aiJob.overrides[field];
      if (!state.aiJob.reviewed.includes(field)) state.aiJob.reviewed.push(field);
    },
    clearAiJob(state) {
      state.aiJob = { ...initialState.aiJob, overrides: {}, reviewed: [] };
    },

    // ADM-030
    setAiCreditFilters(state, action) {
      state.aiCredits.query.filters = action.payload;
      state.aiCredits.query.page = 1;
    },
    setAiCreditSearch(state, action) {
      state.aiCredits.query.search = action.payload;
      state.aiCredits.query.page = 1;
    },
    setAiCreditPage(state, action) {
      state.aiCredits.query.page = action.payload;
    },

    // ADM-031
    setRangeFilters(state, action) {
      state.visibility.ranges.query.filters = action.payload;
      state.visibility.ranges.query.page = 1;
    },
    setRangeSearch(state, action) {
      state.visibility.ranges.query.search = action.payload;
      state.visibility.ranges.query.page = 1;
    },
    setRangePage(state, action) {
      state.visibility.ranges.query.page = action.payload;
    },
    // Putting the designs down again. The screen calls this on unmount, so an
    // unsealed range does not survive a navigation.
    resealRange(state) {
      state.visibility.unseal = { ...initialState.visibility.unseal };
    },
    dismissCatalogueError(state, action) {
      const section = action.payload;
      if (state[section]) {
        state[section].actionError = null;
        state[section].saveError = null;
      }
    },
  },

  extraReducers: (builder) => {
    // ADM-023
    wire(builder, fetchModerationQueue, pickModeration, (state, action) => {
      state.moderation.items = action.payload.items;
      state.moderation.total = action.payload.total;
    });
    wire(builder, fetchModerationCounts, pickModeration, (state, action) => {
      state.moderation.counts = action.payload;
    }, 'countsStatus');
    wire(builder, decideProducts, pickModeration, (state, action) => {
      const updated = action.payload.updated;
      state.moderation.items = state.moderation.items.map(
        (row) => updated.find((next) => next.id === row.id) ?? row,
      );
      state.moderation.selectedIds = [];
    }, 'actionStatus');

    // ADM-024
    wire(builder, fetchProduct, pickProduct, (state, action) => {
      state.product.data = action.payload;
    });
    wire(builder, fetchProductAudit, pickProduct, (state, action) => {
      if (state.product.data) state.product.data.audit = action.payload.items;
    });
    wire(builder, decideProduct, pickProduct, (state, action) => {
      state.product.data = { ...state.product.data, ...action.payload };
    }, 'decisionStatus');

    // ADM-025
    wire(builder, fetchProductDraft, pickProductDraft, (state, action) => {
      state.productDraft.data = action.payload;
      // Kept so the editor can show what changed and what it is replacing.
      state.productDraft.original = action.payload;
      state.productDraft.dirty = false;
    });
    wire(builder, saveProduct, pickProductDraft, (state, action) => {
      state.productDraft.data = action.payload;
      state.productDraft.original = action.payload;
      state.productDraft.dirty = false;
    }, 'saveStatus');

    // ADM-026
    wire(builder, fetchCategories, pickCategories, (state, action) => {
      state.categories.items = action.payload.items;
    });
    wire(builder, saveCategory, pickCategoryDraft, (state) => {
      state.categories.draft.dirty = false;
    }, 'saveStatus');
    wire(builder, archiveCategory, pickCategories, (state, action) => {
      state.categories.items = state.categories.items.map((row) =>
        row.id === action.payload.category.id ? action.payload.category : row,
      );
    }, 'actionStatus');

    // ADM-027
    wire(builder, fetchAttributeSets, pickAttributes, (state, action) => {
      state.attributes.sets = action.payload.sets;
      state.attributes.definitions = action.payload.definitions;
      if (!state.attributes.activeSetId && action.payload.sets.length > 0) {
        const first = action.payload.sets[0];
        state.attributes.activeSetId = first.id;
        state.attributes.draft = {
          ...initialState.attributes.draft,
          data: { ...first, attributeIds: [...first.attributeIds], categoryIds: [...first.categoryIds] },
        };
      }
    });
    wire(builder, saveAttributeSet, pickAttributeDraft, (state, action) => {
      state.attributes.sets = state.attributes.sets.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
      state.attributes.draft.dirty = false;
    }, 'saveStatus');

    // ADM-032
    wire(builder, fetchMediaStandards, pickMedia, (state, action) => {
      state.mediaStandards.data = action.payload;
      state.mediaStandards.dirty = false;
    });
    wire(builder, fetchMediaCompliance, pickMedia, (state, action) => {
      state.mediaStandards.compliance = action.payload;
    }, 'complianceStatus');
    wire(builder, saveMediaStandards, pickMedia, (state, action) => {
      state.mediaStandards.data = action.payload;
      state.mediaStandards.dirty = false;
    }, 'saveStatus');

    // ADM-033
    wire(builder, fetchHsnCodes, pickHsn, (state, action) => {
      state.hsn.items = action.payload.items;
      state.hsn.total = action.payload.total;
    });
    wire(builder, saveHsnCode, (s) => s.hsn.draft, (state) => {
      state.hsn.draft.dirty = false;
    }, 'saveStatus');
    wire(builder, assignHsnCode, pickHsn, () => {}, 'actionStatus');

    // ADM-034
    wire(builder, previewBulkAction, pickBulkPreview, (state, action) => {
      state.bulk.preview.token = action.payload.previewToken;
      state.bulk.preview.items = action.payload.affected;
      state.bulk.preview.total = action.payload.total;
      state.bulk.preview.blocked = action.payload.blocked;
      state.bulk.preview.previewedAt = action.payload.previewedAt;
    });
    wire(builder, runBulkAction, pickBulk, (state, action) => {
      state.bulk.lastRun = action.payload;
      state.bulk.runs = [action.payload, ...state.bulk.runs];
      // The token is spent. Forcing a fresh preview is the whole safeguard.
      state.bulk.preview = { ...initialState.bulk.preview };
    }, 'runStatus');
    wire(builder, fetchBulkRuns, pickBulk, (state, action) => {
      state.bulk.runs = action.payload.items;
    }, 'runsStatus');

    // ADM-028
    wire(builder, fetchAiJobs, pickAiJobs, (state, action) => {
      state.aiJobs.items = action.payload.items;
      state.aiJobs.total = action.payload.total;
    });
    wire(builder, fetchAiJobCounts, pickAiJobs, (state, action) => {
      state.aiJobs.counts = action.payload;
    }, 'countsStatus');
    wire(builder, retryAiJob, pickAiJobs, (state, action) => {
      state.aiJobs.items = state.aiJobs.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'actionStatus');

    // ADM-029
    wire(builder, fetchAiJob, pickAiJob, (state, action) => {
      state.aiJob.data = action.payload;
      state.aiJob.overrides = {};
      state.aiJob.reviewed = [];
    });
    wire(builder, decideAiJob, pickAiJob, (state, action) => {
      state.aiJob.data = action.payload;
    }, 'decisionStatus');

    // ADM-030
    wire(builder, fetchAiCredits, pickAiCredits, (state, action) => {
      state.aiCredits.items = action.payload.items;
      state.aiCredits.total = action.payload.total;
    });
    wire(builder, fetchAiCreditsSummary, pickAiCredits, (state, action) => {
      state.aiCredits.summary = action.payload;
    }, 'summaryStatus');
    wire(builder, grantAiCredits, pickAiCredits, (state, action) => {
      state.aiCredits.items = state.aiCredits.items.map((row) =>
        row.manufacturerId === action.payload.manufacturerId ? action.payload : row,
      );
    }, 'actionStatus');

    // ADM-031
    wire(builder, fetchPrivateRanges, pickRanges, (state, action) => {
      state.visibility.ranges.items = action.payload.items;
      state.visibility.ranges.total = action.payload.total;
    });
    wire(builder, fetchPrivateRange, pickRange, (state, action) => {
      state.visibility.range.data = action.payload.range;
      state.visibility.range.grants = action.payload.grants;
      state.visibility.range.viewLogs = action.payload.viewLogs;
      state.visibility.range.unsealHistory = action.payload.unsealHistory;
      // Opening a different range puts the last one back in its box.
      state.visibility.unseal = { ...initialState.visibility.unseal };
    });
    wire(builder, revokeAccessGrant, pickVisibility, (state, action) => {
      state.visibility.range.grants = state.visibility.range.grants.map((grant) =>
        grant.id === action.payload.id ? action.payload : grant,
      );
    }, 'actionStatus');
    wire(builder, unsealPrivateRange, pickUnseal, (state, action) => {
      // Deliberately NOT written into range.data. The sealed shape is the
      // default and this reveal is session scoped, so a refresh re-seals.
      state.visibility.unseal.revealed = action.payload.pieces;
      state.visibility.unseal.expiresAt = action.payload.expiresAt;
    });
  },
});

export const {
  setModerationFilters, setModerationSearch, setModerationSort, setModerationPage,
  setModerationPageSize, clearModerationFilters, toggleModerationSelection, setModerationSelection,
  setProductDraftField, clearProductDraft,
  startCategoryDraft, setCategoryDraftField, clearCategoryDraft,
  setActiveAttributeSet, setAttributeDraftField, toggleAttributeInSet,
  setMediaStandardField,
  setHsnSearch, setHsnFilters, setHsnPage, startHsnDraft, setHsnDraftField, clearHsnDraft,
  setBulkAction, setBulkParams, setBulkFilters, clearBulkPreview,
  setAiJobFilters, setAiJobSearch, setAiJobPage, setAiJobPageSize, clearAiJobFilters,
  setAiFieldOverride, acceptAiField, clearAiJob,
  setAiCreditFilters, setAiCreditSearch, setAiCreditPage,
  setRangeFilters, setRangeSearch, setRangePage, resealRange,
  dismissCatalogueError,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectCatalogue = (state) => state.catalogue;

// listViewState() calls any non-empty filter "filtered", which is right on the
// other screens and wrong here: the queue opens with queue='awaiting' already
// applied, so an empty result would read as "no records match the current
// filters" when what actually happened is that nothing is waiting on a human.
// That deserves the all-clear, so the default filter does not count as
// filtering. Everything else does.
function moderationViewState({ status, items, query }) {
  const { queue, ...rest } = query.filters;
  const narrowed = queue !== DEFAULT_MODERATION_FILTERS.queue || Object.values(rest).some(Boolean);

  return listViewState({
    status,
    items,
    query: { search: query.search, filters: narrowed ? query.filters : {} },
  });
}

export const selectModerationQueue = createSelector([selectCatalogue], ({ moderation }) => ({
  listings: moderation.items,
  total: moderation.total,
  query: moderation.query,
  counts: moderation.counts,
  countsState: moderation.countsStatus,
  selectedIds: moderation.selectedIds,
  error: moderation.error,
  actionStatus: moderation.actionStatus,
  actionError: moderation.actionError,
  viewState: moderationViewState(moderation),
  allSelected: moderation.items.length > 0 && moderation.selectedIds.length === moderation.items.length,
  someSelected: moderation.selectedIds.length > 0 && moderation.selectedIds.length < moderation.items.length,
  // Bulk approve is refused server side for these, so the bar says so rather
  // than letting an operator press it and read an error afterwards.
  blockedFromApproval: moderation.items.filter(
    (row) => moderation.selectedIds.includes(row.id)
      && (row.visibility === 'private' || row.manufacturerStatus !== 'approved'),
  ).length,
}));

export const selectProductReview = createSelector([selectCatalogue], ({ product }) => ({
  listing: product.data,
  price: product.data?.price ?? null,
  media: product.data?.media ?? [],
  flags: product.data?.flags ?? [],
  audit: product.data?.audit ?? [],
  lockedByOrder: product.data?.lockedByOrder ?? false,
  error: product.error,
  decisionStatus: product.decisionStatus,
  decisionError: product.decisionError,
  viewState:
    product.status === STATUS.FAILED
      ? 'error'
      : product.data
        ? 'populated'
        : product.status === STATUS.SUCCEEDED
          ? 'empty'
          : 'loading',
}));

export const selectProductEditor = createSelector([selectCatalogue], ({ productDraft }) => {
  const draft = productDraft.data;
  const gross = Number(draft?.grossWeight ?? 0);
  const stone = Number(draft?.stoneWeight ?? 0);

  return {
    draft,
    original: productDraft.original,
    dirty: productDraft.dirty,
    saveStatus: productDraft.saveStatus,
    saveError: productDraft.saveError,
    error: productDraft.error,
    lockedByOrder: draft?.lockedByOrder ?? false,
    // Net weight is arithmetic, not an opinion. The editor shows it and never
    // lets it be typed, so the number the jeweller pays metal on cannot drift
    // away from the two numbers it comes from.
    derivedNetWeight: Number((gross - stone).toFixed(3)),
    weightsValid: gross > 0 && stone >= 0 && stone < gross,
    viewState:
      productDraft.status === STATUS.FAILED ? 'error' : draft ? 'populated' : 'loading',
  };
});

export const selectCategoryManager = createSelector([selectCatalogue], ({ categories, attributes, hsn }) => ({
  categories: categories.items,
  // Parents first with their children attached, so the screen renders a tree
  // without re-deriving the shape on every keystroke.
  tree: categories.items
    .filter((row) => !row.parentId)
    .map((parent) => ({
      ...parent,
      children: categories.items.filter((row) => row.parentId === parent.id),
      subtreeProductCount: categories.items
        .filter((row) => row.parentId === parent.id)
        .reduce((sum, row) => sum + row.productCount, 0),
    })),
  draft: categories.draft.data,
  dirty: categories.draft.dirty,
  saveStatus: categories.draft.saveStatus,
  saveError: categories.draft.saveError,
  actionStatus: categories.actionStatus,
  actionError: categories.actionError,
  attributeSetOptions: attributes.sets.map((set) => ({ value: set.id, label: set.name })),
  hsnOptions: hsn.items.filter((row) => row.kind === 'goods').map((row) => ({ value: row.code, label: `${row.code} - ${row.description}` })),
  error: categories.error,
  viewState: listViewState({
    status: categories.status,
    items: categories.items,
    query: { search: '', filters: {} },
  }),
}));

export const selectAttributeSets = createSelector([selectCatalogue], ({ attributes }) => {
  const draft = attributes.draft.data;

  return {
    sets: attributes.sets,
    definitions: attributes.definitions,
    activeSetId: attributes.activeSetId,
    draft,
    dirty: attributes.draft.dirty,
    saveStatus: attributes.draft.saveStatus,
    saveError: attributes.draft.saveError,
    error: attributes.error,
    // Grouped the way the form renders them, so the screen does not group.
    groups: ['metal', 'weight', 'stone', 'making', 'compliance'].map((group) => ({
      group,
      attributes: attributes.definitions.filter((row) => row.group === group),
    })),
    selectedIds: draft?.attributeIds ?? [],
    viewState: listViewState({
      status: attributes.status,
      items: attributes.sets,
      query: { search: '', filters: {} },
    }),
  };
});

export const selectMediaStandards = createSelector([selectCatalogue], ({ mediaStandards }) => {
  const compliance = mediaStandards.compliance;

  return {
    standards: mediaStandards.data,
    compliance,
    complianceState: mediaStandards.complianceStatus,
    dirty: mediaStandards.dirty,
    saveStatus: mediaStandards.saveStatus,
    saveError: mediaStandards.saveError,
    error: mediaStandards.error,
    compliantPercent: compliance && compliance.total
      ? Number(((compliance.compliant / compliance.total) * 100).toFixed(1))
      : null,
    viewState:
      mediaStandards.status === STATUS.FAILED
        ? 'error'
        : mediaStandards.data
          ? 'populated'
          : 'loading',
  };
});

export const selectHsnRegistry = createSelector([selectCatalogue], ({ hsn, categories }) => ({
  codes: hsn.items,
  total: hsn.total,
  query: hsn.query,
  draft: hsn.draft.data,
  dirty: hsn.draft.dirty,
  saveStatus: hsn.draft.saveStatus,
  saveError: hsn.draft.saveError,
  actionStatus: hsn.actionStatus,
  actionError: hsn.actionError,
  error: hsn.error,
  categoryOptions: categories.items
    .filter((row) => row.parentId)
    .map((row) => ({ value: row.id, label: row.name })),
  viewState: listViewState({ status: hsn.status, items: hsn.items, query: hsn.query }),
}));

export const selectBulkActions = createSelector([selectCatalogue], ({ bulk }) => {
  const filterCount = Object.values(bulk.filters).filter(Boolean).length;

  return {
    action: bulk.action,
    params: bulk.params,
    filters: bulk.filters,
    filterCount,
    preview: bulk.preview,
    previewState: bulk.preview.status,
    runStatus: bulk.runStatus,
    runError: bulk.runError,
    lastRun: bulk.lastRun,
    runs: bulk.runs,
    runsState: bulk.runsStatus,
    // The run button is dead until a preview of THIS selection has been seen.
    // A bulk archive that matched 400 listings instead of 4 cannot be undone.
    canPreview: Boolean(bulk.action) && filterCount > 0,
    canRun: Boolean(bulk.preview.token) && bulk.preview.total > 0,
  };
});

export const selectAiJobQueue = createSelector([selectCatalogue], ({ aiJobs }) => ({
  jobs: aiJobs.items,
  total: aiJobs.total,
  query: aiJobs.query,
  counts: aiJobs.counts,
  countsState: aiJobs.countsStatus,
  error: aiJobs.error,
  actionStatus: aiJobs.actionStatus,
  actionError: aiJobs.actionError,
  viewState: listViewState({ status: aiJobs.status, items: aiJobs.items, query: aiJobs.query }),
}));

export const selectAiListingReview = createSelector([selectCatalogue], ({ aiJob }) => {
  const job = aiJob.data;
  const extracted = job?.extracted ?? null;

  // One row per extracted field, carrying what the model said, what the human
  // did about it, and whether it still needs looking at. The screen renders
  // this list and does not re-derive any of it.
  const fields = extracted
    ? Object.entries(extracted).map(([name, entry]) => ({
        name,
        extractedValue: entry.value,
        confidence: entry.confidence,
        sourceImageIndex: entry.sourceImageIndex,
        overriddenValue: aiJob.overrides[name],
        isOverridden: Object.prototype.hasOwnProperty.call(aiJob.overrides, name),
        isReviewed: aiJob.reviewed.includes(name),
        needsReview: (job?.lowConfidenceFields ?? []).includes(name),
        acceptedValue: Object.prototype.hasOwnProperty.call(aiJob.overrides, name)
          ? aiJob.overrides[name]
          : entry.value,
      }))
    : [];

  const outstanding = fields.filter((field) => field.needsReview && !field.isReviewed);

  return {
    job,
    fields,
    media: job?.sourceImages ?? [],
    overrides: aiJob.overrides,
    outstanding: outstanding.map((field) => field.name),
    // The server refuses a publish while any low-confidence field is
    // unreviewed, so the button is disabled for the same reason rather than
    // letting the reviewer press it and read a 422.
    canPublish: Boolean(job) && job.status === 'needs_review' && outstanding.length === 0,
    decisionStatus: aiJob.decisionStatus,
    decisionError: aiJob.decisionError,
    error: aiJob.error,
    viewState:
      aiJob.status === STATUS.FAILED ? 'error' : job ? 'populated' : 'loading',
  };
});

export const selectAiCredits = createSelector([selectCatalogue], ({ aiCredits }) => ({
  accounts: aiCredits.items,
  total: aiCredits.total,
  query: aiCredits.query,
  summary: aiCredits.summary,
  summaryState: aiCredits.summaryStatus,
  usageSeries: aiCredits.summary?.usageSeries ?? [],
  actionStatus: aiCredits.actionStatus,
  actionError: aiCredits.actionError,
  error: aiCredits.error,
  viewState: listViewState({ status: aiCredits.status, items: aiCredits.items, query: aiCredits.query }),
}));

export const selectVisibilityOversight = createSelector([selectCatalogue], ({ visibility }) => ({
  ranges: visibility.ranges.items,
  total: visibility.ranges.total,
  query: visibility.ranges.query,
  range: visibility.range.data,
  grants: visibility.range.grants,
  viewLogs: visibility.range.viewLogs,
  unsealHistory: visibility.range.unsealHistory,
  rangeState: visibility.range.status,
  actionStatus: visibility.actionStatus,
  actionError: visibility.actionError,
  error: visibility.ranges.error,

  // The revealed pieces, if this session has broken the glass. Null is the
  // normal state and the screen must render the sealed panel for it.
  revealed: visibility.unseal.revealed,
  revealExpiresAt: visibility.unseal.expiresAt,
  unsealStatus: visibility.unseal.status,
  unsealError: visibility.unseal.error,
  activeGrantCount: visibility.range.grants.filter((grant) => grant.status === 'active').length,

  viewState: listViewState({
    status: visibility.ranges.status,
    items: visibility.ranges.items,
    query: visibility.ranges.query,
  }),
}));

export default slice.reducer;
