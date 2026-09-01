// The single source of design truth for the whole portal.
// This file is the JS mirror of Elanzia Trade design system v3. Nothing else
// in src/ may declare a colour, font, spacing step, radius or shadow.
//
// Two layers, and the split is the whole point:
//
//   RAMPS    45 fixed values. Identical in light and dark. Every family is
//            normalised so step N carries the same contrast ratio in every
//            family, measured on Pearl White. Swap a family and nothing needs
//            re-checking.
//   ALIASES  40 semantic names. This is what components read. Dark mode is
//            these same 40 names given new values, nothing more.
//
// A component writes var(--action-bg), never var(--emerald-600). That single
// rule is what keeps dark mode a 40-line block instead of a rewrite.

// ── LAYER 1 · THE RAMPS ────────────────────────────────────────────────────
// The only hex literals allowed anywhere in src/.
export const RAMPS = {
  // emerald-600 is Emerald Green #006A58 exactly. The brand.
  emerald: {
    50: '#E9FDF7',
    100: '#A9E4D3',
    200: '#78C9B4',
    300: '#4FAF99',
    400: '#259880',
    500: '#0E816C',
    600: '#006A58',
    700: '#045445',
    800: '#003E33',
    900: '#002A28',
    950: '#00100C',
  },

  // The ramp is the readable one. The brand gold is separate: at 2.08:1 on
  // white it can never be text, only a fill carrying Onyx at 9.38:1.
  gold: {
    50: '#FFF8EA',
    100: '#F4D397',
    200: '#DFB35E',
    300: '#C99729',
    400: '#AE8009',
    500: '#926B02',
    600: '#785803',
    700: '#604604',
    800: '#483200',
    900: '#2C1E01',
    950: '#150C00',
    brand: '#E2AA28', // Champagne Gold
  },

  // Pearl White to Onyx Black, tinted 176 degrees so it sits with emerald.
  neutral: {
    0: '#FEFEFF',
    50: '#F7F9F8',
    100: '#D3D9D8',
    200: '#B3BCBA',
    300: '#98A1A0',
    400: '#7F8987',
    500: '#697471',
    600: '#555F5E',
    700: '#424B4A',
    800: '#2F3836',
    900: '#1A2120',
    950: '#070C0E',
  },

  danger: {
    50: '#FFF7F5',
    100: '#FFCBC3',
    200: '#FEA293',
    300: '#F37D6C',
    400: '#DE6050',
    500: '#C64536',
    600: '#AF2C20',
    700: '#960E06',
    800: '#730301',
    900: '#470201',
    950: '#260000',
  },
};

