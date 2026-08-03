import api from './api';

export const getMyPortfolios = async () => {
  const response = await api.get('/portfolios/me');
  return response.data;
};

export const verifyCertificate = async (certificateId) => {
  const response = await api.get(`/portfolios/verify/${certificateId}`);
  return response.data;
};
