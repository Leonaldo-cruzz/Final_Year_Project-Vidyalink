import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import projectScreenshotUpload from '../middleware/projectScreenshotUpload.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createProjectSchema,
  getProjectsQuerySchema,
  updateProjectSchema,
} from '../validators/project.validator.js';

const router = Router();

router.use(authenticate);

// Students create portfolio projects; recruiters and faculty create
// opportunities. Ownership is enforced in the service.
const PROJECT_AUTHORS = ['student', 'recruiter', 'faculty', 'admin'];

router.post(
  '/',
  authorize(...PROJECT_AUTHORS),
  projectScreenshotUpload,
  validate(createProjectSchema),
  projectController.createProject
);
router.get(
  '/',
  authorize('student', 'recruiter', 'faculty', 'alumni', 'admin'),
  validate(getProjectsQuerySchema),
  projectController.getProjects
);
router.get('/:id', authorize('student', 'recruiter', 'faculty', 'alumni', 'admin'), projectController.getProjectById);
router.post('/:id/verify-deployment', authorize('student', 'admin'), projectController.verifyDeployment);
router.put(
  '/:id',
  authorize(...PROJECT_AUTHORS),
  projectScreenshotUpload,
  validate(updateProjectSchema),
  projectController.updateProject
);
router.delete('/:id', authorize(...PROJECT_AUTHORS), projectController.deleteProject);

export default router;
