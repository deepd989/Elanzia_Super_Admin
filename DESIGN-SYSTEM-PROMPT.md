# Task: migrate the portal to Elanzia Trade design system v3

Read `elanzia-trade-design-system-v3.html` at the repo root before writing any
code. It is the authority. Where this brief and that file disagree, the file
wins. Read `CLAUDE.md` too - every rule in it still holds, especially "no
hardcoded colours, hex values, font names or spacing in screens" and "no em
dashes".

The portal currently runs a midnight-blue and gold theme. The design system is
emerald and champagne gold, with dark mode, three density modes and a two-layer
token architecture. This is a theme replacement, not a redesign: no screen
changes its layout, its data flow or its copy structure.

## Architecture you are implementing

The design system has two token layers and the split is the whole point:

- **Layer 1, the ramps.** 45 fixed values in four families (emerald, gold,
  neutral, danger), 11 steps each. Identical in light and dark. Normalised so
  step N carries the same contrast ratio in every family.
- **Layer 2, the aliases.** 40 semantic names (`--surface-page`, `--action-bg`,
  `--text-secondary`, `--status-positive-fg`). These are what components read.
  Dark mode is these 40 names given new values, nothing more.

**Never let a component read a ramp value.** A component writes
`var(--action-bg)`, never `var(--emerald-600)`. That single rule is what keeps
dark mode a 40-line block instead of a rewrite.

## Step 1 - rewrite `src/theme/tokens.js`

Replace the contents entirely. It stops being a nest of hexes for Tailwind and
becomes the JS mirror of the two CSS layers, still the single source of truth.

Export three things:

- `RAMPS` - the four families from the HTML's Layer 1 block, verbatim. These are
  the only hex literals allowed anywhere in `src/`.
- `ALIASES` - `{ light: {...}, dark: {...} }`, the 40 names from Layer 2,
  verbatim from the HTML including the shadow and focus-ring strings.
- `THEME` - the non-colour scales, so the Tailwind preset can still read them:
  `fonts`, `fontSize`, `spacing`, `radii`, `shadows`, `motion`, `density`,
  `chartSeries`.

Carry these across from the HTML exactly:

- **Fonts.** heading `"Ethic Serif","Playfair Display",Georgia,serif`; body
  `"Figtree","Anek Devanagari",system-ui,sans-serif`; mono
  `"IBM Plex Mono",ui-monospace,monospace`; plus `deva` and `gujr` for Indic.
- **Type scale**, px: display 44, h1 30, h2 22, h3 17, body 15, sm 13, label
  11.5, micro 10. Weights 400/500/600/700/800. Line heights tight 1.12,
  heading 1.25, body 1.55. Tracking display -.03em, heading -.015em, body 0.
- **Space**, 4px base: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 44, 64, 96.
- **Radius - assigned by object type, this is a domain rule, comment it:**
  - `none` 0 - documents: price breakup, invoice, hallmark, rate board, plate
  - `xs` 4px - checkbox, stamp, progress bar, thumbnail
  - `sm` 8px - work layer: button, input, select, segmented control, menu item
  - `md` 12px - conversation layer: card, panel, banner, modal, drawer, toast
  - `showcase` 16px - Marketplace product cards only, unused in this portal
  - `full` 999px - pills: status chip, filter chip, count badge, avatar, toggle
- **Motion:** `press` 90ms, `hover` 150ms, `state` 220ms, `overlay` 280ms,
  `enter` 700ms. Easings `standard`, `out`, `spring`.
- **Shadow:** only four - dropdown, modal, toast, sheet. Nothing else in the
  portal casts a shadow. Delete `shadow-sm` / `shadow-md` from the preset so
  the 27 current uses fail loudly and get corrected to borders.
- **Density.** Three sets of `--d-*` values. This portal is an admin console,
  so it runs `condensed`: control 32px, row 36px, cell padding 6/11, card 14,
  gap 10, body 13.5px.
- **Chart series** for Recharts: derive from the ramps, gold-brand first, then
  emerald-600, neutral-500, gold-300, emerald-300, danger-400.

