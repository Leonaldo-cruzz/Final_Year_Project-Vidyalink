import Profile from '../models/profile.model.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import {
  PROFILE_PHOTO_DIRECTORY,
  PROFILE_PHOTO_PUBLIC_PATH,
} from '../middleware/profilePhotoUpload.middleware.js';

const PROFILE_FIELDS = [
  'fullName',
  'headline',
  'bio',
  'profilePicture',
  'phone',
  'college',
  'degree',
  'branch',
  'graduationYear',
  'currentYear',
  'cgpa',
  'skills',
  'interests',
  'github',
  'githubUsername',
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

const getStoredProfilePhotoPath = (profilePicture) => {
  if (typeof profilePicture !== 'string' || !profilePicture.startsWith(PROFILE_PHOTO_PUBLIC_PATH)) {
    return null;
  }

  const filename = profilePicture.slice(PROFILE_PHOTO_PUBLIC_PATH.length);
  if (!filename || filename !== path.basename(filename)) return null;

  return path.resolve(PROFILE_PHOTO_DIRECTORY, filename);
};

const removeFile = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('Unable to remove profile photo', error);
    }
  }
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

  async updateProfilePhoto(userId, file) {
    if (!file) {
      throw ApiError.badRequest('Profile photo is required');
    }

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      await removeFile(file.path);
      throw ApiError.notFound('Create your profile before uploading a photo');
    }

    const previousPhotoPath = getStoredProfilePhotoPath(profile.profilePicture);
    profile.profilePicture = `${PROFILE_PHOTO_PUBLIC_PATH}${file.filename}`;
    profile.profileCompletion = this.calculateProfileCompletion(profile);

    try {
      await profile.save();
      await profile.populate('user', 'email fullName role avatar status');
    } catch (error) {
      await removeFile(file.path);
      throw error;
    }

    await removeFile(previousPhotoPath);
    return profile;
  }

  async deleteProfile(userId) {
    const profile = await Profile.findOneAndDelete({ user: userId });

    if (!profile) {
      throw ApiError.notFound('Profile not found');
    }

    await removeFile(getStoredProfilePhotoPath(profile.profilePicture));
  }
}

export default new ProfileService();
