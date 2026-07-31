// ============================================================
// VIDYALINK — Formatter Utilities
// ============================================================

/**
 * Extract initials from a full name.
 * "Alex Johnson" → "AJ"
 */
export function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Capitalize first letter of a string.
 * "student" → "Student"
 */
export function capitalize(str = '') {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate a string to a max length and append ellipsis.
 * truncate("Hello World", 8) → "Hello Wo..."
 */
export function truncate(str = '', maxLen = 50) {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}…`;
}

/**
 * Format a date string or Date object to a readable format.
 * formatDate("2024-01-15") → "Jan 15, 2024"
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  try {
    return new Intl.DateTimeFormat('en-IN', defaultOptions).format(new Date(date));
  } catch {
    return String(date);
  }
}

/**
 * Format a date as relative time.
 * "2 days ago", "in 3 hours", etc.
 */
export function formatRelativeTime(date) {
  if (!date) return '';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = (new Date(date) - Date.now()) / 1000;
  const abs = Math.abs(diff);

  if (abs < 60)     return rtf.format(Math.round(diff), 'second');
  if (abs < 3600)   return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400)  return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 2592000) return rtf.format(Math.round(diff / 604800), 'week');
  return formatDate(date);
}

/**
 * Format a number with compact notation.
 * 1500 → "1.5K", 1000000 → "1M"
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(num);
}

/**
 * Build a full name from parts, filtering out empty strings.
 */
export function fullName(...parts) {
  return parts.filter(Boolean).join(' ').trim();
}

/**
 * Convert snake_case or camelCase to Title Case.
 * "graduation_year" → "Graduation Year"
 */
export function toTitleCase(str = '') {
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract error message from Axios error or plain Error.
 */
export function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    'An unexpected error occurred'
  );
}

/**
 * Pluralize a word based on count.
 * pluralize(1, "project") → "project"
 * pluralize(3, "project") → "projects"
 */
export function pluralize(count, word, pluralWord) {
  if (count === 1) return word;
  return pluralWord || `${word}s`;
}
