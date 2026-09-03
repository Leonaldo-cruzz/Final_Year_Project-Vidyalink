import authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  getRefreshTokenCookieOptions,
  getRefreshTokenClearCookieOptions,
} from '../config/constants.js';

class AuthController {
  /**
   * POST /api/v1/auth/register
   */
  register = asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);

    return ApiResponse.created(res, 'Registration successful', { user });
  });

  /**
   * POST /api/v1/auth/login
   *
   * Validates credentials via AuthService and returns JWT tokens + user profile.
   * Uses asyncHandler and returns HTTP 200 via ApiResponse.ok.
   */
  login = asyncHandler(async (req, res) => {
    const { accessToken, refreshToken, user } = await authService.login(req.body);

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    // The refresh token is HTTP-only and must never be exposed to JavaScript.
    return ApiResponse.ok(res, 'Login successful', { accessToken, user });
  });

  /**
   * GET /api/v1/auth/me
   */
  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user._id);

    return ApiResponse.ok(res, 'Current user fetched successfully', { user });
  });

  /**
   * POST /api/v1/auth/logout
   */
  logout = asyncHandler(async (req, res) => {
    await authService.logout(req.user._id);

    res.clearCookie('refreshToken', getRefreshTokenClearCookieOptions());

    return ApiResponse.ok(res, 'Logout successful');
  });

  /**
   * POST /api/v1/auth/refresh-token
   */
  refreshToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    const { accessToken, refreshToken } = await authService.refreshToken(incomingRefreshToken);

    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return ApiResponse.ok(res, 'Token refreshed successfully', { accessToken, refreshToken });
  });
}

export default new AuthController();
