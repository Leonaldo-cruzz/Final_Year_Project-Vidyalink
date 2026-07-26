import StudentProfile from '../models/studentProfile.model.js';
import ApiError from '../utils/ApiError.js';

class ProfileService {
  async createProfile(userId, profileData) {
    const existingProfile = await StudentProfile.findOne({ user: userId });

    if (existingProfile) {
      throw ApiError.conflict('Student profile already exists');
    }

    try {
      return await StudentProfile.create({ user: userId, ...profileData });
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict('Student profile already exists');
      }

      throw error;
    }
  }

  async getProfile(userId) {
    const profile = await StudentProfile.findOne({ user: userId });

    if (!profile) {
      throw ApiError.notFound('Student profile not found');
    }

    return profile;
  }

  async updateProfile(userId, profileData) {
    const profile = await StudentProfile.findOneAndUpdate(
      { user: userId },
      { $set: profileData },
      { new: true, runValidators: true }
    );

    if (!profile) {
      throw ApiError.notFound('Student profile not found');
    }

    return profile;
  }

  async deleteProfile(userId) {
    const profile = await StudentProfile.findOneAndDelete({ user: userId });

    if (!profile) {
      throw ApiError.notFound('Student profile not found');
    }
  }
}

export default new ProfileService();
