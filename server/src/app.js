import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import authRoutes from './routes/auth.routes.js';
import profileRoutes from './routes/profile.routes.js';
import projectRoutes from './routes/project.routes.js';
import applicationRoutes from './routes/application.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import milestoneRoutes from './routes/milestone.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import projectEngagementRoutes from './routes/projectEngagement.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import githubRoutes from './routes/github.routes.js';
import adminRoutes from './routes/admin.routes.js';
import aiRoutes from './routes/ai.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import mentorshipRoutes from './routes/mentorship.routes.js';
import referralRoutes from './routes/referral.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import errorHandler from './middleware/errorHandler.js';
import ApiError from './utils/ApiError.js';
import ApiResponse from './utils/ApiResponse.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, '../uploads');

const getAllowedOrigins = () => {
  const origins = `${env.CORS_ORIGIN || ''},${env.CLIENT_URL || ''}`;
  return origins
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

// Session bootstrap calls run on every page load and the health check is
// probed by Render; neither should consume the shared request budget.
const RATE_LIMIT_EXEMPT_PATHS = new Set(['/health', '/auth/refresh-token', '/auth/me']);

// Credential endpoints get their own limiter (below) so that ordinary page
// browsing can never use up the budget and lock a user out of signing in.
const CREDENTIAL_PATHS = new Set(['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password']);
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_ATTEMPT_MAX = 20;

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  // In non-production environments, allow any localhost, 127.0.0.1, or local LAN IP on any port
  if (env.NODE_ENV !== 'production') {
    try {
      const parsed = new URL(origin);
      const isLoopback =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname === '[::1]';
      const isLocalNetwork =
        parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.') ||
        parsed.hostname.endsWith('.local');
      if (isLoopback || isLocalNetwork) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
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
      if (isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }
      return callback(ApiError.forbidden('Origin is not allowed by CORS'));
    },
  }));
  app.use(compression());
  // Resume generation / ATS requests carry job descriptions of up to 50k chars.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  // Express 5 leaves req.body undefined when a request has no body; handlers
  // destructure it, so normalise to an empty object.
  app.use((req, _res, next) => {
    if (req.body === undefined) req.body = {};
    next();
  });
  app.use(cookieParser());
  app.morgan = morgan;
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use('/uploads', express.static(uploadsDirectory, { maxAge: '1d' }));

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => RATE_LIMIT_EXEMPT_PATHS.has(req.path) || CREDENTIAL_PATHS.has(req.path),
    handler: (_req, res) => ApiResponse.error(res, 429, 'Too many requests. Please try again later.'),
  });
  app.use(apiPrefix, limiter);

  // Brute-force protection: only failed credential attempts count.
  const credentialLimiter = rateLimit({
    windowMs: AUTH_ATTEMPT_WINDOW_MS,
    max: AUTH_ATTEMPT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: (req) => !CREDENTIAL_PATHS.has(req.path),
    handler: (_req, res) => ApiResponse.error(res, 429, 'Too many attempts. Please wait a few minutes and try again.'),
  });
  app.use(apiPrefix, credentialLimiter);

  app.get('/', (_req, res) => ApiResponse.ok(res, 'VidyaLink API Server Running', {
    version: 'v1',
    healthCheck: `${apiPrefix}/health`,
  }));

  app.get(`${apiPrefix}/health`, (_req, res) => ApiResponse.ok(res, 'Service is healthy', {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/profile`, profileRoutes);
  app.use(`${apiPrefix}/profiles`, profileRoutes);
  app.use(`${apiPrefix}/projects`, projectRoutes);
  app.use(`${apiPrefix}/applications`, applicationRoutes);
  app.use(`${apiPrefix}/workspaces`, workspaceRoutes);
  app.use(`${apiPrefix}/milestones`, milestoneRoutes);
  app.use(`${apiPrefix}/portfolios`, portfolioRoutes);
  app.use(`${apiPrefix}/engagements`, projectEngagementRoutes);
  app.use(`${apiPrefix}/resume`, resumeRoutes);
  app.use(`${apiPrefix}/certificates`, certificateRoutes);
  app.use(`${apiPrefix}/github`, githubRoutes);
  app.use(`${apiPrefix}/admin`, adminRoutes);
  app.use(`${apiPrefix}/ai`, aiRoutes);
  app.use(`${apiPrefix}/notifications`, notificationRoutes);
  app.use(`${apiPrefix}/mentorship`, mentorshipRoutes);
  app.use(`${apiPrefix}/referrals`, referralRoutes);
  app.use(`${apiPrefix}/verification`, verificationRoutes);

  app.use((_req, res) => ApiResponse.error(res, 404, 'Route not found'));
  app.use(errorHandler);

  return app;
};
