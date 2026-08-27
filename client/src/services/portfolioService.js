import api from './api';

export const getMyPortfolios = async () => {
  const response = await api.get('/portfolios/me');
  return response.data;
};

export const verifyCertificate = async (certificateId) => {
  const response = await api.get(`/portfolios/verify/${certificateId}`);
  return response.data;
};

// The server builds the readiness snapshot from trusted stored evaluations.
export const getIndustryReadiness = async (portfolioId) => {
  const response = await api.get('/portfolio/readiness', {
    params: portfolioId ? { portfolioId } : undefined,
  });
  return response.data;
};

export const refreshIndustryReadiness = async (portfolioId) => {
  const response = await api.post('/portfolio/readiness/refresh', portfolioId ? { portfolioId } : {});
  return response.data;
};