## Step 2 - `src/index.css`

Emit the CSS variables. Keep the three `@tailwind` directives at the top.

- `:root` gets Layer 1 (the ramps) and the non-colour scales.
- `:root, [data-theme="light"]` gets the light aliases.
- `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` and
  `[data-theme="dark"]` both get the dark aliases. Copy this structure from the
  HTML exactly - it is what makes system preference and an explicit toggle both
  work.
- `[data-density="condensed"]` and the other two density blocks.
- Base element styles from the HTML: `body` on `--surface-page` /
  `--text-primary` / `--font-body` / `--d-body` / `--d-lh`, plus
  `-webkit-font-smoothing: antialiased` and the `prefers-reduced-motion` block.
- The text helper classes: `.num` (tabular-nums, `"tnum" 1,"ss02" 1`, weight
  500), `.id` (mono, .92em, tracking -.02em), `.dsp`, `.h1`, `.h2`, `.h3`,
  `.lb`, `.mi`, `.sm`.

Load the fonts in `index.html` with the exact Google Fonts link from the design
system HTML head - Figtree, Playfair Display, Anek Devanagari, Anek Gujarati,
IBM Plex Mono. Ethic Serif is licensed and stays first in the stack as a
self-hosted face if present, with Playfair Display as the fallback.

Remove the current `@layer base` rule `h1,h2,h3,h4 { @apply font-display
text-primary }`. Under the new mapping `text-primary` means the emerald action
colour, and headings are `--text-primary` near-black. Replace it with
`font-heading text-charcoal`.

## Step 3 - `src/theme/tailwind-preset.js`

Map every colour to `var(--alias)`, never to a hex. This is what lets the 94
existing screens pick up the new theme and dark mode with no edits.

```
primary.DEFAULT   var(--action-bg)        primary.dark  var(--action-bg-hover)
primary.light     var(--action-bg-active)
charcoal.DEFAULT  var(--text-primary)     charcoal.light   var(--text-secondary)
charcoal.lighter  var(--text-disabled)
lightGray.DEFAULT var(--surface-sunken)   lightGray.dark   var(--border-default)
lightGray.darker  var(--border-strong)
white             var(--surface-raised)
accent.DEFAULT    var(--accent-fill)      accent.dark      var(--accent-rule)
success  fg var(--status-positive-fg)  surface var(--status-positive-bg)
warning  fg var(--status-attention-fg) surface var(--status-attention-bg)
danger   fg var(--status-negative-fg)  surface var(--status-negative-bg)
info     -> retire; it duplicates positive. Alias to link during the sweep.
```

Add four names that have no current equivalent and are needed for dark mode to
be correct: `link` (`var(--text-link)`), `onAction` (`var(--action-fg)`),
`surface.page` / `surface.raised` / `surface.hover` / `surface.selected`, and
`border.subtle` / `border.default` / `border.strong`.

Delete `teal` - the design system has no teal.

### The four ambiguous names - sweep these, they are the only screen edits

Each of these carries two meanings that the design system separates. Judge each
occurrence:

1. **`text-primary`, 65 occurrences.** Headings and body emphasis become
   `text-charcoal`. Links and interactive text become `text-link`.
2. **`text-white`, 16 occurrences.** On a primary or danger button it becomes
   `text-onAction` - in dark mode the action label is near-black, not white.
   On an inverse surface it becomes `text-onInverse`.
3. **`text-info` / `bg-info`, 20 occurrences.** Informational chips become
   neutral status; links become `text-link`.
4. **`shadow-sm` / `shadow-md`, 27 occurrences.** Delete them. Only dropdowns,
   modals, toasts and sheets cast shadow. Everything else uses a hairline
   `border-border-default`.

Do not sweep anything else. `text-charcoal` (759), `bg-lightGray` (327),
`border-lightGray` (113), `bg-accent` (32), `bg-white` (58) all resolve
correctly through the mapping and must stay untouched.

## Step 4 - the shared components

Rebuild these against the design system recipes. Read the matching section of
the HTML for each and match it exactly - heights, radii, states, focus rings.

**`src/components/primitives/`**

