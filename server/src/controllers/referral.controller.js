import referralService from '../services/referral.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class ReferralController {
  createReferral = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    const referral = await referralService.createReferral(alumniId, req.body);
    return ApiResponse.created(res, 'Referral opportunity posted successfully', referral);
  });

  getActiveReferrals = asyncHandler(async (_req, res) => {
    const referrals = await referralService.getActiveReferrals();
    return ApiResponse.ok(res, 'Active referrals retrieved', referrals);
  });

  getMyReferrals = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    const referrals = await referralService.getMyReferrals(alumniId);
    return ApiResponse.ok(res, 'Your posted referrals retrieved', referrals);
  });

  deleteReferral = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    const { id } = req.params;
    await referralService.deleteReferral(alumniId, id);
    return ApiResponse.ok(res, 'Referral opportunity removed');
  });
}

export default new ReferralController();
