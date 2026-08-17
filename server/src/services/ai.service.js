import env from '../config/env.js';
import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Portfolio from '../models/portfolio.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Resume from '../models/resume.model.js';
import ApiError from '../utils/ApiError.js';

class AIService {
  constructor() {
    this.baseUrl = (env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
    this.timeoutMs = env.AI_SERVICE_TIMEOUT_MS || 10000;
  }

  /**
   * Health check for the AI microservice.
   * @returns {Promise<{success: boolean, service: string, status: string}>}
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`AI service responded with HTTP status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw ApiError.gatewayTimeout('AI evaluation service request timed out');
      }
      throw ApiError.serviceUnavailable(
        'AI evaluation engine is currently unreachable. Please ensure the AI microservice is running.'
      );
    }
  }

  /**
   * Evaluates student portfolio assets.
   * STRICT SECURITY RULE: Only verified portfolio assets are submitted to the AI engine.
   *
   * @param {string} studentId - Student unique ObjectId
   * @returns {Promise<Object>} Normalized evaluation payload from FastAPI
   */
  async evaluateVerifiedPortfolio(studentId) {
    if (!studentId) {
      throw ApiError.badRequest('Student ID is required for AI evaluation');
    }

    // 1. Query all student portfolio documents across collections
    const [profile, projects, certificates, portfolios, resume, github] = await Promise.all([
      Profile.findOne({ user: studentId }),
      Project.find({ userId: studentId }),
      Certificate.find({ userId: studentId }),
      Portfolio.find({ student: studentId }),
      Resume.findOne({ userId: studentId }),
      GitHubAccount.findOne({ userId: studentId }),
    ]);

    // 2. Filter ONLY verified assets
    const verifiedProjects = projects.filter((p) => p.verificationStatus === 'Verified');
    const verifiedCertificates = certificates.filter((c) => c.verificationStatus === 'Verified');
    const verifiedPortfolios = portfolios || [];
    const verifiedGithub = github && github.connectionStatus === 'Connected' ? github : null;
    const verifiedResume = resume && resume.fileUrl ? resume : null;

    const totalVerifiedAssets =
      verifiedProjects.length +
      verifiedCertificates.length +
      verifiedPortfolios.length +
      (verifiedGithub ? 1 : 0);

    // Enforce verified constraint: Reject unverified portfolio submissions
    if (totalVerifiedAssets === 0) {
      throw ApiError.badRequest(
        'AI evaluation requires at least one verified portfolio asset (project, certificate, or workspace portfolio).'
      );
    }

    // Merge skills from verified workspace credentials
    const workspaceSkills = verifiedPortfolios.flatMap((vp) => vp.skillsVerified || []);
    const studentSkills = Array.from(
      new Set([
        ...(Array.isArray(profile?.skills) ? profile.skills : []),
        ...workspaceSkills,
      ])
    );

    // 3. Construct sanitized evaluation payload (no raw binary files, no secrets)
    const payload = {
      studentId: String(studentId),
      portfolioId: profile?._id ? String(profile._id) : String(studentId),
      resumeText: verifiedResume ? (verifiedResume.extractedText || null) : null,
      projects: verifiedProjects.map((p) => ({
        id: String(p._id),
        title: p.title,
        shortDescription: p.shortDescription || null,
        detailedDescription: p.detailedDescription || null,
        category: p.category || null,
        technologies: p.technologies || [],
        githubRepository: p.githubRepository || null,
        liveDeployment: p.liveDeployment || null,
        isVerified: true,
      })),
      certificates: verifiedCertificates.map((c) => ({
        id: String(c._id),
        title: c.title,
        issuer: c.issuer || null,
        issueDate: c.issueDate ? c.issueDate.toISOString().split('T')[0] : null,
        credentialId: c.credentialId || null,
        credentialUrl: c.credentialUrl || null,
        skills: c.skills || [],
        isVerified: true,
      })),
      github: verifiedGithub
        ? {
            username: verifiedGithub.githubUsername,
            bio: verifiedGithub.bio || null,
            publicRepos: verifiedGithub.publicRepos || 0,
            followers: verifiedGithub.followers || 0,
            following: verifiedGithub.following || 0,
            githubProfileUrl: verifiedGithub.githubProfileUrl || null,
            isVerified: true,
          }
        : null,
      skills: studentSkills,
    };

    // 4. Send verified portfolio payload to FastAPI evaluation endpoint
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/evaluation/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        let errorData = null;
        try {
          errorData = await response.json();
        } catch {
          // ignore non-json error responses
        }

        if (response.status === 422) {
          throw ApiError.badRequest(
            'Evaluation payload validation failed',
            errorData?.detail || []
          );
        }

        throw new Error(`AI service responded with HTTP status ${response.status}`);
      }

      const result = await response.json();
      return this.normalizeEvaluationResponse(result);
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw ApiError.gatewayTimeout('AI evaluation request timed out');
      }

      throw ApiError.serviceUnavailable(
        'AI evaluation service is temporarily unavailable. Please try again later.'
      );
    }
  }

  /**
   * Normalizes the evaluation response to ensure consistent structure.
   * @param {Object} rawResponse
   * @returns {Object}
   */
  normalizeEvaluationResponse(rawResponse) {
    const data = rawResponse?.data || {};
    return {
      portfolioScore: data.portfolioScore ?? null,
      atsScore: data.atsScore ?? null,
      githubScore: data.githubScore ?? null,
      industryReadinessScore: data.industryReadinessScore ?? null,
      skills: Array.isArray(data.skills) ? data.skills : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      status: data.status || 'evaluation_pending',
      evaluatedAt: new Date().toISOString(),
    };
  }
}

const aiService = new AIService();
export default aiService;
