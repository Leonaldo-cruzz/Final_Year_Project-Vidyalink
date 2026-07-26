import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

import ApiError from './ApiError.js';
import { env } from '../config/env.js';

const getAccessTokenSecret = () => {
  if (!env.JWT_SECRET) throw ApiError.internal('JWT_SECRET is not configured');
  return env.JWT_SECRET;
};

const getRefreshTokenSecret = () => {
  if (!env.JWT_REFRESH_SECRET) throw ApiError.internal('JWT_REFRESH_SECRET is not configured');
  return env.JWT_REFRESH_SECRET;
};

const getJwtOptions = () => ({
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
});

export const generateAccessToken = (payload) => jwt.sign(payload, getAccessTokenSecret(), {
  ...getJwtOptions(),
  algorithm: 'HS256',
  expiresIn: env.JWT_EXPIRES_IN,
});

export const generateRefreshToken = (payload) => jwt.sign(payload, getRefreshTokenSecret(), {
  ...getJwtOptions(),
  algorithm: 'HS256',
  expiresIn: env.JWT_REFRESH_EXPIRES_IN,
});

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getAccessTokenSecret(), { ...getJwtOptions(), algorithms: ['HS256'] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Access token has expired');
    throw ApiError.unauthorized('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, getRefreshTokenSecret(), { ...getJwtOptions(), algorithms: ['HS256'] });
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Refresh token has expired');
    throw ApiError.unauthorized('Invalid refresh token');
  }
};

export const generateTokenPair = (user) => {
  const subject = String(user._id);
  const accessToken = generateAccessToken({ email: user.email, role: user.role, sub: subject });
  const refreshToken = generateRefreshToken({ sub: subject });
  return { accessToken, refreshToken };
};

export const hashRefreshToken = (token) => createHash('sha256').update(token).digest('hex');

export const refreshTokensMatch = (storedHash, candidateToken) => {
  if (!storedHash || !candidateToken) return false;
  const stored = Buffer.from(storedHash, 'hex');
  const candidate = Buffer.from(hashRefreshToken(candidateToken), 'hex');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
};
