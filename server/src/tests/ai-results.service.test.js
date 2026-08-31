import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import Portfolio from '../models/portfolio.model.js';
import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import GitHubAnalytics from '../models/githubAnalytics.model.js';
import IndustryReadinessEvaluation from '../models/industryReadinessEvaluation.model.js';
import PortfolioEvaluation from '../models/portfolioEvaluation.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Recommendation from '../models/recommendation.model.js';
import Resume from '../models/resume.model.js';
import ResumeEvaluation from '../models/resumeEvaluation.model.js';
import SkillGapAnalysis from '../models/skillGapAnalysis.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import StudentSkillProfile from '../models/studentSkillProfile.model.js';
import aiResultsService, { isEvaluationStale, sanitizeBreakdown } from '../services/aiResults.service.js';

const studentId = 'student-1';
const portfolioId = 'portfolio-1';
const evaluatedAt = new Date('2026-01-01T00:00:00.000Z');

const setupEmptyModels = () => {
  mock.method(Portfolio, 'find', async () => []);
  for (const Model of [Profile, StudentProfile, Resume, Project, Certificate, GitHubAccount]) {
    mock.method(Model, 'findOne', async () => null);
  }
  for (const Model of [Project, Certificate, Recommendation]) {
    mock.method(Model, 'find', async () => []);
  }
  mock.method(GitHubAnalytics, 'findOne', async () => null);
  mock.method(PortfolioEvaluation, 'findOne', async () => null);
  mock.method(ResumeEvaluation, 'findOne', async () => null);
  mock.method(StudentSkillProfile, 'findOne', async () => null);
  mock.method(SkillGapAnalysis, 'findOne', async () => null);
  mock.method(IndustryReadinessEvaluation, 'findOne', async () => null);
};

afterEach(() => mock.restoreAll());

test('stale detection compares persisted evaluation time with source updates', () => {
  assert.equal(isEvaluationStale({ evaluatedAt }, [{ updatedAt: new Date('2026-01-02T00:00:00.000Z') }]), true);
  assert.equal(isEvaluationStale({ evaluatedAt }, [{ updatedAt: new Date('2025-12-31T00:00:00.000Z') }]), false);
});

test('summary returns partial persisted results without leaking private breakdown fields', async () => {
  setupEmptyModels();
  mock.method(Portfolio, 'findOne', async () => ({
    _id: portfolioId,
    student: studentId,
    verifiedBy: 'faculty-1',
    verificationHash: 'hash',
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    skillsVerified: ['React'],
  }));
  mock.method(PortfolioEvaluation, 'findOne', async () => ({
    portfolioScore: 84,
    category: 'Very Good',
    scoringVersion: '1.0',
    evaluatedAt,
    breakdown: { quality: { score: 84 }, rawResumeText: 'must not leave the service' },
  }));

  const summary = await aiResultsService.getPortfolioAISummary(studentId, portfolioId);

  assert.equal(summary.portfolioScore.score, 84);
  assert.equal(summary.portfolioScore.isStale, true);
  assert.equal(summary.atsScore, null);
  assert.deepEqual(summary.skills, []);
  assert.equal(summary.recommendations.length, 0);
  assert.equal('rawResumeText' in summary.portfolioScore.breakdown, false);
  assert.equal('privateApiKey' in sanitizeBreakdown({ privateApiKey: 'x', score: 1 }), false);
});

test('student portfolio selector is ownership-scoped', async () => {
  setupEmptyModels();
  mock.method(Portfolio, 'findOne', async () => null);

  await assert.rejects(
    () => aiResultsService.getPortfolioAISummary(studentId, 'another-portfolio'),
    (error) => error.statusCode === 404
  );
});

test('recruiter summary requires an explicitly public verified portfolio and strips breakdowns', async () => {
  setupEmptyModels();
  mock.method(Portfolio, 'findOne', async () => ({
    _id: portfolioId,
    student: studentId,
    verifiedBy: 'faculty-1',
    verificationHash: 'hash',
    isPublic: true,
    skillsVerified: ['React'],
  }));
  mock.method(Portfolio, 'find', async () => [{
    _id: portfolioId,
    student: studentId,
    verifiedBy: 'faculty-1',
    verificationHash: 'hash',
    isPublic: true,
    skillsVerified: ['React'],
  }]);
  mock.method(PortfolioEvaluation, 'findOne', async () => ({
    portfolioScore: 91,
    category: 'Excellent',
    scoringVersion: '1.0',
    evaluatedAt,
    breakdown: { hiddenImplementationDetail: { score: 91 } },
  }));

  const summary = await aiResultsService.getRecruiterAISummary(studentId);

  assert.equal(summary.portfolioScore.score, 91);
  assert.equal(summary.portfolioScore.breakdown, undefined);
  assert.deepEqual(summary.verifiedSkills, ['React']);
  assert.equal(summary.atsScore, null);
  assert.equal(summary.githubAnalyticsSummary, null);
});

test('private portfolios are not available through the recruiter projection', async () => {
  setupEmptyModels();
  mock.method(Portfolio, 'findOne', async () => ({
    _id: portfolioId,
    student: studentId,
    verifiedBy: 'faculty-1',
    verificationHash: 'hash',
    isPublic: false,
  }));
  mock.method(Portfolio, 'find', async () => [{
    _id: portfolioId,
    student: studentId,
    verifiedBy: 'faculty-1',
    verificationHash: 'hash',
    isPublic: false,
  }]);

  await assert.rejects(
    () => aiResultsService.getRecruiterAISummary(studentId),
    (error) => error.statusCode === 404
  );
});

