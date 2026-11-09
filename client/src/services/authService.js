// ============================================================
// VIDYALINK — Auth Service
// Consumes backend endpoints: /api/v1/auth/*
// ============================================================

import api, {
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
  AUTH_TIMEOUT_MS,
} from './api';

export const authService = {
  /**
   * POST /api/v1/auth/login
   * Returns { accessToken, user }
   * Refresh token is set as HTTP-Only cookie by the server.
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials, { timeout: AUTH_TIMEOUT_MS });
    const { accessToken, user } = response.data?.data || {};

    if (accessToken) {
      setAccessToken(accessToken);
    }

    return { accessToken, user };
  },

  /**
   * POST /api/v1/auth/register
   * Returns registered user (no token — login separately).
   */
  async register(userData) {
    const response = await api.post('/auth/register', userData, { timeout: AUTH_TIMEOUT_MS });
    return response.data?.data?.user || response.data;
  },

  /**
   * POST /api/v1/auth/logout
   * Server clears the HTTP-Only refresh token cookie.
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
    }
  },

  /**
   * GET /api/v1/auth/me
   * Returns the currently authenticated user.
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me', { timeout: AUTH_TIMEOUT_MS });
    return response.data?.data?.user;
  },

  /**
   * POST /api/v1/auth/refresh-token
   * Uses the HTTP-Only refresh token cookie to obtain a new access token.
   * Called automatically by the Axios interceptor on 401.
   */
  async refreshToken() {
    // Shared single-flight refresh (see api.js) — never two rotations at once.
    return refreshAccessToken();
  },

  /**
   * POST /api/v1/auth/forgot-password
   */
  async forgotPassword(email) {
    const response = await api.post('/auth/forgot-password', { email }, { timeout: AUTH_TIMEOUT_MS });
    return response.data?.data || response.data;
  },

  /**
   * POST /api/v1/auth/reset-password
   */
  async resetPassword(token, newPassword) {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data?.data || response.data;
  },
};

export default authService;
