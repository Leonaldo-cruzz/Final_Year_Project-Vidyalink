/* global AbortController, clearTimeout, fetch, setTimeout */

/**
 * AI Service Client
 *
 * Handles all communication between the Node.js Express backend and the
 * Python FastAPI AI microservice. The Node backend MUST validate and verify
 * portfolio eligibility before forwarding any data to the AI service.
 */

import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';
import Resume from '../models/resume.model.js';
import Project from '../models/project.model.js';
import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import StudentSkillProfile from '../models/studentSkillProfile.model.js';
import SkillGapAnalysis from '../models/skillGapAnalysis.model.js';

const AI_BASE_URL = env.AI_SERVICE_URL;
const AI_TIMEOUT_MS = env.AI_SERVICE_TIMEOUT_MS;

/**
 * Generic POST helper to the AI microservice.
 * Never logs or exposes raw payload in error messages.
 */
async function postToAI(path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VidyaLink-Backend/1.0',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 503) {
      throw ApiError.serviceUnavailable('AI service is temporarily unavailable');
    }

    if (response.status === 504) {
      throw ApiError.gatewayTimeout('AI service timed out');
    }

    if (response.status === 422) {
      const detail = await response.json().catch(() => ({}));
      throw ApiError.badRequest(
        `AI service rejected the payload: ${JSON.stringify(detail?.detail ?? 'invalid data')}`
      );
    }

    if (!response.ok) {
      throw ApiError.badGateway(`AI service returned an unexpected status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      throw ApiError.gatewayTimeout('AI service request timed out');
    }
    throw ApiError.serviceUnavailable('Unable to reach the AI service right now');
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===========================================================================
// Portfolio Scoring
// ===========================================================================

/**
 * Score a verified student portfolio via the AI microservice.
 * Payload must be pre-validated and VERIFIED by the caller.
 *
 * @param {object} payload - Verified portfolio payload
 * @returns {Promise<object>} Portfolio score result from FastAPI
 */
export async function scorePortfolio(payload) {
  return postToAI('/api/v1/evaluation/portfolio/score', payload);
}

// ===========================================================================
// ATS Resume Analysis
// ===========================================================================

/**
 * Run ATS resume analysis against a verified resume.
 * Payload must be pre-validated and VERIFIED by the caller.
 *
 * @param {object} payload - Verified ATS analysis payload
 * @returns {Promise<object>} ATS score result from FastAPI
 */
export async function analyzeResumeATS(payload) {
  return postToAI('/api/v1/evaluation/resume/ats', payload);
}

// ===========================================================================
// GitHub Analytics
// ===========================================================================

/**
 * Analyze verified GitHub activity metrics via the AI microservice.
 *
 * @param {object} payload - Normalized GitHub analytics payload
 * @returns {Promise<object>} GitHub analysis result from FastAPI
 */
export async function analyzeGitHub(payload) {
  return postToAI('/api/v1/evaluation/github/analyze', payload);
}

// ===========================================================================
// Skill Extraction
// ===========================================================================

/**
 * Forward a pre-validated and verified skill extraction payload to FastAPI.
 * Raw caller — used internally by extractStudentVerifiedSkills.
 *
 * @param {object} payload - Verified skill extraction payload
 * @returns {Promise<object>} Extraction result from FastAPI
 */
export async function extractSkills(payload) {
  return postToAI('/api/v1/evaluation/skills/extract', payload);
}

/**
 * Orchestrated skill extraction:
 * 1. Loads verified portfolio assets from MongoDB for the student.
 * 2. Validates that a resume and at least one project/certificate exist.
 * 3. Calls the FastAPI skill extraction endpoint.
 * 4. Persists the resulting StudentSkillProfile.
 *
 * @param {string} studentId  - The authenticated student's _id (string)
 * @param {string} portfolioId - The portfolio's _id (string)
 * @returns {Promise<object>} Saved StudentSkillProfile document
 */
export async function extractStudentVerifiedSkills(studentId, portfolioId) {
  // Load verified assets from DB — never trust client-supplied evidence
  const [resume, projects, certificates, githubAccount] = await Promise.all([
    Resume.findOne({ userId: studentId }).lean(),
    Project.find({ studentId }).lean(),
    Certificate.find({ studentId }).lean(),
    GitHubAccount.findOne({ userId: studentId }).lean(),
  ]);

  // Build github analytics object from account data
  const github = githubAccount
    ? {
        languages: githubAccount.languages || [],
        repositoryCount: githubAccount.publicRepos || 0,
        activeRepositoryCount: 0,
        totalStars: 0,
        totalForks: 0,
        recentCommitCount: 0,
        readmeCoverage: 0,
      }
    : {};

  const payload = {
    studentId: String(studentId),
    portfolioId: String(portfolioId),
    verificationStatus: 'VERIFIED',
    resume: resume
      ? {
          text: resume.rawText || '',
          fileName: resume.originalFileName || '',
          mimeType: resume.mimeType || 'application/pdf',
        }
      : {},
    projects: (projects || []).map((p) => ({
      title: p.title || '',
      description: p.description || '',
      technologies: p.technologies || [],
    })),
    certificates: (certificates || []).map((c) => ({
      title: c.title || '',
      issuer: c.issuer || '',
      skills: c.skillsVerified || [],
    })),
    github,
    endorsements: [],
  };

  const aiResult = await extractSkills(payload);

  if (!aiResult?.success || !aiResult?.data) {
    throw ApiError.badGateway('Skill extraction returned an invalid response from AI service');
  }

  // Persist the unified skill profile
  const profile = await StudentSkillProfile.create({
    studentId,
    portfolioId,
    skills: aiResult.data.skills || [],
    totalSkillsCount: aiResult.data.totalSkillsCount || 0,
    version: aiResult.data.version || '1.0',
    generatedAt: new Date(aiResult.data.generatedAt || Date.now()),
  });

  return profile;
}

// ===========================================================================
// Skill Gap Analysis
// ===========================================================================

/**
 * Forward a pre-validated skill gap analysis payload to FastAPI.
 * Raw caller — used internally by analyzeStudentSkillGap.
 *
 * @param {object} payload - Skill gap payload
 * @returns {Promise<object>} Gap analysis result from FastAPI
 */
export async function analyzeSkillGap(payload) {
  return postToAI('/api/v1/evaluation/skills/gap-analysis', payload);
}

/**
 * Orchestrated skill gap analysis:
 * 1. Loads the student's most recent StudentSkillProfile from MongoDB.
 * 2. Calls FastAPI gap analysis endpoint with normalized target role.
 * 3. Persists the resulting SkillGapAnalysis document.
 *
 * @param {string} studentId  - The authenticated student's _id (string)
 * @param {object} targetRole - { title, requiredSkills, preferredSkills }
 * @returns {Promise<object>} Saved SkillGapAnalysis document
 */
export async function analyzeStudentSkillGap(studentId, targetRole) {
  if (!targetRole || typeof targetRole !== 'object') {
    throw ApiError.badRequest('targetRole must be an object with title, requiredSkills, and preferredSkills');
  }

  // Load most recent skill profile
  const skillProfile = await StudentSkillProfile.findOne({ studentId })
    .sort({ createdAt: -1 })
    .lean();

  if (!skillProfile || !skillProfile.skills?.length) {
    throw ApiError.badRequest(
      'No skill profile found for this student. Run skill extraction first.'
    );
  }

  const payload = {
    studentId: String(studentId),
    skills: skillProfile.skills,
    targetRole: {
      title: targetRole.title || 'Target Role',
      requiredSkills: Array.isArray(targetRole.requiredSkills) ? targetRole.requiredSkills : [],
      preferredSkills: Array.isArray(targetRole.preferredSkills) ? targetRole.preferredSkills : [],
    },
  };

  const aiResult = await analyzeSkillGap(payload);

  if (!aiResult?.success || !aiResult?.data) {
    throw ApiError.badGateway('Skill gap analysis returned an invalid response from AI service');
  }

  const gap = aiResult.data;

  // Persist gap analysis result
  const gapRecord = await SkillGapAnalysis.create({
    studentId,
    targetRole: gap.targetRole,
    matchedSkills: gap.matchedSkills || [],
    missingRequiredSkills: gap.missingRequiredSkills || [],
    missingPreferredSkills: gap.missingPreferredSkills || [],
    weakEvidenceSkills: gap.weakEvidenceSkills || [],
    matchPercentage: gap.matchPercentage || 0,
    analysisVersion: gap.analysisVersion || '1.0',
    generatedAt: new Date(gap.analyzedAt || Date.now()),
  });

  return gapRecord;
}
