import alumniService from '../services/alumni.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class AlumniController {
  getMyProfile = asyncHandler(async (req, res) => {
    const profile = await alumniService.getMyProfile(req.user._id);
    return ApiResponse.ok(res, 'Alumni profile fetched successfully', { profile });
  });

  createProfile = asyncHandler(async (req, res) => {
    const profile = await alumniService.createProfile(req.user._id, req.body);
    return ApiResponse.created(res, 'Alumni profile created successfully', { profile });
  });

  updateProfile = asyncHandler(async (req, res) => {
    const profile = await alumniService.updateProfile(req.user._id, req.body);
    return ApiResponse.ok(res, 'Alumni profile updated successfully', { profile });
  });

  /**
   * Admin only — set isVerified for any alumni user.
   */
  setVerificationStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { isVerified } = req.body;
    const profile = await alumniService.setVerificationStatus(userId, isVerified);
    return ApiResponse.ok(
      res,
      `Alumni ${isVerified ? 'verified' : 'unverified'} successfully`,
      { profile }
    );
  });
}

export default new AlumniController();
