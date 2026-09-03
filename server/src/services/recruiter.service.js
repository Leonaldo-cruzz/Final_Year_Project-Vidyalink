import RecruiterProfile from '../models/recruiterProfile.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

class RecruiterService {
  /**
   * Get the recruiter profile for the authenticated recruiter.
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getProfile(userId) {
    const profile = await RecruiterProfile.findOne({ userId }).populate(
      'userId',
      'fullName email avatar role college'
    );

    if (!profile) {
      throw ApiError.notFound('Recruiter profile not found. Please create your profile first.');
    }

    return profile;
  }

  /**
   * Create a new recruiter profile.
   * @param {string} userId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createProfile(userId, data) {
    const existing = await RecruiterProfile.findOne({ userId });
    if (existing) {
      throw ApiError.conflict('Recruiter profile already exists. Use PATCH to update your profile.');
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const newProfile = await RecruiterProfile.create({
      userId,
      companyName: data.companyName,
      companyWebsite: data.companyWebsite || null,
      companyDescription: data.companyDescription || null,
      industry: data.industry || null,
      designation: data.designation || null,
      location: data.location || null,
      companyLogo: data.companyLogo || null,
      isVerified: false,
    });

    return RecruiterProfile.findById(newProfile._id).populate(
      'userId',
      'fullName email avatar role'
    );
  }

  /**
   * Update an existing recruiter profile.
   * @param {string} userId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, data) {
    const profile = await RecruiterProfile.findOne({ userId });
    if (!profile) {
      throw ApiError.notFound('Recruiter profile not found. Please create your profile first.');
    }

    const updatableFields = [
      'companyName',
      'companyWebsite',
      'companyDescription',
      'industry',
      'designation',
      'location',
      'companyLogo',
    ];

    for (const field of updatableFields) {
      if (data[field] !== undefined) {
        profile[field] = data[field];
      }
    }

    await profile.save();

    return RecruiterProfile.findById(profile._id).populate(
      'userId',
      'fullName email avatar role'
    );
  }
}

const recruiterService = new RecruiterService();
export default recruiterService;


