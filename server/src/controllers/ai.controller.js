import aiIntegrationService from '../services/aiIntegration.service.js';
import aiOrchestratorService from '../services/aiOrchestrator.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const health = asyncHandler(async (_req, res) => {
  const result = await aiIntegrationService.health();
  return ApiResponse.ok(res, result.available ? 'AI service is available' : 'AI service is unavailable', result);
});

const evaluatePortfolio = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.evaluatePortfolio(req.user, req.body?.portfolioId, {
    force: Boolean(req.body?.force),
  });
  return ApiResponse.ok(res, result.status === 'evaluated' ? 'Portfolio evaluated successfully' : 'Portfolio evaluation requires verified evidence', result);
});

const evaluate = asyncHandler(async (req, res) => {
  const result = await aiOrchestratorService.evaluate(req.user, {
    portfolioId: req.body?.portfolioId,
    force: Boolean(req.body?.force),
    targetRole: req.body?.targetRole || null,
    requiredSkills: Array.isArray(req.body?.requiredSkills) ? req.body.requiredSkills : [],
  });
  return ApiResponse.ok(res, `AI pipeline ${result.status.toLowerCase()}`, result);
});

const getResults = asyncHandler(async (req, res) => {
  const result = await aiOrchestratorService.getResults(req.user, {
    portfolioId: req.query.portfolioId,
    latestOnly: req.query.latestOnly === 'true',
  });
  return ApiResponse.ok(res, 'Unified AI results fetched successfully', result);
});

const getLatestResults = asyncHandler(async (req, res) => {
  const result = await aiOrchestratorService.getResults(req.user, {
    portfolioId: req.query.portfolioId,
    latestOnly: true,
  });
  return ApiResponse.ok(res, 'Latest unified AI result fetched successfully', result);
});

const getHistory = asyncHandler(async (req, res) => {
  const result = await aiOrchestratorService.getHistory(req.user, {
    portfolioId: req.query.portfolioId,
  });
  return ApiResponse.ok(res, 'AI evaluation history fetched successfully', result);
});

const getPortfolioEvaluation = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.getPortfolioEvaluation(
    req.user,
    req.params.portfolioId || req.query.portfolioId
  );
  return ApiResponse.ok(res, result.status === 'evaluated' ? 'Portfolio evaluation fetched successfully' : 'Portfolio evaluation status fetched', result);
});

const analyzeATS = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.analyzeATS(req.user, req.body);
  return ApiResponse.ok(res, result.status === 'analyzed' ? 'ATS analysis completed' : 'ATS analysis requires resume evidence', result);
});

const extractSkills = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.extractSkills(req.user, req.body);
  return ApiResponse.ok(res, 'Skill extraction completed', result);
});

const analyzeSkillGap = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.analyzeSkillGap(req.user, req.body);
  return ApiResponse.ok(res, 'Skill gap analysis completed', result);
});

const analyzeGithub = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.analyzeGithub(req.user, req.body);
  return ApiResponse.ok(res, result.status === 'analyzed' ? 'GitHub analysis completed' : 'GitHub analysis requires a connected account', result);
});

const calculateReadiness = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.calculateReadiness(req.user, req.body);
  return ApiResponse.ok(res, result.status === 'analyzed' ? 'Readiness analysis completed' : 'Readiness analysis requires evidence', result);
});

const recommendations = asyncHandler(async (req, res) => {
  const result = await aiIntegrationService.getRecommendations(req.user);
  return ApiResponse.ok(res, 'Recommendations generated from supplied records', result);
});

export default {
  health,
  evaluate,
  getResults,
  getLatestResults,
  getHistory,
  evaluatePortfolio,
  getPortfolioEvaluation,
  analyzeATS,
  extractSkills,
  analyzeSkillGap,
  analyzeGithub,
  calculateReadiness,
  recommendations,
};
