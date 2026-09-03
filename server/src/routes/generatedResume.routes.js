import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import controller from '../controllers/generatedResume.controller.js';
import { generateResumeSchema, generatedResumeIdSchema, updateGeneratedResumeSchema } from '../validators/generatedResume.validator.js';

const router = Router();
router.use(authenticate, authorize('student'));
router.post('/generate', validate(generateResumeSchema), controller.generate);
router.get('/generated', controller.list);
router.get('/generated/:id', validate(generatedResumeIdSchema), controller.get);
router.patch('/generated/:id', validate(updateGeneratedResumeSchema), controller.update);
router.delete('/generated/:id', validate(generatedResumeIdSchema), controller.remove);
router.post('/generated/:id/regenerate', validate(generatedResumeIdSchema), controller.regenerate);
router.get('/generated/:id/download', validate(generatedResumeIdSchema), controller.download);
export default router;
