// ============================================================
// VIDYALINK — Auth Service
// Consumes backend endpoints: /api/v1/auth/*
// ============================================================

import api, { setAccessToken, clearAccessToken } from './api';

export const authService = {
  /**
   * POST /api/v1/auth/login
   * Returns { accessToken, user }
   * Refresh token is set as HTTP-Only cookie by the server.
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
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
    const response = await api.post('/auth/register', userData);
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
    const response = await api.get('/auth/me');
    return response.data?.data?.user;
  },

  /**
   * POST /api/v1/auth/refresh-token
   * Uses the HTTP-Only refresh token cookie to obtain a new access token.
   * Called automatically by the Axios interceptor on 401.
   */
  async refreshToken() {
    const response = await api.post('/auth/refresh-token');
    const { accessToken } = response.data?.data || {};

    if (accessToken) {
      setAccessToken(accessToken);
    }

    return accessToken;
  },
};

export default authService;
