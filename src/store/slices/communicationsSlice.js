// Communications - ADM-085, 086, 089, 090.
//
// Four sections, one per screen, each with its own status and error.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as communicationsApi from '@/services/mock/communicationsApi';
import { listViewState } from '@/store/createListSlice';

function apiThunk(name, fn) {
  return createAsyncThunk(`communications/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

function queryThunk(name, fn, pickQuery) {
  return createAsyncThunk(`communications/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fn(pickQuery(getState().communications));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchBroadcasts = queryThunk('fetchBroadcasts', communicationsApi.listBroadcasts, (s) => s.broadcasts.query);
export const fetchBroadcastSummary = queryThunk('fetchBroadcastSummary', communicationsApi.getBroadcastSummary, (s) => ({
  filters: s.broadcasts.query.filters,
}));
export const cancelBroadcast = apiThunk('cancelBroadcast', communicationsApi.cancelBroadcast);

export const fetchBroadcast = apiThunk('fetchBroadcast', communicationsApi.getBroadcast);
export const fetchAudiences = apiThunk('fetchAudiences', communicationsApi.listAudiences);
export const estimateAudience = apiThunk('estimateAudience', communicationsApi.estimateAudience);
export const saveBroadcastDraft = apiThunk('saveBroadcastDraft', communicationsApi.saveBroadcastDraft);
export const scheduleBroadcast = apiThunk('scheduleBroadcast', communicationsApi.scheduleBroadcast);

export const fetchTemplates = queryThunk('fetchTemplates', communicationsApi.listTemplates, (s) => s.templates.query);
export const fetchTemplate = apiThunk('fetchTemplate', communicationsApi.getTemplate);
export const saveTemplate = apiThunk('saveTemplate', communicationsApi.saveTemplate);
export const previewTemplate = apiThunk('previewTemplate', communicationsApi.previewTemplate);

export const fetchDeliveries = queryThunk('fetchDeliveries', communicationsApi.listDeliveries, (s) => s.deliveries.query);
export const fetchDeliveryHealth = queryThunk('fetchDeliveryHealth', communicationsApi.getDeliveryHealth, (s) => ({
  filters: s.deliveries.query.filters,
}));
export const retryDelivery = apiThunk('retryDelivery', communicationsApi.retryDelivery);

export const submitApproval = apiThunk('submitApproval', communicationsApi.submitTemplateForApproval);
export const refreshApproval = apiThunk('refreshApproval', communicationsApi.refreshApprovalStatus);
export const withdrawApproval = apiThunk('withdrawApproval', communicationsApi.withdrawApproval);
export const fetchApprovalQueue = queryThunk(
  'fetchApprovalQueue',
  communicationsApi.listApprovalQueue,
  (s) => s.templates.approvalQueue.query,
);
export const bulkRetryDeliveries = apiThunk('bulkRetryDeliveries', communicationsApi.bulkRetryDeliveries);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const emptyDraft = {
  id: null,
  title: '',
  body: '',
  category: '',
  audience: { segment: '', city: '', memberCategory: '', memberIds: [] },
  channels: [],
  requiresAcknowledgement: false,
  scheduledFor: '',
};

const initialState = {
  broadcasts: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'createdAt', sortDir: 'desc',
      filters: { status: '', category: '', segment: '', channel: '' },
    },
    summary: null, summaryStatus: 'idle', summaryError: null,
    actionStatus: 'idle', actionError: null,
  },

  composer: {
    draft: { ...emptyDraft, audience: { ...emptyDraft.audience } },
    loaded: null,
    audiences: null, audiencesStatus: 'idle',
    estimate: null, estimateStatus: 'idle', estimateError: null,
    status: 'idle', error: null,
    saveStatus: 'idle', saveError: null,
    saved: null,
  },

  templates: {
    items: [], total: 0, status: 'idle', error: null,
    facets: null, counts: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'updatedAt', sortDir: 'desc',
      filters: { audience: '', kind: '', state: '', channel: '', locale: '' },
    },
    // Every variant waiting on TRAI DLT or Meta, with its lead time. The
    // library shows the count; the editor reads the row for one variant.
    approvalQueue: {
      items: [], total: 0, summary: null, status: 'idle', error: null,
      query: {
        page: 1, pageSize: 20, sortBy: 'submittedAt', sortDir: 'asc',
        filters: { authority: '', status: '', channel: '', locale: '' },
      },
    },

    editor: {
      template: null, variants: [], versions: [],
      channel: '', locale: 'en', bodyDraft: '', subjectDraft: '',
      preview: null, previewStatus: 'idle', previewError: null,
      status: 'idle', error: null,
      saveStatus: 'idle', saveError: null,

      // The approval workflow for the variant currently open.
      approval: {
        submitStatus: 'idle', submitError: null,
        refreshStatus: 'idle', refreshError: null,
        withdrawStatus: 'idle', withdrawError: null,
      },
    },
  },

  deliveries: {
    items: [], total: 0, status: 'idle', error: null,
    facets: null,
    query: {
      page: 1, pageSize: 25, search: '', sortBy: 'attemptedAt', sortDir: 'desc',
      filters: { channel: '', status: '', sourceType: '', failureCode: '', recipientType: '' },
    },
    // A failure queue is worked in bulk rather than one bounce at a time.
    selectedIds: [], bulkStatus: 'idle', bulkError: null, lastBulkRetry: null,
    health: null, healthStatus: 'idle', healthError: null,
    actionStatus: 'idle', actionError: null,
    lastRetry: null,
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

const pickBroadcasts = (s) => s.broadcasts;
const pickComposer = (s) => s.composer;
const pickTemplates = (s) => s.templates;
const pickEditor = (s) => s.templates.editor;
const pickDeliveries = (s) => s.deliveries;

const slice = createSlice({
  name: 'communications',
  initialState,
  reducers: {
    toggleDeliverySelection(state, action) {
      const id = action.payload;
      state.deliveries.selectedIds = state.deliveries.selectedIds.includes(id)
        ? state.deliveries.selectedIds.filter((row) => row !== id)
        : [...state.deliveries.selectedIds, id];
    },
    setDeliverySelection(state, action) { state.deliveries.selectedIds = action.payload; },
    clearBulkRetryResult(state) { state.deliveries.lastBulkRetry = null; state.deliveries.bulkError = null; },
    setApprovalFilters(state, action) {
      state.templates.approvalQueue.query.filters = action.payload;
      state.templates.approvalQueue.query.page = 1;
    },
    setApprovalPage(state, action) { state.templates.approvalQueue.query.page = action.payload; },

    setBroadcastSearch(state, action) { state.broadcasts.query.search = action.payload; state.broadcasts.query.page = 1; },
    setBroadcastFilters(state, action) { state.broadcasts.query.filters = action.payload; state.broadcasts.query.page = 1; },
    setBroadcastSort(state, action) { state.broadcasts.query.sortBy = action.payload.sortBy; state.broadcasts.query.sortDir = action.payload.sortDir; },
    setBroadcastPage(state, action) { state.broadcasts.query.page = action.payload; },
    setBroadcastPageSize(state, action) { state.broadcasts.query.pageSize = action.payload; state.broadcasts.query.page = 1; },
    clearBroadcastFilters(state) {
      state.broadcasts.query = { ...initialState.broadcasts.query, filters: { ...initialState.broadcasts.query.filters } };
    },

    setComposerField(state, action) {
      const { field, value } = action.payload;
      state.composer.draft[field] = value;
      state.composer.saveError = null;
    },
    setComposerAudience(state, action) {
      Object.assign(state.composer.draft.audience, action.payload);
      // The estimate describes the audience that was estimated, so it stops
      // being true the moment the audience changes.
      state.composer.estimate = null;
      state.composer.estimateStatus = 'idle';
      state.composer.saveError = null;
    },
    toggleComposerChannel(state, action) {
      const channel = action.payload;
      const channels = state.composer.draft.channels;
      state.composer.draft.channels = channels.includes(channel)
        ? channels.filter((row) => row !== channel)
        : [...channels, channel];
      state.composer.estimate = null;
      state.composer.estimateStatus = 'idle';
    },
    clearComposer(state) {
      state.composer = {
        ...initialState.composer,
        draft: { ...emptyDraft, audience: { ...emptyDraft.audience } },
      };
    },

    setTemplateSearch(state, action) { state.templates.query.search = action.payload; state.templates.query.page = 1; },
    setTemplateFilters(state, action) { state.templates.query.filters = action.payload; state.templates.query.page = 1; },
    setTemplateSort(state, action) { state.templates.query.sortBy = action.payload.sortBy; state.templates.query.sortDir = action.payload.sortDir; },
    setTemplatePage(state, action) { state.templates.query.page = action.payload; },
    setTemplatePageSize(state, action) { state.templates.query.pageSize = action.payload; state.templates.query.page = 1; },
    clearTemplateFilters(state) {
      state.templates.query = { ...initialState.templates.query, filters: { ...initialState.templates.query.filters } };
    },
    setEditorVariant(state, action) {
      const { channel, locale } = action.payload;
      const variant = state.templates.editor.variants.find(
        (row) => row.channel === channel && row.locale === locale,
      );
      state.templates.editor.channel = channel;
      state.templates.editor.locale = locale;
      state.templates.editor.bodyDraft = variant?.body ?? '';
      state.templates.editor.subjectDraft = variant?.subject ?? '';
      state.templates.editor.preview = null;
      state.templates.editor.previewStatus = 'idle';
      state.templates.editor.saveError = null;
    },
    setEditorBody(state, action) {
      state.templates.editor.bodyDraft = action.payload;
      state.templates.editor.preview = null;
      state.templates.editor.previewStatus = 'idle';
      state.templates.editor.saveError = null;
    },
    setEditorSubject(state, action) {
      state.templates.editor.subjectDraft = action.payload;
      state.templates.editor.saveError = null;
    },
    closeTemplateEditor(state) {
      state.templates.editor = { ...initialState.templates.editor };
    },

    setDeliverySearch(state, action) { state.deliveries.query.search = action.payload; state.deliveries.query.page = 1; },
    setDeliveryFilters(state, action) { state.deliveries.query.filters = action.payload; state.deliveries.query.page = 1; },
    setDeliverySort(state, action) { state.deliveries.query.sortBy = action.payload.sortBy; state.deliveries.query.sortDir = action.payload.sortDir; },
    setDeliveryPage(state, action) { state.deliveries.query.page = action.payload; },
    setDeliveryPageSize(state, action) { state.deliveries.query.pageSize = action.payload; state.deliveries.query.page = 1; },
    clearDeliveryFilters(state) {
      state.deliveries.query = { ...initialState.deliveries.query, filters: { ...initialState.deliveries.query.filters } };
    },
    dismissDeliveryAction(state) {
      state.deliveries.actionStatus = 'idle';
      state.deliveries.actionError = null;
      state.deliveries.lastRetry = null;
    },
  },

  extraReducers: (builder) => {
    // ---- template approval, ADM-089 -----------------------------------
    wire(builder, fetchApprovalQueue, (st) => st.templates.approvalQueue, (st, action) => {
      st.templates.approvalQueue.items = action.payload.items;
      st.templates.approvalQueue.total = action.payload.total;
      st.templates.approvalQueue.summary = action.payload.summary;
    });

    const applyApproval = (st, action) => {
      const row = action.payload;
      st.templates.editor.variants = st.templates.editor.variants.map((variant) =>
        variant.channel === row.channel && variant.locale === row.locale
          ? { ...variant, approval: { ...variant.approval, ...row }, canSend: row.canSend }
          : variant,
      );
      st.templates.approvalQueue.items = st.templates.approvalQueue.items.map((item) =>
        item.variantId === row.variantId ? row : item,
      );
    };

    wire(builder, submitApproval, (st) => st.templates.editor.approval, applyApproval, 'submitStatus');
    wire(builder, refreshApproval, (st) => st.templates.editor.approval, applyApproval, 'refreshStatus');
    wire(builder, withdrawApproval, (st) => st.templates.editor.approval, applyApproval, 'withdrawStatus');

    // ---- bulk retry, ADM-090 -------------------------------------------
    wire(builder, bulkRetryDeliveries, (st) => st.deliveries, (st, action) => {
      st.deliveries.lastBulkRetry = action.payload;
      st.deliveries.selectedIds = [];
    }, 'bulkStatus');

    wire(builder, fetchBroadcasts, pickBroadcasts, (state, action) => {
      state.broadcasts.items = action.payload.items;
      state.broadcasts.total = action.payload.total;
    });
    wire(builder, fetchBroadcastSummary, pickBroadcasts, (state, action) => {
      state.broadcasts.summary = action.payload;
    }, 'summaryStatus');
    wire(builder, cancelBroadcast, pickBroadcasts, (state, action) => {
      // Patch the row in the queue too, so the table behind the dialog does not
      // go stale while the operator is still looking at it.
      const index = state.broadcasts.items.findIndex((row) => row.id === action.payload.id);
      if (index >= 0) state.broadcasts.items[index] = action.payload;
    }, 'actionStatus');

    wire(builder, fetchBroadcast, pickComposer, (state, action) => {
      const { broadcast } = action.payload;
      state.composer.loaded = broadcast;
      state.composer.draft = {
        id: broadcast.id,
        title: broadcast.title,
        body: broadcast.body,
        category: broadcast.category,
        audience: {
          segment: broadcast.audience.segment,
          city: broadcast.audience.city ?? '',
          memberCategory: broadcast.audience.memberCategory ?? '',
          memberIds: broadcast.audience.memberIds ?? [],
        },
        channels: broadcast.channels,
        requiresAcknowledgement: broadcast.requiresAcknowledgement,
        scheduledFor: broadcast.scheduledFor ?? '',
      };
    });
    wire(builder, fetchAudiences, pickComposer, (state, action) => {
      state.composer.audiences = action.payload;
    }, 'audiencesStatus');
    wire(builder, estimateAudience, pickComposer, (state, action) => {
      state.composer.estimate = action.payload;
    }, 'estimateStatus');
    wire(builder, saveBroadcastDraft, pickComposer, (state, action) => {
      state.composer.saved = action.payload;
      state.composer.draft.id = action.payload.id;
    }, 'saveStatus');
    wire(builder, scheduleBroadcast, pickComposer, (state, action) => {
      state.composer.saved = action.payload;
    }, 'saveStatus');

    wire(builder, fetchTemplates, pickTemplates, (state, action) => {
      state.templates.items = action.payload.items;
      state.templates.total = action.payload.total;
      state.templates.facets = action.payload.facets;
      state.templates.counts = action.payload.counts;
    });
    wire(builder, fetchTemplate, pickEditor, (state, action) => {
      const { template, variants, versions } = action.payload;
      const first = variants[0] ?? null;
      Object.assign(state.templates.editor, {
        template,
        variants,
        versions,
        channel: first?.channel ?? '',
        locale: first?.locale ?? 'en',
        bodyDraft: first?.body ?? '',
        subjectDraft: first?.subject ?? '',
        preview: null,
        previewStatus: 'idle',
      });
    });
    wire(builder, saveTemplate, pickEditor, (state, action) => {
      state.templates.editor.template = action.payload.template;
      state.templates.editor.variants = action.payload.variants;
      const index = state.templates.items.findIndex((row) => row.id === action.payload.template.id);
      if (index >= 0) state.templates.items[index] = action.payload.template;
    }, 'saveStatus');
    wire(builder, previewTemplate, pickEditor, (state, action) => {
      state.templates.editor.preview = action.payload;
    }, 'previewStatus');

    wire(builder, fetchDeliveries, pickDeliveries, (state, action) => {
      state.deliveries.items = action.payload.items;
      state.deliveries.total = action.payload.total;
      state.deliveries.facets = action.payload.facets;
    });
    wire(builder, fetchDeliveryHealth, pickDeliveries, (state, action) => {
      state.deliveries.health = action.payload;
    }, 'healthStatus');
    wire(builder, retryDelivery, pickDeliveries, (state, action) => {
      state.deliveries.lastRetry = action.payload;
      const index = state.deliveries.items.findIndex((row) => row.id === action.payload.id);
      if (index >= 0) state.deliveries.items[index] = action.payload;
    }, 'actionStatus');
  },
});

export const {
  toggleDeliverySelection,
  setDeliverySelection,
  clearBulkRetryResult,
  setApprovalFilters,
  setApprovalPage,
  setBroadcastSearch, setBroadcastFilters, setBroadcastSort, setBroadcastPage,
  setBroadcastPageSize, clearBroadcastFilters,
  setComposerField, setComposerAudience, toggleComposerChannel, clearComposer,
  setTemplateSearch, setTemplateFilters, setTemplateSort, setTemplatePage,
  setTemplatePageSize, clearTemplateFilters,
  setEditorVariant, setEditorBody, setEditorSubject, closeTemplateEditor,
  setDeliverySearch, setDeliveryFilters, setDeliverySort, setDeliveryPage,
  setDeliveryPageSize, clearDeliveryFilters, dismissDeliveryAction,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectCommunications = (state) => state.communications;

const simpleViewState = (status, hasData) =>
  status === 'failed' ? 'error'
    : status === 'loading' || status === 'idle' ? 'loading'
      : hasData ? 'populated' : 'empty';

export const selectBroadcastConsole = createSelector([selectCommunications], ({ broadcasts }) => ({
  broadcasts: broadcasts.items,
  total: broadcasts.total,
  query: broadcasts.query,
  summary: broadcasts.summary,
  facets: broadcasts.summary?.facets ?? null,
  viewState: listViewState({
    status: broadcasts.status,
    items: broadcasts.items,
    query: { search: broadcasts.query.search, filters: broadcasts.query.filters },
  }),
  actionStatus: broadcasts.actionStatus,
  actionError: broadcasts.actionError,
  error: broadcasts.error,
}));

export const selectBroadcastComposer = createSelector([selectCommunications], ({ composer }) => {
  const { draft, loaded, estimate } = composer;
  const segment = draft.audience.segment;
  // City and category segments are not an audience until the second choice has
  // been made, so the form must not offer an estimate or a send before then.
  const audienceComplete = Boolean(segment)
    && (segment !== 'city' || Boolean(draft.audience.city))
    && (segment !== 'category' || Boolean(draft.audience.memberCategory))
    && (segment !== 'custom' || draft.audience.memberIds.length > 0);

  return {
    draft,
    loaded,
    // A broadcast that has started going out is settled history. The composer
    // renders it read-only rather than pretending an edit will reach anybody.
    isImmutable: loaded ? loaded.editable === false : false,
    audiences: composer.audiences,
    segmentOptions: composer.audiences?.segments ?? [],
    cityOptions: composer.audiences?.cities ?? [],
    categoryOptions: composer.audiences?.categories ?? [],
    estimate,
    estimateStatus: composer.estimateStatus,
    estimateError: composer.estimateError,
    audienceComplete,
    canEstimate: audienceComplete && draft.channels.length > 0,
    canSave: Boolean(draft.title.trim()) && Boolean(draft.body.trim())
      && Boolean(draft.category) && draft.channels.length > 0 && audienceComplete,
    canSchedule: Boolean(estimate) && estimate.recipientCount > 0,
    viewState: simpleViewState(
      composer.audiencesStatus,
      Boolean(composer.audiences),
    ),
    loadStatus: composer.status,
    saveStatus: composer.saveStatus,
    saveError: composer.saveError,
    saved: composer.saved,
    error: composer.error,
  };
});

export const selectTemplateLibrary = createSelector([selectCommunications], ({ templates }) => {
  const { editor } = templates;
  const variant = editor.variants.find(
    (row) => row.channel === editor.channel && row.locale === editor.locale,
  ) ?? null;

  return {
    templates: templates.items,
    total: templates.total,
    query: templates.query,
    facets: templates.facets,
    counts: templates.counts,
    viewState: listViewState({
      status: templates.status,
      items: templates.items,
      query: { search: templates.query.search, filters: templates.query.filters },
    }),
    editor: {
      ...editor,
      variant,
      // A transactional template is the message that says the money moved. A
      // member cannot opt out of it, so the archive control is not offered.
      canArchive: editor.template ? !editor.template.mandatory : false,
      canSave: Boolean(editor.bodyDraft.trim()) && editor.bodyDraft !== variant?.body,
      canPreview: Boolean(editor.channel),
    },
    editorViewState: simpleViewState(editor.status, Boolean(editor.template)),
    error: templates.error,
  };
});

export const selectDeliveryLog = createSelector([selectCommunications], ({ deliveries }) => ({
  deliveries: deliveries.items,
  total: deliveries.total,
  query: deliveries.query,
  facets: deliveries.facets,
  health: deliveries.health,
  channelHealth: deliveries.health?.byChannel ?? [],
  topFailures: deliveries.health?.topFailures ?? [],
  viewState: listViewState({
    status: deliveries.status,
    items: deliveries.items,
    query: { search: deliveries.query.search, filters: deliveries.query.filters },
  }),
  healthViewState: simpleViewState(deliveries.healthStatus, Boolean(deliveries.health)),
  actionStatus: deliveries.actionStatus,
  actionError: deliveries.actionError,
  lastRetry: deliveries.lastRetry,
  error: deliveries.error,
}));


// The approval board behind ADM-089. `blockedChannels` is the number that
// matters: channel-and-language pairs that cannot send anything at all until
// somebody clears an approval.
export const selectApprovalQueue = createSelector([selectCommunications], ({ templates }) => ({
  approvals: templates.approvalQueue.items,
  total: templates.approvalQueue.total,
  summary: templates.approvalQueue.summary,
  query: templates.approvalQueue.query,
  viewState: listViewState({
    status: templates.approvalQueue.status,
    items: templates.approvalQueue.items,
    query: templates.approvalQueue.query,
  }),
  error: templates.approvalQueue.error,
}));

// The approval state of the variant currently open in the editor, plus the
// warning the editor needs BEFORE a save: editing an approved body voids the
// approval and costs the full lead time again.
export const selectTemplateEditorApproval = createSelector([selectCommunications], ({ templates }) => {
  const editor = templates.editor;
  const variant = editor.variants.find(
    (row) => row.channel === editor.channel && row.locale === editor.locale,
  ) ?? null;
  const approval = variant?.approval ?? null;

  return {
    variant,
    approval,
    required: Boolean(approval?.required),
    canSend: variant ? Boolean(variant.canSend) : true,
    willResetApproval:
      Boolean(approval?.required) &&
      ['approved', 'pending'].includes(approval?.status) &&
      editor.bodyDraft !== '' &&
      editor.bodyDraft !== variant?.body,
    submitStatus: editor.approval.submitStatus,
    submitError: editor.approval.submitError,
    refreshStatus: editor.approval.refreshStatus,
    refreshError: editor.approval.refreshError,
    withdrawStatus: editor.approval.withdrawStatus,
    withdrawError: editor.approval.withdrawError,
  };
});

// Bulk retry on the failure queue - ADM-090.
export const selectDeliverySelection = createSelector([selectCommunications], ({ deliveries }) => ({
  selectedIds: deliveries.selectedIds,
  bulkStatus: deliveries.bulkStatus,
  bulkError: deliveries.bulkError,
  lastBulkRetry: deliveries.lastBulkRetry,
}));

export default slice.reducer;
