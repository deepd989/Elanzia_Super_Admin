# Elanzia Trade - Super Admin Portal

## What this is
Admin portal for a B2B jewellery marketplace. Manufacturers list stock,
jewellers buy, Elanzia operates the platform. 99 screens, 12 feature areas.

Built as a prototype with mock data, but the backend team will EXTEND this
code, not throw it away. They may refactor. They should never have to
decipher. Optimise for legibility and for a clean seam where real data
arrives.

## Absolute rules
- NO real API calls. All data from src/services/mock/.
- NO hardcoded colours, hex values, font names or spacing in screens.
  Everything from src/theme/tokens.js.
- NO hardcoded user-facing strings. All copy via src/i18n/en.js.
- Screens NEVER fetch. They read Redux selectors only.
- Every list and detail screen handles loading, empty, error, populated.
- No em dashes anywhere. Use hyphens.

## Component policy - read carefully
Share only what is hard to get right twice, or where inconsistency is a
bug. Do not share things that vary per screen.

SHARED (src/components/):
  primitives/   Button, Input, Select, Checkbox, Textarea, StatusPill,
                PageHeader, Card, Modal, ConfirmDialog, Toast, Tabs,
                Badge, Spinner, EmptyState, ErrorState
  TableShell         styling only - sticky header, row height, hover,
                     borders, pagination footer. Takes children.
                     NO columns config, NO data prop, NO sorting logic.
  SplitReviewLayout  media left, decision form right. Layout only.
  PriceBreakup       shared because the price composition is a domain
                     rule and must be identical everywhere.
  MediaViewer        documents, images, video with zoom and page nav.
  MetricTile         metric card.
  ChartCard          thin Recharts wrapper.

BANNED: a generic DataTable taking a columns array, FilterBuilder,
FormBuilder, or anything with a `config` prop. If you are adding a fifth
prop to make something fit a new screen, stop and write bespoke markup.

Each screen writes its own table rows, filters and layout using the
primitives and the copy-patterns in PATTERNS.md. Duplication between
screens is expected and correct.

## Code quality
- Screens read top to bottom: data, then handlers, then markup.
- Name things for the domain, not the mechanism.
  manufacturerApplications, not tableData.
- Boring, explicit code. No clever abstractions.
- Comment WHY where a domain rule is encoded, never WHAT.
  Good:  // wastage is added, not deducted - trade convention
  Bad:   // map over the array
- Screens under 250 lines. If longer, split into local sub-components in
  the same file, not into src/components/.
- Selectors are the seam. Everything a screen needs comes from ONE
  memoised selector, so swapping the data source touches one line.

## Stack
React + React Router, Redux Toolkit (createAsyncThunk), Tailwind CSS,
Recharts, lucide-react.

## Architecture
src/
  theme/tokens.js           colours, fonts, spacing, radii, shadows
  theme/tailwind-preset.js  reads tokens
  i18n/en.js
  utils/format.js           INR, grams, dates
  config/navigation.js      the ONLY place routes are registered
  layouts/AdminShell.jsx
  components/               only what is listed above
  data/core/                canonical entities
  data/                     per-domain fixtures
  services/mock/            fake API
  store/index.js
  store/slices/             one slice per feature area
  pages/<FeatureArea>/      screens

## Data flow - never deviate
data/<domain>Fixtures.js
  -> services/mock/<domain>Api.js
  -> store/slices/<domain>Slice.js  (thunk + selectors)
  -> screen via useSelector

## Mock service contract - the most important rule here
Every exported function in src/services/mock/ carries this comment block:

  // BACKEND CONTRACT
  // GET /admin/manufacturers/applications
  // Query: { status, page, pageSize, search, sortBy, sortDir }
  // Returns: { items: Manufacturer[], total: number, page: number }
  // Manufacturer: { id, businessName, city, gstin, appliedAt,
  //                 status: 'applied'|'under_review'|'info_requested'
  //                         |'approved'|'rejected', categories: string[] }
  // Notes: sorted by appliedAt desc by default

No function ships without it. This is what the backend team builds from.

## Domain rules
- Price = (metal rate x net weight) + wastage + making charges
  + stone value + GST. Detail screens show the full breakup.
- A confirmed order's price is permanent. Nothing reprices it.
- No refund shown as processed before return verification.
- Private catalogue pieces never appear on any public surface.
- Weight in grams to 3 decimals.
- Money in INR with Indian digit grouping (1,50,000 not 150,000).
- Purity: 24K, 22K, 18K, 14K.
- Settlement money sits in the payment aggregator's nodal account, never
  Elanzia's own, and splits to the manufacturer minus commission.

## Fixture discipline
src/data/core/ holds the canonical manufacturers, jewellers, products and
orders. Every feature fixture REFERENCES those by id. Never invent a new
manufacturer or order id in a feature fixture file.

Indian names. Real centres: Rajkot, Coimbatore, Jaipur, Surat, Kolkata,
Mumbai, Hyderabad. A 22K bridal necklace is 40-80g and costs lakhs.
Minimum 40 rows per list so filters and pagination feel real. Always
include rejected, suspended, failed and zero-state rows.

## File naming
Screens: src/pages/<FeatureArea>/<ID>-<ScreenName>.jsx
Screen ID as a comment on line 1.
Example: src/pages/Onboarding/ADM-014-VerificationWorkspace.jsx