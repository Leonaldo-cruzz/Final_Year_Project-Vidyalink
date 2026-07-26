import User from '../models/user.model.js';
import { AccountStatus } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.util.js';

const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token is required');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw ApiError.unauthorized('Access token is required');
  }

  const decoded = verifyAccessToken(token);
  if (!decoded.sub) {
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists');
  }

  if (user.status !== AccountStatus.ACTIVE) {
    throw ApiError.forbidden('Your account has been deactivated or suspended');
  }

  req.user = user;
  next();
});

export default authenticate;
