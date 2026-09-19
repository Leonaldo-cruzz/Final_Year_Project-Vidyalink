import assert from 'node:assert/strict';
import test from 'node:test';

import { AIOrchestratorService } from '../src/services/aiOrchestrator.service.js';

const portfolio = { _id: 'portfolio-1', student: 'student-1' };
const makeQuery = (resolveValue) => ({ sort: async () => resolveValue });

const createHarness = ({ source = {}, failStages = [] } = {}) => {
  const evaluations = [];
  const analyses = [];
  let currentHash = source.contentHash || 'hash-1';
  let evaluationCalls = 0;

  const models = {
    AIEvaluation: {
      findOne: (filter) => makeQuery([...evaluations]
        .filter((item) => !filter.portfolioId || item.portfolioId === filter.portfolioId)
        .sort((left, right) => (right.evaluationVersion || 0) - (left.evaluationVersion || 0))[0] || null),
      find: (filter) => makeQuery([...evaluations]
        .filter((item) => item.portfolioId === filter.portfolioId)
        .sort((left, right) => (right.evaluationVersion || 0) - (left.evaluationVersion || 0))),
      findByIdAndUpdate: async (id, update) => {
        const item = evaluations.find((evaluation) => evaluation._id === id);
        if (item) Object.assign(item, update);
        return item;
      },
    },
    AIAnalysis: {
      findOne: (filter) => makeQuery([...analyses]
        .filter((item) => Object.entries(filter).every(([key, value]) => item[key] === value))
        .sort((left, right) => (right.evaluationVersion || 0) - (left.evaluationVersion || 0))[0] || null),
    },
  };

  const addAnalysis = (analysisType, metadata, result) => analyses.push({
    _id: `${analysisType}-${metadata.evaluationVersion}`,
    studentId: 'student-1',
    portfolioId: 'portfolio-1',
    analysisType,
    result,
    ...metadata,
  });

  const integration = {
    resolvePortfolio: async () => portfolio,
    getPortfolioSourceFingerprint: async () => ({
      contentHash: currentHash,
      sourceUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
      project: { _id: 'project-1' },
      payload: { projects: [{ verified: true }], ...(source.payload || {}) },
      context: source.context || {},
    }),
    evaluatePortfolio: async (_user, _portfolioId, options) => {
      evaluationCalls += 1;
      const evaluation = {
        _id: `evaluation-${evaluationCalls}`,
        id: `evaluation-${evaluationCalls}`,
        studentId: 'student-1',
        portfolioId: 'portfolio-1',
        overallScore: 84,
        category: 'Very Good',
        componentScores: {},
        weightedBreakdown: {},
        evidence: {},
        strengths: ['Verified project evidence'],
        improvements: [],
        dataCompleteness: {},
        evaluationVersion: evaluationCalls,
        contentHash: currentHash,
        sourceUpdatedAt: options.preparedSource.sourceUpdatedAt,
        evaluationStatus: 'COMPLETED',
        createdAt: new Date(`2026-01-0${evaluationCalls}T00:00:00.000Z`),
        updatedAt: new Date(`2026-01-0${evaluationCalls}T00:00:00.000Z`),
      };
      evaluations.push(evaluation);
      return { status: 'evaluated', evaluation };
    },
  };

  for (const stage of ['extractSkills', 'analyzeGithub', 'analyzeATS', 'analyzeSkillGap', 'calculateReadiness', 'getRecommendations']) {
    integration[stage] = async (_user, _body, metadata) => {
      if (failStages.includes(stage)) throw new Error(`${stage} failed`);
      const type = {
        extractSkills: 'skills_extract', analyzeGithub: 'github', analyzeATS: 'ats',
        analyzeSkillGap: 'skills_gap', calculateReadiness: 'readiness', getRecommendations: 'recommendations',
      }[stage];
      const result = type === 'skills_extract'
        ? { detected_skills: ['JavaScript'] }
        : type === 'skills_gap'
          ? { coverage_percentage: 75, missing_skills: ['Python'] }
          : type === 'readiness'
            ? { readiness_score: 76, category: 'Good' }
            : type === 'ats'
              ? { ats_score: 72 }
              : type === 'github'
                ? { derived_activity_score: 68 }
                : { alumni_mentors: [], recruiter_opportunities: [] };
      addAnalysis(type, metadata, result);
      return { status: 'analyzed' };
    };
  }

  return {
    service: new AIOrchestratorService({ integration, models }),
    setHash: (value) => { currentHash = value; },
    getEvaluationCalls: () => evaluationCalls,
  };
};

const fullSource = {
  context: { github: { connectionStatus: 'Connected' } },
  payload: { resume: { text: 'Resume text' } },
};

