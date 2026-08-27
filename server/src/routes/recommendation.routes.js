import { Router } from 'express';

import recommendationController from '../controllers/recommendation.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  recommendationActionSchema,
  recommendationRequestSchema,
  refreshRecommendationSchema,
} from '../validators/recommendation.validator.js';

const router = Router();

router.use(authenticate, authorize('student'));

router.get('/', recommendationController.getRecommendations);
router.post('/alumni', validate(recommendationRequestSchema), recommendationController.getAlumni);
router.post('/recruiters', validate(recommendationRequestSchema), recommendationController.getRecruiters);
router.post('/improvements', validate(recommendationRequestSchema), recommendationController.getImprovements);
router.post('/refresh', validate(refreshRecommendationSchema), recommendationController.refresh);
router.patch('/:id/dismiss', validate(recommendationActionSchema), recommendationController.dismiss);
router.patch('/:id/accept', validate(recommendationActionSchema), recommendationController.accept);

export default router;
