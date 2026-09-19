import { Router } from 'express';
import verificationController from '../controllers/verification.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  approveVerificationSchema,
  facultyVerificationDashboardSchema,
  facultyVerificationDetailSchema,
  rejectVerificationSchema,
  requestChangesVerificationSchema,
  studentSummarySchema,
  submitVerificationSchema,
  verificationHistorySchema,
  verificationStatusSchema,
} from '../validators/verification.validator.js';

const router = Router();

router.use(authenticate);

router.post('/submit', authorize('student'), validate(submitVerificationSchema), verificationController.submit);
router.get('/pending', authorize('faculty', 'admin'), verificationController.getPending);
router.get(
  '/dashboard',
  authorize('faculty', 'admin'),
  validate(facultyVerificationDashboardSchema),
  verificationController.getFacultyDashboard
);
router.get(
  '/dashboard/:id',
  authorize('faculty', 'admin'),
  validate(facultyVerificationDetailSchema),
  verificationController.getFacultyVerificationDetail
);
router.get('/history', authorize('student'), validate(verificationHistorySchema), verificationController.getHistory);
router.get(
  '/student/:studentId/summary',
  authorize('student', 'faculty', 'admin'),
  validate(studentSummarySchema),
  verificationController.getStudentVerificationSummary
);
router.get(
  '/:targetType/:targetId',
  authorize('student'),
  validate(verificationStatusSchema),
  verificationController.getStatus
);
router.patch(
  '/:id/approve',
  authorize('faculty', 'admin'),
  validate(approveVerificationSchema),
  verificationController.approve
);
router.patch(
  '/:id/reject',
  authorize('faculty', 'admin'),
  validate(rejectVerificationSchema),
  verificationController.reject
);
router.patch(
  '/:id/request-changes',
  authorize('faculty', 'admin'),
  validate(requestChangesVerificationSchema),
  verificationController.requestChanges
);

export default router;
