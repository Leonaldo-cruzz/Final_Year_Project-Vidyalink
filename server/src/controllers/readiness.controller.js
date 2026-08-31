import aiService from '../services/ai.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const getPortfolioReadiness = asyncHandler(async (req, res) => {
  const result = await aiService.getIndustryReadiness(req.user._id, req.query.portfolioId);
  return ApiResponse.ok(res, 'Industry Readiness Score fetched successfully', result);
});

const refreshPortfolioReadiness = asyncHandler(async (req, res) => {
  const result = await aiService.refreshIndustryReadiness(req.user._id, req.body?.portfolioId);
  return ApiResponse.ok(res, 'Industry Readiness Score refreshed successfully', result);
});

export default {
  getPortfolioReadiness,
  refreshPortfolioReadiness,
};

