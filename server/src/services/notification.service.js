import Notification from '../models/notification.model.js';
import ApiError from '../utils/ApiError.js';

class NotificationService {
  /**
   * Create a single server-controlled notification.
   */
  async createNotification({
    recipientId,
    actorId = null,
    type,
    title,
    message,
    entityType = null,
    entityId = null,
    metadata = {},
  }) {
    if (!recipientId) {
      throw ApiError.badRequest('Recipient ID is required to create notification');
    }

    const safeMetadata = typeof metadata === 'object' && metadata !== null ? metadata : {};

    const notification = await Notification.create({
      recipientId,
      actorId,
      type,
      title,
      message,
      entityType,
      entityId,
      metadata: safeMetadata,
    });

    return notification;
  }

  /**
   * Create bulk notifications (e.g. broadcast or multi-faculty notification).
   */
  async createBulkNotifications(notificationsArray = []) {
    if (!Array.isArray(notificationsArray) || notificationsArray.length === 0) {
      return [];
    }

    const docs = notificationsArray.map((item) => ({
      recipientId: item.recipientId,
      actorId: item.actorId || null,
      type: item.type,
      title: item.title,
      message: item.message,
      entityType: item.entityType || null,
      entityId: item.entityId || null,
      metadata: typeof item.metadata === 'object' && item.metadata !== null ? item.metadata : {},
    }));

    return Notification.insertMany(docs);
  }

  /**
   * Get paginated notifications for a recipient with optional filters.
   */
  async getUserNotifications(recipientId, { page = 1, limit = 20, isRead, type, entityType } = {}) {
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { recipientId };

    if (isRead !== undefined && isRead !== null) {
      if (typeof isRead === 'boolean') {
        filter.isRead = isRead;
      } else if (isRead === 'true') {
        filter.isRead = true;
      } else if (isRead === 'false') {
        filter.isRead = false;
      }
    }

    if (type) {
      if (Array.isArray(type)) {
        filter.type = { $in: type };
      } else if (typeof type === 'string' && type.includes(',')) {
        filter.type = { $in: type.split(',').map((t) => t.trim()).filter(Boolean) };
      } else {
        filter.type = type;
      }
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('actorId', 'fullName email avatar role')
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipientId, isRead: false }),
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    return {
      notifications,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasPrevPage: pageNum > 1,
        hasNextPage: pageNum < totalPages,
      },
      unreadCount,
    };
  }

  /**
   * Get unread notifications for a recipient.
   */
  async getUnreadNotifications(recipientId, options = {}) {
    return this.getUserNotifications(recipientId, {
      ...options,
      isRead: false,
    });
  }

  /**
   * Get unread count for badge indicator.
   */
  async getUnreadCount(recipientId) {
    const count = await Notification.countDocuments({
      recipientId,
      isRead: false,
    });

    return { unreadCount: count };
  }

  /**
   * Mark a single notification as read (with strict ownership check).
   */
  async markAsRead(notificationId, recipientId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipientId,
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found or access denied');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  /**
   * Mark all unread notifications as read for a recipient.
   */
  async markAllAsRead(recipientId) {
    const now = new Date();
    const result = await Notification.updateMany(
      { recipientId, isRead: false },
      { $set: { isRead: true, readAt: now } }
    );

    return {
      modifiedCount: result.modifiedCount,
      readAt: now,
    };
  }

  /**
   * Delete a single notification (with strict ownership check).
   */
  async deleteNotification(notificationId, recipientId) {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipientId,
    });

    if (!notification) {
      throw ApiError.notFound('Notification not found or access denied');
    }

    return { message: 'Notification deleted successfully' };
  }

  /**
   * Delete all notifications for a recipient.
   */
  async deleteAllNotifications(recipientId) {
    const result = await Notification.deleteMany({ recipientId });
    return {
      deletedCount: result.deletedCount,
      message: 'All notifications deleted successfully',
    };
  }
}

export default new NotificationService();
