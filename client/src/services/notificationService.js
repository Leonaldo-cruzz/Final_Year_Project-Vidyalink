import api from './api';

/**
 * Fetch paginated notifications with optional filters (isRead, type, entityType).
 */
export const getNotifications = async ({ page = 1, limit = 20, isRead, type, entityType } = {}) => {
  const params = { page, limit };
  if (isRead !== undefined && isRead !== null && isRead !== 'all') {
    params.isRead = isRead;
  }
  if (type && type !== 'all') {
    params.type = type;
  }
  if (entityType) {
    params.entityType = entityType;
  }

  const response = await api.get('/notifications', { params });
  return response.data?.data || response.data;
};

/**
 * Fetch unread notifications.
 */
export const getUnreadNotifications = async ({ page = 1, limit = 20, type } = {}) => {
  const params = { page, limit };
  if (type && type !== 'all') {
    params.type = type;
  }

  const response = await api.get('/notifications/unread', { params });
  return response.data?.data || response.data;
};

/**
 * Get the total unread notifications count for badge indicators.
 */
export const getUnreadCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data?.data?.unreadCount ?? 0;
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data?.data || response.data;
};

/**
 * Mark all user notifications as read.
 */
export const markAllAsRead = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data?.data || response.data;
};

/**
 * Delete a single notification.
 */
export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data?.data || response.data;
};

/**
 * Delete all notifications for the current user.
 */
export const deleteAllNotifications = async () => {
  const response = await api.delete('/notifications');
  return response.data?.data || response.data;
};

export default {
  getNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};
