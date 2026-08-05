import { Router } from 'express';
import githubController from '../controllers/github.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { connectGithubSchema } from '../validators/github.validator.js';

const router = Router();

router.use(authenticate, authorize('student'));

router.post('/connect', validate(connectGithubSchema), githubController.connect);
router.get('/profile', githubController.getProfile);
router.post('/sync', githubController.sync);
router.delete('/disconnect', githubController.disconnect);

export default router;
