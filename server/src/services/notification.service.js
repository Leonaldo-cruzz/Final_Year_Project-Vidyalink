import Notification from '../models/notification.model.js';
import ApiError from '../utils/ApiError.js';

class NotificationService {
  /**
   * Create and persist a new notification
   */
  async createNotification({ recipient, sender = null, type = 'system', title, message, link = null, metadata = {} }) {
    if (!recipient) {
      throw ApiError.badRequest('Notification recipient is required');
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      link,
      metadata,
    });

    return notification;
  }

  /**
   * Get paginated notifications for an authenticated user
   */
  async getUserNotifications(userId, { limit = 20, page = 1, unreadOnly = false } = {}) {
    const query = { recipient: userId };
    if (unreadOnly) {
      query.read = false;
    }

    const parsedLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 20, 100));
    const parsedPage = Math.max(1, Number.parseInt(page, 10) || 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'fullName email avatar role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, read: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: parsedPage,
      totalPages: Math.ceil(total / parsedLimit),
    };
  }

  /**
   * Get total count of unread notifications for a user
   */
  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({ recipient: userId, read: false });
    return { unreadCount: count };
  }

  /**
   * Mark a specific notification as read
   */
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    notification.read = true;
    await notification.save();
    return notification;
  }

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );

    return {
      updatedCount: result.modifiedCount,
    };
  }
}

export default new NotificationService();
