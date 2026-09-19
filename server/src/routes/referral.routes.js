import { Router } from 'express';
import referralController from '../controllers/referral.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

router.use(authenticate);

// Public / authenticated users can view active referrals
router.get('/', referralController.getActiveReferrals);

// Alumni-specific routes
router.get('/my', authorize('alumni'), referralController.getMyReferrals);
router.post('/', authorize('alumni'), referralController.createReferral);
router.delete('/:id', authorize('alumni'), referralController.deleteReferral);

export default router;
