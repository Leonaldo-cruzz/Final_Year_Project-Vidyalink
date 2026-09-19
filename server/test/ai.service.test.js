import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

process.env.JWT_SECRET ||= 'test-jwt-secret-test-jwt-secret-test';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-test-refresh-secret';
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/vidyalink-test';
process.env.AI_PROVIDER ||= 'deterministic';

const {
  AIServiceClient,
} = await import('../src/services/ai.service.js');
const { AIIntegrationService } = await import('../src/services/aiIntegration.service.js');

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const response = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

const portfolioResponse = {
  overall_score: 82,
  category: 'Very Good',
  component_scores: {
    complexity: 80,
    technology_stack: 85,
    github_activity: 75,
    documentation_quality: 80,
    innovation: 80,
    code_quality: 85,
  },
  weighted_breakdown: {
    complexity: 20,
    technology_stack: 17,
    github_activity: 11.25,
    documentation_quality: 12,
    innovation: 12,
    code_quality: 8.5,
  },
  evidence: { complexity: ['verified project description'] },
  strengths: ['Verified project evidence was supplied.'],
  improvements: ['Add more documentation evidence.'],
  data_completeness: { verified_projects: 1 },
};

test('AI health success is reported without exposing configuration', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, 'http://ai.test/health');
    return response({ status: 'ok', service: 'vidyalink-ai' });
  };

  const result = await new AIServiceClient({ baseUrl: 'http://ai.test' }).health();
  assert.deepEqual(result, {
    available: true,
    data: { status: 'ok', service: 'vidyalink-ai' },
  });
});

test('AI unavailable is graceful and does not throw from health check', async () => {
  globalThis.fetch = async () => {
    throw new Error('connection refused');
  };

  const result = await new AIServiceClient({ baseUrl: 'http://ai.test' }).health();
  assert.equal(result.available, false);
  assert.equal(result.statusCode, 503);
});

test('portfolio response is validated and accepted when shaped correctly', async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.method, 'POST');
    assert.equal(JSON.parse(options.body).projects.length, 1);
    return response(portfolioResponse);
  };

  const result = await new AIServiceClient({ baseUrl: 'http://ai.test' }).evaluatePortfolio({
    projects: [{ title: 'Verified project', verified: true }],
  });
  assert.equal(result.overall_score, 82);
  assert.equal(result.category, 'Very Good');
});

test('malformed AI response is rejected before persistence can occur', async () => {
  globalThis.fetch = async () => response({ overall_score: 140 }, 200);

  await assert.rejects(
    () => new AIServiceClient({ baseUrl: 'http://ai.test' }).evaluatePortfolio({}),
    (error) => error.statusCode === 502 && error.message.includes('invalid')
  );
});

test('AI timeout is mapped to a bounded gateway timeout', async () => {
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });

  await assert.rejects(
    () => new AIServiceClient({ baseUrl: 'http://ai.test', timeoutMs: 5 }).evaluatePortfolio({}),
    (error) => error.statusCode === 504
  );
});

test('ATS, skill, GitHub, readiness, and recommendation responses are validated', async () => {
  const validResponses = {
    '/api/v1/ats/analyze': {
      ats_score: 70, keyword_match_score: 70, skills_score: 70, education_score: 70, experience_score: 70,
      section_completeness: {}, missing_keywords: [], suggestions: [], detected_skills: [],
    },
    '/api/v1/skills/extract': { detected_skills: [], skill_sources: {} },
    '/api/v1/skills/gap': { required_skills: [], matched_skills: [], missing_skills: [], recommendations: [], coverage_percentage: 0 },
    '/api/v1/github/analyze': { factual_metrics: {}, derived_activity_score: 0, observations: [] },
    '/api/v1/portfolio/readiness': { readiness_score: 0, category: 'Insufficient Evidence', component_scores: {}, strengths: [], gaps: [], next_steps: [] },
    '/api/v1/recommendations': { alumni_mentors: [], recruiter_opportunities: [], skills_to_develop: [], notes: [] },
  };
  globalThis.fetch = async (url) => response(validResponses[new URL(url).pathname]);

  const client = new AIServiceClient({ baseUrl: 'http://ai.test' });
  assert.equal((await client.analyzeATS({})).ats_score, 70);
  assert.deepEqual((await client.extractSkills({})).detected_skills, []);
  assert.equal((await client.analyzeSkillGap({})).coverage_percentage, 0);
  assert.equal((await client.analyzeGithub({})).derived_activity_score, 0);
  assert.equal((await client.calculateReadiness({})).category, 'Insufficient Evidence');
  assert.deepEqual((await client.getRecommendations({})).notes, []);
});

