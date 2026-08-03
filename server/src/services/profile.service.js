import Profile from '../models/profile.model.js';
import ApiError from '../utils/ApiError.js';

const PROFILE_FIELDS = [
  'fullName',
  'headline',
  'bio',
  'profilePicture',
  'college',
  'degree',
  'branch',
  'graduationYear',
  'cgpa',
  'skills',
  'interests',
  'github',
  'linkedin',
  'portfolio',
  'resumeUrl',
];

const isFilled = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
};

const pickProfileFields = (data = {}) => {
  const source = data ?? {};

  return Object.fromEntries(
    PROFILE_FIELDS
      .filter((field) => Object.hasOwn(source, field))
      .map((field) => [field, source[field]])
  );
};

class ProfileService {
  calculateProfileCompletion(profile) {
    const filledFieldCount = PROFILE_FIELDS.filter((field) => isFilled(profile[field])).length;

    return Math.round((filledFieldCount / PROFILE_FIELDS.length) * 100);
  }

  async createProfile(userId, profileData) {
    const existingProfile = await Profile.exists({ user: userId });

    if (existingProfile) {
      throw ApiError.conflict('Profile already exists');
    }

    const safeProfileData = pickProfileFields(profileData);
    const profile = new Profile({
      user: userId,
      ...safeProfileData,
    });
    profile.profileCompletion = this.calculateProfileCompletion(profile);

    try {
      await profile.save();
      await profile.populate('user', 'email fullName role avatar status');
      return profile;
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict('Profile already exists');
      }

      throw error;
    }
  }

  async getMyProfile(userId) {
    const profile = await Profile.findOne({ user: userId }).populate('user', 'email fullName role avatar status');

    if (!profile) {
      throw ApiError.notFound('Profile not found');
    }

    return profile;
  }

  async updateProfile(userId, updateData) {
    const profile = await Profile.findOne({ user: userId });

    if (!profile) {
      throw ApiError.notFound('Profile not found');
    }

    Object.assign(profile, pickProfileFields(updateData));
    profile.profileCompletion = this.calculateProfileCompletion(profile);

    await profile.save();
    await profile.populate('user', 'email fullName role avatar status');
    return profile;
  }

  async deleteProfile(userId) {
    const profile = await Profile.findOneAndDelete({ user: userId });

    if (!profile) {
      throw ApiError.notFound('Profile not found');
    }
  }
}

export default new ProfileService();
