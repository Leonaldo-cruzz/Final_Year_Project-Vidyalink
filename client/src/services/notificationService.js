import api from './api';

const notificationService = {
  getMyNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data?.data || response.data;
  },

  markAsRead: async (id = null) => {
    const endpoint = id ? `/notifications/${id}/read` : '/notifications/read-all';
    const response = await api.patch(endpoint);
    return response.data?.data || response.data;
  },
};

export default notificationService;
