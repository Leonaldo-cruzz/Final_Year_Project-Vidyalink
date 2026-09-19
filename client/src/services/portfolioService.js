import api from './api';

export const getMyPortfolios = async () => {
  const response = await api.get('/portfolios/me');
  return response.data;
};

export const verifyCertificate = async (certificateId) => {
  const response = await api.get(`/portfolios/verify/${certificateId}`);
  return response.data;
};

export const getPortfolioEvaluation = async (portfolioId) => {
  const response = await api.get(`/ai/portfolio/evaluation/${portfolioId}`);
  return response.data;
};

export const evaluatePortfolio = async (portfolioId) => {
  const response = await api.post('/ai/portfolio/evaluate', { portfolioId });
  return response.data;
};

export const getPortfolioReadiness = async (portfolioId) => {
  const response = await api.post('/ai/portfolio/readiness', { portfolioId });
  return response.data;
};
