import Notification from '../models/notification.model.js';
import ApiError from '../utils/ApiError.js';

class NotificationService {
  /**
   * Create and send a notification
   */
  async createNotification({ recipient, sender = null, type, title, message, link = null, metadata = {} }) {
    if (!recipient || !type || !title || !message) {
      return null;
    }

    try {
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
    } catch (err) {
      console.error('[NotificationService] Error creating notification:', err.message);
      return null;
    }
  }

  /**
   * Get user notifications with unread count
   */
  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const query = { recipient: userId };
    if (unreadOnly) {
      query.isRead = false;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'fullName avatar role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  /**
   * Mark a single notification or all user notifications as read
   */
  async markAsRead(userId, notificationId = null) {
    if (notificationId) {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
      );
      if (!notification) {
        throw ApiError.notFound('Notification not found');
      }
      return notification;
    }

    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    return { success: true };
  }
}

export default new NotificationService();
