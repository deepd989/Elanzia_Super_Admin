# Architecture

The Super Admin portal is a React SPA with mock data. It is a prototype in
the sense that no request leaves the browser, and production code in every
other sense: the seam where real data arrives is a single named layer, and
the rest of the app never has to know it moved.

Read `CLAUDE.md` first for the rules. This document explains the shape.

---

## 1. Data flow

One direction, four hops, no shortcuts.

```
src/data/<domain>Fixtures.js      plain arrays of rows, referencing
        |                          src/data/core/ entities by id
        v
src/services/mock/<domain>Api.js  the fake network. Every exported
        |                          function carries a BACKEND CONTRACT
        |                          comment block and resolves through
        |                          mockRequest()
        v
src/store/slices/<domain>Slice.js createAsyncThunk calls the mock api.
        |                          The slice holds items, total, status,
        |                          error and query. Selectors live here.
        v
src/pages/<Area>/<ID>-Screen.jsx  useSelector reads ONE memoised selector
                                   and renders. It never fetches.
```

**Screens never fetch.** A screen dispatches a thunk in an effect and reads
selectors. It does not import anything from `src/services/`, and it does not
import a fixture file. If a screen needs a number that does not exist in the
store, the fix is a new selector, not a new import.

**Selectors are the seam.** Everything a screen needs comes from one
memoised selector, so swapping the data source touches one line. That is the
whole point of the layering: when the backend lands, `src/services/mock/`
is replaced by a real HTTP client with the same function signatures, and
nothing above it changes.

### What lives where

| Path | Holds |
| --- | --- |
| `src/theme/tokens.js` | every colour, font, spacing step, radius, shadow |
| `src/theme/tailwind-preset.js` | tokens mapped onto Tailwind. No values of its own |
| `src/i18n/en.js` | every user-facing string, plus `t(key, params)` |
| `src/utils/format.js` | INR, grams, dates, relative time, phone, purity |
| `src/config/navigation.js` | the only place routes are registered |
| `src/config/permissions.js` | the role matrix: every permission, grouped by module |
| `src/layouts/AdminShell.jsx` | top bar, collapsible nav, breadcrumb, content slot |
| `src/layouts/AuthLayout.jsx` | the frame for the unauthenticated screens |
| `src/components/primitives/` | the 16 primitives listed in CLAUDE.md |
| `src/components/` | TableShell, SplitReviewLayout, PriceBreakup, MediaViewer, MetricTile, ChartCard |
| `src/data/core/` | canonical manufacturers, jewellers, products, orders, roles, admin users, metal rates |
| `src/data/` | per-domain fixtures, referencing core by id |
| `src/services/mock/` | the fake API |
| `src/store/` | configureStore plus the slice registry |
| `src/pages/<Area>/` | screens |

---

## 2. The mock layer

### `_client.js`

`mockRequest(data, { delay, failRate, errorMessage })` returns a Promise that
resolves after 300-600ms of random latency. It is the only place latency and
failure are simulated, so every screen's loading state has been exercised
against realistic timing rather than an instant resolve.

Failures are switchable without editing any code:

```js
window.MOCK_FAILURES = true;   // every request rejects
window.MOCK_FAILURES = 0.25;   // one request in four rejects
mockFlags.setOffline(true);    // reject immediately, no delay
mockFlags.reset();             // back to normal
```

The `/gallery` screen has a button that toggles this. Rejections throw a
`MockApiError` carrying `status` and `code`, shaped like the error the real
client will throw so screens written against it keep working.

`_client.js` also exports the query helpers every list endpoint uses:
`applySearch`, `applyFilters`, `applySort`, `paginate`, and `queryCollection`
which chains all four. They exist so that filtering behaves identically on
every queue, and so the paginated envelope is defined once.

### The BACKEND CONTRACT block

**Every exported function in `src/services/mock/` carries one. No function
ships without it.** This is what the backend team builds from - it is the
specification, not a comment.

