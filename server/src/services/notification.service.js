import Notification from '../models/notification.model.js';

class NotificationService {
  async createNotification({ userId, title, message, type = 'system', link = null }) {
    return Notification.create({ userId, title, message, type, link });
  }

  async getMyNotifications(userId) {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ userId, read: false }),
    ]);

    return { notifications, unreadCount };
  }

  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    await Notification.updateMany({ userId, read: false }, { read: true });
    return { success: true };
  }
}

export default new NotificationService();
