import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';

import {
  getRecruiterProfile,
  createRecruiterProfile,
  updateRecruiterProfile,
} from '../controllers/recruiter.controller.js';
import {
  searchCandidates,
  compareCandidates,
  getCandidateDetails,
} from '../controllers/candidate.controller.js';
import {
  shortlistCandidate,
  getShortlists,
  removeFromShortlist,
} from '../controllers/shortlist.controller.js';

import {
  createRecruiterProfileSchema,
  updateRecruiterProfileSchema,
} from '../validators/recruiter.validator.js';
import {
  candidateSearchSchema,
  candidateCompareSchema,
  candidateDetailsSchema,
} from '../validators/candidate.validator.js';
import {
  createShortlistSchema,
  shortlistParamSchema,
  getShortlistsSchema,
} from '../validators/shortlist.validator.js';
import aiController from '../controllers/ai.controller.js';

const router = Router();

// Protect all recruiter endpoints with authentication and RBAC
router.use(authenticate);
router.use(authorize('recruiter', 'admin'));

// ── Recruiter Profile Management ─────────────────────────────────────
router.get('/profile', getRecruiterProfile);
router.post('/profile', validate(createRecruiterProfileSchema), createRecruiterProfile);
router.patch('/profile', validate(updateRecruiterProfileSchema), updateRecruiterProfile);

// ── Candidate Discovery & Details ────────────────────────────────────
router.get('/candidates', validate(candidateSearchSchema), searchCandidates);
router.get('/candidates/compare', validate(candidateCompareSchema), compareCandidates);
router.get('/candidates/:studentId', validate(candidateDetailsSchema), getCandidateDetails);
router.get('/candidates/:studentId/ai-summary', validate(candidateDetailsSchema), aiController.getRecruiterCandidateAISummary);

// ── Shortlisting Workflow ────────────────────────────────────────────
router.post('/shortlists', validate(createShortlistSchema), shortlistCandidate);
router.get('/shortlists', validate(getShortlistsSchema), getShortlists);
router.delete('/shortlists/:studentId', validate(shortlistParamSchema), removeFromShortlist);

export default router;
