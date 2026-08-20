import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  listUsersSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userIdSchema,
} from '../validators/admin.validator.js';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/users', validate(listUsersSchema), adminController.getUsers);
router.get('/users/:id', validate(userIdSchema), adminController.getUser);
router.patch('/users/:id/status', validate(updateUserStatusSchema), adminController.updateUserStatus);
router.patch('/users/:id/role', validate(updateUserRoleSchema), adminController.updateUserRole);

export default router;
