// The single source of design truth for the whole portal.
// Nothing else in src/ may declare a colour, font, spacing step, radius or
// shadow. Change a value here and every screen restyles with no other edit.

// Every hex in the portal, declared once. Everything below references these.
const PALETTE = {
  midnightBlue: '#0A2E4A',
  midnightBlueDark: '#061D30',
  midnightBlueLight: '#16496F',
  mutedGreen: '#4A7C59',
  mutedGreenDark: '#365B41',
  mutedGreenLight: '#6E9B7B',
  gold: '#D4A574',
  goldDark: '#B8874F',
  goldLight: '#E6C6A1',
  teal: '#2E7D8C',
  tealDark: '#1F5A66',
  tealLight: '#5AA3B0',
  white: '#FFFFFF',
  charcoal: '#2D2D2D',
  charcoalLight: '#5C5C5C',
  charcoalLighter: '#8A8A8A',
  lightGray: '#F5F5F5',
  lightGrayDark: '#E4E4E4',
  lightGrayDarker: '#CFCFCF',
  success: '#2E7D32',
  successSurface: '#E8F3E9',
  warning: '#B7791F',
  warningSurface: '#FBF1E0',
  danger: '#C0392B',
  dangerSurface: '#FBEAE8',
  info: '#2E6DA4',
  infoSurface: '#E9F0F7',
};

export const THEME = {
  colors: {
    // Brand
    primary: {
      DEFAULT: PALETTE.midnightBlue, // top bar, nav, primary actions
      dark: PALETTE.midnightBlueDark,
      light: PALETTE.midnightBlueLight,
    },
    muted: {
      DEFAULT: PALETTE.mutedGreen, // secondary brand, positive trend
      dark: PALETTE.mutedGreenDark,
      light: PALETTE.mutedGreenLight,
    },

    // Accent
    accent: {
      DEFAULT: PALETTE.gold, // highlights, selected state, chart series 1
      dark: PALETTE.goldDark,
      light: PALETTE.goldLight,
    },
    teal: {
      DEFAULT: PALETTE.teal,
      dark: PALETTE.tealDark,
      light: PALETTE.tealLight,
    },

    // Neutral
    white: PALETTE.white,
    charcoal: {
      DEFAULT: PALETTE.charcoal, // body text
      light: PALETTE.charcoalLight, // secondary text
      lighter: PALETTE.charcoalLighter, // placeholder, disabled text
    },
    lightGray: {
      DEFAULT: PALETTE.lightGray, // page background, table header
      dark: PALETTE.lightGrayDark, // borders, dividers
      darker: PALETTE.lightGrayDarker,
    },

    // Semantic
    success: {
      DEFAULT: PALETTE.success,
      surface: PALETTE.successSurface,
    },
    warning: {
      DEFAULT: PALETTE.warning,
      surface: PALETTE.warningSurface,
    },
    danger: {
      DEFAULT: PALETTE.danger,
      surface: PALETTE.dangerSurface,
    },
    info: {
      DEFAULT: PALETTE.info,
      surface: PALETTE.infoSurface,
    },
  },

  fonts: {
    display: ['Ethic Serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
    body: ['Gilroy', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
    mono: ['SF Mono', 'Menlo', 'Consolas', 'monospace'],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.8125rem', { lineHeight: '1.25rem' }],
    base: ['0.875rem', { lineHeight: '1.375rem' }],
    md: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.625rem' }],
    xl: ['1.375rem', { lineHeight: '1.875rem' }],
    '2xl': ['1.75rem', { lineHeight: '2.25rem' }],
    '3xl': ['2.25rem', { lineHeight: '2.75rem' }],
  },

  // 4px base step. Tailwind's numeric scale is kept, these are the named
  // steps screens should reach for.
  spacing: {
    gutter: '1.5rem', // page side padding
    section: '2rem', // gap between page sections
    field: '1rem', // gap between form fields
    cell: '0.75rem', // table cell padding
    rowHeight: '3.25rem', // table row height - fixed so tables align
    navWidth: '15rem',
    navWidthCollapsed: '4rem',
    topBarHeight: '3.5rem',
  },

  radii: {
    none: '0',
    sm: '0.25rem',
    DEFAULT: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(10, 46, 74, 0.06)',
    DEFAULT: '0 1px 3px 0 rgba(10, 46, 74, 0.10), 0 1px 2px -1px rgba(10, 46, 74, 0.08)',
    md: '0 4px 10px -2px rgba(10, 46, 74, 0.10), 0 2px 6px -2px rgba(10, 46, 74, 0.06)',
    lg: '0 12px 28px -6px rgba(10, 46, 74, 0.16)',
    focus: '0 0 0 3px rgba(212, 165, 116, 0.45)',
  },

  // Ordered palette for Recharts series. Charts read this, never a hex.
  chartSeries: [
    PALETTE.gold,
    PALETTE.midnightBlue,
    PALETTE.mutedGreen,
    PALETTE.teal,
    PALETTE.warning,
    PALETTE.charcoalLighter,
  ],
};

export default THEME;
