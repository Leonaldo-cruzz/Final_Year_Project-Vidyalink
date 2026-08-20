import AlumniProfile from '../models/alumniProfile.model.js';
import ApiError from '../utils/ApiError.js';

// ─── Allowed update fields ────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  'company',
  'designation',
  'industry',
  'experienceYears',
  'bio',
  'skills',
  'linkedinUrl',
  'githubUrl',
  'companyWebsite',
  'location',
];

const pickFields = (data = {}) =>
  Object.fromEntries(
    PROFILE_FIELDS
      .filter((f) => Object.hasOwn(data, f))
      .map((f) => [f, data[f]])
  );

// ─── Service ─────────────────────────────────────────────────────────────────

class AlumniService {
  /**
   * Return the authenticated alumni's own profile.
   */
  async getMyProfile(userId) {
    const profile = await AlumniProfile
      .findOne({ userId })
      .populate('userId', 'email fullName role avatar status');

    if (!profile) {
      throw ApiError.notFound('Alumni profile not found. Please create your profile first.');
    }

    return profile;
  }

  /**
   * Create a profile — one per alumni user.
   */
  async createProfile(userId, data) {
    const existing = await AlumniProfile.exists({ userId });
    if (existing) {
      throw ApiError.conflict('Alumni profile already exists');
    }

    const profile = new AlumniProfile({ userId, ...pickFields(data) });

    try {
      await profile.save();
      await profile.populate('userId', 'email fullName role avatar status');
      return profile;
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict('Alumni profile already exists');
      }
      throw error;
    }
  }

  /**
   * Update own profile fields (ownership enforced by userId).
   */
  async updateProfile(userId, data) {
    const profile = await AlumniProfile.findOne({ userId });
    if (!profile) {
      throw ApiError.notFound('Alumni profile not found');
    }

    Object.assign(profile, pickFields(data));
    await profile.save();
    await profile.populate('userId', 'email fullName role avatar status');
    return profile;
  }

  /**
   * Admin — toggle verification status for an alumni user.
   */
  async setVerificationStatus(targetUserId, isVerified) {
    const profile = await AlumniProfile.findOne({ userId: targetUserId });
    if (!profile) {
      throw ApiError.notFound('Alumni profile not found for this user');
    }

    profile.isVerified = isVerified;
    await profile.save();
    await profile.populate('userId', 'email fullName role avatar status');
    return profile;
  }

  /**
   * Internal helper — verify that an alumni user has a verified profile.
   * Throws 403 if not verified.
   */
  async requireVerifiedAlumni(alumniUserId) {
    const profile = await AlumniProfile.findOne({ userId: alumniUserId }).select('isVerified');
    if (!profile) {
      throw ApiError.notFound('Alumni profile not found');
    }
    if (!profile.isVerified) {
      throw ApiError.forbidden('Only verified alumni can perform this action');
    }
    return profile;
  }
}

export default new AlumniService();
