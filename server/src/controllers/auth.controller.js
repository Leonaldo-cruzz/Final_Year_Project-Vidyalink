import authService from '../services/auth.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── Auth Controller ──────────────────────────────────────────────────────────
//
// Responsibility: HTTP layer only.
//   - Read from req
//   - Call the correct service method
//   - Write to res
//
// Must NOT contain business logic, validation logic, or database queries.
// All async methods are wrapped with asyncHandler — no manual try/catch needed.

class AuthController {
  /**
   * POST /api/v1/auth/register
   *
   * Receives a pre-validated, sanitized request body (set by `validate` middleware),
   * delegates registration to AuthService, and returns a 201 Created response.
   *
   * Error handling is automatic — asyncHandler forwards any thrown ApiError
   * or unexpected exception to the global error middleware (error.middleware.js).
   *
   * @type {import('express').RequestHandler}
   */
  register = asyncHandler(async (req, res) => {
    const user = await authService.register(req.body);

    return ApiResponse.created(res, 'Registration successful', { user });
  });

  /**
   * POST /api/v1/auth/login
   *
   * Validates credentials via AuthService and returns a JWT access + refresh
   * token pair alongside a sanitised user object. Returns HTTP 200 on success.
   *
   * Error handling is automatic — asyncHandler forwards any thrown ApiError
   * or unexpected exception to the global error middleware (error.middleware.js).
   *
   * @type {import('express').RequestHandler}
   */
  login = asyncHandler(async (req, res) => {
    const { accessToken, refreshToken, user } = await authService.login(req.body);

    return ApiResponse.ok(res, 'Login successful', { accessToken, refreshToken, user });
  });

  getCurrentUser = asyncHandler(async (req, res) => {
    const user = await authService.getCurrentUser(req.user._id);

    return ApiResponse.ok(res, 'Current user fetched successfully', { user });
  });

  logout = asyncHandler(async (req, res) => {
    await authService.logout(req.user._id);

    return ApiResponse.ok(res, 'Logout successful');
  });

  refreshToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    const { accessToken, refreshToken } = await authService.refreshToken(incomingRefreshToken);

    return ApiResponse.ok(res, 'Token refreshed successfully', { accessToken, refreshToken });
  });
}

export default new AuthController();
