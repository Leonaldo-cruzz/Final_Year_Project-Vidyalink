import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import {
  getAdminStats,
  getAdminUsers,
  toggleUserStatus,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', toggleUserStatus);

export default router;
