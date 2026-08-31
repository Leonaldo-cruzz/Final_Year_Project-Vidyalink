import api from './api';

const get = (path, portfolioId) => (
  portfolioId
    ? api.get(path, { params: { portfolioId } })
    : api.get(path)
);

export const getPortfolioAISummary = async (portfolioId) => {
  const response = await get('/ai/portfolio-summary', portfolioId);
  return response.data;
};

export const getPortfolioScore = async (portfolioId) => {
  const response = await get('/ai/portfolio-score', portfolioId);
  return response.data;
};

export const getATSScore = async (portfolioId) => {
  const response = await get('/ai/ats-score', portfolioId);
  return response.data;
};

export const getGitHubAnalytics = async (portfolioId) => {
  const response = await get('/ai/github-analytics', portfolioId);
  return response.data;
};

export const getSkillProfile = async (portfolioId) => {
  const response = await get('/ai/skill-profile', portfolioId);
  return response.data;
};

export const getSkillGaps = async (portfolioId) => {
  const response = await get('/ai/skill-gaps', portfolioId);
  return response.data;
};

export const getRecommendations = async (portfolioId) => {
  const response = await get('/ai/recommendations', portfolioId);
  return response.data;
};

export const getIndustryReadiness = async (portfolioId) => {
  const response = await get('/ai/industry-readiness', portfolioId);
  return response.data;
};

export const getPublicPortfolioAISummary = async (portfolioId) => {
  const response = await api.get(`/ai/public/portfolio/${portfolioId}/summary`);
  return response.data;
};

export const updatePortfolioVisibility = async (portfolioId, isPublic) => {
  const response = await api.patch(`/portfolios/${portfolioId}/visibility`, { isPublic });
  return response.data;
};
