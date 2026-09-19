// ============================================================
// VIDYALINK — AI Service (client-side)
// ============================================================
// All calls go through the Node backend (/api/v1/ai/*).
// React NEVER communicates directly with the FastAPI service.
// All results are grounded in real user evidence; no fallbacks
// or fabricated scores are ever injected here.
// ============================================================

import api from './api.js';

/**
 * Check whether the AI service (FastAPI) is reachable.
 * Returns the raw availability payload from the Node proxy.
 */
export const getAIHealth = () => api.get('/ai/health');

/** Run the complete evidence-backed AI pipeline in one bounded request. */
export const runAIEvaluation = ({ portfolioId, force = false, targetRole, requiredSkills } = {}) =>
  api.post('/ai/evaluate', { portfolioId, force, targetRole, requiredSkills });

/** Fetch the unified current AI profile. */
export const getLatestAIResults = (portfolioId) => api.get('/ai/results/latest', {
  params: portfolioId ? { portfolioId } : undefined,
});

/** Fetch unified current profile plus evaluation history. */
export const getAIResults = (portfolioId) => api.get('/ai/results', {
  params: portfolioId ? { portfolioId } : undefined,
});

/**
 * Trigger a portfolio evaluation for the authenticated student.
 * Requires a faculty-verified portfolio and at least one verified project.
 * @param {string} [portfolioId] – Optional. Required for non-student roles.
 */
export const evaluatePortfolio = (portfolioId) =>
  api.post('/ai/portfolio/evaluate', portfolioId ? { portfolioId } : {});

/**
 * Fetch the most recent stored portfolio evaluation.
 * @param {string} [portfolioId] – Optional. Fetches student's own evaluation when omitted.
 */
export const getPortfolioEvaluation = (portfolioId) => {
  const url = portfolioId
    ? `/ai/portfolio/evaluation/${portfolioId}`
    : '/ai/portfolio/evaluation';
  return api.get(url);
};

/**
 * Run ATS (Applicant Tracking System) analysis against the student's stored resume.
 * @param {object} [body]
 * @param {string} [body.jobDescription] – Optional target job description for gap scoring.
 * @param {string} [body.portfolioId]    – Required when called by non-student roles.
 */
export const analyzeATS = (body = {}) => api.post('/ai/ats/analyze', body);

/**
 * Extract skills from the student's portfolio and resume evidence.
 * @param {object} [body]
 * @param {string} [body.portfolioId] – Required for non-student roles.
 */
export const extractSkills = (body = {}) => api.post('/ai/skills/extract', body);

/**
 * Run a skill gap analysis comparing current skills to a target role's requirements.
 * @param {object} body
 * @param {string[]} [body.currentSkills]  – Falls back to profile skills when omitted.
 * @param {string[]} [body.requiredSkills] – Skills required for the target role.
 * @param {string}   [body.targetRole]     – Free-text target role description.
 */
export const analyzeSkillGap = (body = {}) => api.post('/ai/skills/gap', body);

/**
 * Analyse the student's connected GitHub account activity.
 * Returns insufficient_evidence if no GitHub account is connected.
 */
export const analyzeGithub = (body = {}) => api.post('/ai/github/analyze', body);

/**
 * Calculate overall industry readiness score, aggregated from all stored AI evidence.
 * Returns insufficient_evidence when no prior evaluations exist.
 */
export const calculateReadiness = (body = {}) => api.post('/ai/portfolio/readiness', body);

/**
 * Generate personalised mentor and opportunity recommendations for the authenticated student.
 * Sources live alumni and recruiter project data from the database.
 */
export const getRecommendations = (params) => api.get('/ai/recommendations', { params });
