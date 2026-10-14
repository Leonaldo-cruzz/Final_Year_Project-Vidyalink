import { Router } from 'express';
import mentorshipController from '../controllers/mentorship.controller.js';
import endorsementController from '../controllers/endorsement.controller.js';
import mockInterviewController from '../controllers/mockInterview.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createEndorsementSchema,
  getStudentEndorsementsSchema,
} from '../validators/endorsement.validator.js';
import {
  scheduleMockInterviewSchema,
  updateMockInterviewStatusSchema,
  submitMockInterviewFeedbackSchema,
  mockInterviewIdSchema,
} from '../validators/mockInterview.validator.js';

const router = Router();

router.use(authenticate);

// ── Mentorship Requests ────────────────────────────────────────────────────────
// Student sends mentorship inquiry
router.post('/request', authorize('student'), mentorshipController.requestMentorship);

// Fetch requests (alumni sees incoming, student sees outgoing)
router.get('/my-requests', mentorshipController.getMyRequests);

// Alumni gets active mentees
router.get('/mentees', authorize('alumni'), mentorshipController.getMentees);

// Alumni accepts/schedules or declines
router.patch('/:id/accept', authorize('alumni'), mentorshipController.acceptRequest);
router.patch('/:id/decline', authorize('alumni'), mentorshipController.declineRequest);

// ── Skill Endorsements ─────────────────────────────────────────────────────────
// Alumni endorses student's demonstrated skill
router.post(
  '/endorse',
  authorize('alumni'),
  validate(createEndorsementSchema),
  endorsementController.createEndorsement
);
router.post(
  '/:id/endorse',
  authorize('alumni'),
  validate(createEndorsementSchema),
  endorsementController.createEndorsement
);

// Endorsement fetching
router.get('/endorsements/my', endorsementController.getMyEndorsements);
router.get(
  '/endorsements/student/:studentId',
  validate(getStudentEndorsementsSchema),
  endorsementController.getStudentEndorsements
);

// ── Mock Interviews ────────────────────────────────────────────────────────────
// Schedule a mock interview (alumni or student)
router.post(
  '/mock-interviews',
  validate(scheduleMockInterviewSchema),
  mockInterviewController.scheduleInterview
);

// Retrieve user's mock interviews
router.get('/mock-interviews', mockInterviewController.getMyInterviews);

// Retrieve single mock interview
router.get(
  '/mock-interviews/:id',
  validate(mockInterviewIdSchema),
  mockInterviewController.getInterviewById
);

// Update mock interview status (confirm, reschedule, cancel)
router.patch(
  '/mock-interviews/:id/status',
  validate(updateMockInterviewStatusSchema),
  mockInterviewController.updateStatus
);

// Submit structured mock interview evaluation (alumni interviewer only)
router.post(
  '/mock-interviews/:id/feedback',
  authorize('alumni'),
  validate(submitMockInterviewFeedbackSchema),
  mockInterviewController.submitFeedback
);
router.post(
  '/:id/mock-interview-feedback',
  authorize('alumni'),
  validate(submitMockInterviewFeedbackSchema),
  mockInterviewController.submitFeedback
);

export default router;