- **Button** - height `var(--d-control)`, padding 0 18px, radius `sm` (8px),
  weight 700, font-size `--d-sm`. Variants map to `.b-pri` (`--action-bg` on
  `--action-fg`), `.b-sec` (raised surface, `--text-link`, `--border-strong`),
  `.b-gho` (transparent, `--text-link`), `.b-dan`. Disabled is sunken surface
  with `--text-disabled`, never a faded primary. Focus is
  `outline: 2px solid var(--border-focus); outline-offset: 2px`. Loading hides
  the label and shows the ring spinner. **Buttons are never pills** - radius 8.
  Drop the `accent` and `link` variants; the design system has neither.
- **Input / Textarea / Select** - `.inp` recipe: height `var(--d-control)`,
  padding 0 12px, radius `sm`, `--border-strong` at rest, `--text-disabled` on
  hover, `--border-focus` plus `var(--focus-ring)` on focus. Error state uses
  `--status-negative-fg` with `--focus-ring-error`. Textarea min-height 84px.
- **Field** - persistent label above every field, `--d-label` at weight 700.
  Placeholder is never the label. Help and error text are `.msg` at
  `--fs-micro`, weight 600.
- **Checkbox** - radius `xs` (4px). Radio and toggle are pills.
- **StatusPill / Badge** - the `.chip` recipe: height 24px, padding 0 11px,
  radius `full`, 1px border, optional 5px `currentColor` dot. Four tones only -
  positive, attention, negative, neutral - each reading its `fg` / `bg` / `br`
  alias triple. Sentence case.
- **Card** - radius `md` (12px), 1px `--border-default`, padding
  `var(--d-card)`. **No shadow. No coloured left border. No cards inside
  cards.**
- **Modal / ConfirmDialog** - radius `md`, `--shadow-modal`, scrim
  `var(--scrim)`, `--dur-overlay` with `--ease-spring`. Header / body / footer
  structure from `.mh` / `.mb` / `.mf`. Footer is secondary left, primary or
  danger right.
- **Toast** - `--shadow-toast`, radius `md`.
- **Tabs** - underline on `--action-bg`, sentence case, `--dur-state`.
- **Spinner** - the `.btn.ld::after` ring, 620ms linear.
- **EmptyState / ErrorState** - `.tempty`: 48px padding, centred, top hairline.
  Never "No data yet" - say what would appear here and what to do.
- **PageHeader** - `.h1` at 30px Ethic Serif, weight 500, tracking -.015em.

**`src/components/`**

- **TableShell** - the `.tf` / `table.tbl` recipe. Sticky `thead` at
  `--surface-raised` with `--d-label` weight 700 `--text-tertiary` headers and a
  `--border-strong` bottom rule. Rows at `var(--d-row)`, cells
  `var(--d-cy) var(--d-cx)`, hairline `--border-default` between rows, last row
  no rule. Hover `--surface-hover`, selected `--surface-selected` with the
  positive inset rule. **No zebra striping.** Numeric columns right-aligned with
  tabular-nums. Add the `.bulk` selection bar and `.tempty` slot. Keep the
  existing contract - styling only, no columns config, no data prop.
- **PriceBreakup** - this is a document. **Radius 0**, 1.5px `--text-primary`
  border, `.slr` rows, and a `.slr.fold` rule above the total. Money as the
  rupee sign then a space, Indian grouping, no paise. Weight to three decimals
  with trailing zeros. Rate always carries its basis and time:
  `1,46,280 / 10 g - 15:40 IST`.
- **MetricTile** - `--fs-h2` figure with `.num`, `--d-label` caption. **Never
  four equal stat cards in a row** - figures sit in the page structure.
- **ChartCard** - Recharts series read `THEME.chartSeries`, grid lines
  `--border-subtle`, axis text `--text-tertiary`.
- **MediaViewer, SplitReviewLayout** - retheme only, no structural change.

