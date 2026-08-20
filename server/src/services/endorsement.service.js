import SkillEndorsement from '../models/skillEndorsement.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import Profile from '../models/profile.model.js';
import alumniService from './alumni.service.js';
import ApiError from '../utils/ApiError.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retrieve the student's skills list from either the detailed StudentProfile
 * or the general Profile model — whichever exists.
 */
const getStudentSkills = async (studentId) => {
  const studentProfile = await StudentProfile.findOne({ user: studentId }).select('skills');
  if (studentProfile && studentProfile.skills.length > 0) {
    return studentProfile.skills.map((s) => s.trim().toLowerCase());
  }

  const profile = await Profile.findOne({ user: studentId }).select('skills');
  if (profile && profile.skills.length > 0) {
    return profile.skills.map((s) => s.trim().toLowerCase());
  }

  return [];
};

// ─── Service ─────────────────────────────────────────────────────────────────

class EndorsementService {
  /**
   * Verified alumni endorses a skill on a student's profile.
   *
   * Business rules:
   *  - Alumni must be verified.
   *  - Alumni cannot endorse themselves.
   *  - Endorsed skill must appear on the student's skills list.
   *  - No duplicate endorsement from the same alumni for the same student+skill.
   */
  async createEndorsement(alumniId, { studentId, skill, message }) {
    // Reject self-endorsement
    if (alumniId.toString() === studentId.toString()) {
      throw ApiError.badRequest('You cannot endorse yourself');
    }

    // Verified alumni check
    await alumniService.requireVerifiedAlumni(alumniId);

    // Skill must be on the student's profile
    const studentSkills = await getStudentSkills(studentId);
    if (studentSkills.length === 0) {
      throw ApiError.badRequest('Student has no skills on their profile to endorse');
    }

    const normalizedSkill = skill.trim().toLowerCase();
    if (!studentSkills.includes(normalizedSkill)) {
      throw ApiError.badRequest(
        `Skill '${skill}' is not listed on this student's profile`
      );
    }

    try {
      const endorsement = await SkillEndorsement.create({
        alumniId,
        studentId,
        skill: skill.trim(),
        message: message || null,
      });

      return SkillEndorsement.findById(endorsement._id)
        .populate('alumniId', 'fullName email avatar')
        .populate('studentId', 'fullName email avatar');
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict(
          `You have already endorsed '${skill}' for this student`
        );
      }
      throw error;
    }
  }

  /**
   * Return all endorsements for a given student (publicly visible to
   * alumni, student, and admin).
   */
  async getStudentEndorsements(studentId) {
    return SkillEndorsement.find({ studentId })
      .populate('alumniId', 'fullName email avatar')
      .sort({ createdAt: -1 });
  }

  /**
   * Delete own endorsement — alumni can only delete their own.
   */
  async deleteEndorsement(alumniId, endorsementId) {
    const endorsement = await SkillEndorsement.findOne({
      _id: endorsementId,
      alumniId,
    });

    if (!endorsement) {
      throw ApiError.notFound(
        'Endorsement not found or you do not have permission to delete it'
      );
    }

    await endorsement.deleteOne();
  }
}

export default new EndorsementService();