```js
// BACKEND CONTRACT
// GET /admin/manufacturers/applications
// Query: { status, page, pageSize, search, sortBy, sortDir }
// Returns: { items: Manufacturer[], total: number, page: number }
// Manufacturer: { id, businessName, city, gstin, appliedAt,
//                 status: 'applied'|'under_review'|'info_requested'
//                         |'approved'|'rejected', categories: string[] }
// Notes: sorted by appliedAt desc by default
export function listApplications(query) {
  return mockRequest(() =>
    queryCollection(manufacturerApplications, {
      ...query,
      searchFields: ['businessName', 'city', 'gstin'],
    }),
  );
}
```

Enumerate the union members for every status field. State the default sort.
Note anything a reader could not infer from the shape.

### Fixture discipline

`src/data/core/` holds the canonical 25 manufacturers, 40 jewellers, 60
products and 50 orders. Every feature fixture references those **by id**.
Never invent a new manufacturer or order id in a feature fixture file - if
you need a row that does not exist, add it to core.

`src/data/core/index.js` exports `manufacturerById`, `jewellerById`,
`productById` and `orderById` so a feature fixture can join without scanning.

Fixture data is realistic on purpose: Indian names, real trade centres
(Rajkot, Coimbatore, Jaipur, Surat, Kolkata, Mumbai, Hyderabad), a 22K
bridal necklace at 40-80g and lakhs of rupees. Minimum 40 rows per list so
filters and pagination feel real, and always including rejected, suspended,
failed and zero-state rows - those are the rows that break layouts.

---

## 3. Adding a feature slice

Four files, in this order.

**1. The fixture** - `src/data/settlementsFixtures.js`

```js
import { orders, manufacturerById } from '@/data/core';

// Reference core by id. Do not invent an order.
export const settlementRuns = orders
  .filter((order) => order.settlement.status !== 'not_due')
  .map((order) => ({
    id: `STL-${order.id.slice(4)}`,
    orderId: order.id,
    manufacturerId: order.manufacturerIds[0],
    manufacturerName: manufacturerById[order.manufacturerIds[0]].businessName,
    payout: order.settlement.manufacturerPayout,
    status: order.settlement.status,
    settledAt: order.settlement.settledAt,
  }));
```

**2. The mock API** - `src/services/mock/settlementsApi.js`

Every export gets a BACKEND CONTRACT block. Resolve through `mockRequest`.

**3. The slice** - `src/store/slices/settlementsSlice.js`

```js
import { createSelector } from '@reduxjs/toolkit';
import { createListSlice } from '@/store/createListSlice';
import * as settlementsApi from '@/services/mock/settlementsApi';

const slice = createListSlice({
  name: 'settlements',
  fetcher: settlementsApi.listRuns,
});

export const { fetchList, setFilters, setSearch, setSort, setPage, setPageSize } = slice.actions;

// ONE memoised selector per screen. This is the seam - the screen reads
// this and nothing else.
export const selectSettlementQueue = createSelector(
  [(state) => state.settlements],
  ({ items, total, status, error, query }) => ({
    runs: items,
    total,
    query,
    error,
    viewState: listViewState({ status, items, query }),
    pendingPayout: items
      .filter((run) => run.status === 'pending')
      .reduce((sum, run) => sum + run.payout, 0),
  }),
);

export default slice.reducer;
```

`createListSlice` is a convenience for the common queue shape (items, total,
status, error, query, and the setters that reset to page one on a filter
change). A slice that behaves differently should ignore it and write its own
reducers - it is a helper for slice authors, not an abstraction screens see.

`listViewState()` collapses status and items into the one string a screen
switches on: `'loading' | 'empty' | 'empty-filtered' | 'error' | 'populated'`.
Deciding this in one place is why the four states cannot drift across 99
screens.

**4. Register the reducer** - `src/store/slices/index.js`

```js
import settlementsReducer from './settlementsSlice';

export const reducers = {
  settlements: settlementsReducer,
};
```

The key here is the state key screens select against: `state.settlements`.

---

## 4. Adding a route

`src/config/navigation.js` is the only place routes are registered. The left
nav, the breadcrumb trail and the router all read it. A screen not listed
there is not reachable.

