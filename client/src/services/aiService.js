import api from './api';

const getWithPortfolio = (path, portfolioId) => api.get(path, {
  ...(portfolioId ? { params: { portfolioId } } : {}),
});

export const getStudentAIOverview = async (portfolioId) => {
  const response = await getWithPortfolio('/student/ai/overview', portfolioId);
  return response.data;
};

export const getPortfolioEvaluation = async (portfolioId) => {
  const response = await getWithPortfolio('/ai/portfolio-score', portfolioId);
  return response.data;
};

export const getATSEvaluation = async (portfolioId) => {
  const response = await getWithPortfolio('/ai/ats-score', portfolioId);
  return response.data;
};

export const getGithubAnalytics = async (portfolioId) => {
  const response = await getWithPortfolio('/ai/github-analytics', portfolioId);
  return response.data;
};

export const getSkillProfile = async (portfolioId) => {
  const response = await getWithPortfolio('/ai/skill-profile', portfolioId);
  return response.data;
};

export const getSkillGaps = async (portfolioId) => {
  const response = await getWithPortfolio('/ai/skill-gaps', portfolioId);
  return response.data;
};

export const getRecommendations = async (portfolioId) => {
  const response = await getWithPortfolio('/ai/recommendations', portfolioId);
  return response.data;
};

export const getIndustryReadiness = async (portfolioId) => {
  const response = await getWithPortfolio('/ai/industry-readiness', portfolioId);
  return response.data;
};

export const refreshIndustryReadiness = async (portfolioId) => {
  const response = await api.post('/evaluation/industry-readiness/refresh', portfolioId ? { portfolioId } : {});
  return response.data;
};

export default {
  getStudentAIOverview,
  getPortfolioEvaluation,
  getATSEvaluation,
  getGithubAnalytics,
  getSkillProfile,
  getSkillGaps,
  getRecommendations,
  getIndustryReadiness,
  refreshIndustryReadiness,
};
