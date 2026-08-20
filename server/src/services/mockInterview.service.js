import MockInterviewRequest, {
  MOCK_INTERVIEW_STATUS,
  MOCK_INTERVIEW_MODE,
} from '../models/mockInterviewRequest.model.js';
import User from '../models/user.model.js';
import alumniService from './alumni.service.js';
import ApiError from '../utils/ApiError.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const populateParticipants = (query) =>
  query
    .populate('alumniId', 'fullName email avatar')
    .populate('studentId', 'fullName email avatar');

/**
 * Checks whether the alumni already has an ACCEPTED mock interview that
 * overlaps with the proposed time window.
 */
const hasScheduleConflict = async (alumniId, scheduledAt, durationMinutes, excludeId = null) => {
  const startMs = new Date(scheduledAt).getTime();
  const endMs = startMs + durationMinutes * 60 * 1000;

  const filter = {
    alumniId,
    status: MOCK_INTERVIEW_STATUS.ACCEPTED,
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existingInterviews = await MockInterviewRequest.find(filter).select(
    'scheduledAt durationMinutes'
  );

  return existingInterviews.some((interview) => {
    const iStart = new Date(interview.scheduledAt).getTime();
    const iEnd = iStart + interview.durationMinutes * 60 * 1000;
    // Overlap check: intervals [startMs, endMs) and [iStart, iEnd) overlap when startMs < iEnd && iStart < endMs
    return startMs < iEnd && iStart < endMs;
  });
};

// ─── Service ─────────────────────────────────────────────────────────────────

class MockInterviewService {
  /**
   * Student requests a mock interview from a verified alumni.
   */
  async createRequest(studentId, data) {
    const { alumniId, topic, scheduledAt, durationMinutes, mode, meetingUrl, location } = data;

    // Validate alumni user
    const alumni = await User.findById(alumniId);
    if (!alumni || alumni.role !== 'alumni') {
      throw ApiError.notFound('Alumni not found');
    }

    // Alumni must be verified
    await alumniService.requireVerifiedAlumni(alumniId);

    // Validate mode-specific fields on the request body
    if (mode === MOCK_INTERVIEW_MODE.ONLINE && meetingUrl) {
      // meetingUrl is optional at request time (alumni provides it on accept)
    }

    if (mode === MOCK_INTERVIEW_MODE.OFFLINE && location) {
      // location is optional at request time
    }

    const request = await MockInterviewRequest.create({
      alumniId,
      studentId,
      topic,
      scheduledAt: new Date(scheduledAt),
      durationMinutes,
      mode,
      meetingUrl: meetingUrl || null,
      location: location || null,
      status: MOCK_INTERVIEW_STATUS.REQUESTED,
    });

    return populateParticipants(MockInterviewRequest.findById(request._id));
  }

  /**
   * Student's own mock interview requests.
   */
  async getStudentRequests(studentId) {
    return populateParticipants(
      MockInterviewRequest.find({ studentId }).sort({ createdAt: -1 })
    );
  }

  /**
   * Alumni's incoming mock interview requests.
   */
  async getAlumniRequests(alumniId) {
    return populateParticipants(
      MockInterviewRequest.find({ alumniId }).sort({ createdAt: -1 })
    );
  }

  /**
   * Get a single request — only participants can view.
   */
  async getRequestById(requestId, viewerId) {
    const request = await populateParticipants(
      MockInterviewRequest.findById(requestId)
    );

    if (!request) {
      throw ApiError.notFound('Mock interview request not found');
    }

    const isParticipant =
      request.alumniId._id.toString() === viewerId.toString() ||
      request.studentId._id.toString() === viewerId.toString();

    if (!isParticipant) {
      throw ApiError.forbidden('You do not have access to this mock interview request');
    }

    return request;
  }

  /**
   * Verified alumni accepts a REQUESTED interview.
   * Validates mode-specific fields and checks for schedule conflicts.
   */
  async acceptRequest(alumniId, requestId, { meetingUrl, location }) {
    await alumniService.requireVerifiedAlumni(alumniId);

    const request = await MockInterviewRequest.findOne({ _id: requestId, alumniId });

    if (!request) {
      throw ApiError.notFound('Mock interview request not found');
    }

    if (request.status !== MOCK_INTERVIEW_STATUS.REQUESTED) {
      throw ApiError.badRequest(
        `Cannot accept a request with status '${request.status}'`
      );
    }

    // Mode-specific validation on accept
    if (request.mode === MOCK_INTERVIEW_MODE.ONLINE) {
      if (!meetingUrl) {
        throw ApiError.badRequest('Meeting URL is required for ONLINE interviews');
      }
      request.meetingUrl = meetingUrl;
    }

    if (request.mode === MOCK_INTERVIEW_MODE.OFFLINE) {
      if (!location) {
        throw ApiError.badRequest('Location is required for OFFLINE interviews');
      }
      request.location = location;
    }

    // Schedule conflict detection
    const conflict = await hasScheduleConflict(
      alumniId,
      request.scheduledAt,
      request.durationMinutes
    );
    if (conflict) {
      throw ApiError.conflict(
        'You already have an accepted interview that overlaps with this time slot'
      );
    }

    request.status = MOCK_INTERVIEW_STATUS.ACCEPTED;
    await request.save();

    return populateParticipants(MockInterviewRequest.findById(request._id));
  }

  /**
   * Alumni declines a REQUESTED interview.
   */
  async declineRequest(alumniId, requestId) {
    await alumniService.requireVerifiedAlumni(alumniId);

    const request = await MockInterviewRequest.findOne({ _id: requestId, alumniId });

    if (!request) {
      throw ApiError.notFound('Mock interview request not found');
    }

    if (request.status !== MOCK_INTERVIEW_STATUS.REQUESTED) {
      throw ApiError.badRequest(
        `Cannot decline a request with status '${request.status}'`
      );
    }

    request.status = MOCK_INTERVIEW_STATUS.DECLINED;
    await request.save();

    return populateParticipants(MockInterviewRequest.findById(request._id));
  }

  /**
   * Alumni reschedules an ACCEPTED interview.
   * Validates new time, checks for conflicts (excluding current record).
   */
  async rescheduleRequest(alumniId, requestId, data) {
    await alumniService.requireVerifiedAlumni(alumniId);

    const request = await MockInterviewRequest.findOne({ _id: requestId, alumniId });

    if (!request) {
      throw ApiError.notFound('Mock interview request not found');
    }

    if (request.status !== MOCK_INTERVIEW_STATUS.ACCEPTED) {
      throw ApiError.badRequest(
        `Cannot reschedule a request with status '${request.status}'`
      );
    }

    const { scheduledAt, durationMinutes, meetingUrl, location } = data;

    const newDuration = durationMinutes ?? request.durationMinutes;

    const conflict = await hasScheduleConflict(
      alumniId,
      scheduledAt,
      newDuration,
      requestId // exclude self from conflict check
    );

    if (conflict) {
      throw ApiError.conflict(
        'The rescheduled time conflicts with another accepted interview'
      );
    }

    request.scheduledAt = new Date(scheduledAt);
    if (durationMinutes !== undefined) request.durationMinutes = durationMinutes;
    if (meetingUrl !== undefined) request.meetingUrl = meetingUrl;
    if (location !== undefined) request.location = location;

    await request.save();

    return populateParticipants(MockInterviewRequest.findById(request._id));
  }

  /**
   * Alumni completes an ACCEPTED interview and provides feedback.
   */
  async completeRequest(alumniId, requestId, feedback) {
    const request = await MockInterviewRequest.findOne({ _id: requestId, alumniId });

    if (!request) {
      throw ApiError.notFound('Mock interview request not found');
    }

    if (request.status !== MOCK_INTERVIEW_STATUS.ACCEPTED) {
      throw ApiError.badRequest(
        `Cannot complete a request with status '${request.status}'`
      );
    }

    request.status = MOCK_INTERVIEW_STATUS.COMPLETED;
    request.feedback = feedback;
    await request.save();

    return populateParticipants(MockInterviewRequest.findById(request._id));
  }

  /**
   * Student or alumni cancels an interview.
   * Students can cancel REQUESTED; alumni can cancel REQUESTED or ACCEPTED.
   */
  async cancelRequest(userId, userRole, requestId) {
    let request;

    if (userRole === 'student') {
      request = await MockInterviewRequest.findOne({ _id: requestId, studentId: userId });
    } else if (userRole === 'alumni') {
      request = await MockInterviewRequest.findOne({ _id: requestId, alumniId: userId });
    }

    if (!request) {
      throw ApiError.notFound('Mock interview request not found');
    }

    const cancellableStatuses =
      userRole === 'student'
        ? [MOCK_INTERVIEW_STATUS.REQUESTED]
        : [MOCK_INTERVIEW_STATUS.REQUESTED, MOCK_INTERVIEW_STATUS.ACCEPTED];

    if (!cancellableStatuses.includes(request.status)) {
      throw ApiError.badRequest(
        `Cannot cancel a request with status '${request.status}'`
      );
    }

    request.status = MOCK_INTERVIEW_STATUS.CANCELLED;
    await request.save();

    return populateParticipants(MockInterviewRequest.findById(request._id));
  }
}

export default new MockInterviewService();
