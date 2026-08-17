import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/analytics', adminController.getAnalytics);
router.get('/users', adminController.getUsers);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.get('/verifications', adminController.getAllVerifications);

export default router;
