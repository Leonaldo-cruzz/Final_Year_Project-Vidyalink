import crypto from 'node:crypto';
import User from '../models/user.model.js';
import { AccountStatus } from '../config/constants.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import {
  generateTokenPair,
  hashRefreshToken,
  refreshTokensMatch,
  verifyRefreshToken,
} from '../utils/jwt.util.js';

class AuthService {
  /**
   * Remove sensitive fields (password, refreshToken, __v) from user object before returning.
   */
  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    const {
      password: _password,
      refreshToken: _refreshToken,
      __v: _version,
      ...safeUser
    } = userObj;

    return safeUser;
  }

  /**
   * Helper to issue access/refresh token pair and persist hashed refresh token in DB.
   */
  async issueTokenPair(user) {
    const { accessToken, refreshToken } = generateTokenPair(user);

    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user account
   */
  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });

    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    const user = await User.create(userData);
    return this.sanitizeUser(user);
  }

  /**
   * Login user with email and password credentials.
   *
   * Flow:
   * 1. Find user by email with explicitly included password field (.select('+password'))
   * 2. Throw ApiError(401, 'Invalid email or password') if user not found
   * 3. Compare candidate password via user.comparePassword(password)
   * 4. Verify account status
   * 5. Generate access & refresh tokens using existing model methods / utilities
   * 6. Save hashed refresh token to user document in DB
   * 7. Remove password from response and return { accessToken, refreshToken, user }
   */
  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw ApiError.forbidden('Your account has been deactivated or suspended');
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Get current authenticated user details by userId
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Logout user by clearing stored refresh token
   */
  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }

  /**
   * Refresh expired access token using incoming refresh token
   */
  async refreshToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    const decoded = verifyRefreshToken(incomingRefreshToken);
    if (!decoded.sub && !decoded._id) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const userId = decoded.sub || decoded._id;
    const user = await User.findById(userId).select('+refreshToken');
    if (!user || !refreshTokensMatch(user.refreshToken, incomingRefreshToken)) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw ApiError.forbidden('Your account has been deactivated or suspended');
    }

    const { accessToken, refreshToken } = generateTokenPair(user);
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, refreshToken: user.refreshToken },
      { refreshToken: hashRefreshToken(refreshToken) }
    );

    if (!updatedUser) {
      throw ApiError.unauthorized('Refresh token has been revoked. Please log in again.');
    }

    return { accessToken, refreshToken };
  }

  /**
   * Request password reset token for given email
   */
  async forgotPassword(email) {
    if (!email) {
      throw ApiError.badRequest('Email is required');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Do not leak email existence; return consistent message
      return {
        message: 'If an account exists with this email, password recovery instructions have been sent.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH] Password recovery generated for ${email}: ${resetUrl}`);
    }

    return {
      message: 'If an account exists with this email, password recovery instructions have been sent.',
      ...(process.env.NODE_ENV !== 'production' ? { resetToken, resetUrl } : {}),
    };
  }

  /**
   * Reset user password using verified reset token
   */
  async resetPassword(token, newPassword) {
    if (!token || !newPassword) {
      throw ApiError.badRequest('Reset token and new password are required');
    }

    if (newPassword.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters long');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw ApiError.badRequest('Password reset token is invalid or has expired');
    }

    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    return {
      message: 'Password reset successful. You can now log in with your new password.',
    };
  }
}

export default new AuthService();
