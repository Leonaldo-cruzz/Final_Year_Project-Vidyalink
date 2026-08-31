import assert from 'node:assert/strict';
import test from 'node:test';

import { AIService } from '../services/ai.service.js';
import IndustryReadinessEvaluation from '../models/industryReadinessEvaluation.model.js';

const dimension = {
  score: 80,
  weight: 10,
  weightedScore: 8,
  evidence: ['verified evidence'],
  explanation: 'deterministic test dimension',
};

const response = {
  success: true,
  data: {
    industryReadinessScore: 80,
    category: 'Industry Ready',
    breakdown: {
      portfolioQuality: { ...dimension, weight: 30, weightedScore: 24 },
      technicalSkillProfile: { ...dimension, weight: 20, weightedScore: 16 },
      githubEvidence: { ...dimension, weight: 15, weightedScore: 12 },
      atsReadiness: { ...dimension, weight: 15, weightedScore: 12 },
      verifiedAchievements: dimension,
      careerAlignment: dimension,
    },
    strengths: [],
    gaps: [],
    topRecommendations: [{ entityId: 'existing-recommendation', priority: 'HIGH' }],
    scoringVersion: '1.0',
    generatedAt: '2026-08-27T00:00:00.000Z',
    sourceVersions: {
      portfolioEvaluationVersion: '1.0',
      atsEvaluationVersion: '1.0',
      githubAnalyticsVersion: '1.0',
      skillProfileVersion: '1.0',
      skillGapAnalysisVersion: '1.0',
    },
  },
};

const validPayload = {
  studentId: 'student-id',
  portfolioId: 'portfolio-id',
  verificationStatus: 'VERIFIED',
  portfolioEvaluation: { portfolioScore: 80, breakdown: {} },
  atsEvaluation: { atsScore: 80, breakdown: {} },
  githubAnalytics: {},
  skillProfile: { skills: [] },
  skillGapAnalysis: {},
  recommendations: [{ entityId: 'existing-recommendation', priority: 'HIGH' }],
};

test('calculateIndustryReadiness forwards a server-built verified snapshot and validates response', async () => {
  const previousFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return { ok: true, json: async () => response };
  };

  try {
    const result = await new AIService().calculateIndustryReadiness(validPayload);
    assert.equal(result.data.industryReadinessScore, 80);
    assert.equal(requestBody.verificationStatus, 'VERIFIED');
    assert.equal(requestBody.portfolioEvaluation.portfolioScore, 80);
    assert.equal(requestBody.industryReadinessScore, undefined);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('calculateIndustryReadiness rejects unverified or client-style payloads', async () => {
  await assert.rejects(
    () => new AIService().calculateIndustryReadiness({ ...validPayload, verificationStatus: 'PENDING' }),
    (error) => error.statusCode === 400
  );
});

test('cache freshness detects changed source evidence', async () => {
  const service = new AIService();
  const cached = {
    scoringVersion: '1.0',
    generatedAt: '2026-08-27T01:00:00.000Z',
    portfolioEvaluationVersion: '1.0',
    atsEvaluationVersion: '1.0',
    githubAnalyticsVersion: null,
    skillProfileVersion: null,
    skillGapAnalysisVersion: null,
  };
  const currentVersions = {
    portfolioEvaluationVersion: '1.0',
    atsEvaluationVersion: '1.0',
    githubAnalyticsVersion: null,
    skillProfileVersion: null,
    skillGapAnalysisVersion: null,
  };
  assert.equal(await service.isCachedEvaluationFresh(cached, [{ updatedAt: '2026-08-27T00:00:00.000Z' }], currentVersions), true);
  assert.equal(await service.isCachedEvaluationFresh(cached, [{ updatedAt: '2026-08-27T02:00:00.000Z' }], currentVersions), false);
});

test('IndustryReadinessEvaluation has no uniqueness constraint that would overwrite history', () => {
  const historyIndex = IndustryReadinessEvaluation.schema.indexes()
    .find(([fields]) => fields.studentId === 1 && fields.portfolioId === 1);
  assert.equal(historyIndex?.[1]?.unique, undefined);
});

