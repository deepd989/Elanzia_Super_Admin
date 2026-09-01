import { useCallback, useEffect, useState } from 'react';

// The chosen theme, remembered per browser.
//
// Three states, not two: 'light' and 'dark' are explicit choices written to
// data-theme, and null means follow the operating system. The attribute is
// also set by a small script in index.html before first paint, so an explicit
// choice never flashes the other theme on load.
const STORAGE_KEY = 'elanzia.theme';

// The stored choice, or null when the viewer has never made one and is
// following the operating system. Exported because the unauthenticated
// screens need to tell those two cases apart.
export function readThemePreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    // Storage blocked. The system preference still applies.
    return null;
  }
}

export default function useThemePreference() {
  const [preference, setPreference] = useState(readThemePreference);

  useEffect(() => {
    const root = document.documentElement;

    if (preference) {
      root.setAttribute('data-theme', preference);
    } else {
      root.removeAttribute('data-theme');
    }

    try {
      if (preference) localStorage.setItem(STORAGE_KEY, preference);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to do - the attribute above is what actually themes the page.
    }
  }, [preference]);

  // What the viewer is actually looking at right now, which is what the
  // toggle's label has to describe.
  const resolved =
    preference ??
    (typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');

  const toggle = useCallback(() => {
    setPreference((current) => {
      const showing =
        current ??
        (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      return showing === 'dark' ? 'light' : 'dark';
    });
  }, []);

  return { preference, resolved, toggle };
}
