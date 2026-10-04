import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import projectScreenshotUpload from '../middleware/projectScreenshotUpload.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../validators/project.validator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('student', 'admin'),
  projectScreenshotUpload,
  validate(createProjectSchema),
  projectController.createProject
);
router.get('/', authorize('student', 'recruiter', 'faculty', 'alumni', 'admin'), projectController.getProjects);
router.get('/:id', authorize('student', 'recruiter', 'faculty', 'alumni', 'admin'), projectController.getProjectById);
router.post('/:id/verify-deployment', authorize('student', 'admin'), projectController.verifyDeployment);
router.put(
  '/:id',
  authorize('student', 'admin'),
  projectScreenshotUpload,
  validate(updateProjectSchema),
  projectController.updateProject
);
router.delete('/:id', authorize('student', 'admin'), projectController.deleteProject);

export default router;
