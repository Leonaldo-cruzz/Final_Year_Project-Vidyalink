import recommendationService from '../services/recommendation.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class RecommendationController {
  getRecommendations = asyncHandler(async (req, res) => {
    const recommendations = await recommendationService.listActive(req.user._id);
    return ApiResponse.ok(res, 'Recommendations retrieved successfully', recommendations);
  });

  getAlumni = asyncHandler(async (req, res) => {
    const recommendations = await recommendationService.getForScope(req.user._id, req.body.studentId, 'ALUMNI');
    return ApiResponse.ok(res, 'Alumni mentor recommendations retrieved successfully', recommendations);
  });

  getRecruiters = asyncHandler(async (req, res) => {
    const recommendations = await recommendationService.getForScope(req.user._id, req.body.studentId, 'RECRUITERS');
    return ApiResponse.ok(res, 'Recruiter opportunity recommendations retrieved successfully', recommendations);
  });

  getImprovements = asyncHandler(async (req, res) => {
    const recommendations = await recommendationService.getForScope(req.user._id, req.body.studentId, 'IMPROVEMENTS');
    return ApiResponse.ok(res, 'Improvement recommendations retrieved successfully', recommendations);
  });

  refresh = asyncHandler(async (req, res) => {
    const recommendations = await recommendationService.refresh(req.user._id, req.body.scopes);
    return ApiResponse.ok(res, 'Recommendations refreshed successfully', recommendations);
  });

  dismiss = asyncHandler(async (req, res) => {
    const recommendation = await recommendationService.setStatus(req.user._id, req.params.id, 'DISMISSED');
    return ApiResponse.ok(res, 'Recommendation dismissed successfully', recommendation);
  });

  accept = asyncHandler(async (req, res) => {
    const recommendation = await recommendationService.setStatus(req.user._id, req.params.id, 'ACCEPTED');
    return ApiResponse.ok(res, 'Recommendation accepted successfully', recommendation);
  });
}

export default new RecommendationController();
