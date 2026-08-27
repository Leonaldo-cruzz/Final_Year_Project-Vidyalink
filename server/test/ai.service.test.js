import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-at-least-32-chars';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/vidyalink_test';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.AI_SERVICE_TIMEOUT_MS = '2000';

const [{ default: aiService }, { default: ApiError }, { default: Portfolio }, { default: Project }, { default: Certificate }, { default: Resume }, { default: GitHubAccount }, { default: PortfolioEvaluation }, { default: verificationService }] = await Promise.all([
  import('../src/services/ai.service.js'),
  import('../src/utils/ApiError.js'),
  import('../src/models/portfolio.model.js'),
  import('../src/models/project.model.js'),
  import('../src/models/certificate.model.js'),
  import('../src/models/resume.model.js'),
  import('../src/models/githubAccount.model.js'),
  import('../src/models/portfolioEvaluation.model.js'),
  import('../src/services/verification.service.js'),
]);

describe('AIService - Node ↔ FastAPI Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('evaluatePortfolio & HTTP Client', () => {
    it('successfully calls AI evaluation endpoint and returns normalized result', async () => {
      const mockResponse = {
        success: true,
        data: {
          status: 'evaluation_pending',
          portfolioScore: null,
          atsScore: null,
          githubScore: null,
          industryReadinessScore: null,
          skills: [],
          skillGaps: [],
          recommendations: [],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const payload = {
        studentId: 'student_123',
        portfolioId: 'portfolio_456',
        verificationStatus: 'VERIFIED',
        resume: {},
        projects: [],
        certificates: [],
        github: {},
        skills: ['JavaScript'],
      };

      const result = await aiService.evaluatePortfolio(payload);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('handles AI service timeout and throws gateway timeout ApiError (504)', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const payload = {
        studentId: 'student_123',
        portfolioId: 'portfolio_456',
        verificationStatus: 'VERIFIED',
      };

      await expect(aiService.evaluatePortfolio(payload)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 504,
          message: 'AI service request timed out.',
        })
      );
    });

    it('handles AI service connection failure and throws service unavailable ApiError (503)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed ECONNREFUSED'));

      const payload = {
        studentId: 'student_123',
        portfolioId: 'portfolio_456',
        verificationStatus: 'VERIFIED',
      };

      await expect(aiService.evaluatePortfolio(payload)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 503,
          message: 'AI service is temporarily unavailable.',
        })
      );
    });

    it('handles malformed AI service JSON response and throws bad gateway ApiError (502)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Unexpected token < in JSON at position 0');
        },
      });

      const payload = {
        studentId: 'student_123',
        portfolioId: 'portfolio_456',
        verificationStatus: 'VERIFIED',
      };

      await expect(aiService.evaluatePortfolio(payload)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 502,
          message: 'Received invalid response from AI service.',
        })
      );
    });

    it('handles malformed AI response body structure (success: false) and throws ApiError (502)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: false, error: 'Internal glitch' }),
      });

      const payload = {
        studentId: 'student_123',
        portfolioId: 'portfolio_456',
        verificationStatus: 'VERIFIED',
      };

      await expect(aiService.evaluatePortfolio(payload)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 502,
          message: 'Received malformed response structure from AI service.',
        })
      );
    });

    it('rejects unverified evaluation payload before calling AI service', async () => {
      global.fetch = vi.fn();

      const invalidPayload = {
        studentId: 'student_123',
        portfolioId: 'portfolio_456',
        verificationStatus: 'PENDING',
      };

      await expect(aiService.evaluatePortfolio(invalidPayload)).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringMatching(/Only portfolios with verificationStatus VERIFIED/i),
        })
      );

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('scorePortfolio & scoreVerifiedStudentPortfolio', () => {
    it('successfully calls scoring endpoint and returns structured breakdown', async () => {
      const mockScoreResponse = {
        success: true,
        data: {
          portfolioScore: 84.50,
          category: 'Very Good',
          breakdown: {
            projectComplexity: { score: 85, weight: 25, weightedScore: 21.25, evidence: [], explanation: '' },
            technologyStack: { score: 90, weight: 20, weightedScore: 18.0, evidence: [], explanation: '' },
            githubActivity: { score: 80, weight: 15, weightedScore: 12.0, evidence: [], explanation: '' },
            documentationQuality: { score: 85, weight: 15, weightedScore: 12.75, evidence: [], explanation: '' },
            innovation: { score: 80, weight: 15, weightedScore: 12.0, evidence: [], explanation: '' },
            codeQuality: { score: 85, weight: 10, weightedScore: 8.5, evidence: [], explanation: '' },
          },
          evaluatedAt: '2026-08-27T12:00:00Z',
          version: '1.0',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockScoreResponse,
      });

      const payload = {
        studentId: 'student_123',
        portfolioId: 'portfolio_456',
        verificationStatus: 'VERIFIED',
        resume: {},
        projects: [],
        certificates: [],
        github: {},
        skills: ['React'],
      };

      const result = await aiService.scorePortfolio(payload);
      expect(result).toEqual(mockScoreResponse);
      expect(result.data.portfolioScore).toBe(84.50);
      expect(result.data.category).toBe('Very Good');
    });

    it('scores verified student portfolio and persists result to PortfolioEvaluation', async () => {
      const studentId = new mongoose.Types.ObjectId();
      const portfolioId = new mongoose.Types.ObjectId();
      const facultyId = new mongoose.Types.ObjectId();
      const workspaceId = new mongoose.Types.ObjectId();

      const mockPortfolio = {
        _id: portfolioId,
        student: studentId,
        workspace: workspaceId,
        verifiedBy: facultyId,
        verificationHash: 'valid_sha256_hash',
        skillsVerified: ['React', 'Node.js'],
      };

      const mockScoreResponse = {
        success: true,
        data: {
          portfolioScore: 82.00,
          category: 'Very Good',
          breakdown: {
            projectComplexity: { score: 80, weight: 25, weightedScore: 20, evidence: [], explanation: '' },
            technologyStack: { score: 85, weight: 20, weightedScore: 17, evidence: [], explanation: '' },
            githubActivity: { score: 80, weight: 15, weightedScore: 12, evidence: [], explanation: '' },
            documentationQuality: { score: 80, weight: 15, weightedScore: 12, evidence: [], explanation: '' },
            innovation: { score: 80, weight: 15, weightedScore: 12, evidence: [], explanation: '' },
            codeQuality: { score: 90, weight: 10, weightedScore: 9, evidence: [], explanation: '' },
          },
          evaluatedAt: '2026-08-27T12:00:00Z',
          version: '1.0',
        },
      };

      vi.spyOn(Portfolio, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockPortfolio),
        }),
      });
      vi.spyOn(Project, 'find').mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
      vi.spyOn(Certificate, 'find').mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
      vi.spyOn(Resume, 'findOne').mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
      vi.spyOn(GitHubAccount, 'findOne').mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
      vi.spyOn(verificationService, 'getStudentVerificationSummary').mockResolvedValue({
        studentId,
        latestVerifications: [],
      });

      const mockSavedDoc = {
        _id: new mongoose.Types.ObjectId(),
        studentId,
        portfolioId,
        portfolioScore: 82.00,
        category: 'Very Good',
      };
      vi.spyOn(PortfolioEvaluation, 'create').mockResolvedValue(mockSavedDoc);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockScoreResponse,
      });

      const result = await aiService.scoreVerifiedStudentPortfolio(studentId, portfolioId);

      expect(result.success).toBe(true);
      expect(result.data.portfolioScore).toBe(82.00);
      expect(result.savedEvaluationId).toEqual(mockSavedDoc._id);
      expect(PortfolioEvaluation.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Verified Data Construction Rule', () => {
    const studentId = new mongoose.Types.ObjectId();
    const portfolioId = new mongoose.Types.ObjectId();
    const facultyId = new mongoose.Types.ObjectId();
    const workspaceId = new mongoose.Types.ObjectId();
    const projectId = new mongoose.Types.ObjectId();
    const certId = new mongoose.Types.ObjectId();

    it('builds verified evaluation payload when portfolio and records are verified', async () => {
      const mockPortfolio = {
        _id: portfolioId,
        student: studentId,
        workspace: workspaceId,
        verifiedBy: facultyId,
        verificationHash: 'valid_sha256_hash',
        skillsVerified: ['React', 'Node.js', 'Python'],
      };

      const mockProject = {
        _id: projectId,
        userId: studentId,
        title: 'VidyaLink Platform',
        technologies: ['React', 'Node.js'],
        category: 'Web Development',
      };

      const mockCert = {
        _id: certId,
        userId: studentId,
        title: 'AWS Certified Developer',
        issuer: 'Amazon Web Services',
        issueDate: new Date('2025-01-01'),
      };

      const mockSummary = {
        studentId,
        latestVerifications: [
          { targetType: 'PROJECT', targetId: projectId, status: 'VERIFIED' },
          { targetType: 'CERTIFICATE', targetId: certId, status: 'VERIFIED' },
        ],
      };

      vi.spyOn(Portfolio, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(mockPortfolio),
        }),
      });
      vi.spyOn(Project, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockProject]),
      });
      vi.spyOn(Certificate, 'find').mockReturnValue({
        lean: vi.fn().mockResolvedValue([mockCert]),
      });
      vi.spyOn(Resume, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      vi.spyOn(GitHubAccount, 'findOne').mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      });
      vi.spyOn(verificationService, 'getStudentVerificationSummary').mockResolvedValue(mockSummary);

      const payload = await aiService.buildVerifiedEvaluationPayload(studentId, portfolioId);

      expect(payload).toBeDefined();
      expect(payload.studentId).toBe(String(studentId));
      expect(payload.portfolioId).toBe(String(portfolioId));
      expect(payload.verificationStatus).toBe('VERIFIED');
      expect(payload.projects).toHaveLength(1);
      expect(payload.projects[0].title).toBe('VidyaLink Platform');
      expect(payload.certificates).toHaveLength(1);
      expect(payload.certificates[0].title).toBe('AWS Certified Developer');
      expect(payload.skills).toEqual(['React', 'Node.js', 'Python']);
    });

    it('rejects unverified portfolio without verifiedBy or verificationHash', async () => {
      const unverifiedPortfolio = {
        _id: portfolioId,
        student: studentId,
        workspace: workspaceId,
        verifiedBy: null,
        verificationHash: null,
      };

      vi.spyOn(Portfolio, 'findOne').mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockResolvedValue(unverifiedPortfolio),
        }),
      });

      await expect(
        aiService.buildVerifiedEvaluationPayload(studentId, portfolioId)
      ).rejects.toThrowError(
        expect.objectContaining({
          statusCode: 400,
          message: 'Portfolio has not been verified yet',
        })
      );
    });
  });
});
