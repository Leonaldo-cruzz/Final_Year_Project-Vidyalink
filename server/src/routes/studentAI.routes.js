import { Router } from 'express';
import aiController from '../controllers/ai.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { readinessQuerySchema } from '../validators/readiness.validator.js';

const router = Router();

router.get(
  '/overview',
  authenticate,
  authorize('student'),
  validate(readinessQuerySchema),
  aiController.getStudentAIOverview,
);

export default router;
