import api from './api';

export const getAdminAnalytics = async () => {
  const response = await api.get('/admin/analytics');
  return response.data;
};

export const getAdminUsers = async ({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) => {
  const params = { page, limit };
  if (search) params.search = search;
  if (role && role !== 'all') params.role = role;
  if (status && status !== 'all') params.status = status;

  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const updateUserStatus = async (userId, status) => {
  const response = await api.patch(`/admin/users/${userId}/status`, { status });
  return response.data;
};

export const getAllVerifications = async ({ page = 1, limit = 20, status = 'ALL' } = {}) => {
  const params = { page, limit };
  if (status && status !== 'ALL') params.status = status;

  const response = await api.get('/admin/verifications', { params });
  return response.data;
};

export default {
  getAdminAnalytics,
  getAdminUsers,
  updateUserStatus,
  getAllVerifications,
};
