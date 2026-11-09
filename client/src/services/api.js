// ============================================================
// VIDYALINK — Axios API Instance
// ============================================================
// Security model:
//   • Access token is stored IN MEMORY only (module variable).
//   • Refresh token is stored in an HTTP-Only cookie (set by server).
//   • On 401, we silently attempt one token refresh, then retry.
//   • On refresh failure, user is redirected to login.
// ============================================================

import axios from 'axios';

// ── In-Memory Token Store ────────────────────────────────────
let _accessToken = null;
let _refreshPromise = null;

/** Set the in-memory access token after login / refresh. */
export const setAccessToken = (token) => {
  _accessToken = token;
};

/** Clear the in-memory access token (on logout). */
export const clearAccessToken = () => {
  _accessToken = null;
};

/** Get the current in-memory access token. */
export const getAccessToken = () => _accessToken;

// Render free-tier services sleep when idle and can take 30–60s to wake up.
// Requests that may hit a cold service (session bootstrap, AI, uploads) use
// these longer per-request timeouts instead of the 15s default.
export const AUTH_TIMEOUT_MS = 60_000;
export const LONG_TIMEOUT_MS = 120_000;

// Endpoints whose 401 means "bad credentials / no session" — never a reason
// to attempt a silent refresh (doing so used to hard-reload the login page and
// hide the "Invalid email or password" message).
const NO_REFRESH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh-token',
  '/auth/logout',
];

// Pages that render without a session. A failed refresh while on one of these
// must not bounce the visitor to /login.
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
const isPublicPath = (pathname = '') =>
  PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/portfolio/verify/');

const isNoRefreshEndpoint = (url = '') =>
  NO_REFRESH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

// ── Axios Instance ───────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for HTTP-Only refresh token cookie
  timeout: 15_000,       // 15-second default timeout
});

/**
 * Exchange the HTTP-only refresh cookie for a new access token.
 * Single-flight: concurrent callers (session restore, StrictMode double
 * effects, several 401s at once) share one request, so token rotation on the
 * server never revokes a sibling request's token.
 */
export const refreshAccessToken = () => {
  if (!_refreshPromise) {
    _refreshPromise = api
      .post('/auth/refresh-token', undefined, { timeout: AUTH_TIMEOUT_MS })
      .then((response) => {
        const { accessToken } = response.data?.data || {};
        if (!accessToken) throw new Error('No access token in refresh response');
        setAccessToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        _refreshPromise = null;
      });
  }
  return _refreshPromise;
};

// ── Request Interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Attach access token from memory (never localStorage)
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
    }
    // Let the browser set the multipart boundary for file uploads.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  // 2xx — pass through
  (response) => response,

  // Error handler
  async (error) => {
    const originalRequest = error.config;

    // Guard 1: only act on 401 errors
    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Guard 2: do NOT retry if already retried (prevents infinite loop)
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Guard 3: CRITICAL — auth endpoints (including refresh-token itself)
    // must NEVER trigger a refresh attempt through this interceptor.
    if (isNoRefreshEndpoint(originalRequest.url)) {
      return Promise.reject(error);
    }

    // Attempt silent token refresh — mark retry to prevent looping
    originalRequest._retry = true;

    try {
      const accessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAccessToken();

      // Session is gone. Only force a login when the user is on a page that
      // needs one; public pages simply handle the failed request.
      if (typeof window !== 'undefined' && !isPublicPath(window.location.pathname)) {
        window.location.href = '/login?session=expired';
      }

      return Promise.reject(refreshError);
    }
  },
);

export default api;
