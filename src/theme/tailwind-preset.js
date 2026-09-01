// Translates tokens.js into Tailwind's theme. This file holds no values of
// its own - it is a mapping only, so tokens.js stays the one place to edit.
//
// Two things to know before editing:
//
// 1. Every colour resolves to var(--alias), never to a hex. That is what makes
//    dark mode work without a single screen changing: the class name stays
//    put and the variable underneath it is remapped.
//
// 2. colors, fontSize, borderRadius and boxShadow are closed sets - they
//    REPLACE Tailwind's defaults rather than extending them. A colour or size
//    that is not in the design system should fail to resolve, not quietly
//    fall back to a Tailwind default that nobody chose.
//
// The `sm`/`base`/`lg` size names and the `charcoal`/`lightGray` colour names
// are the vocabulary the screens were written against. They are kept, and
// pointed at design system values, so the migration did not have to touch 94
// screens. New code should prefer the design system names next to them.

import { THEME } from './tokens.js';

// A colour is a function so that Tailwind's opacity modifiers keep working.
// `var(--x)` on its own cannot take an alpha channel, so `border-danger/30`
// would silently emit nothing. color-mix gives it one, and because the mix
// happens at paint time it stays correct when the variable is remapped for
// dark mode.
const alias = (name) => ({ opacityValue }) =>
  opacityValue === undefined
    ? `var(--${name})`
    : `color-mix(in srgb, var(--${name}) calc(${opacityValue} * 100%), transparent)`;

export default {
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',

      // Brand. `primary` is the thing you can act on, not the heading colour -
      // headings are `charcoal`.
      primary: {
        DEFAULT: alias('action-bg'),
        dark: alias('action-bg-hover'),
        light: alias('action-bg-active'),
      },

      // Text ramp.
      charcoal: {
        DEFAULT: alias('text-primary'),
        light: alias('text-secondary'),
        tertiary: alias('text-tertiary'),
        lighter: alias('text-disabled'),
      },

      // Grounds and rules.
      lightGray: {
        DEFAULT: alias('surface-sunken'),
        dark: alias('border-default'),
        darker: alias('border-strong'),
      },
      white: alias('surface-raised'),

      accent: {
        DEFAULT: alias('accent-fill'),
        dark: alias('accent-rule'),
        on: alias('accent-on-fill'),
      },

      // The names the old theme had no equivalent for. Without these, dark
      // mode gets button labels and links wrong: the action label is
      // near-black on emerald-400, not white.
      link: alias('text-link'),
      onAction: alias('action-fg'),
      onInverse: alias('text-on-inverse'),

      surface: {
        page: alias('surface-page'),
        raised: alias('surface-raised'),
        sunken: alias('surface-sunken'),
        hover: alias('surface-hover'),
        selected: alias('surface-selected'),
        inverse: alias('surface-inverse'),
      },

      border: {
        subtle: alias('border-subtle'),
        DEFAULT: alias('border-default'),
        strong: alias('border-strong'),
        focus: alias('border-focus'),
      },

      // Status. Four tones, each a fg / surface / border triple.
      success: {
        DEFAULT: alias('status-positive-fg'),
        surface: alias('status-positive-bg'),
        border: alias('status-positive-br'),
      },
      warning: {
        DEFAULT: alias('status-attention-fg'),
        surface: alias('status-attention-bg'),
        border: alias('status-attention-br'),
      },
      danger: {
        DEFAULT: alias('status-negative-fg'),
        surface: alias('status-negative-bg'),
        border: alias('status-negative-br'),
        // The destructive button, which is a stronger red than the status text.
        bg: alias('danger-bg'),
        bgHover: alias('danger-bg-hover'),
        fg: alias('danger-fg'),
      },
      neutral: {
        DEFAULT: alias('status-neutral-fg'),
        surface: alias('status-neutral-bg'),
        border: alias('status-neutral-br'),
      },
    },

    // The four steps that follow density track --d-* and so shrink on the
    // admin consoles. The four above it are fixed: a page title is 30px
    // wherever it appears.
    fontSize: {
      micro: ['var(--fs-micro)', { lineHeight: '1.3' }],
      label: ['var(--d-label)', { lineHeight: '1.35' }],
      sm: ['var(--d-sm)', { lineHeight: '1.5' }],
      body: ['var(--d-body)', { lineHeight: 'var(--d-lh)' }],
      h3: ['var(--fs-h3)', { lineHeight: '1.35', letterSpacing: '-.008em' }],
      h2: ['var(--fs-h2)', { lineHeight: '1.28', letterSpacing: '-.008em' }],
      h1: ['var(--fs-h1)', { lineHeight: '1.2', letterSpacing: '-.015em' }],
      display: ['var(--fs-display)', { lineHeight: '1.08', letterSpacing: '-.02em' }],

      // The vocabulary the screens already use, pointed at the steps above.
      xs: ['var(--d-sm)', { lineHeight: '1.5' }],
      base: ['var(--d-body)', { lineHeight: 'var(--d-lh)' }],
      md: ['var(--fs-h3)', { lineHeight: '1.35' }],
      lg: ['var(--fs-h3)', { lineHeight: '1.35' }],
      xl: ['var(--fs-h2)', { lineHeight: '1.28' }],
      '2xl': ['var(--fs-h1)', { lineHeight: '1.2' }],
      '3xl': ['var(--fs-display)', { lineHeight: '1.08' }],
    },

    // Rounding says what a thing is, not how modern it looks. Six steps,
    // assigned by object type - see tokens.js for which is which.
    borderRadius: {
      none: THEME.radii.none,
      xs: THEME.radii.xs,
      sm: THEME.radii.sm,
      md: THEME.radii.md,
      showcase: THEME.radii.showcase,
      full: THEME.radii.full,

      // Legacy names. `rounded` was the work layer and stays the work layer.
      DEFAULT: THEME.radii.sm,
      lg: THEME.radii.md,
    },

    // Four floating layers, plus the two focus rings. There is deliberately no
    // shadow-sm or shadow-md to reach for: everything that is not a dropdown,
    // modal, toast or sheet separates with a hairline border.
    boxShadow: THEME.shadows,

    extend: {
      fontFamily: {
        heading: THEME.fonts.heading,
        body: THEME.fonts.body,
        deva: THEME.fonts.deva,
        gujr: THEME.fonts.gujr,
        mono: THEME.fonts.mono,
      },

      // Tailwind's numeric spacing scale is already the design system's 4px
      // base, so it is kept as-is. Only the named steps are added, plus the
      // four that follow density.
      spacing: {
        ...THEME.spacing,
        control: 'var(--d-control)',
        row: 'var(--d-row)',
        cellY: 'var(--d-cy)',
        cellX: 'var(--d-cx)',
        card: 'var(--d-card)',
        cell: 'var(--d-cx)',
        gap: 'var(--d-gap)',
      },

      borderWidth: THEME.borderWidth,
      transitionDuration: THEME.motion.duration,
      transitionTimingFunction: THEME.motion.ease,
      zIndex: THEME.layers,
    },
  },
};
