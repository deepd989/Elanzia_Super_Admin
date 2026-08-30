import { configureStore } from '@reduxjs/toolkit';
import { reducers } from './slices';

export const store = configureStore({
  reducer: reducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Fixtures hold plain JSON only, so the default checks are worth
      // keeping. Dates are stored as ISO strings for exactly this reason.
      serializableCheck: true,
    }),
  devTools: import.meta.env?.DEV ?? true,
});

export default store;
