import api from './api';

export const createReferral = async (data) => {
  const response = await api.post('/referrals', data);
  return response.data?.data || response.data;
};

export const getActiveReferrals = async () => {
  const response = await api.get('/referrals');
  return response.data?.data || response.data;
};

export const getMyReferrals = async () => {
  const response = await api.get('/referrals/my');
  return response.data?.data || response.data;
};

export const deleteReferral = async (id) => {
  const response = await api.delete(`/referrals/${id}`);
  return response.data?.data || response.data;
};

export default {
  createReferral,
  getActiveReferrals,
  getMyReferrals,
  deleteReferral,
};
