import notificationService from '../services/notification.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class NotificationController {
  getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { limit, page, unreadOnly } = req.query;

    const data = await notificationService.getUserNotifications(userId, {
      limit,
      page,
      unreadOnly: unreadOnly === 'true',
    });

    return ApiResponse.ok(res, 'Notifications retrieved successfully', data);
  });

  getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const data = await notificationService.getUnreadCount(userId);
    return ApiResponse.ok(res, 'Unread notification count retrieved', data);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(userId, id);
    return ApiResponse.ok(res, 'Notification marked as read', notification);
  });

  markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const result = await notificationService.markAllAsRead(userId);
    return ApiResponse.ok(res, 'All notifications marked as read', result);
  });
}

export default new NotificationController();
