// Generates src/theme/tokens.generated.css from src/theme/tokens.js.
//
// tokens.js stays the one place a value is edited. This script is the only
// thing that turns it into CSS, so the two layers can never drift apart.
// Runs automatically before dev and build - see package.json.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RAMPS, ALIASES, THEME } from '../src/theme/tokens.js';

const OUT = fileURLToPath(new URL('../src/theme/tokens.generated.css', import.meta.url));

const decl = (name, value) => `  --${name}: ${value};`;

// The ramps, flattened to --emerald-600 and friends.
const ramps = Object.entries(RAMPS).flatMap(([family, steps]) =>
  Object.entries(steps).map(([step, hex]) => decl(`${family}-${step}`, hex)),
);

const aliases = (mode) =>
  Object.entries(ALIASES[mode]).map(([name, value]) => decl(name, value));

const scales = [
  ...Object.entries(THEME.fonts).map(([k, stack]) =>
    decl(`font-${k}`, stack.map((f) => (f.includes(' ') ? `"${f}"` : f)).join(', ')),
  ),
  ...Object.entries(THEME.fontSize).map(([k, [size]]) => decl(`fs-${k}`, size)),
  ...Object.entries(THEME.fontWeight).map(([k, w]) => decl(`fw-${k}`, w)),
  ...Object.entries(THEME.lineHeight).map(([k, v]) => decl(`lh-${k}`, v)),
  ...Object.entries(THEME.tracking).map(([k, v]) => decl(`tracking-${k}`, v)),
  ...Object.entries(THEME.space).map(([k, v]) => decl(`space-${k}`, v)),
  ...Object.entries(THEME.radii).map(([k, v]) => decl(`radius-${k}`, v)),
  ...Object.entries(THEME.borderWidth).map(([k, v]) =>
    decl(k === 'DEFAULT' ? 'border-w' : `border-w-${k}`, v),
  ),
  ...Object.entries(THEME.motion.duration).map(([k, v]) => decl(`dur-${k}`, v)),
  ...Object.entries(THEME.motion.ease).map(([k, v]) => decl(`ease-${k}`, v)),
  ...Object.entries(THEME.layers).map(([k, v]) => decl(`z-${k}`, v)),
];

const density = (mode) =>
  Object.entries(THEME.density[mode]).map(([k, v]) => decl(`d-${k}`, v));

const css = `/* GENERATED FROM src/theme/tokens.js - DO NOT EDIT BY HAND.
   Run \`npm run theme\` after changing tokens.js, or just \`npm run dev\`.

   Layer 1 is the ramps: fixed, identical in light and dark.
   Layer 2 is the aliases: remapped for dark mode. Components read layer 2
   only. Never write var(--emerald-600) in a component; write var(--action-bg).
*/

/* LAYER 1 - the ramps, and the scales that do not change with theme. */
:root {
${ramps.join('\n')}

${scales.join('\n')}
}

/* LAYER 2 - the aliases. Light is the default. */
:root,
[data-theme='light'] {
${aliases('light').join('\n')}
}

/* Dark by system preference, unless an explicit light theme is set. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${aliases('dark').map((line) => `  ${line}`).join('\n')}
  }
}

/* Dark by explicit choice. Same 40 names, new values. */
[data-theme='dark'] {
${aliases('dark').join('\n')}
}

/* DENSITY - relaxed is the default. This portal runs condensed; it is an
   admin console and pointer only. */
:root {
${density('relaxed').join('\n')}
}

[data-density='regular'] {
${density('regular').join('\n')}
}

[data-density='condensed'] {
${density('condensed').join('\n')}
}
`;

writeFileSync(OUT, css);
console.log(`theme: wrote ${OUT.split('/').slice(-2).join('/')}`);
