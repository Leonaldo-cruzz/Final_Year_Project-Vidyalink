import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../validators/project.validator.js';

const router = Router();

router.use(authenticate);

// Public / Student Marketplace routes
router.get('/', projectController.getProjects);
router.get('/my', authorize('recruiter', 'faculty', 'admin'), projectController.getMyProjects);
router.get('/:id', projectController.getProject);
router.post('/:id/apply', authorize('student'), projectController.applyToProject);

// Recruiter / Admin Management routes
router.post(
  '/',
  authorize('recruiter', 'faculty', 'admin'),
  validate(createProjectSchema),
  projectController.createProject
);

router.patch(
  '/:id',
  authorize('recruiter', 'faculty', 'admin'),
  validate(updateProjectSchema),
  projectController.updateProject
);

router.delete(
  '/:id',
  authorize('recruiter', 'faculty', 'admin'),
  projectController.deleteProject
);

export default router;
