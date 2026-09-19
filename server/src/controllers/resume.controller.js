import resumeService from '../services/resume.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── Existing endpoints ────────────────────────────────────────────────────────

const uploadResume = asyncHandler(async (req, res) => {
  const result = await resumeService.saveOrReplaceResume(req.user._id, req.file);
  const message = result.isDuplicate
    ? 'Duplicate resume detected — existing parsed data reused'
    : 'Resume uploaded and parsed successfully';
  return ApiResponse.created(res, message, result);
});

const getResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.getResume(req.user._id);
  if (!resume) return ApiResponse.ok(res, 'No resume found', null);
  return ApiResponse.ok(res, 'Resume fetched successfully', resume);
});

const replaceResume = asyncHandler(async (req, res) => {
  const result = await resumeService.saveOrReplaceResume(req.user._id, req.file);
  const message = result.isDuplicate
    ? 'Duplicate resume detected — existing parsed data reused'
    : 'Resume replaced and parsed successfully';
  return ApiResponse.ok(res, message, result);
});

const deleteResume = asyncHandler(async (req, res) => {
  await resumeService.deleteResume(req.user._id);
  return ApiResponse.ok(res, 'Resume deleted successfully', null);
});

// ── New endpoints ─────────────────────────────────────────────────────────────

/**
 * POST /api/v1/resume/generate
 * Generates an ATS-safe PDF from the student's real profile data.
 * Body (all optional):
 *   { jobDescription: string, sections: { contact, summary, skills, education, projects, certifications, github } }
 */
const generateResume = asyncHandler(async (req, res) => {
  const { jobDescription = null, sections = {} } = req.body || {};

  // Sanitise sections — only allow known section keys, values must be boolean
  const ALLOWED_SECTIONS = ['contact', 'summary', 'skills', 'education', 'projects', 'certifications', 'github'];
  const safeSections = Object.fromEntries(
    ALLOWED_SECTIONS
      .filter((key) => key in sections)
      .map((key) => [key, Boolean(sections[key])]),
  );

  const { resume, atsResult } = await resumeService.generateResume(
    req.user._id,
    { jobDescription, sections: safeSections },
  );

  return ApiResponse.ok(res, 'Resume generated successfully', { resume, atsResult });
});

/**
 * GET /api/v1/resume/latest
 * Returns the current resume record plus the most recent stored ATS result.
 */
const getLatest = asyncHandler(async (req, res) => {
  const result = await resumeService.getLatestWithATS(req.user._id);
  if (!result.resume) return ApiResponse.ok(res, 'No resume found', null);
  return ApiResponse.ok(res, 'Resume with ATS result fetched', result);
});

/**
 * POST /api/v1/resume/check-stale
 * Recomputes the source snapshot and marks the resume STALE if the profile changed.
 */
const checkStale = asyncHandler(async (req, res) => {
  const { isStale, resume } = await resumeService.checkAndMarkStale(req.user._id);
  return ApiResponse.ok(res, isStale ? 'Resume is stale — profile data has changed' : 'Resume is current', {
    isStale,
    resume,
  });
});

/**
 * GET /api/v1/resume/comparison
 * Compares active parsed resume with student profile and verified portfolio.
 */
const getComparison = asyncHandler(async (req, res) => {
  const comparison = await resumeService.getComparison(req.user._id);
  return ApiResponse.ok(res, 'Resume comparison generated successfully', comparison);
});

/**
 * POST /api/v1/resume/import-to-profile
 * Selectively imports confirmed skills or education from resume to profile.
 */
const importToProfile = asyncHandler(async (req, res) => {
  const result = await resumeService.importToProfile(req.user._id, req.body);
  return ApiResponse.ok(res, result.message, result.profile);
});

/**
 * POST /api/v1/resume/reanalyze-ats
 * Re-runs ATS analysis against an optional job description.
 */
const reanalyzeATS = asyncHandler(async (req, res) => {
  const { jobDescription = null } = req.body || {};
  const result = await resumeService.reanalyzeATS(req.user._id, { jobDescription });
  return ApiResponse.ok(res, 'ATS re-analysis completed successfully', result);
});

export default {
  uploadResume,
  getResume,
  replaceResume,
  deleteResume,
  generateResume,
  getLatest,
  checkStale,
  getComparison,
  importToProfile,
  reanalyzeATS,
};
