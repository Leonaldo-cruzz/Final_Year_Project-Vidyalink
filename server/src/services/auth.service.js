import User from '../models/user.model.js';
import { AccountStatus, UserRoles } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import {
  generateTokenPair,
  hashRefreshToken,
  refreshTokensMatch,
  verifyRefreshToken,
} from '../utils/jwt.util.js';

class AuthService {
  async issueTokenPair(user) {
    const { accessToken, refreshToken } = generateTokenPair(user);
    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  }

  async rotateRefreshToken(user) {
    const { accessToken, refreshToken } = generateTokenPair(user);
    const rotatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        refreshToken: user.refreshToken,
        status: AccountStatus.ACTIVE,
      },
      { refreshToken: hashRefreshToken(refreshToken) },
      { new: true }
    );

    if (!rotatedUser) {
      await User.findByIdAndUpdate(user._id, { refreshToken: null });
      throw ApiError.unauthorized('Refresh token has been revoked. Please log in again.');
    }

    return { accessToken, refreshToken };
  }

  async register(userData) {
    const email = userData.email.toLowerCase();
    if (userData.role === UserRoles.ADMIN) {
      throw ApiError.forbidden('Administrator accounts cannot be created through public registration');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const user = await User.create({ ...userData, email });
    const { accessToken, refreshToken } = await this.issueTokenPair(user);
    return { user, accessToken, refreshToken };
  }

  async login(email, password) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
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
    return { user, accessToken, refreshToken };
  }

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }

  async refreshToken(incomingRefreshToken) {
    if (!incomingRefreshToken) {
      throw ApiError.unauthorized('Refresh token is required');
    }

    const decoded = verifyRefreshToken(incomingRefreshToken);
    if (!decoded.sub) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await User.findById(decoded.sub).select('+refreshToken');
    if (!user) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (!refreshTokensMatch(user.refreshToken, incomingRefreshToken)) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
      throw ApiError.unauthorized('Refresh token has been revoked. Please log in again.');
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw ApiError.forbidden('Your account has been deactivated or suspended');
    }

    return this.rotateRefreshToken(user);
  }

  async getCurrentUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }
}

export default new AuthService();
