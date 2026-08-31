import mongoose from 'mongoose';
import Interview, { TERMINAL_STATUSES } from '../models/interview.model.js';
import Shortlist from '../models/shortlist.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

// ─── Helper: detect recruiter booking overlap ─────────────────────────────────
//
// An overlap occurs when a proposed [start, end) window intersects with any
// existing SCHEDULED or RESCHEDULED interview window for the same recruiter.
//
// Formula: two intervals [s1,e1) and [s2,e2) overlap iff s1 < e2 && s2 < e1.
//
async function detectOverlap(recruiterId, scheduledAt, durationMinutes, excludeId = null) {
  const proposedStart = new Date(scheduledAt);
  const proposedEnd = new Date(proposedStart.getTime() + durationMinutes * 60 * 1000);

  const filter = {
    recruiterId,
    status: { $in: ['SCHEDULED', 'RESCHEDULED'] },
    // existing.scheduledAt < proposedEnd  AND  existing.end > proposedStart
    scheduledAt: { $lt: proposedEnd },
    $expr: {
      $gt: [
        { $add: ['$scheduledAt', { $multiply: ['$durationMinutes', 60000] }] },
        proposedStart,
      ],
    },
  };

  if (excludeId) {
    filter._id = { $ne: new mongoose.Types.ObjectId(String(excludeId)) };
  }

  const conflict = await Interview.findOne(filter).select('_id title scheduledAt durationMinutes').lean();
  return conflict;
}

// ─── Helper: build recruiter-safe interview projection ───────────────────────
function formatRecruiterView(interview) {
  return {
    id: String(interview._id),
    recruiterId: String(interview.recruiterId),
    studentId: String(interview.studentId?._id ?? interview.studentId),
    candidate: interview.studentId?.fullName
      ? {
          name: interview.studentId.fullName,
          email: interview.studentId.email,
          avatar: interview.studentId.avatar || null,
        }
      : null,
    projectId: interview.projectId ? String(interview.projectId) : null,
    shortlistId: interview.shortlistId ? String(interview.shortlistId) : null,
    title: interview.title,
    description: interview.description || null,
    scheduledAt: interview.scheduledAt,
    durationMinutes: interview.durationMinutes,
    mode: interview.mode,
    meetingUrl: interview.meetingUrl || null,
    location: interview.location || null,
    status: interview.status,
    recruiterNotes: interview.recruiterNotes || null,
    candidateNotes: interview.candidateNotes || null,
    cancelReason: interview.cancelReason || null,
    createdAt: interview.createdAt,
    updatedAt: interview.updatedAt,
  };
}

// ─── Helper: build student-safe interview projection (strips recruiterNotes) ──
function formatStudentView(interview) {
  const view = formatRecruiterView(interview);
  delete view.recruiterNotes;      // private recruiter field – never exposed to students
  delete view.recruiterId;         // internal field – students don't need the recruiter's raw ID
  return view;
}

// ─── Service Class ────────────────────────────────────────────────────────────

class InterviewService {
  // ── createInterview ──────────────────────────────────────────────────────────
  /**
   * Create a new interview.  Enforces:
   *  - Student must be a valid active student.
   *  - Recruiter must have an active shortlist entry for the student (business rule).
   *  - scheduledAt must be in the future.
   *  - No overlapping interview for the recruiter in the proposed time window.
   *  - ONLINE → meetingUrl required; OFFLINE → location required.
   */
  async createInterview(recruiterId, data) {
    const {
      studentId,
      projectId,
      shortlistId,
      title,
      description,
      scheduledAt,
      durationMinutes,
      mode,
      meetingUrl,
      location,
      recruiterNotes,
    } = data;

    // 1. Validate student exists and is an active student
    const student = await User.findById(studentId).select('fullName email role status');
    if (!student || student.role !== 'student' || student.status === 'blocked') {
      throw ApiError.notFound('Student candidate not found or is unavailable');
    }

    // 2. Require an active shortlist entry (recruiter must have shortlisted the student)
    const activeShortlist = await Shortlist.findOne({
      recruiterId,
      studentId,
      status: 'SHORTLISTED',
    });
    if (!activeShortlist) {
      throw ApiError.badRequest(
        'You must shortlist the candidate before scheduling an interview'
      );
    }

    // 3. Future date guard (also validated by Zod, but defend in service too)
    if (new Date(scheduledAt) <= new Date()) {
      throw ApiError.badRequest('scheduledAt must be a future date and time');
    }

    // 4. Overlap detection for recruiter's calendar
    const conflict = await detectOverlap(recruiterId, scheduledAt, durationMinutes);
    if (conflict) {
      const conflictStart = new Date(conflict.scheduledAt).toISOString();
      throw ApiError.conflict(
        `This time slot conflicts with your existing interview "${conflict.title}" scheduled at ${conflictStart}`
      );
    }

    // 5. Create interview
    const interview = await Interview.create({
      recruiterId,
      studentId,
      projectId: projectId || null,
      shortlistId: shortlistId || activeShortlist._id,
      title,
      description: description || null,
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      mode,
      meetingUrl: mode === 'ONLINE' ? meetingUrl : null,
      location: mode === 'OFFLINE' ? location : null,
      status: 'SCHEDULED',
      recruiterNotes: recruiterNotes || null,
    });

    // Populate candidate for response
    await interview.populate('studentId', 'fullName email avatar');
    return formatRecruiterView(interview.toObject());
  }

