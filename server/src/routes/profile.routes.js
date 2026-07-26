import { Router } from 'express';

import profileController from '../controllers/profile.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createProfileSchema,
  updateProfileSchema,
} from '../validators/profile.validator.js';

const router = Router();

router.use(authenticate, authorize('student'));

router.post('/', validate(createProfileSchema), profileController.createProfile);
router.get('/', profileController.getProfile);
router.put('/', validate(updateProfileSchema), profileController.updateProfile);
router.delete('/', profileController.deleteProfile);

export default router;
