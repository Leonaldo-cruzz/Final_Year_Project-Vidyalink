import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';

import {
  createInterview,
  getRecruiterInterviews,
  getRecruiterInterview,
  updateInterview,
  rescheduleInterview,
  cancelInterview,
  completeInterview,
  getStudentInterviews,
  getStudentInterview,
} from '../controllers/interview.controller.js';

import {
  createInterviewSchema,
  updateInterviewSchema,
  rescheduleInterviewSchema,
  cancelInterviewSchema,
  completeInterviewSchema,
  recruiterInterviewsQuerySchema,
  interviewParamSchema,
  studentInterviewsQuerySchema,
  studentInterviewParamSchema,
} from '../validators/interview.validator.js';

// ─── Recruiter Interview Router ───────────────────────────────────────────────

export const recruiterInterviewRouter = Router();

recruiterInterviewRouter.use(authenticate);
recruiterInterviewRouter.use(authorize('recruiter', 'admin'));

/**
 * POST   /api/v1/recruiter/interviews         Schedule a new interview
 * GET    /api/v1/recruiter/interviews         List recruiter's interviews (paginated)
 * GET    /api/v1/recruiter/interviews/:id     Get single interview (recruiter view)
 * PATCH  /api/v1/recruiter/interviews/:id     Update general editable fields
 * PATCH  /api/v1/recruiter/interviews/:id/reschedule   Reschedule to new time
 * PATCH  /api/v1/recruiter/interviews/:id/cancel       Cancel interview
 * PATCH  /api/v1/recruiter/interviews/:id/complete     Mark as completed
 */
recruiterInterviewRouter.post(
  '/',
  validate(createInterviewSchema),
  createInterview
);

recruiterInterviewRouter.get(
  '/',
  validate(recruiterInterviewsQuerySchema),
  getRecruiterInterviews
);

recruiterInterviewRouter.get(
  '/:id',
  validate(interviewParamSchema),
  getRecruiterInterview
);

recruiterInterviewRouter.patch(
  '/:id',
  validate(updateInterviewSchema),
  updateInterview
);

recruiterInterviewRouter.patch(
  '/:id/reschedule',
  validate(rescheduleInterviewSchema),
  rescheduleInterview
);

recruiterInterviewRouter.patch(
  '/:id/cancel',
  validate(cancelInterviewSchema),
  cancelInterview
);

recruiterInterviewRouter.patch(
  '/:id/complete',
  validate(completeInterviewSchema),
  completeInterview
);

// ─── Student Interview Router ─────────────────────────────────────────────────

export const studentInterviewRouter = Router();

studentInterviewRouter.use(authenticate);
studentInterviewRouter.use(authorize('student'));

/**
 * GET  /api/v1/student/interviews         List student's own interviews (paginated)
 * GET  /api/v1/student/interviews/:id     Get single interview (student view, no recruiterNotes)
 */
studentInterviewRouter.get(
  '/',
  validate(studentInterviewsQuerySchema),
  getStudentInterviews
);

studentInterviewRouter.get(
  '/:id',
  validate(studentInterviewParamSchema),
  getStudentInterview
);


