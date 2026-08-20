import { Router } from 'express';
import mockInterviewController from '../controllers/mockInterview.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createMockInterviewSchema,
  acceptMockInterviewSchema,
  rescheduleMockInterviewSchema,
  completeMockInterviewSchema,
  mockInterviewIdParamSchema,
} from '../validators/mockInterview.validator.js';

const router = Router();

router.use(authenticate);

// ─── Student endpoints ────────────────────────────────────────────────────────

// POST /api/v1/mock-interviews
router.post(
  '/',
  authorize('student'),
  validate(createMockInterviewSchema),
  mockInterviewController.createRequest
);

// GET /api/v1/mock-interviews/student
router.get(
  '/student',
  authorize('student'),
  mockInterviewController.getStudentRequests
);

// ─── Alumni endpoints ─────────────────────────────────────────────────────────

// GET /api/v1/mock-interviews/alumni
router.get(
  '/alumni',
  authorize('alumni'),
  mockInterviewController.getAlumniRequests
);

// PATCH /api/v1/mock-interviews/:id/accept
router.patch(
  '/:id/accept',
  authorize('alumni'),
  validate(acceptMockInterviewSchema),
  mockInterviewController.acceptRequest
);

// PATCH /api/v1/mock-interviews/:id/decline
router.patch(
  '/:id/decline',
  authorize('alumni'),
  validate(mockInterviewIdParamSchema),
  mockInterviewController.declineRequest
);

// PATCH /api/v1/mock-interviews/:id/reschedule
router.patch(
  '/:id/reschedule',
  authorize('alumni'),
  validate(rescheduleMockInterviewSchema),
  mockInterviewController.rescheduleRequest
);

// PATCH /api/v1/mock-interviews/:id/complete
router.patch(
  '/:id/complete',
  authorize('alumni'),
  validate(completeMockInterviewSchema),
  mockInterviewController.completeRequest
);

// ─── Shared — cancel (student or alumni) ─────────────────────────────────────

// PATCH /api/v1/mock-interviews/:id/cancel
router.patch(
  '/:id/cancel',
  authorize('student', 'alumni'),
  validate(mockInterviewIdParamSchema),
  mockInterviewController.cancelRequest
);

// ─── Shared — get by id (student + alumni + admin) ───────────────────────────

// GET /api/v1/mock-interviews/:id
// Note: /student and /alumni must be before /:id
router.get(
  '/:id',
  authorize('student', 'alumni', 'admin'),
  validate(mockInterviewIdParamSchema),
  mockInterviewController.getRequestById
);

export default router;
