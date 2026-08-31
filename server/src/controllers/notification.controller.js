import notificationService from '../services/notification.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class NotificationController {
  getMyNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getUserNotifications(req.user._id, req.query);
    return ApiResponse.ok(res, 'Notifications retrieved successfully', result);
  });

  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await notificationService.markAsRead(req.user._id, id === 'all' ? null : id);
    return ApiResponse.ok(res, 'Notifications marked as read', result);
  });
}

export default new NotificationController();
