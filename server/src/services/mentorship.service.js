import Mentorship from '../models/mentorship.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

class MentorshipService {
  async requestMentorship(studentId, { alumniId, topic, message, requestedSkills }) {
    const alumni = await User.findOne({ _id: alumniId, role: { $in: ['alumni', 'faculty'] } });
    if (!alumni) {
      throw ApiError.notFound('Alumni or mentor not found');
    }

    const mentorship = await Mentorship.create({
      studentId,
      alumniId,
      topic,
      message,
      requestedSkills: Array.isArray(requestedSkills) ? requestedSkills : [],
    });

    return mentorship.populate([
      { path: 'studentId', select: 'fullName email' },
      { path: 'alumniId', select: 'fullName email' },
    ]);
  }

  async getMentorshipRequests(userId, role) {
    const query = role === 'student' ? { studentId: userId } : { alumniId: userId };
    return Mentorship.find(query)
      .populate('studentId', 'fullName email')
      .populate('alumniId', 'fullName email')
      .sort({ createdAt: -1 });
  }

  async updateMentorshipStatus(mentorshipId, userId, { status, alumniNotes, scheduledAt }) {
    const mentorship = await Mentorship.findOne({ _id: mentorshipId, alumniId: userId });
    if (!mentorship) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (status) mentorship.status = status;
    if (alumniNotes !== undefined) mentorship.alumniNotes = alumniNotes;
    if (scheduledAt) mentorship.scheduledAt = new Date(scheduledAt);

    await mentorship.save();

    return mentorship.populate([
      { path: 'studentId', select: 'fullName email' },
      { path: 'alumniId', select: 'fullName email' },
    ]);
  }

  async getMentorsList() {
    return User.find({ role: { $in: ['alumni', 'faculty'] }, status: 'active' })
      .select('fullName email role company designation skills')
      .sort({ fullName: 1 });
  }
}

export default new MentorshipService();
