import { Router } from 'express';
import mentorshipController from '../controllers/mentorship.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/mentors', mentorshipController.getMentorsList);
router.get('/', mentorshipController.getMyMentorships);
router.post('/request', authorize('student'), mentorshipController.requestMentorship);
router.patch('/:id/status', authorize('alumni', 'faculty', 'admin'), mentorshipController.updateMentorshipStatus);

export default router;
