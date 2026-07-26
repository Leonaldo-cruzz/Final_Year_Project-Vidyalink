import profileService from '../services/profile.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class ProfileController {
  createProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.createProfile(req.user._id, req.body);

    return ApiResponse.created(res, 'Student profile created successfully', { profile });
  });

  getProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.getProfile(req.user._id);

    return ApiResponse.ok(res, 'Student profile fetched successfully', { profile });
  });

  updateProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.updateProfile(req.user._id, req.body);

    return ApiResponse.ok(res, 'Student profile updated successfully', { profile });
  });

  deleteProfile = asyncHandler(async (req, res) => {
    await profileService.deleteProfile(req.user._id);

    return ApiResponse.ok(res, 'Student profile deleted successfully');
  });
}

export default new ProfileController();
