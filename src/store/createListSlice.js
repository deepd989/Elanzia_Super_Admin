import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

// The shape every list slice shares. This is a helper for slice authors, not
// a component abstraction - a feature slice may ignore it entirely and hand
// roll its own reducers whenever the queue behaves differently.
//
//   const slice = createListSlice({
//     name: 'manufacturerApplications',
//     fetcher: manufacturerApi.listApplications,
//   });
//   export const { fetchList, setFilters, setPage } = slice.actions;
//   export default slice.reducer;

export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
};

export const initialListState = {
  items: [],
  total: 0,
  status: STATUS.IDLE,
  error: null,
  query: { page: 1, pageSize: 20, search: '', sortBy: null, sortDir: 'desc', filters: {} },
};

export function createListSlice({ name, fetcher, extraInitialState = {}, extraReducers }) {
  const fetchList = createAsyncThunk(`${name}/fetchList`, async (_, { getState, rejectWithValue }) => {
    try {
      return await fetcher(getState()[name].query);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  });

  const slice = createSlice({
    name,
    initialState: { ...initialListState, ...extraInitialState },
    reducers: {
      // Any filter change resets to page one. Landing on page 4 of a
      // three page result is the classic queue-screen bug.
      setFilters(state, action) {
        state.query.filters = action.payload;
        state.query.page = 1;
      },
      setSearch(state, action) {
        state.query.search = action.payload;
        state.query.page = 1;
      },
      setSort(state, action) {
        state.query.sortBy = action.payload.sortBy;
        state.query.sortDir = action.payload.sortDir;
      },
      setPage(state, action) {
        state.query.page = action.payload;
      },
      setPageSize(state, action) {
        state.query.pageSize = action.payload;
        state.query.page = 1;
      },
      ...extraReducers,
    },
    extraReducers: (builder) => {
      builder
        .addCase(fetchList.pending, (state) => {
          state.status = STATUS.LOADING;
          state.error = null;
        })
        .addCase(fetchList.fulfilled, (state, action) => {
          state.status = STATUS.SUCCEEDED;
          state.items = action.payload.items;
          state.total = action.payload.total;
        })
        .addCase(fetchList.rejected, (state, action) => {
          state.status = STATUS.FAILED;
          state.error = action.payload ?? action.error.message;
        });
    },
  });

  return { ...slice, actions: { ...slice.actions, fetchList }, fetchList };
}

// The single view-state a list screen switches on, so the four states are
// decided in one place rather than re-derived with different logic on each
// of the 99 screens.
export function listViewState({ status, items, query }) {
  if (status === STATUS.FAILED) return 'error';
  if (status === STATUS.LOADING && items.length === 0) return 'loading';
  if (items.length > 0) return 'populated';
  if (status !== STATUS.SUCCEEDED) return 'loading';
  const isFiltered = Boolean(query?.search) || Object.values(query?.filters ?? {}).some(Boolean);
  return isFiltered ? 'empty-filtered' : 'empty';
}
