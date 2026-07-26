import { Router } from 'express';

import authController from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from '../validators/auth.validator.js';

// ─── Auth Router ──────────────────────────────────────────────────────────────
//
// All routes in this file are mounted under /api/v1/auth (see app.js).
// Middleware pipeline per route is declared explicitly inline for clarity.

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account
 * @access  Public
 *
 * Middleware pipeline:
 *   1. validate(registerSchema) — Zod validation; returns 400 on failure
 *   2. authController.register  — delegates to AuthService, returns 201
 */
router.post(
  '/register',
  validate(registerSchema),
  authController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate a user and issue access and refresh tokens
 * @access  Public
 */
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

router.post(
  '/refresh-token',
  validate(refreshTokenSchema),
  authController.refreshToken
);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
