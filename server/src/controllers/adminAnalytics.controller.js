import adminAnalyticsService from '../services/adminAnalytics.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class AdminAnalyticsController {
  getOverview = asyncHandler(async (_req, res) => {
    const overview = await adminAnalyticsService.getOverview();
    return ApiResponse.ok(res, 'Admin overview retrieved successfully', overview);
  });

  getVerifications = asyncHandler(async (req, res) => {
    const analytics = await adminAnalyticsService.getVerificationAnalytics(req.validated.query);
    return ApiResponse.ok(res, 'Verification analytics retrieved successfully', analytics);
  });

  getProjects = asyncHandler(async (req, res) => {
    const analytics = await adminAnalyticsService.getProjectAnalytics(req.validated.query);
    return ApiResponse.ok(res, 'Project analytics retrieved successfully', analytics);
  });

  getRecruitment = asyncHandler(async (_req, res) => {
    const analytics = await adminAnalyticsService.getRecruitmentAnalytics();
    return ApiResponse.ok(res, 'Recruitment analytics retrieved successfully', analytics);
  });

  getActivity = asyncHandler(async (req, res) => {
    const analytics = await adminAnalyticsService.getActivity(req.validated.query);
    return ApiResponse.ok(res, 'Platform activity retrieved successfully', analytics);
  });
}

export default new AdminAnalyticsController();
