import { Router } from 'express';
import mentorshipController from '../controllers/mentorship.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createMentorshipRequestSchema,
  acceptMentorshipSchema,
  declineMentorshipSchema,
  idParamSchema,
} from '../validators/mentorship.validator.js';

const router = Router();

router.use(authenticate);

// ─── Student endpoints ────────────────────────────────────────────────────────

// POST /api/v1/mentorship/requests
router.post(
  '/requests',
  authorize('student'),
  validate(createMentorshipRequestSchema),
  mentorshipController.requestMentorship
);

// GET /api/v1/mentorship/student
router.get(
  '/student',
  authorize('student'),
  mentorshipController.getStudentRequests
);

// PATCH /api/v1/mentorship/requests/:id/cancel
router.patch(
  '/requests/:id/cancel',
  authorize('student'),
  validate(idParamSchema),
  mentorshipController.cancelRequest
);

// ─── Alumni endpoints ─────────────────────────────────────────────────────────

// GET /api/v1/mentorship/alumni
router.get(
  '/alumni',
  authorize('alumni'),
  mentorshipController.getAlumniRequests
);

// PATCH /api/v1/mentorship/requests/:id/accept
router.patch(
  '/requests/:id/accept',
  authorize('alumni'),
  validate(acceptMentorshipSchema),
  mentorshipController.acceptRequest
);

// PATCH /api/v1/mentorship/requests/:id/decline
router.patch(
  '/requests/:id/decline',
  authorize('alumni'),
  validate(declineMentorshipSchema),
  mentorshipController.declineRequest
);

// PATCH /api/v1/mentorship/requests/:id/complete
router.patch(
  '/requests/:id/complete',
  authorize('alumni'),
  validate(idParamSchema),
  mentorshipController.completeRequest
);

// ─── Shared (student + alumni + admin) ───────────────────────────────────────

// GET /api/v1/mentorship/requests/:id
router.get(
  '/requests/:id',
  authorize('student', 'alumni', 'admin'),
  validate(idParamSchema),
  mentorshipController.getRequestById
);

export default router;
