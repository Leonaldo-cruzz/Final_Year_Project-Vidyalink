import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * JWT Authentication Middleware
 *
 * Responsibilities:
 * 1. Read Bearer token from Authorization header.
 * 2. Verify JWT using env.JWT_SECRET.
 * 3. Decode token payload.
 * 4. Find user by ID in MongoDB.
 * 5. If user doesn't exist, throw 401 Unauthorized ApiError.
 * 6. Attach authenticated user to req.user.
 * 7. Call next().
 *
 * Errors handled (all return 401 Unauthorized):
 * - Missing Token
 * - Invalid Token
 * - Expired Token
 * - User Not Found
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Read Bearer token from Authorization header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authorization header with Bearer token is required');
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw ApiError.unauthorized('Access token is missing');
  }

  // 2. Verify JWT & decode payload
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token has expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  // Extract user ID from payload (_id or sub)
  const userId = decoded._id || decoded.sub;
  if (!userId) {
    throw ApiError.unauthorized('Invalid access token payload');
  }

  // 3. Find user by ID
  const user = await User.findById(userId);

  // 4. If user doesn't exist -> 401 Unauthorized
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists');
  }

  // 5. Attach authenticated user to req.user
  req.user = user;

  // 6. Proceed to next middleware/handler
  next();
});

export default authenticate;
