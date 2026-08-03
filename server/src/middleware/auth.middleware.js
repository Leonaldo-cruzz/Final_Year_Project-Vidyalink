import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { env } from '../config/env.js';

/**
 * JWT Authentication Middleware
 *
 * Responsibilities:
 * 1. Validate presence and format of Authorization header.
 * 2. Verify access token using single source of truth (verifyAccessToken).
 * 3. Extract user ID (supporting both `sub` and `_id` for backward compatibility).
 * 4. Fetch active user from MongoDB database.
 * 5. Attach authenticated user to req.user.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw ApiError.unauthorized('Access token is required');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authorization header must follow Bearer <token> format');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw ApiError.unauthorized('Access token is missing');
  }

  // Verify JWT using central helper function
  const decoded = verifyAccessToken(token);

  // Extract user ID from token payload (supports sub and _id)
  const userId = decoded.sub || decoded._id;
  if (!userId) {
    throw ApiError.unauthorized('Invalid access token payload');
  }

  if (env.NODE_ENV === 'development') {
    console.log('[Auth Middleware Debug] Token Decoded Payload:', decoded);
    console.log('[Auth Middleware Debug] decoded.sub:', decoded.sub);
    console.log('[Auth Middleware Debug] decoded._id:', decoded._id);
    console.log('[Auth Middleware Debug] User ID for DB Lookup:', userId);
  }

  // Find user by ID in MongoDB
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists');
  }

  if (user.status !== 'active') {
    throw ApiError.forbidden('Your account has been deactivated or suspended');
  }

  // Attach user to request object
  req.user = user;
  next();
});

export default authenticate;
