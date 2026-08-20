import { Router } from 'express';
import alumniController from '../controllers/alumni.controller.js';
import endorsementController from '../controllers/endorsement.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createAlumniProfileSchema,
  updateAlumniProfileSchema,
  setVerificationSchema,
} from '../validators/alumni.validator.js';
import {
  createEndorsementSchema,
  studentIdParamSchema,
  endorsementIdParamSchema,
} from '../validators/endorsement.validator.js';

const router = Router();

// All alumni routes require authentication
router.use(authenticate);

// ─── Alumni Profile ───────────────────────────────────────────────────────────

router.get(
  '/profile',
  authorize('alumni'),
  alumniController.getMyProfile
);

router.post(
  '/profile',
  authorize('alumni'),
  validate(createAlumniProfileSchema),
  alumniController.createProfile
);

router.patch(
  '/profile',
  authorize('alumni'),
  validate(updateAlumniProfileSchema),
  alumniController.updateProfile
);

// ─── Admin — verification ─────────────────────────────────────────────────────

router.patch(
  '/users/:userId/verify',
  authorize('admin'),
  validate(setVerificationSchema),
  alumniController.setVerificationStatus
);

// ─── Skill Endorsements ───────────────────────────────────────────────────────

router.post(
  '/endorsements',
  authorize('alumni'),
  validate(createEndorsementSchema),
  endorsementController.createEndorsement
);

router.get(
  '/students/:studentId/endorsements',
  authorize('alumni', 'student', 'admin'),
  validate(studentIdParamSchema),
  endorsementController.getStudentEndorsements
);

router.delete(
  '/endorsements/:id',
  authorize('alumni'),
  validate(endorsementIdParamSchema),
  endorsementController.deleteEndorsement
);

export default router;