// ── LAYER 2 · THE ALIASES ──────────────────────────────────────────────────
// Dark is not an inversion: the page is emerald-tinted charcoal, the action
// steps up the ramp to emerald-400 and takes an Onyx label, and every status
// foreground lands within 0.1 of its light-mode contrast ratio.
export const ALIASES = {
  light: {
    // surface
    'surface-page': '#FEFEFF',
    'surface-raised': '#FEFEFF',
    'surface-sunken': '#F7F9F8',
    'surface-hover': '#EFF3F2',
    'surface-selected': '#E9F6F2',
    'surface-inverse': '#002A28',
    'text-on-inverse': '#FEFEFF',
    scrim: 'rgba(7, 12, 14, .46)',

    // text
    'text-primary': '#070C0E',
    'text-secondary': '#424B4A',
    'text-tertiary': '#555F5E',
    'text-disabled': '#7F8987',
    'text-link': '#045445',

    // border
    'border-subtle': '#EDF0EF',
    'border-default': '#E1E6E5',
    'border-strong': '#CBD2D1',
    'border-focus': '#006A58',
    'border-inverse': 'rgba(254, 254, 255, .22)',

    // action
    'action-bg': '#006A58',
    'action-bg-hover': '#045445',
    'action-bg-active': '#003E33',
    'action-fg': '#FEFEFF',
    'danger-bg': '#AF2C20',
    'danger-bg-hover': '#960E06',
    'danger-fg': '#FEFEFF',

    // accent
    'accent-fill': '#E2AA28',
    'accent-on-fill': '#070C0E',
    'accent-rule': '#C99729',

    // status
    'status-positive-fg': '#006A58',
    'status-positive-bg': '#E9FDF7',
    'status-positive-br': '#A9E4D3',
    'status-attention-fg': '#604604',
    'status-attention-bg': '#FFF8EA',
    'status-attention-br': '#F4D397',
    'status-negative-fg': '#AF2C20',
    'status-negative-bg': '#FFF7F5',
    'status-negative-br': '#FFCBC3',
    'status-neutral-fg': '#555F5E',
    'status-neutral-bg': '#F7F9F8',
    'status-neutral-br': '#D3D9D8',

    // focus
    'focus-ring': '0 0 0 3px rgba(0, 106, 88, .24)',
    'focus-ring-error': '0 0 0 3px rgba(175, 44, 32, .20)',

    // shadow · four floating layers. Nothing else casts a shadow.
    'shadow-dropdown': '0 4px 14px rgba(7, 12, 14, .10), 0 1px 3px rgba(7, 12, 14, .07)',
    'shadow-modal': '0 20px 56px rgba(7, 12, 14, .20)',
    'shadow-toast': '0 6px 22px rgba(7, 12, 14, .14)',
    'shadow-sheet': '0 -8px 30px rgba(7, 12, 14, .16)',
  },

  dark: {
    'surface-page': '#0A0F0E',
    'surface-raised': '#141A19',
    'surface-sunken': '#070C0E',
    'surface-hover': '#1D2423',
    'surface-selected': '#0A2E29',
    'surface-inverse': '#E9FDF7',
    'text-on-inverse': '#070C0E',
    scrim: 'rgba(0, 0, 0, .62)',

    'text-primary': '#F7F9F8',
    'text-secondary': '#B3BCBA',
    'text-tertiary': '#98A1A0',
    'text-disabled': '#697471',
    'text-link': '#4FAF99',

    'border-subtle': '#1A211F',
    'border-default': '#2A3230',
    'border-strong': '#3B4442',
    'border-focus': '#4FAF99',
    'border-inverse': 'rgba(7, 12, 14, .30)',

    'action-bg': '#259880',
    'action-bg-hover': '#4FAF99',
    'action-bg-active': '#78C9B4',
    'action-fg': '#070C0E',
    'danger-bg': '#DE6050',
    'danger-bg-hover': '#F37D6C',
    'danger-fg': '#070C0E',

    'accent-fill': '#E2AA28',
    'accent-on-fill': '#070C0E',
    'accent-rule': '#C99729',

    'status-positive-fg': '#4FAF99',
    'status-positive-bg': '#0A2A24',
    'status-positive-br': '#045445',
    'status-attention-fg': '#C99729',
    'status-attention-bg': '#241A02',
    'status-attention-br': '#604604',
    'status-negative-fg': '#F37D6C',
    'status-negative-bg': '#2C0B08',
    'status-negative-br': '#960E06',
    'status-neutral-fg': '#98A1A0',
    'status-neutral-bg': '#181E1D',
    'status-neutral-br': '#2F3836',

    'focus-ring': '0 0 0 3px rgba(79, 175, 153, .30)',
    'focus-ring-error': '0 0 0 3px rgba(222, 96, 80, .26)',

    'shadow-dropdown': '0 4px 14px rgba(0, 0, 0, .44), 0 1px 3px rgba(0, 0, 0, .34)',
    'shadow-modal': '0 20px 56px rgba(0, 0, 0, .58)',
    'shadow-toast': '0 6px 22px rgba(0, 0, 0, .46)',
    'shadow-sheet': '0 -8px 30px rgba(0, 0, 0, .50)',
  },
};