test('complete verified pipeline produces one unified completed profile', async () => {
  const harness = createHarness({ source: fullSource });
  const result = await harness.service.evaluate(
    { role: 'student', _id: 'student-1' },
    { portfolioId: 'portfolio-1', force: true, targetRole: 'Software Engineer', requiredSkills: ['Python'] },
  );
  assert.equal(result.status, 'COMPLETED');
  assert.equal(result.evaluation.overallScore, 84);
  assert.equal(result.readiness.readiness_score, 76);
  assert.deepEqual(result.skills.detected_skills, ['JavaScript']);
  assert.equal(result.dataCompleteness.missingComponents.length, 0);
  assert.equal(harness.getEvaluationCalls(), 1);
});

test('missing GitHub and resume produce an honest partial result without fabricated sections', async () => {
  const harness = createHarness({ source: {} });
  const result = await harness.service.evaluate(
    { role: 'student', _id: 'student-1' },
    { portfolioId: 'portfolio-1', force: true, targetRole: 'Software Engineer', requiredSkills: ['Python'] },
  );
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.github, null);
  assert.equal(result.ats, null);
  assert.equal(result.componentStatus.github.status, 'unavailable');
  assert.equal(result.componentStatus.ats.status, 'unavailable');
  assert.equal(result.evaluation.overallScore, 84);
});

test('no verified portfolio returns insufficient evidence and does not call AI', async () => {
  const harness = createHarness();
  harness.service.integration.resolvePortfolio = async () => null;
  const result = await harness.service.evaluate({ role: 'student', _id: 'student-1' });
  assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(harness.getEvaluationCalls(), 0);
});

test('identical source versions are deduplicated, while explicit re-evaluation creates history', async () => {
  const harness = createHarness({ source: fullSource });
  const user = { role: 'student', _id: 'student-1' };
  await harness.service.evaluate(user, { portfolioId: 'portfolio-1', force: true, targetRole: 'Engineer', requiredSkills: ['Python'] });
  const deduplicated = await harness.service.evaluate(user, { portfolioId: 'portfolio-1', targetRole: 'Engineer', requiredSkills: ['Python'] });
  assert.equal(deduplicated.evaluationVersion, 1);
  assert.equal(harness.getEvaluationCalls(), 1);
  const reevaluated = await harness.service.evaluate(user, { portfolioId: 'portfolio-1', force: true, targetRole: 'Engineer', requiredSkills: ['Python'] });
  assert.equal(reevaluated.evaluationVersion, 2);
  assert.equal(harness.getEvaluationCalls(), 2);
  const history = await harness.service.getResults(user, { portfolioId: 'portfolio-1' });
  assert.equal(history.history.length, 2);
});

test('source changes are reported as stale before another evaluation runs', async () => {
  const harness = createHarness({ source: fullSource });
  const user = { role: 'student', _id: 'student-1' };
  await harness.service.evaluate(user, { portfolioId: 'portfolio-1', force: true, targetRole: 'Engineer', requiredSkills: ['Python'] });
  harness.setHash('hash-2');
  const result = await harness.service.getLatestResult(user, { portfolioId: 'portfolio-1' });
  assert.equal(result.status, 'STALE');
  assert.equal(result.stale, true);
});

test('component failures preserve the portfolio evaluation and mark the pipeline partial', async () => {
  const harness = createHarness({ source: fullSource, failStages: ['analyzeGithub'] });
  const result = await harness.service.evaluate(
    { role: 'student', _id: 'student-1' },
    { portfolioId: 'portfolio-1', force: true, targetRole: 'Engineer', requiredSkills: ['Python'] },
  );
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.evaluation.overallScore, 84);
  assert.equal(result.github, null);
  assert.equal(result.componentStatus.github.status, 'failed');
});

test('getHistory returns formatted evaluation versions with readiness score', async () => {
  const harness = createHarness({ source: fullSource });
  const user = { role: 'student', _id: 'student-1' };
  await harness.service.evaluate(user, { portfolioId: 'portfolio-1', force: true, targetRole: 'Engineer', requiredSkills: ['Python'] });
  harness.setHash('hash-2');
  await harness.service.evaluate(user, { portfolioId: 'portfolio-1', force: true, targetRole: 'Engineer', requiredSkills: ['Python'] });

  const history = await harness.service.getHistory(user, { portfolioId: 'portfolio-1' });
  assert.equal(Array.isArray(history), true);
  assert.equal(history.length, 2);
  assert.equal(history[0].evaluationVersion, 2);
  assert.equal(history[1].evaluationVersion, 1);
  assert.equal(history[0].status, 'COMPLETED');
  assert.equal(history[0].overallScore, 84);
  assert.equal(history[0].readinessScore, 76);
});

