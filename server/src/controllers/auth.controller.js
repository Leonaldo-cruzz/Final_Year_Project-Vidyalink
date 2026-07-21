import authService from '../services/auth.service.js';
import {
  getRefreshTokenClearCookieOptions,
  getRefreshTokenCookieOptions,
} from '../config/constants.js';
import ApiResponse from '../utils/ApiResponse.js';

class AuthController {
  async register(req, res) {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    return ApiResponse.created(res, 'Registration successful', { user, accessToken });
  }

  async login(req, res) {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await authService.login(email, password);
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    return ApiResponse.ok(res, 'Login successful', { user, accessToken });
  }

  async logout(req, res) {
    await authService.logout(req.user._id);
    res.clearCookie('refreshToken', getRefreshTokenClearCookieOptions());
    return ApiResponse.ok(res, 'Logged out successfully');
  }

  async refreshToken(req, res) {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const { accessToken, refreshToken } = await authService.refreshToken(incomingRefreshToken);
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());
    return ApiResponse.ok(res, 'Token refreshed successfully', { accessToken });
  }

  async me(req, res) {
    const user = await authService.getCurrentUser(req.user._id);
    return ApiResponse.ok(res, 'User fetched successfully', { user });
  }
}

export default new AuthController();
