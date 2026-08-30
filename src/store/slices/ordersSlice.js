// Order console and order detail - ADM-048, ADM-049.
//
// Two sections, each with its own status and error. They do not share a loading
// flag because they do not share a screen, and the detail screen's three
// interventions share one action pair because a reviewer can only be doing one
// of them at a time.
//
// Selectors at the foot of the file are the seam - a screen reads exactly one
// of them and nothing else.

import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { STATUS, listViewState } from '@/store/createListSlice';
import * as ordersApi from '@/services/mock/ordersApi';

// Every thunk here fails the same way: surface the API error's code alongside
// its message, because screens branch on the code (order_price_permanent
// renders against the adjustment form, not as a page error) and render the
// message.
function apiThunk(name, fetcher) {
  return createAsyncThunk(`orders/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await fetcher(arg);
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// A list thunk reads its own query out of the store, so a screen dispatches
// fetchOrders() with no argument and cannot accidentally page with stale
// filters.
function queryThunk(name, fetcher, pickQuery) {
  return createAsyncThunk(`orders/${name}`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fetcher(pickQuery(getState().orders));
    } catch (error) {
      return rejectWithValue({ code: error.code ?? 'unknown', message: error.message });
    }
  });
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchOrders = queryThunk('fetchOrders', ordersApi.listOrders, (state) => state.list.query);

export const fetchOrderSummary = queryThunk('fetchOrderSummary', ordersApi.getOrderSummary, (state) => ({
  filters: state.list.query.filters,
}));

export const exportOrders = queryThunk('exportOrders', ordersApi.exportOrders, (state) => state.list.query);

export const fetchOrder = apiThunk('fetchOrder', ordersApi.getOrder);
export const cancelOrder = apiThunk('cancelOrder', ordersApi.cancelOrder);
export const recordAdjustment = apiThunk('recordAdjustment', ordersApi.recordAdjustment);
export const escalateOrder = apiThunk('escalateOrder', ordersApi.escalateOrder);

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

// The filters the console opens on. Held as a constant because clearFilters has
// to return to exactly this, not to an empty object.
export const DEFAULT_ORDER_FILTERS = {
  status: '',
  paymentStatus: '',
  settlementStatus: '',
  jewellerId: '',
  manufacturerId: '',
  valueBand: '',
  ageBucket: '',
};

const initialState = {
  // ADM-048
  list: {
    items: [],
    total: 0,
    status: STATUS.IDLE,
    error: null,
    query: {
      page: 1,
      pageSize: 20,
      search: '',
      sortBy: 'placedAt',
      sortDir: 'desc',
      filters: { ...DEFAULT_ORDER_FILTERS },
    },
    summary: null,
    summaryStatus: STATUS.IDLE,
    summaryError: null,
    facets: { jewellers: [], manufacturers: [] },
    exportStatus: STATUS.IDLE,
    exportError: null,
    lastExport: null,
  },

  // ADM-049
  detail: {
    order: null,
    lines: [],
    settlementLines: [],
    timeline: [],
    interventions: [],
    invoices: [],
    payouts: [],
    adjustmentTotal: 0,
    jeweller: null,
    manufacturers: [],
    status: STATUS.IDLE,
    error: null,
    // Cancel, adjust and escalate share one pair. A reviewer is doing one of
    // them at a time, and three separate spinners on one panel would be noise.
    actionStatus: STATUS.IDLE,
    actionError: null,
    lastAction: null,
  },
};

// Wires the three async states onto one section. Spelling this out for all
// seven thunks would bury the parts that actually differ.
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

const pickList = (state) => state.list;
const pickDetail = (state) => state.detail;

const slice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    // Any filter change resets to page one. Landing on page 4 of a three page
    // result is the classic queue-screen bug.
    setOrderFilters(state, action) {
      state.list.query.filters = action.payload;
      state.list.query.page = 1;
    },
    setOrderSearch(state, action) {
      state.list.query.search = action.payload;
      state.list.query.page = 1;
    },
    setOrderSort(state, action) {
      state.list.query.sortBy = action.payload.sortBy;
      state.list.query.sortDir = action.payload.sortDir;
    },
    setOrderPage(state, action) {
      state.list.query.page = action.payload;
    },
    setOrderPageSize(state, action) {
      state.list.query.pageSize = action.payload;
      state.list.query.page = 1;
    },
    clearOrderFilters(state) {
      state.list.query.filters = { ...DEFAULT_ORDER_FILTERS };
      state.list.query.search = '';
      state.list.query.page = 1;
    },
    dismissOrderActionError(state) {
      state.detail.actionError = null;
      state.detail.lastAction = null;
    },
  },

  extraReducers: (builder) => {
    wire(builder, fetchOrders, pickList, (state, action) => {
      state.list.items = action.payload.items;
      state.list.total = action.payload.total;
    });

    wire(
      builder,
      fetchOrderSummary,
      pickList,
      (state, action) => {
        state.list.summary = action.payload;
        state.list.facets = action.payload.facets;
      },
      'summaryStatus',
    );

    wire(
      builder,
      exportOrders,
      pickList,
      (state, action) => {
        state.list.lastExport = action.payload;
      },
      'exportStatus',
    );

    wire(builder, fetchOrder, pickDetail, (state, action) => {
      Object.assign(state.detail, action.payload);
    });

    // The three interventions land the same way: patch the order in place so
    // neither the header nor the queue behind it flashes, and push the new
    // audit row onto the front of the list where the newest one belongs.
    [cancelOrder, recordAdjustment, escalateOrder].forEach((thunk) => {
      wire(
        builder,
        thunk,
        pickDetail,
        (state, action) => {
          const { order, intervention, adjustmentTotal } = action.payload;
          state.detail.order = order;
          state.detail.interventions.unshift(intervention);
          if (adjustmentTotal !== undefined) state.detail.adjustmentTotal = adjustmentTotal;
          state.detail.lastAction = intervention.kind;

          // The console row behind the detail screen holds the same order.
          state.list.items = state.list.items.map((row) => (row.id === order.id ? order : row));
        },
        'actionStatus',
      );
    });
  },
});

export const {
  setOrderFilters,
  setOrderSearch,
  setOrderSort,
  setOrderPage,
  setOrderPageSize,
  clearOrderFilters,
  dismissOrderActionError,
} = slice.actions;

// ---------------------------------------------------------------------------
// Selectors - one per screen. This is the seam.
// ---------------------------------------------------------------------------

const selectOrders = (state) => state.orders;

export const selectOrderConsole = createSelector([selectOrders], ({ list }) => ({
  orders: list.items,
  total: list.total,
  query: list.query,
  error: list.error,
  summary: list.summary,
  summaryState: list.summaryStatus,
  facets: list.facets,
  viewState: listViewState(list),
  exportStatus: list.exportStatus,
  lastExport: list.lastExport,
}));

export const selectOrderDetail = createSelector([selectOrders], ({ detail }) => {
  const order = detail.order;

  return {
    order,
    lines: detail.lines,
    settlementLines: detail.settlementLines,
    timeline: detail.timeline,
    interventions: detail.interventions,
    invoices: detail.invoices,
    payouts: detail.payouts,
    adjustmentTotal: detail.adjustmentTotal,
    jeweller: detail.jeweller,
    manufacturers: detail.manufacturers,
    error: detail.error,
    actionStatus: detail.actionStatus,
    actionError: detail.actionError,
    lastAction: detail.lastAction,
    viewState: listViewState({
      status: detail.status,
      items: order ? [order] : [],
      query: { search: '', filters: {} },
    }),

    // What the screen is allowed to offer. Deciding it here rather than in the
    // markup means the rule reads in one place and the button and the endpoint
    // cannot disagree about it.
    canCancel: Boolean(
      order && !['dispatched', 'delivered', 'returned', 'refunded', 'cancelled'].includes(order.status),
    ),
    // Money can only be put back against an order that has actually been
    // charged. Nothing has been charged before confirmation.
    canAdjust: Boolean(order?.confirmedAt),

    // The permanent price and what was put back beside it, kept as two numbers
    // on purpose. A single "adjusted total" would read as though the order had
    // been repriced, which is the one thing that never happens here.
    permanentTotal: order?.total ?? 0,
    netOfAdjustments: (order?.total ?? 0) - detail.adjustmentTotal,

    payoutsFailedCount: detail.payouts.filter((row) => row.status === 'failed').length,
    invoicesFailedCount: detail.invoices.filter((row) => row.status === 'failed').length,
  };
});

export default slice.reducer;
