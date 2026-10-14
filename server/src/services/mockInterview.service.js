import mongoose from 'mongoose';
import MockInterview from '../models/mockInterview.model.js';
import User from '../models/user.model.js';
import notificationService from './notification.service.js';
import ApiError from '../utils/ApiError.js';

class MockInterviewService {
  /**
   * Helper to strip privateNotes for students / non-interviewers
   */
  sanitizeInterview(interviewDoc, viewerId, viewerRole) {
    if (!interviewDoc) return null;
    const interview = interviewDoc.toObject ? interviewDoc.toObject() : { ...interviewDoc };

    const interviewerId =
      interview.alumni?._id?.toString() || interview.alumni?.toString();
    const isInterviewer =
      viewerRole === 'admin' || (interviewerId && viewerId && interviewerId === viewerId.toString());

    if (!isInterviewer && interview.evaluation) {
      delete interview.evaluation.privateNotes;
    }

    return interview;
  }

  /**
   * Schedule a new mock interview
   */
  async scheduleInterview({
    requesterId,
    requesterRole,
    studentId,
    alumniId,
    mentorshipId = null,
    scheduledDate,
    mode = 'online',
    meetingLink = null,
    location = null,
    focusDomain,
  }) {
    let resolvedStudentId = studentId;
    let resolvedAlumniId = alumniId;

    if (requesterRole === 'alumni') {
      resolvedAlumniId = requesterId;
    } else if (requesterRole === 'student') {
      resolvedStudentId = requesterId;
    }

    if (!resolvedStudentId || !resolvedAlumniId) {
      throw ApiError.badRequest('Both studentId and alumniId are required to schedule an interview');
    }

    if (
      !mongoose.Types.ObjectId.isValid(resolvedStudentId) ||
      !mongoose.Types.ObjectId.isValid(resolvedAlumniId)
    ) {
      throw ApiError.badRequest('Invalid student or alumni identifier');
    }

    if (resolvedStudentId.toString() === resolvedAlumniId.toString()) {
      throw ApiError.badRequest('Cannot schedule a mock interview with yourself');
    }

    const parsedDate = new Date(scheduledDate);
    if (Number.isNaN(parsedDate.getTime())) {
      throw ApiError.badRequest('Invalid scheduled date provided');
    }
    if (parsedDate <= new Date()) {
      throw ApiError.badRequest('Scheduled date must be in the future');
    }

    const [student, alumni] = await Promise.all([
      User.findById(resolvedStudentId),
      User.findById(resolvedAlumniId),
    ]);

    if (!student) throw ApiError.notFound('Student not found');
    if (student.role !== 'student') throw ApiError.badRequest('Designated participant must be a student');

    if (!alumni) throw ApiError.notFound('Alumni mentor not found');
    if (alumni.role !== 'alumni' && alumni.role !== 'admin') {
      throw ApiError.badRequest('Designated interviewer must be an alumni member');
    }

    if (!focusDomain || !focusDomain.trim()) {
      throw ApiError.badRequest('Technical focus domain is required');
    }

    const mockInterview = await MockInterview.create({
      student: resolvedStudentId,
      alumni: resolvedAlumniId,
      mentorship: mentorshipId && mongoose.Types.ObjectId.isValid(mentorshipId) ? mentorshipId : null,
      scheduledDate: parsedDate,
      mode: mode || 'online',
      meetingLink: meetingLink ? meetingLink.trim() : null,
      location: location ? location.trim() : null,
      focusDomain: focusDomain.trim(),
      status: 'scheduled',
    });

    // Notify the counterpart
    const notifyRecipientId =
      requesterId.toString() === resolvedAlumniId.toString()
        ? resolvedStudentId
        : resolvedAlumniId;
    const notifySenderId = requesterId;
    const isAlumniInitiator = requesterId.toString() === resolvedAlumniId.toString();

    try {
      await notificationService.createNotification({
        recipient: notifyRecipientId,
        sender: notifySenderId,
        type: 'interview',
        title: 'Mock Interview Scheduled',
        message: isAlumniInitiator
          ? `${alumni.fullName} scheduled a mock interview for ${mockInterview.focusDomain} on ${parsedDate.toLocaleDateString()}.`
          : `${student.fullName} requested a mock interview in ${mockInterview.focusDomain} for ${parsedDate.toLocaleDateString()}.`,
        link: isAlumniInitiator ? '/dashboard/student' : '/dashboard/alumni',
        metadata: {
          interviewId: mockInterview._id,
          focusDomain: mockInterview.focusDomain,
          scheduledDate: parsedDate,
        },
      });
    } catch {
      // Safe notification handling
    }

    const populated = await MockInterview.findById(mockInterview._id)
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('alumni', 'fullName email avatar college branch graduationYear');

    return this.sanitizeInterview(populated, requesterId, requesterRole);
  }

