import aiResultsService from '../services/aiResults.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const getPortfolioId = (req) => req.query.portfolioId || undefined;

class AIController {
  getStudentAIOverview = asyncHandler(async (req, res) => {
    // The authenticated identity is the only source of the student id. A
    // portfolio id may narrow the current student's own records, but no
    // client-supplied student id is accepted.
    const summary = await aiResultsService.getPortfolioAISummary(
      req.user._id,
      req.query.portfolioId || undefined
    );
    return ApiResponse.ok(res, 'Student AI overview retrieved', {
      portfolioScore: summary.portfolioScore,
      atsScore: summary.atsScore,
      githubAnalytics: summary.githubAnalytics,
      skills: summary.skills,
      skillGaps: summary.skillGaps,
      recommendations: summary.recommendations,
      industryReadiness: summary.industryReadiness,
    });
  });

  getPortfolioAISummary = asyncHandler(async (req, res) => {
    const summary = await aiResultsService.getPortfolioAISummary(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'AI portfolio summary retrieved', summary);
  });

  getPortfolioScore = asyncHandler(async (req, res) => {
    const result = await aiResultsService.getPortfolioScore(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'Portfolio score retrieved', result);
  });

  getATSScore = asyncHandler(async (req, res) => {
    const result = await aiResultsService.getATSScore(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'ATS score retrieved', result);
  });

  getGitHubAnalytics = asyncHandler(async (req, res) => {
    const result = await aiResultsService.getGitHubAnalytics(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'GitHub analytics retrieved', result);
  });

  getSkillProfile = asyncHandler(async (req, res) => {
    const result = await aiResultsService.getSkillProfile(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'Skill profile retrieved', result);
  });

  getSkillGaps = asyncHandler(async (req, res) => {
    const result = await aiResultsService.getSkillGaps(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'Skill gaps retrieved', result);
  });

  getRecommendations = asyncHandler(async (req, res) => {
    const result = await aiResultsService.getRecommendations(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'Recommendations retrieved', result);
  });

  getIndustryReadiness = asyncHandler(async (req, res) => {
    const result = await aiResultsService.getIndustryReadiness(req.user._id, getPortfolioId(req));
    return ApiResponse.ok(res, 'Industry readiness retrieved', result);
  });

  getPublicPortfolioAISummary = asyncHandler(async (req, res) => {
    const summary = await aiResultsService.getPublicPortfolioAISummary(req.params.portfolioId);
    if (!summary) return ApiResponse.ok(res, 'Public AI summary is not available', null);
    return ApiResponse.ok(res, 'Public AI summary retrieved', summary);
  });

  getRecruiterAISummary = asyncHandler(async (req, res) => {
    const summary = await aiResultsService.getRecruiterAISummary(req.params.studentId);
    return ApiResponse.ok(res, 'Candidate AI summary retrieved', summary);
  });
}

export default new AIController();
