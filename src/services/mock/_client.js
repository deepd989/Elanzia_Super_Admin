// The fake network. Every mock API module resolves through mockRequest so
// that latency and failure behave the same everywhere, and so the real HTTP
// client can replace this one file when the backend lands.

const MIN_DELAY_MS = 300;
const MAX_DELAY_MS = 600;

// Flipped from the gallery, the console or a test to exercise error states
// without editing any screen. window.MOCK_FAILURES = true fails everything.
const flags = {
  failRate: 0, // 0 to 1, applied to every request
  offline: false, // reject immediately, no delay
};

function readGlobalFlag() {
  if (typeof window === 'undefined') return null;
  return window.MOCK_FAILURES ?? null;
}

export const mockFlags = {
  get failRate() {
    const global = readGlobalFlag();
    if (global === true) return 1;
    if (global === false) return 0;
    if (typeof global === 'number') return global;
    return flags.failRate;
  },
  setFailRate(rate) {
    flags.failRate = Math.min(1, Math.max(0, rate));
  },
  get offline() {
    return flags.offline;
  },
  setOffline(value) {
    flags.offline = Boolean(value);
  },
  reset() {
    flags.failRate = 0;
    flags.offline = false;
    if (typeof window !== 'undefined') delete window.MOCK_FAILURES;
  },
};

// Shaped like the error the real client will throw, so screens written
// against this keep working unchanged.
export class MockApiError extends Error {
  constructor(message, { status = 500, code = 'mock_failure' } = {}) {
    super(message);
    this.name = 'MockApiError';
    this.status = status;
    this.code = code;
  }
}

function randomDelay() {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}

/**
 * Resolve `data` as if it came off the wire.
 *
 * @param data              the payload, or a function returning it (called
 *                          after the delay, so fixtures stay lazy)
 * @param options.delay     override the 300-600ms random latency
 * @param options.failRate  override the global failure rate for this call
 * @param options.errorMessage  message on the thrown MockApiError
 */
export function mockRequest(data, { delay, failRate, errorMessage } = {}) {
  const wait = delay ?? randomDelay();
  const rate = failRate ?? mockFlags.failRate;

  if (mockFlags.offline) {
    return Promise.reject(new MockApiError('Network unavailable', { status: 0, code: 'offline' }));
  }

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < rate) {
        reject(new MockApiError(errorMessage ?? 'The service is unavailable', { status: 503 }));
        return;
      }
      resolve(typeof data === 'function' ? data() : data);
    }, wait);
  });
}

// ---------------------------------------------------------------------------
// Query helpers. Mock API modules use these so that filtering, sorting and
// paging behave consistently, and so the shape they return matches the
// paginated envelope documented in every BACKEND CONTRACT block.
// ---------------------------------------------------------------------------

export function applySearch(items, search, fields) {
  if (!search) return items;
  const needle = String(search).trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    fields.some((field) => String(item[field] ?? '').toLowerCase().includes(needle)),
  );
}

// Filters is a map of field to value or array of values. Undefined, null,
// empty string and 'all' mean "do not filter on this field".
export function applyFilters(items, filters = {}) {
  const active = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== null && value !== '' && value !== 'all',
  );
  if (active.length === 0) return items;

  return items.filter((item) =>
    active.every(([field, value]) =>
      Array.isArray(value) ? value.includes(item[field]) : item[field] === value,
    ),
  );
}

export function applySort(items, sortBy, sortDir = 'asc') {
  if (!sortBy) return items;
  const direction = sortDir === 'desc' ? -1 : 1;

  return [...items].sort((a, b) => {
    const left = a[sortBy];
    const right = b[sortBy];
    if (left === right) return 0;
    if (left === null || left === undefined) return 1;
    if (right === null || right === undefined) return -1;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction;
    return String(left).localeCompare(String(right)) * direction;
  });
}

// The one paginated envelope. Every list contract returns this shape.
export function paginate(items, { page = 1, pageSize = 20 } = {}) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}

// Convenience for list endpoints: search, filter, sort, then page.
export function queryCollection(
  items,
  { search, searchFields = [], filters = {}, sortBy, sortDir, page, pageSize } = {},
) {
  let result = applySearch(items, search, searchFields);
  result = applyFilters(result, filters);
  result = applySort(result, sortBy, sortDir);
  return paginate(result, { page, pageSize });
}
