import MentorshipRequest, { MENTORSHIP_STATUS } from '../models/mentorshipRequest.model.js';
import User from '../models/user.model.js';
import alumniService from './alumni.service.js';
import ApiError from '../utils/ApiError.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const populateParticipants = (query) =>
  query
    .populate('alumniId', 'fullName email avatar')
    .populate('studentId', 'fullName email avatar');

// ─── Service ─────────────────────────────────────────────────────────────────

class MentorshipService {
  /**
   * Student creates a mentorship request to a verified alumni.
   * Prevents duplicate PENDING requests from the same student to the same alumni.
   */
  async requestMentorship(studentId, { alumniId, topic, message }) {
    // Validate alumni exists and has correct role
    const alumni = await User.findById(alumniId);
    if (!alumni || alumni.role !== 'alumni') {
      throw ApiError.notFound('Alumni user not found');
    }

    // Alumni must be verified
    await alumniService.requireVerifiedAlumni(alumniId);

    // Prevent duplicate PENDING requests
    const duplicate = await MentorshipRequest.findOne({
      alumniId,
      studentId,
      status: MENTORSHIP_STATUS.PENDING,
    });
    if (duplicate) {
      throw ApiError.conflict(
        'You already have a pending mentorship request with this alumni'
      );
    }

    const request = await MentorshipRequest.create({
      alumniId,
      studentId,
      topic,
      message,
      status: MENTORSHIP_STATUS.PENDING,
    });

    await populateParticipants(
      MentorshipRequest.findById(request._id)
    );

    return MentorshipRequest.findById(request._id)
      .populate('alumniId', 'fullName email avatar')
      .populate('studentId', 'fullName email avatar');
  }

  /**
   * Return all mentorship requests where the authenticated user is the student.
   */
  async getStudentRequests(studentId) {
    return populateParticipants(
      MentorshipRequest.find({ studentId }).sort({ createdAt: -1 })
    );
  }

  /**
   * Return all mentorship requests where the authenticated user is the alumni.
   */
  async getAlumniRequests(alumniId) {
    return populateParticipants(
      MentorshipRequest.find({ alumniId }).sort({ createdAt: -1 })
    );
  }

  /**
   * Get a single request by ID — only visible to participants.
   */
  async getRequestById(requestId, viewerId) {
    const request = await populateParticipants(
      MentorshipRequest.findById(requestId)
    );

    if (!request) {
      throw ApiError.notFound('Mentorship request not found');
    }

    const isParticipant =
      request.alumniId._id.toString() === viewerId.toString() ||
      request.studentId._id.toString() === viewerId.toString();

    if (!isParticipant) {
      throw ApiError.forbidden('You do not have access to this mentorship request');
    }

    return request;
  }

  /**
   * Alumni accepts a PENDING request.
   * Only verified alumni may accept.
   */
  async acceptRequest(alumniId, requestId, responseMessage) {
    await alumniService.requireVerifiedAlumni(alumniId);

    const request = await MentorshipRequest.findOne({
      _id: requestId,
      alumniId,
    });

    if (!request) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (request.status !== MENTORSHIP_STATUS.PENDING) {
      throw ApiError.badRequest(
        `Cannot accept a request with status '${request.status}'`
      );
    }

    request.status = MENTORSHIP_STATUS.ACCEPTED;
    if (responseMessage) request.responseMessage = responseMessage;
    await request.save();

    return populateParticipants(MentorshipRequest.findById(request._id));
  }

  /**
   * Alumni declines a PENDING request.
   */
  async declineRequest(alumniId, requestId, responseMessage) {
    await alumniService.requireVerifiedAlumni(alumniId);

    const request = await MentorshipRequest.findOne({
      _id: requestId,
      alumniId,
    });

    if (!request) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (request.status !== MENTORSHIP_STATUS.PENDING) {
      throw ApiError.badRequest(
        `Cannot decline a request with status '${request.status}'`
      );
    }

    request.status = MENTORSHIP_STATUS.DECLINED;
    if (responseMessage) request.responseMessage = responseMessage;
    await request.save();

    return populateParticipants(MentorshipRequest.findById(request._id));
  }

  /**
   * Student cancels their own PENDING request.
   */
  async cancelRequest(studentId, requestId) {
    const request = await MentorshipRequest.findOne({
      _id: requestId,
      studentId,
    });

    if (!request) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (request.status !== MENTORSHIP_STATUS.PENDING) {
      throw ApiError.badRequest(
        `Cannot cancel a request with status '${request.status}'`
      );
    }

    request.status = MENTORSHIP_STATUS.CANCELLED;
    await request.save();

    return populateParticipants(MentorshipRequest.findById(request._id));
  }

  /**
   * Alumni marks an ACCEPTED request as COMPLETED.
   */
  async completeRequest(alumniId, requestId) {
    const request = await MentorshipRequest.findOne({
      _id: requestId,
      alumniId,
    });

    if (!request) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (request.status !== MENTORSHIP_STATUS.ACCEPTED) {
      throw ApiError.badRequest(
        `Cannot complete a request with status '${request.status}'. Only accepted requests can be completed.`
      );
    }

    request.status = MENTORSHIP_STATUS.COMPLETED;
    await request.save();

    return populateParticipants(MentorshipRequest.findById(request._id));
  }
}

export default new MentorshipService();
