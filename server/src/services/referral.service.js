import Referral, { REFERRAL_STATUS } from '../models/referral.model.js';
import User from '../models/user.model.js';
import alumniService from './alumni.service.js';
import ApiError from '../utils/ApiError.js';

// ─── Allowed update fields ────────────────────────────────────────────────────

const UPDATE_FIELDS = ['companyName', 'jobTitle', 'jobUrl', 'message', 'status'];

const pickUpdateFields = (data = {}) =>
  Object.fromEntries(
    UPDATE_FIELDS
      .filter((f) => Object.hasOwn(data, f))
      .map((f) => [f, data[f]])
  );

// ─── Service ─────────────────────────────────────────────────────────────────

class ReferralService {
  /**
   * Verified alumni creates a referral for a student.
   */
  async createReferral(alumniId, data) {
    await alumniService.requireVerifiedAlumni(alumniId);

    const { studentId, companyName, jobTitle, jobUrl, message, status } = data;

    // Verify student exists with student role
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw ApiError.notFound('Student not found');
    }

    const referral = await Referral.create({
      alumniId,
      studentId,
      companyName,
      jobTitle,
      jobUrl: jobUrl || null,
      message: message || null,
      status: status || REFERRAL_STATUS.DRAFT,
    });

    return Referral.findById(referral._id)
      .populate('alumniId', 'fullName email avatar')
      .populate('studentId', 'fullName email avatar');
  }

  /**
   * Return all referrals created by this alumni.
   */
  async getAlumniReferrals(alumniId) {
    return Referral.find({ alumniId })
      .populate('studentId', 'fullName email avatar college branch')
      .sort({ createdAt: -1 });
  }

  /**
   * Return all referrals where this user is the referred student.
   */
  async getStudentReferrals(studentId) {
    return Referral.find({ studentId })
      .populate('alumniId', 'fullName email avatar')
      .sort({ createdAt: -1 });
  }

  /**
   * Get a single referral by ID.
   * Accessible by: the alumni who created it, the referred student, or an admin.
   */
  async getReferralById(referralId, viewerId, viewerRole) {
    const referral = await Referral.findById(referralId)
      .populate('alumniId', 'fullName email avatar')
      .populate('studentId', 'fullName email avatar');

    if (!referral) {
      throw ApiError.notFound('Referral not found');
    }

    const isAlumni = referral.alumniId._id.toString() === viewerId.toString();
    const isStudent = referral.studentId._id.toString() === viewerId.toString();
    const isAdmin = viewerRole === 'admin';

    if (!isAlumni && !isStudent && !isAdmin) {
      throw ApiError.forbidden('You do not have access to this referral');
    }

    return referral;
  }

  /**
   * Alumni updates their own referral.
   * Sets referredAt when status transitions to REFERRED.
   */
  async updateReferral(alumniId, referralId, data) {
    const referral = await Referral.findOne({ _id: referralId, alumniId });

    if (!referral) {
      throw ApiError.notFound(
        'Referral not found or you do not have permission to update it'
      );
    }

    const updates = pickUpdateFields(data);

    // Automatically set referredAt when status changes to REFERRED
    if (updates.status === REFERRAL_STATUS.REFERRED && !referral.referredAt) {
      updates.referredAt = new Date();
    }

    Object.assign(referral, updates);
    await referral.save();

    return Referral.findById(referral._id)
      .populate('alumniId', 'fullName email avatar')
      .populate('studentId', 'fullName email avatar');
  }

  /**
   * Alumni deletes their own referral.
   * Only DRAFT referrals may be deleted to protect audit trail.
   */
  async deleteReferral(alumniId, referralId) {
    const referral = await Referral.findOne({ _id: referralId, alumniId });

    if (!referral) {
      throw ApiError.notFound(
        'Referral not found or you do not have permission to delete it'
      );
    }

    if (referral.status !== REFERRAL_STATUS.DRAFT) {
      throw ApiError.badRequest(
        'Only referrals in DRAFT status can be deleted'
      );
    }

    await referral.deleteOne();
  }
}

export default new ReferralService();
