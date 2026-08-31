import interviewService from '../services/interview.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// ─── Recruiter Controllers ────────────────────────────────────────────────────

/**
 * POST /api/v1/recruiter/interviews
 * Create a new interview for a shortlisted candidate.
 */
export const createInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.createInterview(req.user._id, req.body);
  return ApiResponse.created(res, 'Interview scheduled successfully', interview);
});

/**
 * GET /api/v1/recruiter/interviews
 * List all interviews created by the recruiter (paginated, filterable).
 */
export const getRecruiterInterviews = asyncHandler(async (req, res) => {
  const result = await interviewService.getRecruiterInterviews(req.user._id, req.query);
  return ApiResponse.ok(res, 'Interviews retrieved successfully', result);
});

/**
 * GET /api/v1/recruiter/interviews/:id
 * Get a single interview by ID (recruiter view, includes recruiterNotes).
 */
export const getRecruiterInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.getInterviewById(
    req.params.id,
    req.user._id,
    req.user.role
  );
  return ApiResponse.ok(res, 'Interview retrieved successfully', interview);
});

/**
 * PATCH /api/v1/recruiter/interviews/:id
 * Update editable fields of a non-terminal interview.
 */
export const updateInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.updateInterview(
    req.params.id,
    req.user._id,
    req.body
  );
  return ApiResponse.ok(res, 'Interview updated successfully', interview);
});

/**
 * PATCH /api/v1/recruiter/interviews/:id/reschedule
 * Reschedule an interview to a new future date/time.
 */
export const rescheduleInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.rescheduleInterview(
    req.params.id,
    req.user._id,
    req.body
  );
  return ApiResponse.ok(res, 'Interview rescheduled successfully', interview);
});

/**
 * PATCH /api/v1/recruiter/interviews/:id/cancel
 * Cancel an interview (cannot cancel a COMPLETED interview).
 */
export const cancelInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.cancelInterview(
    req.params.id,
    req.user._id,
    req.body.cancelReason
  );
  return ApiResponse.ok(res, 'Interview cancelled successfully', interview);
});

/**
 * PATCH /api/v1/recruiter/interviews/:id/complete
 * Mark an interview as COMPLETED.
 */
export const completeInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.completeInterview(
    req.params.id,
    req.user._id
  );
  return ApiResponse.ok(res, 'Interview marked as completed', interview);
});

// ─── Student Controllers ──────────────────────────────────────────────────────

/**
 * GET /api/v1/student/interviews
 * List all interviews assigned to the authenticated student (paginated).
 * recruiterNotes are NOT included in this response.
 */
export const getStudentInterviews = asyncHandler(async (req, res) => {
  const result = await interviewService.getStudentInterviews(req.user._id, req.query);
  return ApiResponse.ok(res, 'Your interviews retrieved successfully', result);
});

/**
 * GET /api/v1/student/interviews/:id
 * Get a single interview by ID (student view, recruiterNotes stripped).
 */
export const getStudentInterview = asyncHandler(async (req, res) => {
  const interview = await interviewService.getInterviewById(
    req.params.id,
    req.user._id,
    req.user.role
  );
  return ApiResponse.ok(res, 'Interview retrieved successfully', interview);
});

