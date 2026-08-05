import { Router } from 'express';

import profileController from '../controllers/profile.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import profilePhotoUpload from '../middleware/profilePhotoUpload.middleware.js';
import {
  createProfileSchema,
  updateProfileSchema,
} from '../validators/profile.validator.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createProfileSchema), profileController.createProfile);
router.get('/', profileController.getMyProfile);
router.get('/me', profileController.getMyProfile);
router.patch('/', validate(updateProfileSchema), profileController.updateProfile);
router.post('/photo', profilePhotoUpload, profileController.updateProfilePhoto);
router.delete('/', profileController.deleteProfile);

export default router;
