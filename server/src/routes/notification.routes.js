import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationController.getMyNotifications);
router.patch('/read-all', (req, res, next) => {
  req.params.id = 'all';
  notificationController.markAsRead(req, res, next);
});
router.patch('/:id/read', notificationController.markAsRead);

export default router;
