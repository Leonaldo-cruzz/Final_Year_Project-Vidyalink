import { Router } from 'express';
import referralController from '../controllers/referral.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createReferralSchema,
  updateReferralSchema,
  referralIdParamSchema,
} from '../validators/referral.validator.js';

const router = Router();

router.use(authenticate);

// ─── Alumni endpoints ─────────────────────────────────────────────────────────

// POST /api/v1/referrals
router.post(
  '/',
  authorize('alumni'),
  validate(createReferralSchema),
  referralController.createReferral
);

// GET /api/v1/referrals/alumni
router.get(
  '/alumni',
  authorize('alumni'),
  referralController.getAlumniReferrals
);

// PATCH /api/v1/referrals/:id
router.patch(
  '/:id',
  authorize('alumni'),
  validate(updateReferralSchema),
  referralController.updateReferral
);

// DELETE /api/v1/referrals/:id
router.delete(
  '/:id',
  authorize('alumni'),
  validate(referralIdParamSchema),
  referralController.deleteReferral
);

// ─── Student endpoints ────────────────────────────────────────────────────────

// GET /api/v1/referrals/student
router.get(
  '/student',
  authorize('student'),
  referralController.getStudentReferrals
);

// ─── Shared (alumni + student + admin) ───────────────────────────────────────

// GET /api/v1/referrals/:id
// Note: /alumni and /student must be registered before /:id to prevent
// Express matching them as :id values.
router.get(
  '/:id',
  authorize('alumni', 'student', 'admin'),
  validate(referralIdParamSchema),
  referralController.getReferralById
);

export default router;
