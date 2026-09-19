import Mentorship from '../models/mentorship.model.js';
import User from '../models/user.model.js';
import notificationService from './notification.service.js';
import ApiError from '../utils/ApiError.js';

class MentorshipService {
  async requestMentorship(studentId, { alumniId, focusSkill, message }) {
    if (!alumniId || !focusSkill || !message) {
      throw ApiError.badRequest('alumniId, focusSkill, and message are required');
    }

    if (studentId.toString() === alumniId.toString()) {
      throw ApiError.badRequest('Cannot request mentorship from yourself');
    }

    const [student, alumni] = await Promise.all([
      User.findById(studentId),
      User.findById(alumniId),
    ]);

    if (!student) throw ApiError.notFound('Student not found');
    if (!alumni) throw ApiError.notFound('Alumni mentor not found');

    const existingPending = await Mentorship.findOne({
      student: studentId,
      alumni: alumniId,
      status: 'pending',
    });

    if (existingPending) {
      throw ApiError.conflict('You already have a pending mentorship inquiry with this mentor');
    }

    const mentorship = await Mentorship.create({
      student: studentId,
      alumni: alumniId,
      focusSkill: focusSkill.trim(),
      message: message.trim(),
      status: 'pending',
    });

    // Notify alumni
    await notificationService.createNotification({
      recipient: alumniId,
      sender: studentId,
      type: 'mentorship',
      title: 'New Mentorship Request',
      message: `${student.fullName} requested mentorship in ${focusSkill.trim()}.`,
      link: '/dashboard/alumni',
      metadata: { mentorshipId: mentorship._id },
    });

    return mentorship;
  }

  async getMyRequests(userId, role) {
    if (role === 'alumni') {
      return Mentorship.find({ alumni: userId, status: 'pending' })
        .populate('student', 'fullName email avatar college branch graduationYear')
        .sort({ createdAt: -1 });
    }

    return Mentorship.find({ student: userId })
      .populate('alumni', 'fullName email avatar college organization title')
      .sort({ createdAt: -1 });
  }

  async acceptRequest(alumniId, requestId, { scheduledDate, notes } = {}) {
    const mentorship = await Mentorship.findOne({
      _id: requestId,
      alumni: alumniId,
    }).populate('alumni', 'fullName email');

    if (!mentorship) {
      throw ApiError.notFound('Mentorship request not found');
    }

    mentorship.status = 'accepted';
    if (scheduledDate) {
      mentorship.scheduledDate = new Date(scheduledDate);
    }
    if (notes) {
      mentorship.notes = notes.trim();
    }

    await mentorship.save();

    const formattedDate = mentorship.scheduledDate
      ? ` for ${mentorship.scheduledDate.toLocaleDateString()}`
      : '';

    // Notify student
    await notificationService.createNotification({
      recipient: mentorship.student,
      sender: alumniId,
      type: 'mentorship',
      title: 'Mentorship Inquiry Accepted!',
      message: `${mentorship.alumni.fullName} accepted your mentorship request${formattedDate}.`,
      link: '/ai-insights',
      metadata: { mentorshipId: mentorship._id },
    });

    return mentorship;
  }

  async declineRequest(alumniId, requestId) {
    const mentorship = await Mentorship.findOne({
      _id: requestId,
      alumni: alumniId,
    }).populate('alumni', 'fullName email');

    if (!mentorship) {
      throw ApiError.notFound('Mentorship request not found');
    }

    mentorship.status = 'declined';
    await mentorship.save();

    // Notify student
    await notificationService.createNotification({
      recipient: mentorship.student,
      sender: alumniId,
      type: 'mentorship',
      title: 'Mentorship Inquiry Update',
      message: `${mentorship.alumni.fullName} was unable to accept your mentorship request at this time.`,
      link: '/ai-insights',
      metadata: { mentorshipId: mentorship._id },
    });

    return mentorship;
  }

  async getMentees(alumniId) {
    return Mentorship.find({ alumni: alumniId, status: 'accepted' })
      .populate('student', 'fullName email avatar college branch graduationYear')
      .sort({ updatedAt: -1 });
  }
}

export default new MentorshipService();
