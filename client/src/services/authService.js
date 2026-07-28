import api, { setAccessToken, clearAccessToken } from './api';

export const authService = {
  /**
   * Log in user with email and password
   */
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    const { accessToken, user } = response.data.data;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return { accessToken, user, message: response.data.message };
  },

  /**
   * Register a new user account
   */
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Log out current user session
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAccessToken();
    }
  },

  /**
   * Get authenticated user profile
   */
  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.data.user;
  },

  /**
   * Request new access token using refresh token
   */
  async refreshToken() {
    const response = await api.post('/auth/refresh-token');
    const { accessToken } = response.data.data;
    if (accessToken) {
      setAccessToken(accessToken);
    }
    return accessToken;
  },
};

export default authService;
