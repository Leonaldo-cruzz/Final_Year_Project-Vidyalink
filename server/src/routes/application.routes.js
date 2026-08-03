import { Router } from 'express';
import applicationController from '../controllers/application.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
  scheduleInterviewSchema,
  selectCandidateSchema,
} from '../validators/application.validator.js';

const router = Router();

router.use(authenticate);

// Student Endpoints
router.post(
  '/',
  authorize('student'),
  validate(createApplicationSchema),
  applicationController.applyToProject
);

router.get(
  '/my',
  authorize('student'),
  applicationController.getStudentApplications
);

router.delete(
  '/:id/withdraw',
  authorize('student'),
  applicationController.withdrawApplication
);

// Recruiter Endpoints
router.get(
  '/project/:projectId',
  authorize('recruiter', 'faculty', 'admin'),
  applicationController.getProjectApplications
);

router.patch(
  '/:id/status',
  authorize('recruiter', 'faculty', 'admin'),
  validate(updateApplicationStatusSchema),
  applicationController.updateApplicationStatus
);

router.patch(
  '/:id/interview',
  authorize('recruiter', 'faculty', 'admin'),
  validate(scheduleInterviewSchema),
  applicationController.scheduleInterview
);

router.patch(
  '/:id/select',
  authorize('recruiter', 'faculty', 'admin'),
  validate(selectCandidateSchema),
  applicationController.selectCandidate
);

export default router;
