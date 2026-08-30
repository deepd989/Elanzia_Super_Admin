// Growth and content - ADM-072 to ADM-081.
//
// Ten sections, each with its own status and error, because ten screens cannot
// share one loading flag. Loads use `status`; saves use `saveStatus` and
// `saveError`, so a save in flight never swaps a form for a page skeleton and
// loses what the editor typed. Selectors at the foot are the seam - a screen
// reads exactly one of them and nothing else.
//
// Three selectors carry the public surface guard's output (`blocked` on
// collections and banners, `withheld` on SEO) so no screen re-derives it. The
// guard itself lives in the API and never in a screen.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { listViewState } from '@/store/createListSlice';
import * as growthApi from '@/services/mock/growthApi';

function apiThunk(name, fn) {
  return createAsyncThunk(`growth/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({
        code: error.code ?? 'unknown',
        message: error.message,
        // The guard's rejections carry the offending pieces. Losing them here
        // would leave the screen able to say "refused" and nothing else.
        blocked: error.blocked ?? null,
        usedBy: error.usedBy ?? null,
      });
    }
  });
}

function queryThunk(name, fn, pickQuery) {
  return createAsyncThunk(`growth/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fn(pickQuery(getState().growth));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

// ADM-072
export const fetchInvitations = queryThunk('fetchInvitations', growthApi.listInvitations, (s) => s.invitations.query);
export const fetchInvitationCounts = queryThunk('fetchInvitationCounts', growthApi.getInvitationCounts, (s) => ({
  search: s.invitations.query.search,
  filters: s.invitations.query.filters,
}));
export const fetchAttribution = apiThunk('fetchAttribution', growthApi.getAttribution);
export const resendInvitation = apiThunk('resendInvitation', growthApi.resendInvitation);
export const revokeInvitation = apiThunk('revokeInvitation', growthApi.revokeInvitation);
export const graduateBuyer = apiThunk('graduateBuyer', growthApi.graduateBuyer);

// ADM-073
export const fetchExhibitions = apiThunk('fetchExhibitions', growthApi.listExhibitions);
export const fetchExhibition = apiThunk('fetchExhibition', growthApi.getExhibition);
export const saveExhibition = apiThunk('saveExhibition', growthApi.saveExhibition);
export const fetchStalls = apiThunk('fetchStalls', growthApi.listStalls);
export const saveStall = apiThunk('saveStall', growthApi.saveStall);
export const issueStallQr = apiThunk('issueStallQr', growthApi.issueStallQr);

// ADM-074
export const fetchExhibitionReport = apiThunk('fetchExhibitionReport', growthApi.getExhibitionReport);
export const fetchShowLeads = queryThunk('fetchShowLeads', growthApi.listShowLeads, (s) => ({
  showId: s.showReport.showId,
  ...s.showReport.leadQuery,
}));
export const recordFollowUp = apiThunk('recordFollowUp', growthApi.recordFollowUp);

// ADM-075
export const fetchPages = queryThunk('fetchPages', growthApi.listPages, (s) => s.pages.query);
export const fetchPage = apiThunk('fetchPage', growthApi.getPage);
export const savePage = apiThunk('savePage', growthApi.savePage);
export const publishPage = apiThunk('publishPage', growthApi.publishPage);
export const unpublishPage = apiThunk('unpublishPage', growthApi.unpublishPage);

// ADM-076
export const fetchMedia = queryThunk('fetchMedia', growthApi.listMedia, (s) => s.media.query);
export const saveMediaAsset = apiThunk('saveMediaAsset', growthApi.updateMediaAsset);
export const deleteMediaAsset = apiThunk('deleteMediaAsset', growthApi.deleteMediaAsset);

// ADM-077
export const fetchCollections = queryThunk('fetchCollections', growthApi.listCollections, (s) => s.collections.query);
export const fetchCollection = apiThunk('fetchCollection', growthApi.getCollection);
export const saveCollection = apiThunk('saveCollection', growthApi.saveCollection);
export const publishCollection = apiThunk('publishCollection', growthApi.publishCollection);

// ADM-078
export const fetchBanners = queryThunk('fetchBanners', growthApi.listBanners, (s) => s.banners.query);
export const saveBanner = apiThunk('saveBanner', growthApi.saveBanner);
export const reorderBanner = apiThunk('reorderBanner', growthApi.reorderBanner);

// ADM-079
export const fetchPageTemplates = apiThunk('fetchPageTemplates', growthApi.listPageTemplates);
export const savePageTemplate = apiThunk('savePageTemplate', growthApi.savePageTemplate);
export const previewPageTemplate = apiThunk('previewPageTemplate', growthApi.previewPageTemplate);

// ADM-080
export const fetchSeoSettings = apiThunk('fetchSeoSettings', growthApi.getSeoSettings);
export const saveSeoSettings = apiThunk('saveSeoSettings', growthApi.updateSeoSettings);
export const fetchSitemap = apiThunk('fetchSitemap', growthApi.getSitemap);
export const rebuildSitemap = apiThunk('rebuildSitemap', growthApi.rebuildSitemap);

// ADM-081
export const fetchRedirects = queryThunk('fetchRedirects', growthApi.listRedirects, (s) => s.redirects.query);
export const saveRedirect = apiThunk('saveRedirect', growthApi.saveRedirect);
export const deleteRedirect = apiThunk('deleteRedirect', growthApi.deleteRedirect);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const DEFAULT_INVITATION_FILTERS = { status: '', mode: '', introducerId: '', feeState: '' };

const draftShape = { data: null, saveStatus: 'idle', saveError: null, dirty: false };

const initialState = {
  invitations: {
    items: [], total: 0, status: 'idle', error: null,
    query: {
      page: 1, pageSize: 20, search: '', sortBy: 'sentAt', sortDir: 'desc',
      filters: { ...DEFAULT_INVITATION_FILTERS },
    },
    counts: null, countsStatus: 'idle',
    attribution: { data: null, status: 'idle', error: null },
    actionStatus: 'idle', actionError: null,
  },

  exhibitions: {
    items: [], status: 'idle', error: null,
    activeShowId: null,
    draft: { ...draftShape },
    stalls: [], stallsStatus: 'idle',
    actionStatus: 'idle', actionError: null,
  },

  showReport: {
    showId: null, report: null, status: 'idle', error: null,
    leads: [], leadsTotal: 0, leadsStatus: 'idle',
    leadQuery: {
      page: 1, pageSize: 20, search: '', sortBy: 'scannedAt', sortDir: 'desc',
      filters: { stallId: '', outcome: '', followUpState: '' },
    },
    actionStatus: 'idle', actionError: null,
  },

  pages: {
    items: [], total: 0, status: 'idle', error: null,
    query: { page: 1, pageSize: 20, search: '', sortBy: 'updatedAt', sortDir: 'desc', filters: { status: '' } },
    draft: { data: null, status: 'idle', error: null, ...draftShape },
    publishStatus: 'idle', publishError: null,
  },

  media: {
    items: [], total: 0, status: 'idle', error: null,
    query: { page: 1, pageSize: 24, search: '', sortBy: 'uploadedAt', sortDir: 'desc', filters: { type: '', usage: '' } },
    selectedId: null,
    saveStatus: 'idle', saveError: null,
    actionStatus: 'idle', actionError: null,
  },

  collections: {
    items: [], total: 0, status: 'idle', error: null,
    query: { page: 1, pageSize: 20, search: '', sortBy: 'updatedAt', sortDir: 'desc', filters: { status: '', surface: '' } },
    draft: { data: null, status: 'idle', error: null, ...draftShape },
    // What the guard refused, kept beside the draft rather than merged into it.
    // The screen has to show which pieces were rejected and why, and a merge
    // would lose the reason.
    blocked: [],
    publishStatus: 'idle', publishError: null,
  },

  banners: {
    items: [], slots: [], total: 0, status: 'idle', error: null,
    query: { page: 1, pageSize: 50, search: '', filters: { slot: '', status: '' } },
    draft: { ...draftShape },
    blocked: [],
    actionStatus: 'idle', actionError: null,
  },

  templates: {
    items: [], status: 'idle', error: null,
    activeTemplateId: null,
    draft: { ...draftShape },
    // Server computed, and nulled by any draft edit - a preview of a pattern
    // you have since changed is worse than no preview.
    preview: { data: null, status: 'idle', error: null },
  },

  seo: {
    settings: null, status: 'idle', error: null,
    saveStatus: 'idle', saveError: null, dirty: false,
    sitemap: null, sitemapStatus: 'idle', sitemapError: null,
    rebuildStatus: 'idle', rebuildError: null,
  },

  redirects: {
    items: [], total: 0, counts: null, status: 'idle', error: null,
    query: { page: 1, pageSize: 20, search: '', sortBy: 'fromPath', sortDir: 'asc', filters: { kind: '', health: '' } },
    draft: { ...draftShape },
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

const pickInvitations = (s) => s.invitations;
const pickAttribution = (s) => s.invitations.attribution;
const pickExhibitions = (s) => s.exhibitions;
const pickExhibitionDraft = (s) => s.exhibitions.draft;
const pickShowReport = (s) => s.showReport;
const pickPages = (s) => s.pages;
const pickPageDraft = (s) => s.pages.draft;
const pickMedia = (s) => s.media;
const pickCollections = (s) => s.collections;
const pickCollectionDraft = (s) => s.collections.draft;
const pickBanners = (s) => s.banners;
const pickBannerDraft = (s) => s.banners.draft;
const pickTemplates = (s) => s.templates;
const pickTemplateDraft = (s) => s.templates.draft;
const pickTemplatePreview = (s) => s.templates.preview;
const pickSeo = (s) => s.seo;
const pickRedirects = (s) => s.redirects;
const pickRedirectDraft = (s) => s.redirects.draft;

// A detail or form section has no items to count, so listViewState does not
// apply. Three states is all it has.
function simpleViewState(status, hasData) {
  if (status === 'failed') return 'error';
  if (hasData) return 'populated';
  return status === 'succeeded' ? 'empty' : 'loading';
}

const slice = createSlice({
  name: 'growth',
  initialState,
  reducers: {
    // ADM-072. Any filter change resets to page one.
    setInvitationFilters(state, action) {
      state.invitations.query.filters = action.payload;
      state.invitations.query.page = 1;
    },
    setInvitationSearch(state, action) {
      state.invitations.query.search = action.payload;
      state.invitations.query.page = 1;
    },
    setInvitationPage(state, action) {
      state.invitations.query.page = action.payload;
    },
    setInvitationSort(state, action) {
      state.invitations.query.sortBy = action.payload.sortBy;
      state.invitations.query.sortDir = action.payload.sortDir;
    },
    clearInvitationFilters(state) {
      state.invitations.query.filters = { ...DEFAULT_INVITATION_FILTERS };
      state.invitations.query.search = '';
      state.invitations.query.page = 1;
    },
    closeAttribution(state) {
      state.invitations.attribution = { data: null, status: 'idle', error: null };
    },

    // ADM-073
    setActiveShow(state, action) {
      state.exhibitions.activeShowId = action.payload;
      state.exhibitions.draft = { ...draftShape };
    },
    startExhibitionDraft(state, action) {
      state.exhibitions.draft = {
        ...draftShape,
        data: action.payload ?? {
          id: null, name: '', venue: '', city: '', startsOn: '', endsOn: '', status: 'planned', notes: '',
        },
      };
    },
    setExhibitionDraftField(state, action) {
      const { field, value } = action.payload;
      state.exhibitions.draft.data[field] = value;
      state.exhibitions.draft.dirty = true;
    },
    clearExhibitionDraft(state) {
      state.exhibitions.draft = { ...draftShape };
    },

    // ADM-074
    setShowReportId(state, action) {
      state.showReport.showId = action.payload;
      state.showReport.leadQuery.page = 1;
    },
    setLeadFilters(state, action) {
      state.showReport.leadQuery.filters = action.payload;
      state.showReport.leadQuery.page = 1;
    },
    setLeadPage(state, action) {
      state.showReport.leadQuery.page = action.payload;
    },

    // ADM-075
    setPageFilters(state, action) {
      state.pages.query.filters = action.payload;
      state.pages.query.page = 1;
    },
    setPageSearch(state, action) {
      state.pages.query.search = action.payload;
      state.pages.query.page = 1;
    },
    setPagesPage(state, action) {
      state.pages.query.page = action.payload;
    },
    startPageDraft(state, action) {
      state.pages.draft = {
        ...draftShape,
        status: 'succeeded',
        error: null,
        data: action.payload ?? {
          id: null, title: '', slug: '', body: '', excerpt: '',
          metaTitle: '', metaDescription: '', heroAssetId: null, status: 'draft',
        },
      };
    },
    setPageDraftField(state, action) {
      const { field, value } = action.payload;
      state.pages.draft.data[field] = value;
      state.pages.draft.dirty = true;
    },
    clearPageDraft(state) {
      state.pages.draft = { data: null, status: 'idle', error: null, ...draftShape };
    },

    // ADM-076
    setMediaFilters(state, action) {
      state.media.query.filters = action.payload;
      state.media.query.page = 1;
    },
    setMediaSearch(state, action) {
      state.media.query.search = action.payload;
      state.media.query.page = 1;
    },
    setMediaPage(state, action) {
      state.media.query.page = action.payload;
    },
    selectMediaAsset(state, action) {
      state.media.selectedId = action.payload;
      state.media.saveError = null;
      state.media.actionError = null;
    },

    // ADM-077
    setCollectionFilters(state, action) {
      state.collections.query.filters = action.payload;
      state.collections.query.page = 1;
    },
    setCollectionSearch(state, action) {
      state.collections.query.search = action.payload;
      state.collections.query.page = 1;
    },
    setCollectionsPage(state, action) {
      state.collections.query.page = action.payload;
    },
    startCollectionDraft(state, action) {
      state.collections.draft = {
        ...draftShape,
        status: 'succeeded',
        error: null,
        data: action.payload ?? {
          id: null, title: '', slug: '', description: '', surface: 'homepage',
          heroAssetId: null, productIds: [], status: 'draft',
        },
      };
      state.collections.blocked = action.payload?.blocked ?? [];
    },
    setCollectionDraftField(state, action) {
      const { field, value } = action.payload;
      state.collections.draft.data[field] = value;
      state.collections.draft.dirty = true;
    },
    toggleCollectionProduct(state, action) {
      const draft = state.collections.draft.data;
      if (!draft) return;
      const id = action.payload;
      draft.productIds = draft.productIds.includes(id)
        ? draft.productIds.filter((candidate) => candidate !== id)
        : [...draft.productIds, id];
      state.collections.draft.dirty = true;
      // The server decides what is blocked, and it has not been asked yet.
      // Clearing here stops a stale verdict sitting under a changed selection.
      state.collections.blocked = [];
    },
    clearCollectionDraft(state) {
      state.collections.draft = { data: null, status: 'idle', error: null, ...draftShape };
      state.collections.blocked = [];
    },

    // ADM-078
    setBannerFilters(state, action) {
      state.banners.query.filters = action.payload;
    },
    startBannerDraft(state, action) {
      state.banners.draft = {
        ...draftShape,
        data: action.payload ?? {
          id: null, slot: 'home_hero', title: '', subtitle: '', assetId: null,
          ctaLabel: '', ctaPath: '', linkedProductId: null, status: 'draft',
        },
      };
      state.banners.blocked = [];
    },
    setBannerDraftField(state, action) {
      const { field, value } = action.payload;
      state.banners.draft.data[field] = value;
      state.banners.draft.dirty = true;
      state.banners.blocked = [];
    },
    clearBannerDraft(state) {
      state.banners.draft = { ...draftShape };
      state.banners.blocked = [];
    },

    // ADM-079
    setActiveTemplate(state, action) {
      const template = state.templates.items.find((row) => row.id === action.payload);
      state.templates.activeTemplateId = action.payload;
      state.templates.draft = { ...draftShape, data: template ? { ...template } : null };
      state.templates.preview = { data: null, status: 'idle', error: null };
    },
    setTemplateDraftField(state, action) {
      const { field, value } = action.payload;
      state.templates.draft.data[field] = value;
      state.templates.draft.dirty = true;
      // A preview of a pattern that has since changed is a lie with numbers
      // on it, so editing throws it away.
      state.templates.preview = { data: null, status: 'idle', error: null };
    },

    // ADM-080
    setSeoField(state, action) {
      const { field, value } = action.payload;
      state.seo.settings[field] = value;
      state.seo.dirty = true;
    },

    // ADM-081
    setRedirectFilters(state, action) {
      state.redirects.query.filters = action.payload;
      state.redirects.query.page = 1;
    },
    setRedirectSearch(state, action) {
      state.redirects.query.search = action.payload;
      state.redirects.query.page = 1;
    },
    setRedirectsPage(state, action) {
      state.redirects.query.page = action.payload;
    },
    setRedirectSort(state, action) {
      state.redirects.query.sortBy = action.payload.sortBy;
      state.redirects.query.sortDir = action.payload.sortDir;
    },
    startRedirectDraft(state, action) {
      state.redirects.draft = {
        ...draftShape,
        data: action.payload ?? { id: null, fromPath: '', toPath: '', kind: 301, reason: '' },
      };
    },
    setRedirectDraftField(state, action) {
      const { field, value } = action.payload;
      state.redirects.draft.data[field] = value;
      state.redirects.draft.dirty = true;
    },
    clearRedirectDraft(state) {
      state.redirects.draft = { ...draftShape };
    },
  },

  extraReducers: (builder) => {
    // ADM-072
    wire(builder, fetchInvitations, pickInvitations, (state, action) => {
      state.invitations.items = action.payload.items;
      state.invitations.total = action.payload.total;
    });
    wire(builder, fetchInvitationCounts, pickInvitations, (state, action) => {
      state.invitations.counts = action.payload;
    }, 'countsStatus');
    wire(builder, fetchAttribution, pickAttribution, (state, action) => {
      state.invitations.attribution.data = action.payload;
    });
    [resendInvitation, revokeInvitation, graduateBuyer].forEach((thunk) => {
      wire(builder, thunk, pickInvitations, (state, action) => {
        state.invitations.items = state.invitations.items.map((row) =>
          row.id === action.payload.id ? action.payload : row,
        );
      }, 'actionStatus');
    });

    // ADM-073
    wire(builder, fetchExhibitions, pickExhibitions, (state, action) => {
      state.exhibitions.items = action.payload.items;
      if (!state.exhibitions.activeShowId && action.payload.items.length > 0) {
        state.exhibitions.activeShowId = action.payload.items[0].id;
      }
    });
    wire(builder, fetchExhibition, pickExhibitions, (state, action) => {
      state.exhibitions.items = state.exhibitions.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    });
    wire(builder, fetchStalls, pickExhibitions, (state, action) => {
      state.exhibitions.stalls = action.payload.items;
    }, 'stallsStatus');
    wire(builder, saveExhibition, pickExhibitionDraft, (state, action) => {
      state.exhibitions.items = state.exhibitions.items.some((row) => row.id === action.payload.id)
        ? state.exhibitions.items.map((row) => (row.id === action.payload.id ? action.payload : row))
        : [action.payload, ...state.exhibitions.items];
      state.exhibitions.draft.dirty = false;
    }, 'saveStatus');
    [saveStall, issueStallQr].forEach((thunk) => {
      wire(builder, thunk, pickExhibitions, (state, action) => {
        state.exhibitions.stalls = state.exhibitions.stalls.some((row) => row.id === action.payload.id)
          ? state.exhibitions.stalls.map((row) => (row.id === action.payload.id ? action.payload : row))
          : [...state.exhibitions.stalls, action.payload];
      }, 'actionStatus');
    });

    // ADM-074
    wire(builder, fetchExhibitionReport, pickShowReport, (state, action) => {
      state.showReport.report = action.payload;
    });
    wire(builder, fetchShowLeads, pickShowReport, (state, action) => {
      state.showReport.leads = action.payload.items;
      state.showReport.leadsTotal = action.payload.total;
    }, 'leadsStatus');
    wire(builder, recordFollowUp, pickShowReport, (state, action) => {
      state.showReport.leads = state.showReport.leads.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'actionStatus');

    // ADM-075
    wire(builder, fetchPages, pickPages, (state, action) => {
      state.pages.items = action.payload.items;
      state.pages.total = action.payload.total;
    });
    wire(builder, fetchPage, pickPageDraft, (state, action) => {
      state.pages.draft.data = action.payload;
      state.pages.draft.dirty = false;
    });
    wire(builder, savePage, pickPageDraft, (state, action) => {
      state.pages.draft.data = action.payload;
      state.pages.draft.dirty = false;
      state.pages.items = state.pages.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'saveStatus');
    [publishPage, unpublishPage].forEach((thunk) => {
      wire(builder, thunk, pickPages, (state, action) => {
        state.pages.draft.data = action.payload;
        state.pages.items = state.pages.items.map((row) =>
          row.id === action.payload.id ? action.payload : row,
        );
      }, 'publishStatus');
    });

    // ADM-076
    wire(builder, fetchMedia, pickMedia, (state, action) => {
      state.media.items = action.payload.items;
      state.media.total = action.payload.total;
    });
    wire(builder, saveMediaAsset, pickMedia, (state, action) => {
      state.media.items = state.media.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'saveStatus');
    wire(builder, deleteMediaAsset, pickMedia, (state, action) => {
      state.media.items = state.media.items.filter((row) => row.id !== action.payload.assetId);
      state.media.selectedId = null;
    }, 'actionStatus');

    // ADM-077
    wire(builder, fetchCollections, pickCollections, (state, action) => {
      state.collections.items = action.payload.items;
      state.collections.total = action.payload.total;
    });
    wire(builder, fetchCollection, pickCollectionDraft, (state, action) => {
      state.collections.draft.data = action.payload;
      state.collections.draft.dirty = false;
      state.collections.blocked = action.payload.blocked;
    });
    wire(builder, saveCollection, pickCollectionDraft, (state, action) => {
      state.collections.draft.data = action.payload;
      state.collections.draft.dirty = false;
      state.collections.blocked = action.payload.blocked;
    }, 'saveStatus');
    wire(builder, publishCollection, pickCollections, (state, action) => {
      state.collections.draft.data = action.payload;
      state.collections.blocked = action.payload.blocked;
      state.collections.items = state.collections.items.map((row) =>
        row.id === action.payload.id ? action.payload : row,
      );
    }, 'publishStatus');

    // ADM-078
    wire(builder, fetchBanners, pickBanners, (state, action) => {
      state.banners.items = action.payload.items;
      state.banners.total = action.payload.total;
      state.banners.slots = action.payload.slots;
    });
    wire(builder, saveBanner, pickBannerDraft, (state, action) => {
      state.banners.items = state.banners.items.some((row) => row.id === action.payload.id)
        ? state.banners.items.map((row) => (row.id === action.payload.id ? action.payload : row))
        : [...state.banners.items, action.payload];
      state.banners.draft.dirty = false;
      state.banners.blocked = action.payload.blocked;
    }, 'saveStatus');
    wire(builder, reorderBanner, pickBanners, (state, action) => {
      state.banners.items = state.banners.items.map(
        (row) => action.payload.items.find((next) => next.id === row.id) ?? row,
      );
    }, 'actionStatus');

    // ADM-079
    wire(builder, fetchPageTemplates, pickTemplates, (state, action) => {
      state.templates.items = action.payload.items;
      if (!state.templates.activeTemplateId && action.payload.items.length > 0) {
        const first = action.payload.items[0];
        state.templates.activeTemplateId = first.id;
        state.templates.draft = { ...draftShape, data: { ...first } };
      }
    });
    wire(builder, savePageTemplate, pickTemplateDraft, (state, action) => {
      state.templates.items = state.templates.items.map((row) =>
        row.id === action.payload.id ? { ...row, ...action.payload } : row,
      );
      state.templates.draft.data = { ...state.templates.draft.data, ...action.payload };
      state.templates.draft.dirty = false;
    }, 'saveStatus');
    wire(builder, previewPageTemplate, pickTemplatePreview, (state, action) => {
      state.templates.preview.data = action.payload;
    });

    // ADM-080
    wire(builder, fetchSeoSettings, pickSeo, (state, action) => {
      state.seo.settings = action.payload;
      state.seo.dirty = false;
    });
    wire(builder, saveSeoSettings, pickSeo, (state, action) => {
      state.seo.settings = action.payload;
      state.seo.dirty = false;
    }, 'saveStatus');
    wire(builder, fetchSitemap, pickSeo, (state, action) => {
      state.seo.sitemap = action.payload;
    }, 'sitemapStatus');
    wire(builder, rebuildSitemap, pickSeo, (state, action) => {
      state.seo.sitemap = action.payload;
    }, 'rebuildStatus');

    // ADM-081
    wire(builder, fetchRedirects, pickRedirects, (state, action) => {
      state.redirects.items = action.payload.items;
      state.redirects.total = action.payload.total;
      state.redirects.counts = action.payload.counts;
    });
    wire(builder, saveRedirect, pickRedirectDraft, (state, action) => {
      state.redirects.items = state.redirects.items.some((row) => row.id === action.payload.id)
        ? state.redirects.items.map((row) => (row.id === action.payload.id ? action.payload : row))
        : [action.payload, ...state.redirects.items];
      state.redirects.draft.dirty = false;
    }, 'saveStatus');
    wire(builder, deleteRedirect, pickRedirects, (state, action) => {
      state.redirects.items = state.redirects.items.filter((row) => row.id !== action.payload.redirectId);
    }, 'actionStatus');

    // The guard's verdict travels on the REJECTION as well as on success, and
    // it is the rejection that matters most - a refused save is exactly when
    // the curator needs to be told which three of their twelve pieces cannot
    // go out. A matcher rather than addCase, because wire() has already
    // registered the rejected case for each of these and RTK allows one
    // reducer per action type.
    builder.addMatcher(
      (action) =>
        [saveCollection.rejected.type, publishCollection.rejected.type].includes(action.type),
      (state, action) => {
        state.collections.blocked = action.payload?.blocked ?? [];
      },
    );
    builder.addMatcher(
      (action) => action.type === saveBanner.rejected.type,
      (state, action) => {
        state.banners.blocked = action.payload?.blocked ?? [];
      },
    );
  },
});

export const {
  setInvitationFilters, setInvitationSearch, setInvitationPage, setInvitationSort,
  clearInvitationFilters, closeAttribution,
  setActiveShow, startExhibitionDraft, setExhibitionDraftField, clearExhibitionDraft,
  setShowReportId, setLeadFilters, setLeadPage,
  setPageFilters, setPageSearch, setPagesPage, startPageDraft, setPageDraftField, clearPageDraft,
  setMediaFilters, setMediaSearch, setMediaPage, selectMediaAsset,
  setCollectionFilters, setCollectionSearch, setCollectionsPage, startCollectionDraft,
  setCollectionDraftField, toggleCollectionProduct, clearCollectionDraft,
  setBannerFilters, startBannerDraft, setBannerDraftField, clearBannerDraft,
  setActiveTemplate, setTemplateDraftField,
  setSeoField,
  setRedirectFilters, setRedirectSearch, setRedirectsPage, setRedirectSort,
  startRedirectDraft, setRedirectDraftField, clearRedirectDraft,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectGrowth = (state) => state.growth;

export const selectInvitationOversight = createSelector([selectGrowth], ({ invitations }) => ({
  invitationRows: invitations.items,
  total: invitations.total,
  query: invitations.query,
  counts: invitations.counts,
  countsState: invitations.countsStatus,
  attribution: invitations.attribution.data,
  attributionState: invitations.attribution.status,
  attributionError: invitations.attribution.error,
  actionStatus: invitations.actionStatus,
  actionError: invitations.actionError,
  error: invitations.error,
  viewState: listViewState({
    status: invitations.status,
    items: invitations.items,
    query: invitations.query,
  }),
}));

export const selectExhibitionSetup = createSelector([selectGrowth], ({ exhibitions }) => {
  const activeShow = exhibitions.items.find((row) => row.id === exhibitions.activeShowId) ?? null;

  return {
    shows: exhibitions.items,
    activeShowId: exhibitions.activeShowId,
    activeShow,
    stalls: exhibitions.stalls,
    stallsState: exhibitions.stallsStatus,
    draft: exhibitions.draft.data,
    dirty: exhibitions.draft.dirty,
    saveStatus: exhibitions.draft.saveStatus,
    saveError: exhibitions.draft.saveError,
    actionStatus: exhibitions.actionStatus,
    actionError: exhibitions.actionError,
    error: exhibitions.error,
    // A closed show is a historical record. Its scan numbers were reported to
    // the manufacturers who paid for the stalls, so nothing about it moves.
    readOnly: activeShow?.status === 'closed',
    stallsWithoutQr: exhibitions.stalls.filter((stall) => !stall.qrToken).length,
    viewState: listViewState({
      status: exhibitions.status,
      items: exhibitions.items,
      query: { search: '', filters: {} },
    }),
  };
});

export const selectShowReport = createSelector([selectGrowth], ({ showReport }) => ({
  showId: showReport.showId,
  report: showReport.report,
  exhibition: showReport.report?.exhibition ?? null,
  funnel: showReport.report?.funnel ?? null,
  scansByDay: showReport.report?.scansByDay ?? [],
  leaderboard: showReport.report?.stallLeaderboard ?? [],
  leads: showReport.leads,
  leadsTotal: showReport.leadsTotal,
  leadQuery: showReport.leadQuery,
  leadsState: showReport.leadsStatus,
  actionStatus: showReport.actionStatus,
  actionError: showReport.actionError,
  error: showReport.error,
  viewState: simpleViewState(showReport.status, Boolean(showReport.report)),
  leadsViewState: listViewState({
    status: showReport.leadsStatus,
    items: showReport.leads,
    query: showReport.leadQuery,
  }),
}));

export const selectCmsPages = createSelector([selectGrowth], ({ pages, media }) => {
  const draft = pages.draft.data;

  return {
    pageRows: pages.items,
    total: pages.total,
    query: pages.query,
    draft,
    dirty: pages.draft.dirty,
    saveStatus: pages.draft.saveStatus,
    saveError: pages.draft.saveError,
    publishStatus: pages.publishStatus,
    publishError: pages.publishError,
    error: pages.error,
    assetOptions: media.items.map((asset) => ({ value: asset.id, label: asset.label })),
    // The publish guard's two conditions, answered before the button is
    // pressed rather than after the 422 comes back.
    canPublish: Boolean(
      draft && draft.id && draft.status !== 'published' &&
      String(draft.metaDescription ?? '').trim() && String(draft.body ?? '').trim(),
    ),
    missingMetaDescription: Boolean(draft && !String(draft.metaDescription ?? '').trim()),
    viewState: listViewState({ status: pages.status, items: pages.items, query: pages.query }),
    editorViewState: simpleViewState(pages.draft.status, Boolean(draft)),
  };
});

export const selectMediaLibrary = createSelector([selectGrowth], ({ media }) => {
  const selected = media.items.find((row) => row.id === media.selectedId) ?? null;

  return {
    assets: media.items,
    total: media.total,
    query: media.query,
    selected,
    // MediaViewer takes { id, type, url, label, caption }, and the shaping
    // happens here rather than in markup - the trustSlice convention.
    viewerItems: selected
      ? [{
          id: selected.id,
          type: selected.type,
          url: selected.url,
          label: selected.label,
          caption: selected.altText,
        }]
      : [],
    saveStatus: media.saveStatus,
    saveError: media.saveError,
    actionStatus: media.actionStatus,
    actionError: media.actionError,
    error: media.error,
    // An in-use asset cannot be deleted, so the button is disabled for the
    // same reason the server would refuse it.
    canDelete: Boolean(selected) && selected.usageCount === 0,
    missingAltCount: media.items.filter((row) => row.type === 'image' && !row.altText).length,
    viewState: listViewState({ status: media.status, items: media.items, query: media.query }),
  };
});

export const selectCollectionCuration = createSelector([selectGrowth], ({ collections, media }) => {
  const draft = collections.draft.data;

  return {
    collectionRows: collections.items,
    total: collections.total,
    query: collections.query,
    draft,
    items: draft?.items ?? [],
    dirty: collections.draft.dirty,
    saveStatus: collections.draft.saveStatus,
    saveError: collections.draft.saveError,
    publishStatus: collections.publishStatus,
    publishError: collections.publishError,
    error: collections.error,
    assetOptions: media.items.map((asset) => ({ value: asset.id, label: asset.label })),

    // The guard's verdict, from the server. A screen never decides for itself
    // whether a piece may go public.
    blocked: collections.blocked,
    blockedCount: collections.blocked.length,
    canPublish: Boolean(
      draft && draft.id && draft.status !== 'published' &&
      (draft.productIds?.length ?? 0) > 0 && collections.blocked.length === 0,
    ),
    // How many rows across the whole list are publishing something they should
    // not. This is the number that matters on a Monday morning.
    liveWithBlocked: collections.items.filter(
      (row) => row.status === 'published' && row.blocked.length > 0,
    ).length,

    viewState: listViewState({ status: collections.status, items: collections.items, query: collections.query }),
    editorViewState: simpleViewState(collections.draft.status, Boolean(draft)),
  };
});

export const selectBannerMerchandising = createSelector([selectGrowth], ({ banners, media }) => ({
  bannerRows: banners.items,
  slots: banners.slots,
  total: banners.total,
  query: banners.query,
  draft: banners.draft.data,
  dirty: banners.draft.dirty,
  saveStatus: banners.draft.saveStatus,
  saveError: banners.draft.saveError,
  actionStatus: banners.actionStatus,
  actionError: banners.actionError,
  error: banners.error,
  assetOptions: media.items.map((asset) => ({ value: asset.id, label: asset.label })),
  blocked: banners.blocked,
  // Grouped the way the screen renders them, so the screen does not group.
  bySlot: banners.slots.map((slot) => ({
    ...slot,
    banners: banners.items
      .filter((row) => row.slot === slot.id)
      .sort((a, b) => a.order - b.order),
    full: banners.items.filter((row) => row.slot === slot.id && row.status === 'live').length >= slot.maxLive,
  })),
  liveWithBlocked: banners.items.filter((row) => row.status === 'live' && row.blocked.length > 0).length,
  viewState: listViewState({ status: banners.status, items: banners.items, query: banners.query }),
}));

export const selectPageTemplates = createSelector([selectGrowth], ({ templates }) => {
  const preview = templates.preview.data;

  return {
    templates: templates.items,
    activeTemplateId: templates.activeTemplateId,
    draft: templates.draft.data,
    dirty: templates.draft.dirty,
    saveStatus: templates.draft.saveStatus,
    saveError: templates.draft.saveError,
    error: templates.error,
    preview,
    previewState: templates.preview.status,
    previewError: templates.preview.error,
    generated: preview?.generated ?? [],
    suppressed: preview?.suppressed ?? [],
    // Reported apart, because they are different failures. Suppressed means
    // there was never enough stock to fill the page; withheld means there was,
    // and it is not allowed out.
    withheldCount: preview?.withheldCount ?? 0,
    suppressedCount: preview?.suppressedCount ?? 0,
    generatedCount: preview?.generatedCount ?? 0,
    viewState: listViewState({
      status: templates.status,
      items: templates.items,
      query: { search: '', filters: {} },
    }),
  };
});

export const selectSeoSettings = createSelector([selectGrowth], ({ seo, media }) => ({
  settings: seo.settings,
  dirty: seo.dirty,
  saveStatus: seo.saveStatus,
  saveError: seo.saveError,
  error: seo.error,
  sitemap: seo.sitemap,
  sitemapState: seo.sitemapStatus,
  sitemapError: seo.sitemapError,
  rebuildStatus: seo.rebuildStatus,
  assetOptions: media.items
    .filter((asset) => asset.type === 'image')
    .map((asset) => ({ value: asset.id, label: asset.label })),

  // The guard's output at the last surface before a crawler. Named apart so
  // the screen can say seventeen pieces were withheld and why, rather than
  // showing a total that quietly went down.
  withheld: seo.sitemap?.withheld ?? [],
  withheldCount: seo.sitemap?.withheldCount ?? 0,
  sitemapStale: Boolean(seo.sitemap?.stale),
  // One select away from taking the whole site out of every index, so the
  // screen puts a confirm in front of it.
  siteIsNoindex: seo.settings?.robotsPolicy === 'noindex',
  viewState: simpleViewState(seo.status, Boolean(seo.settings)),
}));

export const selectRedirects = createSelector([selectGrowth], ({ redirects }) => ({
  redirectRows: redirects.items,
  total: redirects.total,
  counts: redirects.counts,
  query: redirects.query,
  draft: redirects.draft.data,
  dirty: redirects.draft.dirty,
  saveStatus: redirects.draft.saveStatus,
  saveError: redirects.draft.saveError,
  actionStatus: redirects.actionStatus,
  actionError: redirects.actionError,
  error: redirects.error,
  // Health is computed across the whole table by the server, because a
  // redirect's health depends on the others. These are the rows to fix first.
  unhealthyCount: (redirects.counts?.loop ?? 0) + (redirects.counts?.chained ?? 0) + (redirects.counts?.shadowed ?? 0),
  viewState: listViewState({ status: redirects.status, items: redirects.items, query: redirects.query }),
}));

export default slice.reducer;