  /**
   * Retrieve list of interviews for the authenticated user
   */
  async getInterviewsForUser(userId, role, { status = null } = {}) {
    const query = {};
    if (role === 'alumni') {
      query.alumni = userId;
    } else if (role === 'student') {
      query.student = userId;
    }

    if (status) {
      query.status = status;
    }

    const interviews = await MockInterview.find(query)
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('alumni', 'fullName email avatar college branch graduationYear')
      .sort({ scheduledDate: -1, createdAt: -1 });

    return interviews.map((item) => this.sanitizeInterview(item, userId, role));
  }

  /**
   * Get single interview by ID with participant privacy enforcement
   */
  async getInterviewById(interviewId, userId, role) {
    if (!interviewId || !mongoose.Types.ObjectId.isValid(interviewId)) {
      throw ApiError.badRequest('Valid interview ID is required');
    }

    const interview = await MockInterview.findById(interviewId)
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('alumni', 'fullName email avatar college branch graduationYear');

    if (!interview) {
      throw ApiError.notFound('Mock interview not found');
    }

    const isStudent = interview.student._id.toString() === userId.toString();
    const isAlumni = interview.alumni._id.toString() === userId.toString();
    const isAdmin = role === 'admin';

    if (!isStudent && !isAlumni && !isAdmin) {
      throw ApiError.forbidden('You are not authorized to view this interview');
    }

    return this.sanitizeInterview(interview, userId, role);
  }

  /**
   * Accept/Confirm, Reschedule, or Cancel an interview
   */
  async updateStatus(
    interviewId,
    userId,
    userRole,
    { status, scheduledDate, cancellationReason, meetingLink, location }
  ) {
    if (!interviewId || !mongoose.Types.ObjectId.isValid(interviewId)) {
      throw ApiError.badRequest('Valid interview ID is required');
    }

    const interview = await MockInterview.findById(interviewId)
      .populate('student', 'fullName email')
      .populate('alumni', 'fullName email');

    if (!interview) {
      throw ApiError.notFound('Mock interview not found');
    }

    const isStudent = interview.student._id.toString() === userId.toString();
    const isAlumni = interview.alumni._id.toString() === userId.toString();
    const isAdmin = userRole === 'admin';

    if (!isStudent && !isAlumni && !isAdmin) {
      throw ApiError.forbidden('You are not a participant in this mock interview');
    }

    if (interview.status === 'completed') {
      throw ApiError.badRequest('Cannot alter an interview that is already completed');
    }

    if (interview.status === 'cancelled' && status !== 'scheduled') {
      throw ApiError.badRequest('Cannot update a cancelled interview');
    }

    if (scheduledDate) {
      const parsedDate = new Date(scheduledDate);
      if (Number.isNaN(parsedDate.getTime()) || parsedDate <= new Date()) {
        throw ApiError.badRequest('Rescheduled date must be a valid future date');
      }
      interview.scheduledDate = parsedDate;
    }

    if (status) {
      if (status === 'cancelled') {
        interview.status = 'cancelled';
        interview.cancellationReason = cancellationReason ? cancellationReason.trim() : 'Cancelled by participant';
      } else if (status === 'confirmed') {
        interview.status = 'confirmed';
      } else if (status === 'completed') {
        interview.status = 'completed';
      } else if (status === 'scheduled') {
        interview.status = 'scheduled';
      }
    }

    if (meetingLink !== undefined) interview.meetingLink = meetingLink ? meetingLink.trim() : null;
    if (location !== undefined) interview.location = location ? location.trim() : null;

    await interview.save();

    // Notify the other party
    const notifyRecipientId = isAlumni ? interview.student._id : interview.alumni._id;
    try {
      await notificationService.createNotification({
        recipient: notifyRecipientId,
        sender: userId,
        type: 'interview',
        title: `Mock Interview ${interview.status === 'cancelled' ? 'Cancelled' : 'Updated'}`,
        message: `Your mock interview status for ${interview.focusDomain} was updated to ${interview.status}.`,
        link: isAlumni ? '/dashboard/student' : '/dashboard/alumni',
        metadata: { interviewId: interview._id, status: interview.status },
      });
    } catch {
      // Safe notification
    }

    return this.sanitizeInterview(interview, userId, userRole);
  }

