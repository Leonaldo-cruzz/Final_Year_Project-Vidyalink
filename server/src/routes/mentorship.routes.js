import { Router } from 'express';
import mentorshipController from '../controllers/mentorship.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

// Student sends mentorship inquiry
router.post('/request', authorize('student'), mentorshipController.requestMentorship);

// Fetch requests (alumni sees incoming, student sees outgoing)
router.get('/my-requests', mentorshipController.getMyRequests);

// Alumni gets active mentees
router.get('/mentees', authorize('alumni'), mentorshipController.getMentees);

// Alumni accepts/schedules or declines
router.patch('/:id/accept', authorize('alumni'), mentorshipController.acceptRequest);
router.patch('/:id/decline', authorize('alumni'), mentorshipController.declineRequest);

export default router;
