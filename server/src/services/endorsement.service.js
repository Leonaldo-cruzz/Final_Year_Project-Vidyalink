import mongoose from 'mongoose';
import Endorsement from '../models/endorsement.model.js';
import User from '../models/user.model.js';
import notificationService from './notification.service.js';
import ApiError from '../utils/ApiError.js';

class EndorsementService {
  /**
   * Endorse a student's technical skill
   */
  async endorseSkill({ alumniId, studentId, skill, notes = null }) {
    if (!alumniId || !studentId || !skill) {
      throw ApiError.badRequest('alumniId, studentId, and skill are required');
    }

    if (!mongoose.Types.ObjectId.isValid(alumniId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw ApiError.badRequest('Invalid user identifier provided');
    }

    if (alumniId.toString() === studentId.toString()) {
      throw ApiError.badRequest('Self-endorsement is not permitted');
    }

    const [alumni, student] = await Promise.all([
      User.findById(alumniId),
      User.findById(studentId),
    ]);

    if (!alumni) {
      throw ApiError.notFound('Alumni endorser not found');
    }
    if (alumni.role !== 'alumni' && alumni.role !== 'admin') {
      throw ApiError.forbidden('Only alumni members are authorized to endorse technical skills');
    }

    if (!student) {
      throw ApiError.notFound('Student not found');
    }
    if (student.role !== 'student') {
      throw ApiError.badRequest('Skill endorsements can only be issued to students');
    }

    const trimmedSkill = skill.trim();
    if (!trimmedSkill) {
      throw ApiError.badRequest('Skill cannot be empty');
    }

    const canonicalSkill = trimmedSkill.toLowerCase();

    // Check for duplicate active endorsement
    const existing = await Endorsement.findOne({
      student: studentId,
      alumni: alumniId,
      canonicalSkill,
      status: 'active',
    });

    if (existing) {
      throw ApiError.conflict(
        `You have already endorsed this student for the skill "${existing.skill}".`
      );
    }

    // Persist endorsement
    const endorsement = await Endorsement.create({
      student: studentId,
      alumni: alumniId,
      skill: trimmedSkill,
      canonicalSkill,
      notes: notes && typeof notes === 'string' ? notes.trim() : null,
      status: 'active',
    });

    // Notify student (safe failure handling)
    try {
      await notificationService.createNotification({
        recipient: studentId,
        sender: alumniId,
        type: 'endorsement',
        title: 'New Skill Endorsement!',
        message: `${alumni.fullName} endorsed your technical skill in ${endorsement.skill}.`,
        link: '/portfolio/me',
        metadata: {
          endorsementId: endorsement._id,
          skill: endorsement.skill,
          alumniId: alumni._id,
        },
      });
    } catch {
      // Notification failure does not corrupt or abort endorsement persistence
    }

    return Endorsement.findById(endorsement._id)
      .populate('alumni', 'fullName email avatar college branch graduationYear')
      .populate('student', 'fullName email avatar college branch graduationYear');
  }

  /**
   * Get all active endorsements for a given student
   */
  async getStudentEndorsements(studentId) {
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw ApiError.badRequest('Valid student ID is required');
    }

    const student = await User.findById(studentId);
    if (!student) {
      throw ApiError.notFound('Student not found');
    }

    return Endorsement.find({ student: studentId, status: 'active' })
      .populate('alumni', 'fullName email avatar college branch graduationYear')
      .sort({ createdAt: -1 });
  }

  /**
   * Get endorsements given or received by the current user
   */
  async getMyEndorsements(userId, role) {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest('Valid user ID is required');
    }

    if (role === 'alumni') {
      return Endorsement.find({ alumni: userId, status: 'active' })
        .populate('student', 'fullName email avatar college branch graduationYear')
        .sort({ createdAt: -1 });
    }

    return Endorsement.find({ student: userId, status: 'active' })
      .populate('alumni', 'fullName email avatar college branch graduationYear')
      .sort({ createdAt: -1 });
  }
}

export default new EndorsementService();