  /**
   * Submit structured evaluation rubric
   */
  async submitEvaluation(
    interviewId,
    alumniId,
    {
      technicalKnowledge,
      problemSolving,
      communication,
      projectUnderstanding,
      confidence,
      strengths,
      improvements,
      privateNotes = null,
      feedbackVisibility = 'published',
    }
  ) {
    if (!interviewId || !mongoose.Types.ObjectId.isValid(interviewId)) {
      throw ApiError.badRequest('Valid interview ID is required');
    }

    const interview = await MockInterview.findById(interviewId)
      .populate('student', 'fullName email')
      .populate('alumni', 'fullName email');

    if (!interview) {
      throw ApiError.notFound('Mock interview not found');
    }

    if (interview.alumni._id.toString() !== alumniId.toString()) {
      throw ApiError.forbidden('Only the assigned alumni interviewer can submit an evaluation');
    }

    if (interview.status === 'cancelled') {
      throw ApiError.badRequest('Cannot evaluate a cancelled interview');
    }

    // Validate 5 rubric dimensions (1 to 5 integer)
    const dimensions = [
      { name: 'Technical Knowledge', val: technicalKnowledge },
      { name: 'Problem-Solving', val: problemSolving },
      { name: 'Communication', val: communication },
      { name: 'Project Understanding', val: projectUnderstanding },
      { name: 'Confidence and Professionalism', val: confidence },
    ];

    for (const d of dimensions) {
      if (
        typeof d.val !== 'number' ||
        !Number.isInteger(d.val) ||
        d.val < 1 ||
        d.val > 5
      ) {
        throw ApiError.badRequest(
          `${d.name} rating must be an integer between 1 and 5`
        );
      }
    }

    if (!strengths || strengths.trim().length < 5) {
      throw ApiError.badRequest('Strengths feedback must be at least 5 characters');
    }

    if (!improvements || improvements.trim().length < 5) {
      throw ApiError.badRequest('Improvement feedback must be at least 5 characters');
    }

    // Server-side calculated overall score:
    // Overall Score = (sum of dimension ratings / sum of maximum possible ratings) * 100
    // Sum of max ratings = 25
    const sumRatings =
      technicalKnowledge + problemSolving + communication + projectUnderstanding + confidence;
    const overallScore = Math.round((sumRatings / 25) * 100);

    interview.evaluation = {
      technicalKnowledge,
      problemSolving,
      communication,
      projectUnderstanding,
      confidence,
      overallScore,
      strengths: strengths.trim(),
      improvements: improvements.trim(),
      privateNotes: privateNotes && typeof privateNotes === 'string' ? privateNotes.trim() : null,
      feedbackVisibility: feedbackVisibility || 'published',
      evaluatedAt: new Date(),
    };

    interview.status = 'completed';
    await interview.save();

    // Notify student about feedback
    try {
      await notificationService.createNotification({
        recipient: interview.student._id,
        sender: alumniId,
        type: 'interview',
        title: 'Mock Interview Feedback Published!',
        message: `${interview.alumni.fullName} submitted your mock interview score (${overallScore}/100) and structured feedback for ${interview.focusDomain}.`,
        link: '/dashboard/student',
        metadata: {
          interviewId: interview._id,
          overallScore,
          focusDomain: interview.focusDomain,
        },
      });
    } catch {
      // Safe notification
    }

    return this.sanitizeInterview(interview, alumniId, 'alumni');
  }
}

export default new MockInterviewService();
