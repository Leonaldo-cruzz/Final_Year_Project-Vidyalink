import User from '../models/user.model.js';
import { AccountStatus } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import {
  generateTokenPair,
  hashRefreshToken,
  refreshTokensMatch,
  verifyRefreshToken,
} from '../utils/jwt.util.js';

class AuthService {
  sanitizeUser(user) {
    const {
      password: _password,
      refreshToken: _refreshToken,
      __v: _version,
      ...safeUser
    } = user.toObject();

    return safeUser;
  }

  async issueTokenPair(user) {
    const { accessToken, refreshToken } = generateTokenPair(user);

    user.refreshToken = hashRefreshToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  }

  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });

    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    const user = await User.create(userData);
    return this.sanitizeUser(user);
  }

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

  async getCurrentUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return this.sanitizeUser(user);
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
    if (!user || !refreshTokensMatch(user.refreshToken, incomingRefreshToken)) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw ApiError.forbidden('Your account has been deactivated or suspended');
    }

    const { accessToken, refreshToken } = generateTokenPair(user);
    const rotatedUser = await User.findOneAndUpdate(
      { _id: user._id, refreshToken: user.refreshToken },
      { refreshToken: hashRefreshToken(refreshToken) },
      { new: true }
    );

    if (!rotatedUser) {
      throw ApiError.unauthorized('Refresh token has been revoked. Please log in again.');
    }

    return { accessToken, refreshToken };
  }
}

export default new AuthService();
