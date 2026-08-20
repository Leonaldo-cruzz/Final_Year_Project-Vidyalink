import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
} from '../validators/notification.validator.js';

const router = Router();

// All notification endpoints require valid JWT authentication
router.use(authenticate);

// ─── Static endpoints (Must be declared before /:id) ──────────────────────────

// GET /api/v1/notifications
router.get(
  '/',
  validate(getNotificationsQuerySchema),
  notificationController.getUserNotifications
);

// GET /api/v1/notifications/unread
router.get(
  '/unread',
  validate(getNotificationsQuerySchema),
  notificationController.getUnreadNotifications
);

// GET /api/v1/notifications/unread-count
router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

// PATCH /api/v1/notifications/read-all
router.patch(
  '/read-all',
  notificationController.markAllAsRead
);

// DELETE /api/v1/notifications
router.delete(
  '/',
  notificationController.deleteAllNotifications
);

// ─── Dynamic :id endpoints ───────────────────────────────────────────────────

// PATCH /api/v1/notifications/:id/read
router.patch(
  '/:id/read',
  validate(notificationIdParamSchema),
  notificationController.markAsRead
);

// DELETE /api/v1/notifications/:id
router.delete(
  '/:id',
  validate(notificationIdParamSchema),
  notificationController.deleteNotification
);

export default router;
