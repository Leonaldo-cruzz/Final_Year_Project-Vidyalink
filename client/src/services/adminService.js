import api from './api';

export const getAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getAdminUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const toggleUserStatus = async (id, status) => {
  const response = await api.patch(`/admin/users/${id}/status`, { status });
  return response.data;
};

export const getAllVerifications = async ({ page = 1, limit = 10, status = 'ALL' } = {}) => {
  const params = { page, limit };
  if (status && status !== 'ALL') params.status = status;
  const response = await api.get('/verification/dashboard', { params });
  const d = response.data?.data || response.data || {};
  const list = d.verifications || [];
  const total = d.summary?.totalRequests ?? list.length;
  return {
    data: {
      verifications: list,
      pagination: {
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        total,
      },
    },
  };
};

export default {
  getAdminStats,
  getAdminUsers,
  toggleUserStatus,
  getAllVerifications,
};
