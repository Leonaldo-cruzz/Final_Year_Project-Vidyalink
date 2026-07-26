import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import errorHandler from './middleware/errorHandler.js';
import ApiError from './utils/ApiError.js';
import ApiResponse from './utils/ApiResponse.js';
import { env } from './config/env.js';

const getAllowedOrigins = () => {
  const origins = env.CORS_ORIGIN || env.CLIENT_URL;
  return origins.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const getTrustProxySetting = () => {
  const value = env.TRUST_PROXY;
  if (!value) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const asNumber = Number(value);
  return Number.isInteger(asNumber) ? asNumber : value;
};

export const createApp = () => {
  const app = express();
  const apiPrefix = env.API_PREFIX;
  const allowedOrigins = getAllowedOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', getTrustProxySetting());

  app.use(helmet());
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(ApiError.forbidden('Origin is not allowed by CORS'));
    },
  }));
  app.use(compression());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => ApiResponse.error(res, 429, 'Too many requests. Please try again later.'),
  });
  app.use(apiPrefix, limiter);

  app.get(`${apiPrefix}/health`, (_req, res) => ApiResponse.ok(res, 'Service is healthy', {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/profile`, profileRoutes);
  app.use((_req, res) => ApiResponse.error(res, 404, 'Route not found'));
  app.use(errorHandler);

  return app;
};
