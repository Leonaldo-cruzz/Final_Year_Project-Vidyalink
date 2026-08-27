/* global AbortController, clearTimeout, fetch, setTimeout */

import fs from 'node:fs/promises';
import path from 'node:path';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import Portfolio from '../models/portfolio.model.js';
import Project from '../models/project.model.js';
import Certificate from '../models/certificate.model.js';
import Resume from '../models/resume.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import PortfolioEvaluation from '../models/portfolioEvaluation.model.js';
import ResumeEvaluation from '../models/resumeEvaluation.model.js';
import { RESUME_DIRECTORY } from '../middleware/resumeUpload.middleware.js';

class AIService {
  constructor() {
    this.baseUrl = (env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
    this.timeoutMs = env.AI_SERVICE_TIMEOUT_MS || 5000;
  }

  /**
   * Safe fetch wrapper with timeout and standard error normalization.
   * @param {string} endpoint
   * @param {RequestInit} options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const timeout = options.timeout || this.timeoutMs;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        logger.error('Failed to parse AI service JSON response');
        throw ApiError.badGateway('Received invalid response from AI service.');
      }

      if (!response.ok) {
        logger.warn('AI service responded with non-2xx status code', { status: response.status });
        if (response.status === 400 || response.status === 422) {
          const detailMsg = responseData?.error || responseData?.detail || 'Invalid evaluation request';
          throw ApiError.badRequest(typeof detailMsg === 'string' ? detailMsg : 'Invalid evaluation request');
        }
        throw ApiError.badGateway('AI service returned an unexpected error.');
      }

      if (!responseData || typeof responseData !== 'object' || responseData.success !== true) {
        logger.error('AI service response structure is malformed');
        throw ApiError.badGateway('Received malformed response structure from AI service.');
      }

      return responseData;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        logger.error('AI service request timed out', { timeoutMs: timeout });
        throw ApiError.gatewayTimeout('AI service request timed out.');
      }

      logger.error('AI service connection failure', { errorName: error.name });
      throw ApiError.serviceUnavailable('AI service is temporarily unavailable.');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check for AI microservice.
   * @returns {Promise<{success: boolean, service: string, status: string}>}
   */
  async checkHealth() {
    return this.request('/health', { method: 'GET' });
  }

  /**
   * Forward a validated payload to the AI service evaluation queue endpoint.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async evaluatePortfolio(payload) {
    if (!payload || typeof payload !== 'object') {
      throw ApiError.badRequest('Invalid payload supplied for portfolio evaluation');
    }

    if (!payload.studentId || !payload.portfolioId) {
      throw ApiError.badRequest('studentId and portfolioId are required for evaluation');
    }

    if (payload.verificationStatus !== 'VERIFIED') {
      throw ApiError.badRequest('Only portfolios with verificationStatus VERIFIED can be evaluated');
    }

    return this.request('/api/v1/evaluation/portfolio', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Forward a validated payload to the AI service score calculation endpoint.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async scorePortfolio(payload) {
    if (!payload || typeof payload !== 'object') {
      throw ApiError.badRequest('Invalid payload supplied for portfolio scoring');
    }

    if (!payload.studentId || !payload.portfolioId) {
      throw ApiError.badRequest('studentId and portfolioId are required for scoring');
    }

    if (payload.verificationStatus !== 'VERIFIED') {
      throw ApiError.badRequest('Only portfolios with verificationStatus VERIFIED can be scored');
    }

    return this.request('/api/v1/evaluation/portfolio/score', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Forward a validated resume payload to the ATS Resume Evaluation endpoint.
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async evaluateResumeATS(payload) {
    if (!payload || typeof payload !== 'object') {
      throw ApiError.badRequest('Invalid payload supplied for ATS resume evaluation');
    }

    if (!payload.studentId || !payload.portfolioId) {
      throw ApiError.badRequest('studentId and portfolioId are required for ATS evaluation');
    }

    if (payload.verificationStatus !== 'VERIFIED') {
      throw ApiError.badRequest('Only resumes with verificationStatus VERIFIED can be evaluated for ATS');
    }

    return this.request('/api/v1/evaluation/resume/ats', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Loads portfolio & verification records securely from database,
   * validates verification eligibility, and constructs a verified payload.
   *
   * @param {string|ObjectId} studentId - Authenticated student ID
   * @param {string|ObjectId} portfolioId - Portfolio record ID
   * @returns {Promise<object>} Server-constructed verified evaluation payload
   */
  async buildVerifiedEvaluationPayload(studentId, portfolioId) {
    if (!studentId || !portfolioId) {
      throw ApiError.badRequest('studentId and portfolioId are required');
    }

    // 1. Fetch portfolio from database ensuring ownership
    const portfolio = await Portfolio.findOne({
      _id: portfolioId,
      student: studentId,
    })
      .populate('student', 'fullName email')
      .populate('verifiedBy', 'fullName email role');

    if (!portfolio) {
      throw ApiError.notFound('Portfolio not found or unauthorized');
    }

    // Must be verified by faculty / mentor
    if (!portfolio.verifiedBy || !portfolio.verificationHash) {
      throw ApiError.badRequest('Portfolio has not been verified yet');
    }

    // 2. Fetch student assets
    const [projects, certificates, resume, github] = await Promise.all([
      Project.find({ userId: studentId }).lean(),
      Certificate.find({ userId: studentId }).lean(),
      Resume.findOne({ userId: studentId }).lean(),
      GitHubAccount.findOne({ userId: studentId }).lean(),
    ]);

    // 3. Construct server-verified payload with complete schema fields
    const sanitizedPayload = {
      studentId: String(studentId),
      portfolioId: String(portfolioId),
      verificationStatus: 'VERIFIED',
      resume: resume ? {
        summary: resume.summary || '',
        education: resume.education || [],
        experience: resume.experience || [],
      } : {},
      projects: projects.map((p) => ({
        id: String(p._id),
        title: p.title,
        description: p.shortDescription || p.description || '',
        detailedDescription: p.detailedDescription || '',
        technologies: p.technologies || p.techStack || [],
        category: p.category || '',
        domain: p.domain || p.category || '',
        githubRepository: p.githubUrl || p.githubRepository || '',
        liveDeployment: p.liveUrl || p.liveDeployment || '',
        demoVideo: p.demoVideo || p.demoVideoUrl || '',
        documentationUrl: p.documentationUrl || '',
        teamMembers: p.teamMembers || [],
        documentation: p.documentation || {},
        codeQuality: p.codeQuality || {},
      })),
      certificates: certificates.map((c) => ({
        id: String(c._id),
        title: c.title,
        issuer: c.issuer || '',
        issueDate: c.issueDate || null,
      })),
      github: github ? {
        username: github.username || '',
        publicRepos: github.publicRepos || github.repositoryCount || 0,
        repositoryCount: github.repositoryCount || github.publicRepos || 0,
        commitCount: github.commitCount || github.recentCommits || 0,
        contributionActivity: github.contributionActivity || github.totalContributions || 0,
        languages: github.languages || [],
        stars: github.stars || github.totalStars || 0,
        forks: github.forks || github.totalForks || 0,
        readmePresent: github.readmePresent !== undefined ? github.readmePresent : true,
        lastActivity: github.lastActivity || null,
      } : {},
      skills: portfolio.skillsVerified || [],
    };

    return sanitizedPayload;
  }

  /**
   * Orchestrates secure evaluation: loads verified portfolio from DB, verifies status, and calls AI service.
   * @param {string|ObjectId} studentId
   * @param {string|ObjectId} portfolioId
   * @returns {Promise<object>}
   */
  async evaluateVerifiedStudentPortfolio(studentId, portfolioId) {
    const verifiedPayload = await this.buildVerifiedEvaluationPayload(studentId, portfolioId);
    return this.evaluatePortfolio(verifiedPayload);
  }

  /**
   * Evaluates and scores a verified student portfolio, persisting historical result in PortfolioEvaluation.
   * @param {string|ObjectId} studentId
   * @param {string|ObjectId} portfolioId
   * @returns {Promise<object>}
   */
  async scoreVerifiedStudentPortfolio(studentId, portfolioId) {
    const verifiedPayload = await this.buildVerifiedEvaluationPayload(studentId, portfolioId);
    const scoreResponse = await this.scorePortfolio(verifiedPayload);

    if (scoreResponse?.data) {
      const evaluationDoc = await PortfolioEvaluation.create({
        studentId,
        portfolioId,
        scoringVersion: scoreResponse.data.version || '1.0',
        portfolioScore: scoreResponse.data.portfolioScore,
        category: scoreResponse.data.category,
        breakdown: scoreResponse.data.breakdown,
        evaluatedAt: scoreResponse.data.evaluatedAt ? new Date(scoreResponse.data.evaluatedAt) : new Date(),
      });

      return {
        ...scoreResponse,
        savedEvaluationId: evaluationDoc._id,
      };
    }

    return scoreResponse;
  }

  /**
   * Evaluates ATS compatibility of a student's verified resume and persists result in ResumeEvaluation.
   * @param {string|ObjectId} studentId
   * @param {object} [options={}] - Optional targetJob and portfolioId
   * @returns {Promise<object>}
   */
  async evaluateVerifiedStudentResume(studentId, options = {}) {
    const { targetJob = null, portfolioId = null } = options;

    if (!studentId) {
      throw ApiError.badRequest('studentId is required for resume evaluation');
    }

    // 1. Look up student resume record
    const resume = await Resume.findOne({ userId: studentId });
    if (!resume) {
      throw ApiError.notFound('No resume record found for this student');
    }

    // 2. Read file content if stored locally
    let base64Content = null;
    if (resume.storedFileName && RESUME_DIRECTORY) {
      try {
        const filePath = path.join(RESUME_DIRECTORY, resume.storedFileName);
        const fileBuffer = await fs.readFile(filePath);
        base64Content = fileBuffer.toString('base64');
      } catch {
        logger.warn('Could not read resume file from disk, using metadata fallback');
      }
    }

    // 3. Construct verified ATS request payload
    const effectivePortfolioId = portfolioId ? String(portfolioId) : String(resume._id);
    const payload = {
      studentId: String(studentId),
      portfolioId: effectivePortfolioId,
      verificationStatus: 'VERIFIED',
      resume: {
        fileName: resume.originalFileName,
        mimeType: resume.mimeType || 'application/pdf',
        fileContentBase64: base64Content,
      },
      targetJob: targetJob || undefined,
    };

    // 4. Call FastAPI ATS evaluation endpoint
    const atsResponse = await this.evaluateResumeATS(payload);

    // 5. Persist evaluation history
    if (atsResponse?.data) {
      const savedDoc = await ResumeEvaluation.create({
        studentId,
        resumeId: resume._id,
        portfolioId: portfolioId || null,
        atsScore: atsResponse.data.atsScore,
        category: atsResponse.data.category,
        breakdown: atsResponse.data.breakdown,
        matchedSkills: atsResponse.data.matchedSkills || [],
        missingSkills: atsResponse.data.missingSkills || [],
        missingKeywords: atsResponse.data.missingKeywords || [],
        recommendations: atsResponse.data.recommendations || [],
        scoringVersion: atsResponse.data.scoringVersion || '1.0',
        evaluatedAt: atsResponse.data.evaluatedAt ? new Date(atsResponse.data.evaluatedAt) : new Date(),
      });

      return {
        ...atsResponse,
        savedEvaluationId: savedDoc._id,
      };
    }

    return atsResponse;
  }
}

const aiService = new AIService();
export { AIService };
export default aiService;
