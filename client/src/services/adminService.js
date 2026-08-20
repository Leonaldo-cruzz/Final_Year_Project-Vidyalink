import api from './api';

export const getAdminOverview = async () => {
  const response = await api.get('/admin/analytics/overview');
  return response.data;
};

export const getAdminUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const getAdminUser = async (id) => {
  const response = await api.get(`/admin/users/${id}`);
  return response.data;
};

export const updateAdminUserStatus = async (id, status) => {
  const response = await api.patch(`/admin/users/${id}/status`, { status });
  return response.data;
};

export const updateAdminUserRole = async (id, role) => {
  const response = await api.patch(`/admin/users/${id}/role`, { role });
  return response.data;
};

export const getVerificationAnalytics = async (params = {}) => {
  const response = await api.get('/admin/analytics/verifications', { params });
  return response.data;
};

export const getProjectAnalytics = async (params = {}) => {
  const response = await api.get('/admin/analytics/projects', { params });
  return response.data;
};

export const getRecruitmentAnalytics = async () => {
  const response = await api.get('/admin/analytics/recruitment');
  return response.data;
};

export const getActivityAnalytics = async (params = {}) => {
  const response = await api.get('/admin/analytics/activity', { params });
  return response.data;
};

export default {
  getAdminOverview,
  getAdminUsers,
  getAdminUser,
  updateAdminUserStatus,
  updateAdminUserRole,
  getVerificationAnalytics,
  getProjectAnalytics,
  getRecruitmentAnalytics,
  getActivityAnalytics,
};
