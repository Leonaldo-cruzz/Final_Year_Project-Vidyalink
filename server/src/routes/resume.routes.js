import { Router } from 'express';
import resumeController from '../controllers/resume.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import resumeUpload from '../middleware/resumeUpload.middleware.js';

const router = Router();

// All resume routes require authentication
router.use(authenticate);
router.use(authorize('student'));

// ── Existing upload/manage routes ─────────────────────────────────────────────
router.post('/', resumeUpload, resumeController.uploadResume);
router.get('/', resumeController.getResume);
router.put('/', resumeUpload, resumeController.replaceResume);
router.delete('/', resumeController.deleteResume);

// ── New generation + ATS routes ───────────────────────────────────────────────
/** Generate ATS-safe PDF from real profile data + auto-run ATS */
router.post('/generate', resumeController.generateResume);

/** Fetch current resume with latest stored ATS result */
router.get('/latest', resumeController.getLatest);

/** Check if the generated resume is stale (profile changed since last generation) */
router.post('/check-stale', resumeController.checkStale);

// ── Document Intelligence & Profile Integration ──────────────────────────────
/** Compare active resume with student profile and verified portfolio */
router.get('/comparison', resumeController.getComparison);

/** Selectively import confirmed resume skills or education to profile */
router.post('/import-to-profile', resumeController.importToProfile);

/** Re-analyze resume ATS against optional job description */
router.post('/reanalyze-ats', resumeController.reanalyzeATS);

export default router;
