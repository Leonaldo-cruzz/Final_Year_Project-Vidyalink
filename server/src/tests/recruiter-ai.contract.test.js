import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { candidateCompareSchema, candidateSearchSchema } from '../validators/candidate.validator.js';
import IndustryReadinessEvaluation from '../models/industryReadinessEvaluation.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Portfolio from '../models/portfolio.model.js';
import PortfolioEvaluation from '../models/portfolioEvaluation.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import ResumeEvaluation from '../models/resumeEvaluation.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import SkillGapAnalysis from '../models/skillGapAnalysis.model.js';
import User from '../models/user.model.js';
import aiResultsService from '../services/aiResults.service.js';
import candidateService from '../services/candidate.service.js';
import recruiterAIService from '../services/recruiterAI.service.js';

const publicPortfolio = {
  _id: 'portfolio-1',
  student: 'student-1',
  isPublic: true,
  verifiedBy: 'faculty-1',
  verificationHash: 'hash-1',
  skillsVerified: ['React', 'Node.js'],
};

const queryResult = (value) => ({
  select() { return this; },
  populate() { return this; },
  sort() { return this; },
  skip() { return this; },
  limit() { return this; },
  lean() { return Promise.resolve(value); },
});

afterEach(() => mock.restoreAll());

test('candidate search exposes the AI filter and sort contract', () => {
  const result = candidateSearchSchema.safeParse({
    query: {
      requiredSkills: 'React, Node.js',
      minIndustryReadiness: '70',
      maxIndustryReadiness: '95',
      minATSScore: '60',
      maxATSScore: '90',
      verifiedOnly: 'true',
      sortBy: 'industryReadiness',
    },
  });

  assert.equal(result.success, true);
  assert.equal(result.data.query.minIndustryReadiness, 70);
  assert.equal(result.data.query.maxATSScore, 90);
  assert.equal(result.data.query.verifiedOnly, true);
  assert.equal(result.data.query.sortBy, 'industryReadiness');
});

test('candidate comparison rejects more than five IDs', () => {
  const result = candidateCompareSchema.safeParse({
    query: {
      ids: [1, 2, 3, 4, 5, 6].map((_, index) => `507f1f77bcf86cd7994390${String(index + 1).padStart(2, '0')}`).join(','),
    },
  });

  assert.equal(result.success, false);
});

test('candidate signals use centralized portfolio verification and preserve missing scores', async () => {
  mock.method(PortfolioEvaluation, 'find', async () => [{
    studentId: 'student-1',
    portfolioId: 'portfolio-1',
    portfolioScore: 82,
    evaluatedAt: new Date('2026-01-02T00:00:00.000Z'),
  }]);
  mock.method(ResumeEvaluation, 'find', async () => []);
  mock.method(IndustryReadinessEvaluation, 'find', async () => [{
    studentId: 'student-1',
    portfolioId: 'portfolio-1',
    industryReadinessScore: 76,
    breakdown: { githubEvidence: { score: 64 } },
    generatedAt: new Date('2026-01-03T00:00:00.000Z'),
  }]);
  mock.method(SkillGapAnalysis, 'find', async () => []);

  const signals = await recruiterAIService.getCandidateSignals(
    ['student-1', 'student-2'],
    [publicPortfolio, { student: 'student-2', isPublic: true, verifiedBy: null, verificationHash: null }],
  );

  assert.equal(signals.get('student-1').portfolioScore, 82);
  assert.equal(signals.get('student-1').atsScore, null);
  assert.equal(signals.get('student-1').githubEvidenceScore, 64);
  assert.equal(signals.get('student-1').industryReadinessScore, 76);
  assert.equal(signals.get('student-2').portfolioScore, null);
  assert.equal(signals.get('student-2').industryReadinessScore, null);
});

