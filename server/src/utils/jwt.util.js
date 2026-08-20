import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

import ApiError from './ApiError.js';
import { env } from '../config/env.js';

const getAccessTokenSecret = () => {
  if (!env.jwt.secret) throw ApiError.internal('JWT_SECRET is not configured');
  return env.jwt.secret;
};

const getRefreshTokenSecret = () => {
  if (!env.jwt.refreshSecret) throw ApiError.internal('JWT_REFRESH_SECRET is not configured');
  return env.jwt.refreshSecret;
};

const getJwtOptions = () => ({
  issuer: env.jwt.issuer,
  audience: env.jwt.audience,
});

export const generateAccessToken = (payload) => jwt.sign(payload, getAccessTokenSecret(), {
  ...getJwtOptions(),
  algorithm: 'HS256',
  expiresIn: env.jwt.expiresIn,
});

export const generateRefreshToken = (payload) => jwt.sign(payload, getRefreshTokenSecret(), {
  ...getJwtOptions(),
  algorithm: 'HS256',
  expiresIn: env.jwt.refreshExpiresIn,
});

export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, getAccessTokenSecret(), {
      ...getJwtOptions(),
      algorithms: ['HS256'],
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token has expired');
    }

    throw ApiError.unauthorized('Invalid access token');
  }
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, getRefreshTokenSecret(), {
      ...getJwtOptions(),
      algorithms: ['HS256'],
    });

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') throw ApiError.unauthorized('Refresh token has expired');
    throw ApiError.unauthorized('Invalid refresh token');
  }
};

export const generateTokenPair = (user) => {
  const subject = String(user._id);
  const accessToken = generateAccessToken({
    _id: subject,
    sub: subject,
    email: user.email,
    role: user.role,
  });
  const refreshToken = generateRefreshToken({ _id: subject, sub: subject });
  return { accessToken, refreshToken };
};

export const hashRefreshToken = (token) => createHash('sha256').update(token).digest('hex');

export const refreshTokensMatch = (storedHash, candidateToken) => {
  if (!storedHash || !candidateToken) return false;
  const stored = Buffer.from(storedHash, 'hex');
  const candidate = Buffer.from(hashRefreshToken(candidateToken), 'hex');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
};
