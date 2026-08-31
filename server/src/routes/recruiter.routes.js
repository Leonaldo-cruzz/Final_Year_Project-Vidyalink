import { Router } from 'express';
import aiController from '../controllers/ai.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate, authorize('recruiter', 'admin'));
router.get('/candidates/:studentId/ai-summary', aiController.getRecruiterAISummary);

export default router;
