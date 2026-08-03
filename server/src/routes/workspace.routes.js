import { Router } from 'express';
import workspaceController from '../controllers/workspace.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', workspaceController.getUserWorkspaces);
router.get('/:id', workspaceController.getWorkspaceById);

export default router;
