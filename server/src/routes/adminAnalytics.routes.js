import { Router } from 'express';
import adminAnalyticsController from '../controllers/adminAnalytics.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { analyticsRangeSchema } from '../validators/admin.validator.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/overview', adminAnalyticsController.getOverview);
router.get('/verifications', validate(analyticsRangeSchema), adminAnalyticsController.getVerifications);
router.get('/projects', validate(analyticsRangeSchema), adminAnalyticsController.getProjects);
router.get('/recruitment', adminAnalyticsController.getRecruitment);
router.get('/activity', validate(analyticsRangeSchema), adminAnalyticsController.getActivity);

export default router;
