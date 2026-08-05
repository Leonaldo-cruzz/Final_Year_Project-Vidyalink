import { Router } from 'express';
import projectEngagementController from '../controllers/projectEngagement.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createEngagementSchema,
  engagementIdSchema,
  updateEngagementSchema,
} from '../validators/projectEngagement.validator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('recruiter'),
  validate(createEngagementSchema),
  projectEngagementController.createEngagement
);

router.get(
  '/student',
  authorize('student'),
  projectEngagementController.getStudentEngagements
);

router.get(
  '/recruiter',
  authorize('recruiter'),
  projectEngagementController.getRecruiterEngagements
);

router.get(
  '/faculty',
  authorize('faculty'),
  projectEngagementController.getFacultyEngagements
);

router.get(
  '/:id',
  validate(engagementIdSchema),
  projectEngagementController.getEngagement
);

router.patch(
  '/:id',
  authorize('recruiter', 'faculty'),
  validate(updateEngagementSchema),
  projectEngagementController.updateEngagement
);

export default router;
