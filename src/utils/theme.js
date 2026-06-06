export const T = {
  glass: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.16)",
  text: "var(--txt-name)",
  muted: "var(--color-muted)",
  cyan: "var(--color-cyan)",
  purple: "var(--color-purple)",
  green: "var(--color-green)",
  red: "var(--color-red)",
  amber: "var(--color-amber)",
  colors: {
    pearlWhite: 'var(--pearl-white)',
    charcoalStone: 'var(--charcoal-stone)',
    peachIce: 'var(--peach-ice)',
    aquaMist: 'var(--aqua-mist)'
  }
};

export const THEME_KEYS = ['rulebook-theme', 'rb_theme'];
export const THEME_CHANGE_EVENT = 'rulebook-theme-change';
export const THEMES = {
  dark: 'dark',
  light: 'light',
};

export function normalizeTheme(theme) {
  return theme === THEMES.light ? THEMES.light : THEMES.dark;
}

export function getStoredTheme(fallback = THEMES.dark) {
  try {
    for (const key of THEME_KEYS) {
      const value = localStorage.getItem(key);
      if (value === THEMES.dark || value === THEMES.light) return value;
    }
  } catch {}
  return normalizeTheme(fallback);
}

export function persistTheme(theme) {
  const normalized = normalizeTheme(theme);
  try {
    THEME_KEYS.forEach(key => localStorage.setItem(key, normalized));
  } catch {}
  return normalized;
}

export function applyTheme(theme, { disableTransition = true } = {}) {
  const normalized = normalizeTheme(theme);
  if (typeof document === 'undefined') return normalized;

  const root = document.documentElement;
  if (disableTransition) root.style.setProperty('transition', 'none');
  root.setAttribute('data-theme', normalized);

  if (disableTransition && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.style.removeProperty('transition');
    }));
  } else if (disableTransition) {
    root.style.removeProperty('transition');
  }

  return normalized;
}

export function saveAndApplyTheme(theme, options) {
  const normalized = persistTheme(theme);
  applyTheme(normalized, options);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: normalized } }));
  }

  return normalized;
}

export function toggleThemeValue(theme) {
  return normalizeTheme(theme) === THEMES.dark ? THEMES.light : THEMES.dark;
}
