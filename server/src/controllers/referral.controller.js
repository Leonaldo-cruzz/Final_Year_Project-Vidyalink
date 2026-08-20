import referralService from '../services/referral.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class ReferralController {
  createReferral = asyncHandler(async (req, res) => {
    const referral = await referralService.createReferral(req.user._id, req.body);
    return ApiResponse.created(res, 'Referral created successfully', { referral });
  });

  getAlumniReferrals = asyncHandler(async (req, res) => {
    const referrals = await referralService.getAlumniReferrals(req.user._id);
    return ApiResponse.ok(res, 'Referrals fetched successfully', { referrals });
  });

  getStudentReferrals = asyncHandler(async (req, res) => {
    const referrals = await referralService.getStudentReferrals(req.user._id);
    return ApiResponse.ok(res, 'Referrals fetched successfully', { referrals });
  });

  getReferralById = asyncHandler(async (req, res) => {
    const referral = await referralService.getReferralById(
      req.params.id,
      req.user._id,
      req.user.role
    );
    return ApiResponse.ok(res, 'Referral fetched successfully', { referral });
  });

  updateReferral = asyncHandler(async (req, res) => {
    const referral = await referralService.updateReferral(
      req.user._id,
      req.params.id,
      req.body
    );
    return ApiResponse.ok(res, 'Referral updated successfully', { referral });
  });

  deleteReferral = asyncHandler(async (req, res) => {
    await referralService.deleteReferral(req.user._id, req.params.id);
    return ApiResponse.ok(res, 'Referral deleted successfully');
  });
}

export default new ReferralController();
