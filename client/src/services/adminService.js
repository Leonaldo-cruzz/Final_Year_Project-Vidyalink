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
  // The dashboard endpoint returns the full filtered list (its query schema is
  // strict and has no paging params), so paginate on the client.
  const params = {};
  if (status && status !== 'ALL') params.status = status;
  const response = await api.get('/verification/dashboard', { params });
  const d = response.data?.data || response.data || {};
  const all = Array.isArray(d.verifications) ? d.verifications : [];
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(1, page), pages);
  return {
    data: {
      verifications: all.slice((currentPage - 1) * limit, currentPage * limit),
      pagination: {
        page: currentPage,
        pages,
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