```js
import { Banknote } from 'lucide-react';

export const navigation = [
  {
    id: 'settlements',
    label: 'settlements.navLabel',        // an i18n key, resolved with t()
    icon: Banknote,
    items: [
      {
        id: 'settlement-runs',
        label: 'settlements.runsNavLabel',
        path: '/settlements/runs',
        permission: 'payments.view',       // from src/config/permissions.js
        element: () => import('@/pages/Settlements/ADM-061-SettlementRuns.jsx'),
      },
      {
        id: 'settlement-detail',
        label: 'settlements.runDetailNavLabel',
        path: '/settlements/runs/:runId',
        permission: 'payments.view',
        element: () => import('@/pages/Settlements/ADM-062-SettlementRunDetail.jsx'),
        hidden: true,                      // reachable, but not in the sidebar
      },
    ],
  },
];
```

- `element` is a lazy import, so a feature area only ships when first visited.
- `label` is an i18n key, not a string. Add it to `src/i18n/en.js` first.
- `permission` names an id from `src/config/permissions.js`. Add the permission
  there before you reference it here. An item with no `permission` is open to
  every signed-in admin, which is right for a screen like your own profile and
  wrong for almost everything else.
- `hidden: true` keeps a detail screen out of the sidebar while leaving it
  routable and breadcrumbed.

Derived helpers - `sectionsForPermissions`, `allRoutes`, `findRoute`,
`breadcrumbFor`, `NAVIGABLE_PERMISSIONS` - are what `AdminShell` and `App`
read. Nothing reads the raw array.

Unauthenticated screens go in `authRoutes`. They render outside `AdminShell`,
because a sign-in page that paints a nav and a breadcrumb is showing the shape
of the portal to somebody who has not proved who they are.

Routes with no nav entry (the gallery, auth, error pages) go in
`standaloneRoutes`.

---

## 5. Screen anatomy

Screens read top to bottom: **data, then handlers, then markup.** Under 250
lines; if longer, split into local sub-components in the same file, never
into `src/components/`.

```jsx
// ADM-061
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// ... primitives, shared components, format helpers, t

export default function SettlementRuns() {
  const dispatch = useDispatch();

  // Data: one selector, nothing else.
  const { runs, total, query, viewState, pendingPayout } =
    useSelector(selectSettlementQueue);

  useEffect(() => {
    dispatch(fetchList());
  }, [dispatch, query]);

  // Handlers.
  const handleSort = (sortBy) => dispatch(setSort({ ... }));

  // Markup: PageHeader, filter row, TableShell, pagination.
  return ( ... );
}
```

Copy the markup blocks from `PATTERNS.md`. Screens **copy** those blocks;
they do not import them. Duplication between screens is expected and correct
- it is what lets screen 62 diverge from screen 61 without a prop being
added to something shared.

Every list and detail screen handles all four states. `viewState` from the
selector decides which one renders.

---

## 6. Component policy in one line

Share only what is hard to get right twice, or where inconsistency is a bug.

`TableShell` is styling only - sticky header, fixed row height, hover,
borders, a pagination footer. It takes children. There is no columns config,
no data prop and no sorting logic in it, and there must never be. The same
goes for `SplitReviewLayout`, which is layout and nothing else.

`PriceBreakup` is shared for the opposite reason: the composition of a price
is a domain rule, and it must be identical on the product page, the order
page and the invoice or the marketplace loses the manufacturer's trust.

A generic `DataTable` taking a columns array, a `FilterBuilder`, a
`FormBuilder`, or anything with a `config` prop is banned. If you are adding
a fifth prop to make something fit a new screen, stop and write bespoke
markup.

---

## 7. The gallery

`/gallery` renders every primitive and every shared component in every
state, plus the full token set. It is not in the nav and is not a feature
screen. When you change a component, this is where you confirm nothing else
broke. It also carries the mock-failure toggle, so error states across the
whole portal can be exercised without touching a screen.

---

## 8. Domain rules encoded in code

These are the rules a reader cannot infer from the shape of the data, and
each is commented where it is encoded:

- Price = (metal rate x net weight) + wastage + making charges + stone value
  + GST. Wastage is **added**, not deducted - trade convention.
- Net weight is gross minus stone weight. The jeweller pays metal rate on
  net only, and it is the most disputed number in the trade.
- A confirmed order's price is permanent. Nothing reprices it, however far
  the metal rate moves afterwards.
