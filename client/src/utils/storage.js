// ============================================================
// VIDYALINK — Storage Utilities
// NOTE: Sensitive tokens (JWT) are stored IN MEMORY only.
//       This file handles only non-sensitive UI preferences.
// ============================================================

import { THEME_KEY } from '@/constants';

/**
 * Safely get a value from localStorage (non-sensitive data only).
 * Returns null if not available (SSR / private browsing).
 */
export function getLocalItem(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Safely set a value in localStorage.
 */
export function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail (quota exceeded, etc.)
  }
}

/**
 * Remove a key from localStorage.
 */
export function removeLocalItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

// ── Theme Preference ──────────────────────────────────────────

/** Get saved theme preference, defaulting to 'dark'. */
export function getSavedTheme() {
  return getLocalItem(THEME_KEY) || 'dark';
}

/** Save theme preference to localStorage. */
export function saveTheme(theme) {
  setLocalItem(THEME_KEY, theme);
}

/** Apply theme class to <html> element. */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
    document.body.classList.add('light');
    document.body.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
    document.body.classList.remove('light');
  }
}
