import profileService from '../services/profile.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class ProfileController {
  createProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.createProfile(req.user._id, req.body);

    return ApiResponse.created(res, 'Profile created successfully', { profile });
  });

  getMyProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.getMyProfile(req.user._id);

    return ApiResponse.ok(res, 'Profile fetched successfully', { profile });
  });

  updateProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.updateProfile(req.user._id, req.body);

    return ApiResponse.ok(res, 'Profile updated successfully', { profile });
  });

  updateProfilePhoto = asyncHandler(async (req, res) => {
    const profile = await profileService.updateProfilePhoto(req.user._id, req.file);

    return ApiResponse.ok(res, 'Profile photo updated successfully', { profile });
  });

  deleteProfile = asyncHandler(async (req, res) => {
    await profileService.deleteProfile(req.user._id);

    return ApiResponse.ok(res, 'Profile deleted successfully');
  });
}

export default new ProfileController();
