// ============================================================
// VIDYALINK — Resume Service (client-side)
// ============================================================
// All API calls route through the Node backend only.
// No fake data, no fallback data injected here.
// ============================================================

import api from './api.js';

// ── Existing upload-based operations ─────────────────────────────────────────

/**
 * Fetch the current student's resume metadata (upload or generated).
 */
export const getResume = async () => {
  const response = await api.get('/resume');
  return response.data;
};

/**
 * Upload a new resume PDF (manual, student-supplied).
 */
export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await api.post('/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Replace the existing resume with a new student-supplied PDF.
 */
export const replaceResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);
  const response = await api.put('/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Delete the student's active resume.
 */
export const deleteResume = async () => {
  const response = await api.delete('/resume');
  return response.data;
};

// ── New generation + ATS operations ──────────────────────────────────────────

/**
 * Generate an ATS-safe PDF resume from the student's real profile data.
 * Automatically runs ATS analysis after generation.
 *
 * @param {object} [options]
 * @param {string|null}  [options.jobDescription]  - Optional target job description for ATS keyword matching.
 * @param {object}       [options.sections]         - Section visibility flags (defaults all true):
 *   { contact, summary, skills, education, projects, certifications, github }
 * @returns {Promise<{ resume: object, atsResult: object|null }>}
 */
export const generateResume = async ({ jobDescription = null, sections = {} } = {}) => {
  const response = await api.post('/resume/generate', { jobDescription, sections });
  return response.data;
};

/**
 * Fetch the current resume with the most recent stored ATS analysis result.
 * @returns {Promise<{ resume: object|null, atsResult: object|null }>}
 */
export const getLatestResume = async () => {
  const response = await api.get('/resume/latest');
  return response.data;
};

/**
 * Check whether the generated resume is stale (profile data changed since last generation).
 * Marks the resume as STALE in the database if so.
 * @returns {Promise<{ isStale: boolean, resume: object }>}
 */
export const checkStaleness = async () => {
  const response = await api.post('/resume/check-stale');
  return response.data;
};

// ── Document Intelligence & Profile Integration ──────────────────────────────

/**
 * Compare active parsed resume against student profile and verified portfolio.
 */
export const getResumeComparison = async () => {
  const response = await api.get('/resume/comparison');
  return response.data;
};

/**
 * Selectively import confirmed resume skills or education to profile.
 */
export const importToProfile = async ({ skills = [], education = null } = {}) => {
  const response = await api.post('/resume/import-to-profile', { skills, education });
  return response.data;
};

/**
 * Re-run ATS analysis on the uploaded resume against an optional job description.
 */
export const reanalyzeATS = async (jobDescription = null) => {
  const response = await api.post('/resume/reanalyze-ats', { jobDescription });
  return response.data;
};

export default {
  getResume,
  uploadResume,
  replaceResume,
  deleteResume,
  generateResume,
  getLatestResume,
  checkStaleness,
  getResumeComparison,
  importToProfile,
  reanalyzeATS,
};
