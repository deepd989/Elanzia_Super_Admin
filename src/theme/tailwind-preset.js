// Translates tokens.js into Tailwind's theme. This file holds no values of
// its own - it is a mapping only, so tokens.js stays the one place to edit.

import { THEME } from './tokens.js';

export default {
  theme: {
    extend: {
      colors: {
        primary: THEME.colors.primary,
        muted: THEME.colors.muted,
        accent: THEME.colors.accent,
        teal: THEME.colors.teal,
        white: THEME.colors.white,
        charcoal: THEME.colors.charcoal,
        lightGray: THEME.colors.lightGray,
        success: THEME.colors.success,
        warning: THEME.colors.warning,
        danger: THEME.colors.danger,
        info: THEME.colors.info,
      },
      fontFamily: {
        display: THEME.fonts.display,
        body: THEME.fonts.body,
        mono: THEME.fonts.mono,
      },
      fontSize: THEME.fontSize,
      spacing: THEME.spacing,
      borderRadius: THEME.radii,
      boxShadow: THEME.shadows,
    },
  },
};
