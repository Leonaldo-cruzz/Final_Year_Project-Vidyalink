/**
 * Unit tests for AIService.
 */

/* global global, process */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.JWT_SECRET = 'test-jwt-secret-for-vitest-32chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-vitest-32chars';
process.env.MONGODB_URI = 'mongodb://localhost:27017/vidyalink-test';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.AI_SERVICE_TIMEOUT_MS = '5000';

vi.mock('../src/models/portfolio.model.js', () => ({
  default: { findOne: vi.fn() },
}));

vi.mock('../src/models/project.model.js', () => ({
  default: { find: vi.fn() },
}));

vi.mock('../src/models/certificate.model.js', () => ({
  default: { find: vi.fn() },
}));

vi.mock('../src/models/resume.model.js', () => ({
  default: { findOne: vi.fn() },
}));

vi.mock('../src/models/githubAccount.model.js', () => ({
  default: { findOne: vi.fn() },
}));

vi.mock('../src/models/githubAnalytics.model.js', () => ({
  default: { findOne: vi.fn() },
}));

vi.mock('../src/models/portfolioEvaluation.model.js', () => ({
  default: { create: vi.fn() },
}));

vi.mock('../src/models/resumeEvaluation.model.js', () => ({
  default: { create: vi.fn() },
}));

vi.mock('../src/middleware/resumeUpload.middleware.js', () => ({
  RESUME_DIRECTORY: '/tmp/test-resumes',
  RESUME_PUBLIC_PATH: '/uploads/resumes/',
  default: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
  },
}));

const { AIService } = await import('../src/services/ai.service.js');
const Resume = (await import('../src/models/resume.model.js')).default;
const ResumeEvaluation = (await import('../src/models/resumeEvaluation.model.js')).default;

const mockATSResponse = {
  success: true,
  data: {
    atsScore: 78.5,
    category: 'Good',
    breakdown: {
      keywordMatching: { score: 75, weight: 30, weightedScore: 22.5, evidence: [], explanation: '' },
      formatting: { score: 80, weight: 20, weightedScore: 16.0, evidence: [], explanation: '' },
      technicalSkills: { score: 85, weight: 25, weightedScore: 21.25, evidence: [], explanation: '' },
      experience: { score: 70, weight: 15, weightedScore: 10.5, evidence: [], explanation: '' },
      education: { score: 85, weight: 10, weightedScore: 8.5, evidence: [], explanation: '' },
    },
    matchedSkills: ['python', 'react'],
    missingSkills: ['kubernetes'],
    missingKeywords: [],
    recommendations: ['Add quantifiable metrics'],
    scoringVersion: '1.0',
    evaluatedAt: '2026-08-27T00:00:00Z',
  },
};

const mockPortfolioScoreResponse = {
  success: true,
  data: {
    portfolioScore: 82.5,
    category: 'Very Good',
    breakdown: {
      projectComplexity: { score: 90, weight: 25, weightedScore: 22.5, evidence: [], explanation: '' },
      technologyStack: { score: 85, weight: 20, weightedScore: 17.0, evidence: [], explanation: '' },
      githubActivity: { score: 75, weight: 15, weightedScore: 11.25, evidence: [], explanation: '' },
      documentationQuality: { score: 80, weight: 15, weightedScore: 12.0, evidence: [], explanation: '' },
      innovation: { score: 75, weight: 15, weightedScore: 11.25, evidence: [], explanation: '' },
      codeQuality: { score: 85, weight: 10, weightedScore: 8.5, evidence: [], explanation: '' },
    },
    version: '1.0',
    evaluatedAt: '2026-08-27T00:00:00Z',
  },
};

describe('AIService - Configuration', () => {
  it('uses AI_SERVICE_URL from environment', () => {
    const service = new AIService();
    expect(service.baseUrl).toBe('http://localhost:8000');
  });

  it('uses AI_SERVICE_TIMEOUT_MS from environment', () => {
    const service = new AIService();
    expect(service.timeoutMs).toBe(5000);
  });
});

describe('AIService - evaluatePortfolio() input validation', () => {
  let service;

  beforeEach(() => {
    service = new AIService();
  });

  it('throws ApiError 400 for null payload', async () => {
    await expect(service.evaluatePortfolio(null)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws ApiError 400 for missing studentId', async () => {
    await expect(service.evaluatePortfolio({ portfolioId: 'p1', verificationStatus: 'VERIFIED' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws ApiError 400 for unverified status', async () => {
    await expect(service.evaluatePortfolio({
      studentId: 's1',
      portfolioId: 'p1',
      verificationStatus: 'PENDING',
    })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('AIService - evaluateResumeATS() input validation', () => {
  let service;

  beforeEach(() => {
    service = new AIService();
  });

  it('throws ApiError 400 for null payload', async () => {
    await expect(service.evaluateResumeATS(null)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws ApiError 400 for missing studentId', async () => {
    await expect(service.evaluateResumeATS({
      portfolioId: 'p1',
      verificationStatus: 'VERIFIED',
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('calls fetch with correct endpoint when payload is valid', async () => {
    service = new AIService();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockATSResponse,
    });

    const result = await service.evaluateResumeATS({
      studentId: 'student-123',
      portfolioId: 'portfolio-456',
      verificationStatus: 'VERIFIED',
      resume: { text: 'Resume text here' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/evaluation/resume/ats'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result.success).toBe(true);
    expect(result.data.atsScore).toBe(78.5);
  });
});

describe('AIService - scorePortfolio() fetch behavior', () => {
  let service;

  beforeEach(() => {
    service = new AIService();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockPortfolioScoreResponse,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /api/v1/evaluation/portfolio/score endpoint', async () => {
    await service.scorePortfolio({
      studentId: 's1',
      portfolioId: 'p1',
      verificationStatus: 'VERIFIED',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/evaluation/portfolio/score'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('returns the AI service response', async () => {
    const result = await service.scorePortfolio({
      studentId: 's1',
      portfolioId: 'p1',
      verificationStatus: 'VERIFIED',
    });
    expect(result.data.portfolioScore).toBe(82.5);
    expect(result.data.category).toBe('Very Good');
  });
});

describe('AIService - evaluateVerifiedStudentResume() integration', () => {
  let service;

  beforeEach(() => {
    service = new AIService();

    Resume.findOne.mockResolvedValue({
      _id: 'resume-id-001',
      userId: 'student-abc',
      originalFileName: 'resume.pdf',
      storedFileName: 'resume-001.pdf',
      mimeType: 'application/pdf',
    });

    ResumeEvaluation.create.mockResolvedValue({
      _id: 'eval-id-001',
      atsScore: 78.5,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockATSResponse,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('throws ApiError 404 when no resume record found', async () => {
    Resume.findOne.mockResolvedValue(null);
    await expect(service.evaluateVerifiedStudentResume('student-xyz')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('calls ATS endpoint and returns ats score', async () => {
    const result = await service.evaluateVerifiedStudentResume('student-abc');
    expect(result.data.atsScore).toBe(78.5);
    expect(result.data.category).toBe('Good');
  });

  it('persists result in ResumeEvaluation collection', async () => {
    await service.evaluateVerifiedStudentResume('student-abc');
    expect(ResumeEvaluation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        atsScore: 78.5,
        category: 'Good',
        scoringVersion: '1.0',
      })
    );
  });
});
