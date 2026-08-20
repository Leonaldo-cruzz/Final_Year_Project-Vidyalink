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
let _isRefreshing = false;
let _failedQueue = [];

const processQueue = (error, token = null) => {
  _failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  _failedQueue = [];
};

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

// ── Axios Instance ───────────────────────────────────────────
const api = axios.create({
  // VITE_API_BASE_URL is intentionally limited to a public browser-safe URL.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for HTTP-Only refresh token cookie
  timeout: 15_000,       // 15-second timeout
});

// ── Request Interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Attach access token from memory (never localStorage)
    if (_accessToken) {
      config.headers.Authorization = `Bearer ${_accessToken}`;
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

    // If not a 401, or already retried, or is the refresh endpoint itself — reject
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error);
    }

    // Queue concurrent requests while token is being refreshed
    if (_isRefreshing) {
      return new Promise((resolve, reject) => {
        _failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // Attempt silent token refresh
    originalRequest._retry = true;
    _isRefreshing = true;

    try {
      const response = await api.post('/auth/refresh-token');
      const { accessToken } = response.data?.data || {};

      if (!accessToken) throw new Error('No access token in refresh response');

      setAccessToken(accessToken);
      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // Refresh failed — clear state and redirect to login
      processQueue(refreshError, null);
      clearAccessToken();

      // Redirect without React Router (works from outside component tree)
      if (typeof window !== 'undefined') {
        window.location.href = '/login?session=expired';
      }

      return Promise.reject(refreshError);
    } finally {
      _isRefreshing = false;
    }
  },
);

export default api;
