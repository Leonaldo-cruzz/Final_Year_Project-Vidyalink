import notificationService from '../services/notification.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const getMyNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getMyNotifications(req.user._id);
  return ApiResponse.ok(res, 'Notifications fetched successfully', result);
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await notificationService.markAsRead(id, req.user._id);
  return ApiResponse.ok(res, 'Notification marked as read', result);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user._id);
  return ApiResponse.ok(res, 'All notifications marked as read', result);
});

export default {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