test('candidate search filters and sorts persisted signals without converting missing scores to zero', async () => {
  const studentOne = '507f1f77bcf86cd799439011';
  const studentTwo = '507f1f77bcf86cd799439012';
  mock.method(Profile, 'find', () => queryResult([
    { _id: 'profile-1', user: { _id: studentOne, fullName: 'Asha', role: 'student', status: 'active' }, fullName: 'Asha', skills: ['React'], updatedAt: new Date('2026-01-01') },
    { _id: 'profile-2', user: { _id: studentTwo, fullName: 'Bina', role: 'student', status: 'active' }, fullName: 'Bina', skills: ['Python'], updatedAt: new Date('2026-01-02') },
  ]));
  mock.method(Project, 'find', () => queryResult([]));
  mock.method(GitHubAccount, 'find', () => queryResult([]));
  mock.method(Portfolio, 'find', () => queryResult([publicPortfolio]));
  mock.method(recruiterAIService, 'getCandidateSignals', async () => new Map([
    [studentOne, { portfolioScore: 82, atsScore: 70, githubEvidenceScore: 64, industryReadinessScore: 91, verifiedSkills: ['React'], skillGaps: null, topStrengths: ['Strong evidence'] }],
    [studentTwo, { portfolioScore: null, atsScore: null, githubEvidenceScore: null, industryReadinessScore: null, verifiedSkills: [], skillGaps: null, topStrengths: [] }],
  ]));

  const result = await candidateService.searchCandidates({
    minIndustryReadiness: 75,
    requiredSkills: 'React',
    sortBy: 'industryReadiness',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
  });

  assert.equal(result.pagination.total, 1);
  assert.equal(result.candidates[0].studentId, studentOne);
  assert.equal(result.candidates[0].atsScore, 70);
  assert.equal(result.candidates[0].githubEvidenceScore, 64);
  assert.equal(result.candidates[0].portfolioScore, 82);
});

test('candidate comparison returns public normalized fields only', async () => {
  const studentId = '507f1f77bcf86cd799439011';
  mock.method(User, 'find', () => queryResult([{ _id: studentId, fullName: 'Asha', role: 'student', status: 'active', password: 'private' }]));
  mock.method(Profile, 'find', () => queryResult([{ user: studentId, fullName: 'Asha', college: 'Vidya Institute', branch: 'CSE', graduationYear: 2027 }]));
  mock.method(StudentProfile, 'find', () => queryResult([{ user: studentId, experience: [{ company: 'Example', position: 'Engineer', description: 'private detail' }], education: [{ institution: 'Vidya Institute', degree: 'B.Tech' }] }]));
  mock.method(Project, 'find', () => queryResult([{ userId: studentId, title: 'Verified app' }]));
  mock.method(Portfolio, 'find', () => queryResult([publicPortfolio]));
  mock.method(recruiterAIService, 'getCandidateSignals', async () => new Map([[studentId, {
    portfolioScore: 82,
    atsScore: null,
    githubEvidenceScore: 64,
    industryReadinessScore: 76,
    verifiedSkills: ['React'],
    skillGaps: { missingRequiredSkills: ['Docker'] },
  }]]));

  const [candidate] = await candidateService.compareCandidates([studentId]);

  assert.equal(candidate.name, 'Asha');
  assert.equal(candidate.portfolioScore, 82);
  assert.equal(candidate.githubEvidence, 64);
  assert.equal(candidate.industryReadiness, 76);
  assert.deepEqual(candidate.verifiedProjects, ['Verified app']);
  assert.equal('password' in candidate, false);
  assert.equal(candidate.experience[0].description, undefined);
});

test('recruiter AI summary returns only the allowed projection', async () => {
  mock.method(Portfolio, 'find', async () => [publicPortfolio]);
  mock.method(aiResultsService, 'getPortfolioAISummary', async () => ({
    portfolioScore: { score: 82, evaluatedAt: '2026-01-02T00:00:00.000Z', isStale: false },
    atsScore: null,
    githubAnalytics: { repositoryCount: 3, commitCount: 20, isStale: false },
    skillGaps: { missingRequiredSkills: ['Docker'] },
    industryReadiness: { score: 76, strengths: ['Strong project evidence'], breakdown: { githubEvidence: { score: 64 } } },
    recommendations: [{ title: 'Add deployment evidence', target: 'private-target', reasons: ['Deploy the project'] }],
  }));

  const summary = await recruiterAIService.getCandidateAISummary('student-1');

  assert.deepEqual(Object.keys(summary).sort(), [
    'atsScore',
    'github',
    'industryReadiness',
    'metadata',
    'portfolioScore',
    'recommendations',
    'skillGaps',
    'strengths',
    'verifiedSkills',
  ].sort());
  assert.equal(summary.portfolioScore.score, 82);
  assert.equal(summary.atsScore, null);
  assert.deepEqual(summary.verifiedSkills, ['React', 'Node.js']);
  assert.equal(summary.metadata.isStale, false);
  assert.equal(summary.recommendations[0].target, undefined);
});

test('recruiter AI summary is unavailable without a public verified portfolio', async () => {
  mock.method(Portfolio, 'find', async () => [{ student: 'student-1', isPublic: true, verifiedBy: null, verificationHash: null }]);

  const summary = await recruiterAIService.getCandidateAISummary('student-1');

  assert.equal(summary, null);
});