// ── THE NON-COLOUR SCALES ──────────────────────────────────────────────────
export const THEME = {
  fonts: {
    heading: ['Ethic Serif', 'Playfair Display', 'Georgia', 'serif'],
    body: ['Figtree', 'Anek Devanagari', 'system-ui', 'sans-serif'],
    deva: ['Anek Devanagari', 'sans-serif'],
    gujr: ['Anek Gujarati', 'sans-serif'],
    mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
  },

  fontSize: {
    micro: ['10px', { lineHeight: '1.3' }],
    label: ['11.5px', { lineHeight: '1.35' }],
    sm: ['13px', { lineHeight: '1.5' }],
    body: ['15px', { lineHeight: '1.55' }],
    h3: ['17px', { lineHeight: '1.35', letterSpacing: '-.008em' }],
    h2: ['22px', { lineHeight: '1.28', letterSpacing: '-.008em' }],
    h1: ['30px', { lineHeight: '1.2', letterSpacing: '-.015em' }],
    display: ['44px', { lineHeight: '1.08', letterSpacing: '-.02em' }],
  },

  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 800,
  },

  lineHeight: {
    tight: '1.12',
    heading: '1.25',
    body: '1.55',
    deva: '1.45',
    gujr: '1.42',
  },

  tracking: {
    display: '-.03em',
    heading: '-.015em',
    body: '0',
  },

  // 4px base. The named steps below are the ones screens reach for.
  space: {
    0: '0',
    1: '2px',
    2: '4px',
    3: '6px',
    4: '8px',
    5: '12px',
    6: '16px',
    7: '20px',
    8: '24px',
    9: '32px',
    10: '44px',
    11: '64px',
    12: '96px',
  },

  spacing: {
    gutter: '24px', // page side padding
    section: '32px', // gap between page sections
    field: '16px', // gap between form fields
    navWidth: '210px',
    navWidthCollapsed: '64px',
    topBarHeight: '52px',
  },

  // Rounding says what a thing is, not how modern it looks. The step is
  // assigned by object type and is not a free choice.
  radii: {
    none: '0', // documents: price breakup, invoice, hallmark, rate board, plate
    xs: '4px', // checkbox, stamp, progress bar, thumbnail
    sm: '8px', // work layer: button, input, select, segmented control, menu item
    md: '12px', // conversation layer: card, panel, banner, modal, drawer, toast
    showcase: '16px', // Marketplace product and maker cards ONLY, unused here
    full: '999px', // pills: status chip, filter chip, count badge, avatar, toggle
  },

  borderWidth: {
    DEFAULT: '1px',
    2: '1.5px',
    3: '2px',
  },

  // Only four things float. Nothing else in the portal casts a shadow -
  // everything else separates with a hairline border.
  shadows: {
    none: 'none',
    dropdown: 'var(--shadow-dropdown)',
    modal: 'var(--shadow-modal)',
    toast: 'var(--shadow-toast)',
    sheet: 'var(--shadow-sheet)',
    focus: 'var(--focus-ring)',
    'focus-error': 'var(--focus-ring-error)',
  },

  // Named for what they do, not how long they take.
  motion: {
    duration: {
      press: '90ms', // a button taking the press
      hover: '150ms', // hover and colour change
      state: '220ms', // a control changing state: toggle, tab, accordion
      overlay: '280ms', // modal, drawer, sheet, toast entering or leaving
      enter: '700ms', // a page region arriving once, on first paint
    },
    ease: {
      standard: 'cubic-bezier(.2, 0, .15, 1)',
      out: 'cubic-bezier(0, 0, .2, 1)',
      spring: 'cubic-bezier(.22, .9, .24, 1)',
    },
  },

  // Three modes. This portal is an admin console, so it runs condensed.
  density: {
    relaxed: {
      body: '15px', lh: '1.55', sm: '13px', label: '11.5px',
      control: '44px', row: '56px', cy: '14px', cx: '16px', card: '24px', gap: '16px',
    },
    regular: {
      body: '14.5px', lh: '1.5', sm: '12.5px', label: '11px',
      control: '44px', row: '48px', cy: '11px', cx: '14px', card: '18px', gap: '14px',
    },
    condensed: {
      body: '13.5px', lh: '1.45', sm: '12px', label: '10.5px',
      control: '32px', row: '36px', cy: '6px', cx: '11px', card: '14px', gap: '10px',
    },
  },

  layers: {
    sticky: 100,
    dropdown: 400,
    drawer: 500,
    modal: 600,
    toast: 700,
    tooltip: 800,
  },

  // Ordered palette for Recharts series. Charts read this, never a hex.
  // Gold leads because it is the accent fill; every following step is a ramp
  // value that stays legible against both page grounds.
  chartSeries: [
    RAMPS.gold.brand,
    RAMPS.emerald[600],
    RAMPS.neutral[500],
    RAMPS.gold[300],
    RAMPS.emerald[300],
    RAMPS.danger[400],
  ],
};

export default THEME;
