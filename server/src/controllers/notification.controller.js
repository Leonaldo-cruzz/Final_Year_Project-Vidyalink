import notificationService from '../services/notification.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class NotificationController {
  /**
   * GET /api/v1/notifications
   */
  getUserNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getUserNotifications(req.user._id, req.query);
    return ApiResponse.ok(res, 'Notifications fetched successfully', result);
  });

  /**
   * GET /api/v1/notifications/unread
   */
  getUnreadNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadNotifications(req.user._id, req.query);
    return ApiResponse.ok(res, 'Unread notifications fetched successfully', result);
  });

  /**
   * GET /api/v1/notifications/unread-count
   */
  getUnreadCount = asyncHandler(async (req, res) => {
    const result = await notificationService.getUnreadCount(req.user._id);
    return ApiResponse.ok(res, 'Unread count fetched successfully', result);
  });

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  markAsRead = asyncHandler(async (req, res) => {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    return ApiResponse.ok(res, 'Notification marked as read', { notification });
  });

  /**
   * PATCH /api/v1/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user._id);
    return ApiResponse.ok(res, 'All notifications marked as read', result);
  });

  /**
   * DELETE /api/v1/notifications/:id
   */
  deleteNotification = asyncHandler(async (req, res) => {
    const result = await notificationService.deleteNotification(req.params.id, req.user._id);
    return ApiResponse.ok(res, result.message);
  });

  /**
   * DELETE /api/v1/notifications
   */
  deleteAllNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.deleteAllNotifications(req.user._id);
    return ApiResponse.ok(res, result.message, { deletedCount: result.deletedCount });
  });
}

export default new NotificationController();