  // ── getRecruiterInterviews ───────────────────────────────────────────────────
  /**
   * Paginated list of all interviews created by the recruiter.
   * Supports filters: status, studentId, from, to.
   */
  async getRecruiterInterviews(recruiterId, queryOptions = {}) {
    const page = Number.parseInt(queryOptions.page, 10) || 1;
    const limit = Number.parseInt(queryOptions.limit, 10) || 20;
    const { status, studentId, from, to } = queryOptions;

    const filter = { recruiterId };

    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;

    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [total, interviews] = await Promise.all([
      Interview.countDocuments(filter),
      Interview.find(filter)
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'fullName email avatar')
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      interviews: interviews.map(formatRecruiterView),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // ── getStudentInterviews ─────────────────────────────────────────────────────
  /**
   * Paginated list of interviews assigned to the authenticated student.
   * Does NOT expose recruiterNotes.
   * Supports filters: status, from, to.
   */
  async getStudentInterviews(studentId, queryOptions = {}) {
    const page = Number.parseInt(queryOptions.page, 10) || 1;
    const limit = Number.parseInt(queryOptions.limit, 10) || 20;
    const { status, from, to } = queryOptions;

    const filter = { studentId };

    if (status) filter.status = status;

    if (from || to) {
      filter.scheduledAt = {};
      if (from) filter.scheduledAt.$gte = new Date(from);
      if (to) filter.scheduledAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const [total, interviews] = await Promise.all([
      Interview.countDocuments(filter),
      Interview.find(filter)
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      interviews: interviews.map(formatStudentView),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  // ── getInterviewById ─────────────────────────────────────────────────────────
  /**
   * Fetch a single interview by ID.
   * Enforces ownership:
   *  - recruiterId or studentId must match the requesting user's ID.
   *  - Students receive the student-safe view (no recruiterNotes).
   */
  async getInterviewById(interviewId, requestingUserId, requestingRole) {
    const interview = await Interview.findById(interviewId)
      .populate('studentId', 'fullName email avatar')
      .lean();

    if (!interview) {
      throw ApiError.notFound('Interview not found');
    }

    const isRecruiter =
      requestingRole === 'recruiter' || requestingRole === 'admin';
    const isOwnerRecruiter = String(interview.recruiterId) === String(requestingUserId);
    const isOwnerStudent = String(interview.studentId?._id ?? interview.studentId) === String(requestingUserId);

    if (!isOwnerRecruiter && !isOwnerStudent && requestingRole !== 'admin') {
      throw ApiError.forbidden('You do not have permission to view this interview');
    }

    return isRecruiter && isOwnerRecruiter
      ? formatRecruiterView(interview)
      : formatStudentView(interview);
  }

  // ── updateInterview ──────────────────────────────────────────────────────────
  /**
   * General PATCH for recruiter to update editable fields.
   * Blocked on terminal statuses (COMPLETED, CANCELLED, NO_SHOW).
   */
  async updateInterview(interviewId, recruiterId, updates) {
    const interview = await Interview.findById(interviewId);
    if (!interview) throw ApiError.notFound('Interview not found');

    if (String(interview.recruiterId) !== String(recruiterId)) {
      throw ApiError.forbidden('You can only modify your own interviews');
    }

    if (TERMINAL_STATUSES.includes(interview.status)) {
      throw ApiError.badRequest(
        `Interview cannot be modified — current status is ${interview.status}`
      );
    }

    // Apply allowed editable fields
    const allowedFields = [
      'title', 'description', 'mode', 'meetingUrl', 'location', 'recruiterNotes',
    ];
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        interview[field] = updates[field];
      }
    }

    // Cross-field integrity: after applying updates, check mode consistency
    if (interview.mode === 'ONLINE' && !interview.meetingUrl) {
      throw ApiError.badRequest('meetingUrl is required for ONLINE interviews');
    }
    if (interview.mode === 'OFFLINE' && !interview.location) {
      throw ApiError.badRequest('location is required for OFFLINE interviews');
    }

    await interview.save();
    await interview.populate('studentId', 'fullName email avatar');
    return formatRecruiterView(interview.toObject());
  }

  // ── rescheduleInterview ──────────────────────────────────────────────────────
  /**
   * Reschedule an interview to a new date/time.
   * Validates future date, checks overlap (excluding the current interview).
   * Transitions status to RESCHEDULED.
   */
  async rescheduleInterview(interviewId, recruiterId, data) {
    const {
      scheduledAt,
      durationMinutes,
      mode,
      meetingUrl,
      location,
      recruiterNotes,
    } = data;

    const interview = await Interview.findById(interviewId);
    if (!interview) throw ApiError.notFound('Interview not found');

    if (String(interview.recruiterId) !== String(recruiterId)) {
      throw ApiError.forbidden('You can only reschedule your own interviews');
    }

    if (TERMINAL_STATUSES.includes(interview.status)) {
      throw ApiError.badRequest(
        `Cannot reschedule — interview status is ${interview.status}`
      );
    }

    // Future date guard
    if (new Date(scheduledAt) <= new Date()) {
      throw ApiError.badRequest('New scheduledAt must be a future date and time');
    }

    // Use new duration if provided, else keep existing
    const newDuration = durationMinutes ?? interview.durationMinutes;
    const newMode = mode ?? interview.mode;

    // Overlap detection — exclude this interview from the check
    const conflict = await detectOverlap(recruiterId, scheduledAt, newDuration, interviewId);
    if (conflict) {
      const conflictStart = new Date(conflict.scheduledAt).toISOString();
      throw ApiError.conflict(
        `The new time slot conflicts with interview "${conflict.title}" at ${conflictStart}`
      );
    }

    interview.scheduledAt = new Date(scheduledAt);
    interview.durationMinutes = newDuration;
    if (mode !== undefined) interview.mode = newMode;
    if (meetingUrl !== undefined) interview.meetingUrl = meetingUrl;
    if (location !== undefined) interview.location = location;
    if (recruiterNotes !== undefined) interview.recruiterNotes = recruiterNotes;
    interview.status = 'RESCHEDULED';

    // Cross-field integrity after update
    if (interview.mode === 'ONLINE' && !interview.meetingUrl) {
      throw ApiError.badRequest('meetingUrl is required for ONLINE interviews');
    }
    if (interview.mode === 'OFFLINE' && !interview.location) {
      throw ApiError.badRequest('location is required for OFFLINE interviews');
    }

    await interview.save();
    await interview.populate('studentId', 'fullName email avatar');
    return formatRecruiterView(interview.toObject());
  }

  // ── cancelInterview ──────────────────────────────────────────────────────────
  /**
   * Cancel an interview.
   * - Cannot cancel a COMPLETED interview (admin override required).
   * - Already CANCELLED interviews are idempotent (return as-is).
   */
  async cancelInterview(interviewId, recruiterId, cancelReason) {
    const interview = await Interview.findById(interviewId);
    if (!interview) throw ApiError.notFound('Interview not found');

    if (String(interview.recruiterId) !== String(recruiterId)) {
      throw ApiError.forbidden('You can only cancel your own interviews');
    }

    if (interview.status === 'COMPLETED') {
      throw ApiError.badRequest(
        'Completed interviews cannot be cancelled without an admin override'
      );
    }

    if (interview.status === 'CANCELLED') {
      // Idempotent — already cancelled
      await interview.populate('studentId', 'fullName email avatar');
      return formatRecruiterView(interview.toObject());
    }

    interview.status = 'CANCELLED';
    if (cancelReason) interview.cancelReason = cancelReason;

    await interview.save();
    await interview.populate('studentId', 'fullName email avatar');
    return formatRecruiterView(interview.toObject());
  }

  // ── completeInterview ────────────────────────────────────────────────────────
  /**
   * Mark an interview as COMPLETED.
   * - Must currently be SCHEDULED or RESCHEDULED.
   * - Cannot complete a CANCELLED or NO_SHOW interview.
   */
  async completeInterview(interviewId, recruiterId) {
    const interview = await Interview.findById(interviewId);
    if (!interview) throw ApiError.notFound('Interview not found');

    if (String(interview.recruiterId) !== String(recruiterId)) {
      throw ApiError.forbidden('You can only complete your own interviews');
    }

    if (interview.status === 'COMPLETED') {
      // Idempotent — already completed
      await interview.populate('studentId', 'fullName email avatar');
      return formatRecruiterView(interview.toObject());
    }

    if (['CANCELLED', 'NO_SHOW'].includes(interview.status)) {
      throw ApiError.badRequest(
        `Cannot mark a ${interview.status} interview as completed`
      );
    }

    interview.status = 'COMPLETED';
    await interview.save();
    await interview.populate('studentId', 'fullName email avatar');
    return formatRecruiterView(interview.toObject());
  }
}

const interviewService = new InterviewService();
export default interviewService;

