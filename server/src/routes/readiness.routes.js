import { Router } from 'express';

import readinessController from '../controllers/readiness.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { readinessQuerySchema, readinessRefreshSchema } from '../validators/readiness.validator.js';

const router = Router();

router.use(authenticate, authorize('student'));

router.get('/readiness', validate(readinessQuerySchema), readinessController.getPortfolioReadiness);
router.post('/readiness/refresh', validate(readinessRefreshSchema), readinessController.refreshPortfolioReadiness);

export default router;