test('upstream HTTP failures are converted to a non-successful Node error', async () => {
  globalThis.fetch = async () => response({ detail: 'invalid request' }, 422);

  await assert.rejects(
    () => new AIServiceClient({ baseUrl: 'http://ai.test' }).analyzeATS({}),
    (error) => error.statusCode === 502
  );
});

test('malformed JSON from FastAPI is rejected', async () => {
  globalThis.fetch = async () => new Response('not-json', { status: 200 });

  await assert.rejects(
    () => new AIServiceClient({ baseUrl: 'http://ai.test' }).extractSkills({}),
    (error) => error.statusCode === 502
  );
});

test('student ownership is checked before resolving another portfolio', async () => {
  const service = new AIIntegrationService();
  await assert.rejects(
    () => service.resolveTarget(
      { role: 'student', _id: '507f1f77bcf86cd799439011' },
      { studentId: '507f1f77bcf86cd799439012' }
    ),
    (error) => error.statusCode === 403
  );
});

test('portfolio evaluation stops with insufficient evidence without calling FastAPI', async () => {
  let called = false;
  const service = new AIIntegrationService({
    client: { evaluatePortfolio: async () => { called = true; } },
  });
  service.resolvePortfolio = async () => null;

  const result = await service.evaluatePortfolio({ role: 'student', _id: 'student-1' });
  assert.deepEqual(result, {
    status: 'insufficient_evidence',
    reason: 'No faculty-verified portfolio is available.',
  });
  assert.equal(called, false);
});

test('successful evaluation persistence maps the stored result for the API', async () => {
  const service = new AIIntegrationService({
    client: { evaluatePortfolio: async () => portfolioResponse },
  });
  const portfolio = { _id: 'portfolio-1', student: 'student-1', verifiedBy: 'faculty-1', verificationHash: 'hash' };
  service.resolvePortfolio = async () => portfolio;
  service.buildPortfolioPayload = async () => ({
    payload: { projects: [{ title: 'Verified', verified: true }] },
    project: { title: 'Verified' },
  });
  service.storePortfolioEvaluation = async () => ({
    _id: 'evaluation-1',
    studentId: 'student-1',
    portfolioId: 'portfolio-1',
    overallScore: 82,
    category: 'Very Good',
    componentScores: portfolioResponse.component_scores,
    weightedBreakdown: portfolioResponse.weighted_breakdown,
    evidence: portfolioResponse.evidence,
    strengths: portfolioResponse.strengths,
    improvements: portfolioResponse.improvements,
    dataCompleteness: portfolioResponse.data_completeness,
    evidenceStatus: 'sufficient',
    provider: 'deterministic',
    model: 'deterministic-heuristics',
    version: '1.0.0',
  });

  const result = await service.evaluatePortfolio({ role: 'student', _id: 'student-1' }, 'portfolio-1');
  assert.equal(result.status, 'evaluated');
  assert.equal(result.evaluation.overallScore, 82);
  assert.equal(result.evaluation.category, 'Very Good');
});

test('portfolio persistence writes only the validated AI response fields', async () => {
  let saved;
  const service = new AIIntegrationService({
    models: {
      AIEvaluation: {
        create: async (data) => { saved = data; return data; },
      },
    },
  });
  await service.storePortfolioEvaluation({
    portfolio: { _id: 'portfolio-1' },
    studentId: 'student-1',
    result: portfolioResponse,
  });
  assert.equal(saved.overallScore, 82);
  assert.equal(saved.provider, 'deterministic');
  assert.equal(Object.hasOwn(saved, 'apiKey'), false);
});
