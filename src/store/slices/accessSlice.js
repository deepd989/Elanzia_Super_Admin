// Access and shell - ADM-001 to ADM-009.
//
// Six sections, each with its own status and error, because nine screens
// cannot share one loading flag. Selectors at the foot of the file are the
// seam: a screen reads exactly one of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import * as accessApi from '@/services/mock/accessApi';
import { expandPermissions, lockedBy } from '@/config/permissions';
import { listViewState } from '@/store/createListSlice';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code (otp_incorrect renders
// differently from account_locked) and render the message.
function apiThunk(name, fn) {
  return createAsyncThunk(`access/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const signIn = apiThunk('signIn', accessApi.signIn);
export const verifyOtp = apiThunk('verifyOtp', accessApi.verifyOtp);
export const resendOtp = apiThunk('resendOtp', accessApi.resendOtp);
export const verifyTwoFactor = apiThunk('verifyTwoFactor', accessApi.verifyTwoFactor);
export const requestPasswordReset = apiThunk('requestPasswordReset', accessApi.requestPasswordReset);
export const resetPassword = apiThunk('resetPassword', accessApi.resetPassword);
export const signOut = apiThunk('signOut', accessApi.signOut);

export const fetchProfile = apiThunk('fetchProfile', accessApi.getProfile);
export const saveProfile = apiThunk('saveProfile', accessApi.updateProfile);
export const saveNotificationPreferences = apiThunk(
  'saveNotificationPreferences',
  accessApi.updateNotificationPreferences,
);

export const fetchStaff = createAsyncThunk('access/fetchStaff', async (_, { getState, rejectWithValue }) => {
  try {
    return await accessApi.listStaff(getState().access.staff.query);
  } catch (error) {
    return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
  }
});
export const inviteStaff = apiThunk('inviteStaff', accessApi.inviteStaff);
export const resendInvite = apiThunk('resendInvite', accessApi.resendInvite);
export const deactivateStaff = apiThunk('deactivateStaff', accessApi.deactivateStaff);
export const reactivateStaff = apiThunk('reactivateStaff', accessApi.reactivateStaff);

export const fetchRoles = apiThunk('fetchRoles', accessApi.listRoles);
export const fetchPermissionCatalogue = apiThunk(
  'fetchPermissionCatalogue',
  accessApi.getPermissionCatalogue,
);
export const fetchRole = apiThunk('fetchRole', accessApi.getRole);
export const createRole = apiThunk('createRole', accessApi.createRole);
export const updateRole = apiThunk('updateRole', accessApi.updateRole);
export const deleteRole = apiThunk('deleteRole', accessApi.deleteRole);

export const fetchNavPreview = apiThunk('fetchNavPreview', accessApi.getNavigationForRole);

export const fetchImpersonationTargets = createAsyncThunk(
  'access/fetchImpersonationTargets',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await accessApi.listImpersonationTargets(getState().access.impersonation.targets.query);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  },
);
export const startImpersonation = apiThunk('startImpersonation', accessApi.startImpersonation);
export const endImpersonation = apiThunk('endImpersonation', accessApi.endImpersonation);
export const fetchImpersonationSessions = createAsyncThunk(
  'access/fetchImpersonationSessions',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await accessApi.listImpersonationSessions(getState().access.impersonation.sessions.query);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  },
);

export const fetchLocales = apiThunk('fetchLocales', accessApi.listLocales);
export const fetchTranslations = createAsyncThunk(
  'access/fetchTranslations',
  async (_, { getState, rejectWithValue }) => {
    try {
      return await accessApi.listTranslations(getState().access.translations.query);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  },
);
export const saveTranslation = apiThunk('saveTranslation', accessApi.updateTranslation);
export const publishLocale = apiThunk('publishLocale', accessApi.publishLocale);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState = {
  // ADM-001, ADM-002, ADM-003. One object, because signing in is a single
  // conversation with the server spanning three screens. `step` is what those
  // screens switch on, so the flow cannot be entered halfway from a URL.
  session: {
    step: 'credentials',
    challengeId: null,
    resetToken: null,
    method: 'password',
    identifier: '',
    maskedDestination: null,
    codeExpiresAt: null,
    attemptsRemaining: 5,
    twoFactorMethod: null,
    currentUser: null,
    role: null,
    grantedPermissions: [],
    status: 'idle',
    error: null,
  },

  profile: {
    data: null,
    status: 'idle',
    error: null,
    saveStatus: 'idle',
    saveError: null,
  },

  staff: {
    items: [],
    total: 0,
    status: 'idle',
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'name',
      sortDir: 'asc',
      filters: { roleId: '', status: '' },
    },
    selectedIds: [],
    actionStatus: 'idle',
    actionError: null,
  },

  roles: {
    items: [],
    total: 0,
    status: 'idle',
    error: null,
    query: { page: 1, pageSize: 50, search: '' },
    catalogue: { modules: [], status: 'idle', error: null },
    draft: {
      data: null,
      status: 'idle',
      error: null,
      saveStatus: 'idle',
      saveError: null,
      dirty: false,
    },
  },

  navPreview: { roleId: null, sections: [], grantedPermissions: [], status: 'idle', error: null },

  impersonation: {
    targets: {
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      query: {
        page: 1,
        pageSize: 20,
        search: '',
        sortBy: 'businessName',
        sortDir: 'asc',
        filters: { targetType: '', status: '' },
      },
    },
    active: null,
    sessions: {
      items: [],
      total: 0,
      status: 'idle',
      error: null,
      query: { page: 1, pageSize: 10, sortBy: 'startedAt', sortDir: 'desc', filters: { adminId: '' } },
    },
    actionStatus: 'idle',
    actionError: null,
  },

  translations: {
    items: [],
    total: 0,
    status: 'idle',
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'key',
      sortDir: 'asc',
      filters: { locale: 'hi', module: '', state: '' },
    },
    locales: [],
    localesStatus: 'idle',
    localesError: null,
    editing: { key: null, saveStatus: 'idle', saveError: null },
  },
};

// Wires the three async states onto one section. Spelling this out for all 28
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

const pickSession = (state) => state.session;
const pickProfile = (state) => state.profile;
const pickStaff = (state) => state.staff;
const pickRoles = (state) => state.roles;
const pickDraft = (state) => state.roles.draft;
const pickTargets = (state) => state.impersonation.targets;
const pickSessions = (state) => state.impersonation.sessions;
const pickImpersonation = (state) => state.impersonation;
const pickTranslations = (state) => state.translations;

const slice = createSlice({
  name: 'access',
  initialState,
  reducers: {
    setIdentifier(state, action) {
      state.session.identifier = action.payload;
    },
    setSignInMethod(state, action) {
      state.session.method = action.payload;
      state.session.error = null;
    },
    // Sends the flow back to the start. Used by "use a different account" and
    // by every screen that finds itself mounted at the wrong step.
    resetSignIn(state) {
      state.session = { ...initialState.session, identifier: state.session.identifier };
    },
    startPasswordReset(state) {
      state.session.step = 'reset_requested';
      state.session.error = null;
    },

    setStaffSearch(state, action) {
      state.staff.query.search = action.payload;
      state.staff.query.page = 1;
    },
    setStaffFilters(state, action) {
      state.staff.query.filters = action.payload;
      state.staff.query.page = 1;
    },
    setStaffSort(state, action) {
      state.staff.query.sortBy = action.payload.sortBy;
      state.staff.query.sortDir = action.payload.sortDir;
    },
    setStaffPage(state, action) {
      state.staff.query.page = action.payload;
    },
    setStaffPageSize(state, action) {
      state.staff.query.pageSize = action.payload;
      state.staff.query.page = 1;
    },
    clearStaffFilters(state) {
      state.staff.query = { ...initialState.staff.query };
    },
    toggleStaffSelection(state, action) {
      const id = action.payload;
      state.staff.selectedIds = state.staff.selectedIds.includes(id)
        ? state.staff.selectedIds.filter((candidate) => candidate !== id)
        : [...state.staff.selectedIds, id];
    },
    setStaffSelection(state, action) {
      state.staff.selectedIds = action.payload;
    },

    // ADM-007. The draft is edited locally and saved in one go, so an admin
    // can rework a permission set without every tick hitting the server.
    startRoleDraft(state, action) {
      state.roles.draft = {
        ...initialState.roles.draft,
        data: action.payload ?? { id: null, name: '', description: '', permissions: [] },
      };
    },
    setRoleDraftField(state, action) {
      const { field, value } = action.payload;
      state.roles.draft.data[field] = value;
      state.roles.draft.dirty = true;
    },
    // Ticking a permission pulls in everything it implies. Unticking is
    // refused while a granted permission still depends on it, because a role
    // that can approve an application it cannot open is broken, not strict.
    toggleRolePermission(state, action) {
      const id = action.payload;
      const draft = state.roles.draft.data;
      const granted = draft.permissions;

      if (granted.includes(id)) {
        if (lockedBy(expandPermissions(granted), id).length > 0) return;
        draft.permissions = granted.filter((candidate) => candidate !== id);
      } else {
        // Transitively: settle implies reconcile, which implies view. Adding
        // only the direct parent would leave view unticked while the role
        // still held it, so the grid would disagree with itself.
        draft.permissions = [...new Set([...granted, ...expandPermissions([id])])];
      }
      state.roles.draft.dirty = true;
    },
    // Module-level select all and clear, for the checkbox group header.
    setModulePermissions(state, action) {
      const { permissionIds, granted } = action.payload;
      const draft = state.roles.draft.data;

      if (granted) {
        const next = new Set([...draft.permissions, ...expandPermissions(permissionIds)]);
        draft.permissions = [...next];
      } else {
        const removable = permissionIds.filter(
          (id) => lockedBy(expandPermissions(draft.permissions.filter((p) => !permissionIds.includes(p))), id).length === 0,
        );
        draft.permissions = draft.permissions.filter((id) => !removable.includes(id));
      }
      state.roles.draft.dirty = true;
    },
    clearRoleDraft(state) {
      state.roles.draft = { ...initialState.roles.draft };
    },

    setNavPreviewRole(state, action) {
      state.navPreview.roleId = action.payload;
    },

    setTargetSearch(state, action) {
      state.impersonation.targets.query.search = action.payload;
      state.impersonation.targets.query.page = 1;
    },
    setTargetFilters(state, action) {
      state.impersonation.targets.query.filters = action.payload;
      state.impersonation.targets.query.page = 1;
    },
    setTargetPage(state, action) {
      state.impersonation.targets.query.page = action.payload;
    },
    setTargetPageSize(state, action) {
      state.impersonation.targets.query.pageSize = action.payload;
      state.impersonation.targets.query.page = 1;
    },
    clearTargetFilters(state) {
      state.impersonation.targets.query = { ...initialState.impersonation.targets.query };
    },

    setTranslationSearch(state, action) {
      state.translations.query.search = action.payload;
      state.translations.query.page = 1;
    },
    setTranslationFilters(state, action) {
      state.translations.query.filters = action.payload;
      state.translations.query.page = 1;
    },
    setTranslationSort(state, action) {
      state.translations.query.sortBy = action.payload.sortBy;
      state.translations.query.sortDir = action.payload.sortDir;
    },
    setTranslationPage(state, action) {
      state.translations.query.page = action.payload;
    },
    setTranslationPageSize(state, action) {
      state.translations.query.pageSize = action.payload;
      state.translations.query.page = 1;
    },
    clearTranslationFilters(state) {
      state.translations.query = {
        ...initialState.translations.query,
        filters: { ...initialState.translations.query.filters, locale: state.translations.query.filters.locale },
      };
    },
    setEditingTranslation(state, action) {
      state.translations.editing = { key: action.payload, saveStatus: 'idle', saveError: null };
    },
  },

  extraReducers: (builder) => {
    // ---- session -------------------------------------------------------
    wire(builder, signIn, pickSession, (state, action) => {
      Object.assign(state.session, {
        step: action.payload.nextStep,
        challengeId: action.payload.challengeId,
        method: action.payload.method,
        maskedDestination: action.payload.maskedDestination,
        twoFactorMethod: action.payload.twoFactorMethod,
        codeExpiresAt: action.payload.codeExpiresAt,
        attemptsRemaining: action.payload.attemptsRemaining,
      });
    });

    wire(builder, verifyOtp, pickSession, (state, action) => {
      Object.assign(state.session, {
        step: action.payload.nextStep,
        twoFactorMethod: action.payload.twoFactorMethod,
        codeExpiresAt: action.payload.codeExpiresAt,
      });
    });

    wire(builder, resendOtp, pickSession, (state, action) => {
      state.session.codeExpiresAt = action.payload.codeExpiresAt;
      state.session.maskedDestination = action.payload.maskedDestination;
    });

    wire(builder, verifyTwoFactor, pickSession, (state, action) => {
      Object.assign(state.session, {
        step: 'authenticated',
        challengeId: null,
        currentUser: action.payload.user,
        role: action.payload.role,
        grantedPermissions: action.payload.grantedPermissions,
        error: null,
      });
    });

    wire(builder, requestPasswordReset, pickSession, (state, action) => {
      Object.assign(state.session, {
        step: 'reset_sent',
        resetToken: action.payload.resetToken,
        maskedDestination: action.payload.maskedDestination,
        codeExpiresAt: action.payload.codeExpiresAt,
      });
    });

    wire(builder, resetPassword, pickSession, (state) => {
      state.session.step = 'reset_done';
      state.session.resetToken = null;
    });

    wire(builder, signOut, pickSession, (state) => {
      state.session = { ...initialState.session };
      state.impersonation.active = null;
    });

    // ---- profile -------------------------------------------------------
    wire(builder, fetchProfile, pickProfile, (state, action) => {
      state.profile.data = action.payload;
    });
    wire(
      builder,
      saveProfile,
      pickProfile,
      (state, action) => {
        state.profile.data = action.payload;
        // The shell reads the signed-in name and language from the session.
        if (state.session.currentUser) {
          state.session.currentUser = { ...state.session.currentUser, ...action.payload };
        }
      },
      'saveStatus',
    );
    wire(
      builder,
      saveNotificationPreferences,
      pickProfile,
      (state, action) => {
        if (state.profile.data) {
          state.profile.data.notificationPreferences = action.payload.preferences;
        }
      },
      'saveStatus',
    );

    // ---- staff ---------------------------------------------------------
    wire(builder, fetchStaff, pickStaff, (state, action) => {
      state.staff.items = action.payload.items;
      state.staff.total = action.payload.total;
    });
    wire(builder, inviteStaff, pickStaff, () => {}, 'actionStatus');
    wire(builder, resendInvite, pickStaff, () => {}, 'actionStatus');
    wire(
      builder,
      deactivateStaff,
      pickStaff,
      (state) => {
        state.staff.selectedIds = [];
      },
      'actionStatus',
    );
    wire(builder, reactivateStaff, pickStaff, () => {}, 'actionStatus');

    // ---- roles ---------------------------------------------------------
    wire(builder, fetchRoles, pickRoles, (state, action) => {
      state.roles.items = action.payload.items;
      state.roles.total = action.payload.total;
    });
    wire(
      builder,
      fetchPermissionCatalogue,
      (state) => state.roles.catalogue,
      (state, action) => {
        state.roles.catalogue.modules = action.payload.modules;
      },
    );
    wire(builder, fetchRole, pickDraft, (state, action) => {
      state.roles.draft.data = {
        id: action.payload.id,
        name: action.payload.name,
        description: action.payload.description,
        permissions: action.payload.permissions,
        isSystem: action.payload.isSystem,
        memberCount: action.payload.memberCount,
      };
      state.roles.draft.dirty = false;
    });
    wire(
      builder,
      createRole,
      pickDraft,
      (state) => {
        state.roles.draft.dirty = false;
      },
      'saveStatus',
    );
    wire(
      builder,
      updateRole,
      pickDraft,
      (state) => {
        state.roles.draft.dirty = false;
      },
      'saveStatus',
    );
    wire(builder, deleteRole, pickDraft, () => {}, 'saveStatus');

    // ---- navigation preview -------------------------------------------
    wire(
      builder,
      fetchNavPreview,
      (state) => state.navPreview,
      (state, action) => {
        state.navPreview.roleId = action.payload.roleId;
        state.navPreview.sections = action.payload.sections;
        state.navPreview.grantedPermissions = action.payload.grantedPermissions;
      },
    );

    // ---- impersonation -------------------------------------------------
    wire(builder, fetchImpersonationTargets, pickTargets, (state, action) => {
      state.impersonation.targets.items = action.payload.items;
      state.impersonation.targets.total = action.payload.total;
    });
    wire(builder, fetchImpersonationSessions, pickSessions, (state, action) => {
      state.impersonation.sessions.items = action.payload.items;
      state.impersonation.sessions.total = action.payload.total;
    });
    wire(
      builder,
      startImpersonation,
      pickImpersonation,
      (state, action) => {
        state.impersonation.active = action.payload;
      },
      'actionStatus',
    );
    wire(
      builder,
      endImpersonation,
      pickImpersonation,
      (state) => {
        state.impersonation.active = null;
      },
      'actionStatus',
    );

    // ---- translations --------------------------------------------------
    wire(builder, fetchTranslations, pickTranslations, (state, action) => {
      state.translations.items = action.payload.items;
      state.translations.total = action.payload.total;
    });
    wire(
      builder,
      fetchLocales,
      pickTranslations,
      (state, action) => {
        state.translations.locales = action.payload.items;
      },
      'localesStatus',
    );
    wire(
      builder,
      saveTranslation,
      (state) => state.translations.editing,
      (state, action) => {
        const index = state.translations.items.findIndex((row) => row.key === action.payload.key);
        if (index !== -1) state.translations.items[index] = action.payload;
        state.translations.editing.key = null;
      },
      'saveStatus',
    );
    wire(builder, publishLocale, pickTranslations, (state, action) => {
      const locale = state.translations.locales.find((row) => row.code === action.payload.code);
      if (locale) locale.publishedAt = action.payload.publishedAt;
    }, 'localesStatus');
  },
});

export const {
  setIdentifier,
  setSignInMethod,
  resetSignIn,
  startPasswordReset,
  setStaffSearch,
  setStaffFilters,
  setStaffSort,
  setStaffPage,
  setStaffPageSize,
  clearStaffFilters,
  toggleStaffSelection,
  setStaffSelection,
  startRoleDraft,
  setRoleDraftField,
  toggleRolePermission,
  setModulePermissions,
  clearRoleDraft,
  setNavPreviewRole,
  setTargetSearch,
  setTargetFilters,
  setTargetPage,
  setTargetPageSize,
  clearTargetFilters,
  setTranslationSearch,
  setTranslationFilters,
  setTranslationSort,
  setTranslationPage,
  setTranslationPageSize,
  clearTranslationFilters,
  setEditingTranslation,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectAccess = (state) => state.access;

export const selectSignIn = createSelector([selectAccess], ({ session }) => ({
  step: session.step,
  method: session.method,
  identifier: session.identifier,
  maskedDestination: session.maskedDestination,
  attemptsRemaining: session.attemptsRemaining,
  status: session.status,
  error: session.error,
  isAuthenticated: session.step === 'authenticated',
}));

export const selectTwoFactorChallenge = createSelector([selectAccess], ({ session }) => ({
  step: session.step,
  challengeId: session.challengeId,
  method: session.method,
  twoFactorMethod: session.twoFactorMethod,
  maskedDestination: session.maskedDestination,
  codeExpiresAt: session.codeExpiresAt,
  attemptsRemaining: session.attemptsRemaining,
  status: session.status,
  error: session.error,
  // 2FA is mandatory, so arriving here without a challenge means the flow was
  // entered from a URL and has to be sent back to the start.
  hasChallenge: Boolean(session.challengeId),
}));

export const selectPasswordReset = createSelector([selectAccess], ({ session }) => ({
  step: session.step,
  resetToken: session.resetToken,
  identifier: session.identifier,
  maskedDestination: session.maskedDestination,
  codeExpiresAt: session.codeExpiresAt,
  status: session.status,
  error: session.error,
}));

export const selectAdminProfile = createSelector([selectAccess], ({ profile, session }) => ({
  profile: profile.data,
  role: session.role,
  grantedPermissions: session.grantedPermissions,
  viewState:
    profile.status === 'failed'
      ? 'error'
      : profile.status === 'loading' || profile.status === 'idle'
        ? 'loading'
        : profile.data
          ? 'populated'
          : 'empty',
  saveStatus: profile.saveStatus,
  saveError: profile.saveError,
  error: profile.error,
}));

export const selectStaffDirectory = createSelector([selectAccess], ({ staff, roles, session }) => ({
  staffMembers: staff.items,
  total: staff.total,
  query: staff.query,
  selectedIds: staff.selectedIds,
  roleOptions: roles.items.map((role) => ({ value: role.id, label: role.name })),
  currentUserId: session.currentUser?.id ?? null,
  viewState: listViewState({
    status: staff.status,
    items: staff.items,
    query: { search: staff.query.search, filters: staff.query.filters },
  }),
  actionStatus: staff.actionStatus,
  actionError: staff.actionError,
  error: staff.error,
}));

export const selectRoleEditor = createSelector([selectAccess], ({ roles }) => {
  const draft = roles.draft.data;
  const granted = draft ? expandPermissions(draft.permissions) : [];

  return {
    roleList: roles.items,
    listStatus: roles.status,
    modules: roles.catalogue.modules,
    draft,
    // Expanded, so a screen never has to work out that approve entails view.
    grantedPermissions: granted,
    // Which ticked permissions are holding another one in place, keyed by id.
    lockedPermissions: Object.fromEntries(
      granted.map((id) => [id, lockedBy(granted, id)]).filter(([, holders]) => holders.length > 0),
    ),
    isSystem: Boolean(draft?.isSystem),
    dirty: roles.draft.dirty,
    viewState:
      roles.catalogue.status === 'failed' || roles.draft.status === 'failed'
        ? 'error'
        : roles.catalogue.status === 'loading' || roles.draft.status === 'loading'
          ? 'loading'
          : draft
            ? 'populated'
            : 'loading',
    saveStatus: roles.draft.saveStatus,
    saveError: roles.draft.saveError,
    error: roles.draft.error ?? roles.catalogue.error,
  };
});

export const selectNavPreview = createSelector([selectAccess], ({ navPreview, roles }) => ({
  roleId: navPreview.roleId,
  sections: navPreview.sections,
  grantedPermissions: navPreview.grantedPermissions,
  roleOptions: roles.items.map((role) => ({ value: role.id, label: role.name })),
  selectedRole: roles.items.find((role) => role.id === navPreview.roleId) ?? null,
  reachableCount: navPreview.sections.reduce(
    (count, section) => count + section.items.filter((item) => item.granted).length,
    0,
  ),
  totalCount: navPreview.sections.reduce((count, section) => count + section.items.length, 0),
  viewState:
    navPreview.status === 'failed'
      ? 'error'
      : navPreview.status === 'loading'
        ? 'loading'
        : navPreview.sections.length > 0
          ? 'populated'
          : 'empty',
  error: navPreview.error,
}));

export const selectImpersonation = createSelector([selectAccess], ({ impersonation, session }) => ({
  targets: impersonation.targets.items,
  total: impersonation.targets.total,
  query: impersonation.targets.query,
  sessions: impersonation.sessions.items,
  sessionsTotal: impersonation.sessions.total,
  sessionsViewState: listViewState({
    status: impersonation.sessions.status,
    items: impersonation.sessions.items,
    query: impersonation.sessions.query,
  }),
  active: impersonation.active,
  canImpersonate: session.grantedPermissions.includes('access.impersonate'),
  viewState: listViewState({
    status: impersonation.targets.status,
    items: impersonation.targets.items,
    query: {
      search: impersonation.targets.query.search,
      filters: impersonation.targets.query.filters,
    },
  }),
  actionStatus: impersonation.actionStatus,
  actionError: impersonation.actionError,
  error: impersonation.targets.error,
}));

export const selectTranslationWorkbench = createSelector([selectAccess], ({ translations }) => {
  const activeLocale = translations.locales.find(
    (locale) => locale.code === translations.query.filters.locale,
  );

  return {
    entries: translations.items,
    total: translations.total,
    query: translations.query,
    locales: translations.locales,
    activeLocale: activeLocale ?? null,
    editingKey: translations.editing.key,
    // Modules present in the string table, for the filter. Derived rather than
    // hardcoded so a new i18n block appears here without an edit.
    moduleOptions: [...new Set(translations.items.map((entry) => entry.module))]
      .sort()
      .map((module) => ({ value: module, label: module })),
    viewState: listViewState({
      status: translations.status,
      items: translations.items,
      query: { search: translations.query.search, filters: translations.query.filters },
    }),
    saveStatus: translations.editing.saveStatus,
    saveError: translations.editing.saveError,
    localesStatus: translations.localesStatus,
    error: translations.error,
  };
});

// Consumed by the shell rather than a screen.
export const selectGrantedPermissions = createSelector(
  [selectAccess],
  ({ session }) => session.grantedPermissions,
);

export const selectShellSession = createSelector([selectAccess], ({ session, impersonation }) => ({
  currentUser: session.currentUser,
  role: session.role,
  grantedPermissions: session.grantedPermissions,
  isAuthenticated: session.step === 'authenticated',
  activeImpersonation: impersonation.active,
}));

export default slice.reducer;
