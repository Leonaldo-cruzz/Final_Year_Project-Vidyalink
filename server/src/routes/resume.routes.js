import { Router } from 'express';
import resumeController from '../controllers/resume.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import resumeUpload from '../middleware/resumeUpload.middleware.js';

const router = Router();

// Protect all resume routes for authenticated student users
router.use(authenticate);
router.use(authorize('student'));

router.post('/', resumeUpload, resumeController.uploadResume);
router.get('/', resumeController.getResume);
router.put('/', resumeUpload, resumeController.replaceResume);
router.delete('/', resumeController.deleteResume);

export default router;
