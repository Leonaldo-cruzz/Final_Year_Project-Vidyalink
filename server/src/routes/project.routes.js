import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import projectScreenshotUpload from '../middleware/projectScreenshotUpload.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createProjectSchema,
  projectListQuerySchema,
  updateProjectSchema,
} from '../validators/project.validator.js';

const router = Router();

router.use(authenticate);
router.use(authorize('student'));

router.post(
  '/',
  projectScreenshotUpload,
  validate(createProjectSchema),
  projectController.createProject
);
router.get('/', validate(projectListQuerySchema), projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.put(
  '/:id',
  projectScreenshotUpload,
  validate(updateProjectSchema),
  projectController.updateProject
);
router.delete('/:id', projectController.deleteProject);

export default router;
