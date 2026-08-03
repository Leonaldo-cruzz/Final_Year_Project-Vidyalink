import { Router } from 'express';
import milestoneController from '../controllers/milestone.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createMilestoneSchema,
  submitDeliverableSchema,
  verifyMilestoneSchema,
} from '../validators/milestone.validator.js';

const router = Router();

router.use(authenticate);

router.get('/workspace/:workspaceId', milestoneController.getWorkspaceMilestones);

router.post(
  '/',
  authorize('recruiter', 'faculty', 'admin'),
  validate(createMilestoneSchema),
  milestoneController.createMilestone
);

router.patch(
  '/:id',
  authorize('recruiter', 'faculty', 'admin'),
  milestoneController.updateMilestone
);

router.delete(
  '/:id',
  authorize('recruiter', 'faculty', 'admin'),
  milestoneController.deleteMilestone
);

router.post(
  '/:id/submit',
  authorize('student'),
  validate(submitDeliverableSchema),
  milestoneController.submitDeliverable
);

router.post(
  '/:id/verify',
  authorize('recruiter', 'faculty', 'admin'),
  validate(verifyMilestoneSchema),
  milestoneController.verifyMilestone
);

export default router;