**New, from the trade objects section:** a `Stamp` (`.stamp` - the flat
verification mark that replaces every coloured left border), a `DocumentFrame`
(`.doc` / `.doch` - radius 0, 1.5px border) that `PriceBreakup` and the invoice
and hallmark views sit inside, and a `RateBoard` (`.board`). Add them to
`src/components/index.js`.

## Step 5 - `src/layouts/AdminShell.jsx`

- Set `data-density="condensed"` on the root. This portal is pointer-only.
- Set `data-theme` from a persisted preference, defaulting to unset so the
  system preference wins. Add a light/dark toggle in the top bar.
- Retheme the sidebar to the `nav.side` recipe: `--surface-page` ground,
  `--border-default` right edge, items at 12.5px weight 500 `--text-secondary`,
  active item on `--surface-selected` with `--text-link`, weight 700, and a 2px
  `--action-bg` left border.
- Top bar 52px, sticky, `--surface-page`, hairline bottom.

## Step 6 - copy rules

Sweep `src/i18n/en.js` against the design system's copy rules and record them in
`PATTERNS.md`:

- Sentence case everywhere, including buttons, labels and chips. No uppercase,
  no title case, no letter-spaced eyebrows.
- Buttons are verb plus object. "Request quotation", not "Submit".
- Errors state what is wrong, then the value that fixes it.
- Identifiers are mono, as issued, never re-cased: `ELZ-TH-4471`.
- Purity reads `22K 916`.
- Banned words: seamless, robust, comprehensive, cutting-edge, transformative,
  unlock, unleash, empower, elevate, streamline, leverage, journey, ecosystem,
  landscape, tapestry. Also "No X. No Y. Just Z.", "it's not just X, it's Y",
  "Welcome back, [Name]", "No data yet", and em dashes.

## Never do this - carry into `PATTERNS.md`

- Coloured left border on a card or banner. Use the stamp.
- Cream or beige grounds. Pearl White `#FEFEFF`, or the dark page `#0A0F0E`.
- Gold as text on white - it is 2.08:1. Use `--status-attention-fg`, or gold
  as a fill carrying near-black.
- Gradients, backdrop blur, glow. Flat colour and hairline borders.
- Rotated or skewed elements. Everything sits square.
- Cards on shadow, or cards inside cards. Four things cast shadow.
- Pill-shaped buttons. Radius 8.
- One radius on everything. Six steps, assigned by object type.
- Countdowns and live tickers. Use an absolute timestamp.
- Zebra striping. Hairline row rules.
- Emoji as icons. lucide-react only, 1.5px stroke.
- Placeholder text as the field label.
- Proportional figures in a column. `tabular-nums` on every figure.
- A generic spinner as a page state. Show the real layout with data missing.
- Four equal stat cards in a row.

## Out of scope

Glass surfaces. The design system marks them Marketplace-only. Do not implement
`--glass-*` or any `backdrop-filter` in this portal.

## Order of work

1. `tokens.js`, `index.css`, `index.html` fonts, `tailwind-preset.js`. Run the
   app - every screen should render in emerald with no other edit. Anything that
   looks wrong here is a mapping bug, so fix it before moving on.
2. The four ambiguous-name sweeps.
3. The primitives, then the shared components, then `AdminShell`.
4. Copy and `PATTERNS.md`.

## Verification

- `npm run build` is clean and `npm run lint` passes.
- `grep -rnE '#[0-9A-Fa-f]{3,8}' src` returns nothing outside `tokens.js`.
- `grep -rn 'shadow-sm\|shadow-md\|text-info\|bg-info' src` returns nothing.
- Search `src` for em dashes and confirm there are none.
- Walk one screen per feature area in both themes and confirm the four states -
  loading, empty, error, populated. Good candidates:
  `src/pages/Onboarding/ADM-014-VerificationWorkspace.jsx` for the split review
  and stamp, an Orders detail for `PriceBreakup` as a document, a Catalogue list
  for `TableShell` with the bulk bar.
- Toggle dark mode on a table-heavy screen and confirm no element is invisible
  and no button label is white on emerald-400.
- Confirm no screen exceeds 250 lines after the sweep.

Do not change any screen's data flow. Screens keep reading one memoised selector
and never fetch. No real API calls.
