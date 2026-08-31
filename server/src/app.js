import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
import aiRoutes from './routes/ai.routes.js';
import studentAIRoutes from './routes/studentAI.routes.js';
import readinessRoutes from './routes/readiness.routes.js';
import industryReadinessRoutes from './routes/industryReadiness.routes.js';
import errorHandler from './middleware/errorHandler.js';
import ApiError from './utils/ApiError.js';
import ApiResponse from './utils/ApiResponse.js';
import { env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, '../uploads');

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
  app.use('/uploads', express.static(uploadsDirectory, { maxAge: '1d' }));

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => ApiResponse.error(res, 429, 'Too many requests. Please try again later.'),
  });
  app.use(apiPrefix, limiter);

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
  app.use(`${apiPrefix}/projects`, projectRoutes);
  app.use(`${apiPrefix}/applications`, applicationRoutes);
  app.use(`${apiPrefix}/workspaces`, workspaceRoutes);
  app.use(`${apiPrefix}/milestones`, milestoneRoutes);
  app.use(`${apiPrefix}/portfolios`, portfolioRoutes);
  app.use(`${apiPrefix}/engagements`, projectEngagementRoutes);
  app.use(`${apiPrefix}/resume`, resumeRoutes);
  app.use(`${apiPrefix}/certificates`, certificateRoutes);
  app.use(`${apiPrefix}/github`, githubRoutes);
  app.use(`${apiPrefix}/ai`, aiRoutes);
  app.use(`${apiPrefix}/student/ai`, studentAIRoutes);
  app.use(`${apiPrefix}/evaluation`, readinessRoutes);
  app.use(`${apiPrefix}/evaluation/industry-readiness`, industryReadinessRoutes);

  app.use((_req, res) => ApiResponse.error(res, 404, 'Route not found'));
  app.use(errorHandler);

  return app;
};
