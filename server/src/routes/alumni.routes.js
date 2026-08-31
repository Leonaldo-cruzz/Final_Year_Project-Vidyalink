import { Router } from 'express';
import alumniController from '../controllers/alumni.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  alumniProfileSchema,
  updateAlumniProfileSchema,
  mentorshipRequestSchema,
  mentorshipActionSchema,
  mentorshipCompleteSchema,
  endorsementSchema,
  mockInterviewRequestSchema,
  mockInterviewScheduleSchema,
  mockInterviewFeedbackSchema,
  createReferralSchema,
  updateReferralSchema,
} from '../validators/alumni.validator.js';

const router = Router();

// All alumni routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', authorize('alumni', 'admin'), alumniController.getProfile);
router.post('/profile', authorize('alumni', 'admin'), validate(alumniProfileSchema), alumniController.createProfile);
router.patch('/profile', authorize('alumni', 'admin'), validate(updateAlumniProfileSchema), alumniController.updateProfile);

// Dashboard routes
router.get('/dashboard', authorize('alumni', 'admin'), alumniController.getDashboardStats);
router.get('/dashboard/stats', authorize('alumni', 'admin'), alumniController.getDashboardStats);

// Student discovery & portfolio access
router.get('/students', authorize('alumni', 'admin', 'recruiter'), alumniController.getStudents);
router.get('/students/:studentId', authorize('alumni', 'admin', 'recruiter', 'faculty'), alumniController.getStudentPortfolio);

// Mentorship routes
router.get('/mentorship/requests', authorize('alumni', 'student', 'admin'), alumniController.getMentorshipRequests);
router.post('/mentorship/requests', authorize('student', 'admin'), validate(mentorshipRequestSchema), alumniController.requestMentorship);
router.patch('/mentorship/requests/:id/accept', authorize('alumni', 'admin'), validate(mentorshipActionSchema), alumniController.acceptMentorship);
router.patch('/mentorship/requests/:id/decline', authorize('alumni', 'admin'), validate(mentorshipActionSchema), alumniController.declineMentorship);
router.patch('/mentorship/requests/:id/complete', authorize('alumni', 'admin'), validate(mentorshipCompleteSchema), alumniController.completeMentorship);
router.patch('/mentorship/requests/:id/cancel', authorize('student', 'alumni', 'admin'), alumniController.cancelMentorship);

// Skill endorsements
router.get('/endorsements', authorize('alumni', 'student', 'admin', 'recruiter'), alumniController.getEndorsements);
router.post('/endorsements', authorize('alumni', 'admin'), validate(endorsementSchema), alumniController.createEndorsement);
router.delete('/endorsements/:id', authorize('alumni', 'admin'), alumniController.deleteEndorsement);

// Mock Interviews
router.get('/mock-interviews', authorize('alumni', 'student', 'admin'), alumniController.getMockInterviews);
router.post('/mock-interviews', authorize('student', 'admin'), validate(mockInterviewRequestSchema), alumniController.requestMockInterview);
router.patch('/mock-interviews/:id/accept', authorize('alumni', 'admin'), alumniController.acceptMockInterview);
router.patch('/mock-interviews/:id/schedule', authorize('alumni', 'admin'), validate(mockInterviewScheduleSchema), alumniController.scheduleMockInterview);
router.patch('/mock-interviews/:id/decline', authorize('alumni', 'admin'), alumniController.declineMockInterview);
router.patch('/mock-interviews/:id/complete', authorize('alumni', 'admin'), validate(mockInterviewFeedbackSchema), alumniController.completeMockInterview);

// Referrals
router.get('/referrals', authorize('alumni', 'student', 'admin'), alumniController.getReferrals);
router.get('/referrals/:id', authorize('alumni', 'student', 'admin'), alumniController.getReferralById);
router.post('/referrals', authorize('alumni', 'admin'), validate(createReferralSchema), alumniController.createReferral);
router.patch('/referrals/:id', authorize('alumni', 'admin'), validate(updateReferralSchema), alumniController.updateReferral);

export default router;