- No refund shows as processed before return verification.
- Private catalogue pieces never appear on any public surface.
- Weight in grams to 3 decimals. Money in INR with Indian digit grouping.
- Settlement money sits in the payment aggregator's nodal account, never
  Elanzia's own, and splits to the manufacturer net of commission.

---

## 9. Metal rates are canonical

`src/data/core/metalRates.js` holds the rate every price on the platform is
calculated from. It is core rather than a Pricing fixture because three places
read it and none of them may disagree:

- Pricing manages it (ADM-035 to ADM-041)
- Operations renders it on the dashboard (ADM-010)
- the prices baked into `src/data/core/products.js` were computed from its
  `previousRatePerGram` column

`src/data/operationsFixtures.js` derives `goldRateSnapshot` and
`goldRateHistory` from it rather than declaring them, so the dashboard panel
and the rate board cannot show different gold rates on the same morning.

### Quoted versus derived

A purity gets its rate one of two ways, and the difference decides whether
editing its conversion factor does anything:

- **quoted** - the feed publishes that purity directly. IBJA quotes 999, 916,
  750 and 585 gold as separate numbers, so all four gold rates are facts off
  the wire. They do not sit at exactly the nominal purity ratio and are not
  supposed to; the market prices each caratage on its own. The factor table
  only *audits* these.
- **derived** - the feed does not publish it, so the rate is the reference
  purity times the configured factor. Silver 925 works this way, and editing
  its factor in ADM-038 moves a real price.

A quoted rate more than `NOMINAL_DEVIATION_TOLERANCE_PERCENT` from its nominal
ratio is flagged on the board rather than passed through, because that usually
means the feed published something odd.

An active manual override (ADM-037) supersedes the feed for one metal and
purity until it expires, and the row says so. Overrides always carry a reason
and an expiry: one that never expires is a permanent silent lie about the
market, and the API refuses to store it.

---

## 10. The role matrix

`src/config/permissions.js` is the definition of every permission in the
portal, grouped by the 12 feature areas. It is platform truth, not tenant data,
so it sits beside `navigation.js` rather than in `src/data/`.

**Everything downstream reads from it.** Adding a capability to the product
means adding a permission here first.

```js
{
  id: 'payments.settle',                     // stable key, never renamed
  label: 'permissions.payments.settle',      // i18n key
  description: 'permissions.payments.settleHelp',
  implies: ['payments.reconcile'],           // transitively pulls in view
  sensitive: true,                           // granting it needs a confirm
}
```

- `implies` is applied **transitively** by `expandPermissions()`. Granting
  `payments.settle` grants `payments.reconcile` and `payments.view` too. A role
  that can approve something it cannot open is broken, not strict.
- `lockedBy(granted, id)` is the reverse: which granted permissions are holding
  `id` in place. ADM-007 uses it to disable a checkbox that something else
  depends on, and to say why.
- `sensitive` marks the 17 permissions that move money, change access or reach
  member data. ADM-007 puts a confirm in front of granting one.

A role stores **only what was ticked**. Expansion happens at evaluation time,
so a later change to `implies` reaches existing roles without a migration.

### How the nav uses it

Nav items are permission keyed, not role keyed:

```js
{ id: 'staff-directory', path: '/access/users', permission: 'access.staff.view' }
```

Role keying cannot express a custom role created in ADM-007 - that role has no
name the nav could match on, it has a permission set. `sectionsForPermissions()`
filters the tree, `AdminShell` renders the result, and `RequirePermission` in
`App.jsx` guards the route so typing a URL cannot reach a screen the sidebar
does not offer.

`GET /admin/roles/:roleId/navigation` performs the same computation and is what
ADM-005 renders. **If that screen and the sidebar ever disagree, one of them has
a bug** - there is a check for exactly this in the verification pass.

### Sign-in

2FA is mandatory for every admin role, so no endpoint except
`POST /admin/auth/2fa/verify` issues a token. A correct password advances to a
challenge; it never authenticates. The three sign-in screens read one `session`
object from the slice rather than holding their own step state, so the flow
cannot be entered halfway by typing a URL, and they render outside `AdminShell`
through `authRoutes`.
