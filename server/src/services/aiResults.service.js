import ApiError from '../utils/ApiError.js';
import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import GitHubAnalytics from '../models/githubAnalytics.model.js';
import IndustryReadinessEvaluation from '../models/industryReadinessEvaluation.model.js';
import Portfolio from '../models/portfolio.model.js';
import PortfolioEvaluation from '../models/portfolioEvaluation.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Recommendation from '../models/recommendation.model.js';
import Resume from '../models/resume.model.js';
import ResumeEvaluation from '../models/resumeEvaluation.model.js';
import SkillGapAnalysis from '../models/skillGapAnalysis.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import StudentSkillProfile from '../models/studentSkillProfile.model.js';

const EVALUATION_SORT = {
  generatedAt: -1,
  evaluatedAt: -1,
  calculatedAt: -1,
  createdAt: -1,
};

const PRIVATE_KEY_PATTERN = /(raw|prompt|token|secret|password|credential|resume.?text|stored.?file|api.?key|^text$|^content$)/i;

const asDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const asIso = (value) => asDate(value)?.toISOString() || null;

const asId = (value) => (value?._id ? String(value._id) : String(value));

const execute = async (query) => {
  const leanQuery = query && typeof query.lean === 'function' ? query.lean() : query;
  return leanQuery && typeof leanQuery.then === 'function' ? leanQuery : Promise.resolve(leanQuery);
};

const findOne = async (Model, filter, sort = EVALUATION_SORT) => {
  let query = Model.findOne(filter);
  if (query && typeof query.sort === 'function') query = query.sort(sort);
  return execute(query);
};

const findMany = async (Model, filter, sort = EVALUATION_SORT) => {
  let query = Model.find(filter);
  if (query && typeof query.sort === 'function') query = query.sort(sort);
  const result = await execute(query);
  return Array.isArray(result) ? result : [];
};

const firstValue = (...values) => values.find((value) => value !== null && value !== undefined && value !== '') ?? null;

const evaluationTimestamp = (record) => asDate(
  firstValue(record?.evaluatedAt, record?.generatedAt, record?.calculatedAt, record?.createdAt)
);

const sourceTimestamp = (record) => {
  const dates = [record?.updatedAt, record?.lastSyncedAt, record?.createdAt]
    .map(asDate)
    .filter(Boolean);
  return dates.reduce((latest, date) => (!latest || date > latest ? date : latest), null);
};

const newestSourceTimestamp = (records = []) => records
  .map(sourceTimestamp)
  .filter(Boolean)
  .reduce((latest, date) => (!latest || date > latest ? date : latest), null);

export const isEvaluationStale = (record, sourceRecords = []) => {
  const evaluatedAt = evaluationTimestamp(record);
  const latestSource = newestSourceTimestamp(sourceRecords);
  return Boolean(evaluatedAt && latestSource && latestSource > evaluatedAt);
};

export const isValidScore = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;

const sanitizeValue = (value, depth = 0) => {
  if (depth > 4 || value === null || value === undefined) return value ?? null;
  if (typeof value === 'string') return value.slice(0, 500);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value !== 'object') return null;

  return Object.entries(value).reduce((safe, [key, child]) => {
    if (!PRIVATE_KEY_PATTERN.test(key)) safe[key] = sanitizeValue(child, depth + 1);
    return safe;
  }, {});
};

export const sanitizeBreakdown = (value) => sanitizeValue(value || {});

const getVersion = (record) => firstValue(
  record?.scoringVersion,
  record?.sourceVersion,
  record?.analyticsVersion,
  record?.analysisVersion,
  record?.algorithmVersion,
  record?.version
);

const withMetadata = (record, sourceRecords = [], extra = {}) => {
  const scoringVersion = getVersion(record);
  const sourceVersion = firstValue(record?.sourceVersion, record?.version, record?.analyticsVersion, scoringVersion);

  return {
    ...extra,
    evaluatedAt: asIso(evaluationTimestamp(record)),
    scoringVersion,
    sourceVersion,
    isStale: isEvaluationStale(record, sourceRecords),
  };
};

const isVerifiedPortfolio = (portfolio) => {
  if (!portfolio) return false;
  const status = portfolio.verificationStatus || portfolio.status;
  const statusIsVerified = !status || String(status).toLowerCase() === 'verified';
  return statusIsVerified && Boolean(portfolio.verifiedBy && portfolio.verificationHash);
};

const isPublicPortfolio = (portfolio) => Boolean(
  portfolio?.isPublic === true
  || portfolio?.aiResultsPublic === true
  || String(portfolio?.visibility || '').toLowerCase() === 'public'
);

const scoreFilter = (studentId, portfolioId, scoreField) => ({
  studentId,
  ...(portfolioId ? { portfolioId } : {}),
  [scoreField]: { $gte: 0, $lte: 100 },
});

const latestScore = async (Model, studentId, portfolioId, scoreField, allowUnscopedFallback = false) => {
  const matching = await findOne(Model, scoreFilter(studentId, portfolioId, scoreField));
  if (matching || !allowUnscopedFallback || !portfolioId) return matching;

  return findOne(Model, scoreFilter(studentId, null, scoreField));
};

const latestOptionalPortfolioRecord = async (Model, studentId, portfolioId) => {
  if (portfolioId) {
    const matching = await findOne(Model, { studentId, portfolioId });
    if (matching) return matching;
  }

  return findOne(Model, { studentId, ...(portfolioId ? { portfolioId: null } : {}) });
};

const latestRecommendations = async (studentId) => {
  const records = (await findMany(Recommendation, { studentId, status: 'ACTIVE' }))
    .filter((record) => record?.targetId && Array.isArray(record.reasons) && record.reasons.length > 0);
  if (records.length === 0) return [];

  const latestGeneratedAt = records
    .map((record) => evaluationTimestamp(record))
    .filter(Boolean)
    .reduce((latest, date) => (!latest || date > latest ? date : latest), null);

  return latestGeneratedAt
    ? records.filter((record) => evaluationTimestamp(record)?.getTime() === latestGeneratedAt.getTime())
    : records;
};

const loadPortfolio = async (studentId, portfolioId) => {
  if (portfolioId) {
    const portfolio = await findOne(Portfolio, { _id: portfolioId, student: studentId }, { updatedAt: -1, createdAt: -1 });
    if (!portfolio) throw ApiError.notFound('Portfolio not found');
    return portfolio;
  }

  return findOne(Portfolio, { student: studentId }, { updatedAt: -1, createdAt: -1 });
};

const loadPublicPortfolio = async (studentId) => {
  const portfolios = await findMany(Portfolio, { student: studentId }, { updatedAt: -1, createdAt: -1 });
  return portfolios.find((portfolio) => isVerifiedPortfolio(portfolio) && isPublicPortfolio(portfolio)) || null;
};

const loadSourceDocuments = async (studentId, portfolio) => {
  const [profile, studentProfile, resume, projects, certificates, githubAccount] = await Promise.all([
    findOne(Profile, { user: studentId }, { updatedAt: -1, createdAt: -1 }),
    findOne(StudentProfile, { user: studentId }, { updatedAt: -1, createdAt: -1 }),
    findOne(Resume, { userId: studentId }, { updatedAt: -1, createdAt: -1 }),
    findMany(Project, { userId: studentId }, { updatedAt: -1, createdAt: -1 }),
    findMany(Certificate, { userId: studentId }, { updatedAt: -1, createdAt: -1 }),
    findOne(GitHubAccount, { userId: studentId }, { updatedAt: -1, lastSyncedAt: -1, createdAt: -1 }),
  ]);

  return {
    profile: [profile, studentProfile].filter(Boolean),
    resume: [resume].filter(Boolean),
    projects,
    certificates,
    github: [githubAccount].filter(Boolean),
    portfolio: portfolio ? [portfolio] : [],
  };
};

const flattenSources = (sources, keys) => keys.flatMap((key) => sources[key] || []);

const mapScore = (record, scoreField, sourceRecords) => {
  if (!record || !isValidScore(record[scoreField])) return null;

  return withMetadata(record, sourceRecords, {
    score: Number(record[scoreField]),
    [scoreField]: Number(record[scoreField]),
    category: record.category || null,
    breakdown: sanitizeBreakdown(record.breakdown),
  });
};

const mapGithubAnalytics = (record, sourceRecords) => {
  if (!record || !evaluationTimestamp(record)) return null;

  return withMetadata(record, sourceRecords, {
    repositoryCount: Number(record.repositoryCount) || 0,
    activeRepositoryCount: Number(record.activeRepositoryCount) || 0,
    totalStars: Number(record.totalStars) || 0,
    totalForks: Number(record.totalForks) || 0,
    languages: Array.isArray(record.languages) ? record.languages.slice(0, 50) : [],
    commitCount: Number(record.commitCount) || 0,
    recentCommitCount: Number(record.recentCommitCount) || 0,
    contributionActivity: sanitizeBreakdown(record.contributionActivity),
    recentActivityDate: asIso(record.recentActivityDate),
    averageCommitFrequency: Number(record.averageCommitFrequency) || 0,
    readmeCoverage: Number(record.readmeCoverage) || 0,
    documentationCoverage: Number(record.documentationCoverage) || 0,
  });
};

const mapSkillProfile = (record, sourceRecords) => {
  if (!record) return null;

  return withMetadata(record, sourceRecords, {
    skills: (Array.isArray(record.skills) ? record.skills : []).map((skill) => ({
      name: skill.name,
      category: skill.category || null,
      sources: Array.isArray(skill.sources) ? skill.sources.slice(0, 20) : [],
      evidenceCount: Number(skill.evidenceCount) || 0,
      confidence: Number(skill.confidence) || 0,
    })),
    totalSkillsCount: Number(record.totalSkillsCount) || 0,
  });
};

const mapSkillGaps = (record, sourceRecords) => {
  if (!record) return null;

  return withMetadata(record, sourceRecords, {
    targetRole: record.targetRole || null,
    matchedSkills: Array.isArray(record.matchedSkills) ? record.matchedSkills.map((skill) => sanitizeValue(skill)) : [],
    missingRequiredSkills: Array.isArray(record.missingRequiredSkills) ? record.missingRequiredSkills.slice(0, 50) : [],
    missingPreferredSkills: Array.isArray(record.missingPreferredSkills) ? record.missingPreferredSkills.slice(0, 50) : [],
    weakEvidenceSkills: Array.isArray(record.weakEvidenceSkills) ? record.weakEvidenceSkills.map((skill) => sanitizeValue(skill)) : [],
    matchPercentage: Number(record.matchPercentage) || 0,
  });
};

const mapRecommendation = (record, sourceRecords) => withMetadata(record, sourceRecords, {
  type: record.type || null,
  target: record.targetId || null,
  matchScore: isValidScore(record.matchScore) ? Number(record.matchScore) : null,
  reasons: Array.isArray(record.reasons) ? record.reasons.slice(0, 20) : [],
  matchedSkills: Array.isArray(record.matchedSkills) ? record.matchedSkills.slice(0, 50) : [],
  missingSkills: Array.isArray(record.missingSkills) ? record.missingSkills.slice(0, 50) : [],
  priority: record.priority || null,
  status: record.status || 'ACTIVE',
});

const mapIndustryReadiness = (record, sourceRecords) => {
  if (!record || !isValidScore(record.industryReadinessScore)) return null;

  return withMetadata(record, sourceRecords, {
    score: Number(record.industryReadinessScore),
    industryReadinessScore: Number(record.industryReadinessScore),
    category: record.category || null,
    breakdown: sanitizeBreakdown(record.breakdown),
    strengths: Array.isArray(record.strengths) ? record.strengths.slice(0, 20) : [],
    gaps: Array.isArray(record.gaps) ? record.gaps.slice(0, 20) : [],
    topRecommendations: Array.isArray(record.topRecommendations)
      ? record.topRecommendations.slice(0, 20).map((item) => sanitizeValue(item))
      : [],
    sourceVersions: sanitizeValue({
      portfolioEvaluationVersion: record.portfolioEvaluationVersion,
      atsEvaluationVersion: record.atsEvaluationVersion,
      githubAnalyticsVersion: record.githubAnalyticsVersion,
      skillProfileVersion: record.skillProfileVersion,
      skillGapAnalysisVersion: record.skillGapAnalysisVersion,
    }),
  });
};

class AIResultsService {
  async getPortfolioAISummary(studentId, portfolioId) {
    const portfolio = await loadPortfolio(studentId, portfolioId);
    const resolvedPortfolioId = portfolio?._id ? asId(portfolio._id) : portfolioId;
    const sources = await loadSourceDocuments(studentId, portfolio);

    const [portfolioEvaluation, atsEvaluation, githubAnalytics, skillProfile, skillGaps, recommendations, industryReadiness] = await Promise.all([
      latestScore(PortfolioEvaluation, studentId, resolvedPortfolioId, 'portfolioScore'),
      latestScore(ResumeEvaluation, studentId, resolvedPortfolioId, 'atsScore', true),
      findOne(GitHubAnalytics, { userId: studentId }, { calculatedAt: -1, createdAt: -1 }),
      latestOptionalPortfolioRecord(StudentSkillProfile, studentId, resolvedPortfolioId),
      findOne(SkillGapAnalysis, { studentId }, { generatedAt: -1, createdAt: -1 }),
      latestRecommendations(studentId),
      latestScore(IndustryReadinessEvaluation, studentId, resolvedPortfolioId, 'industryReadinessScore'),
    ]);

    const portfolioSources = flattenSources(sources, ['portfolio', 'projects', 'certificates']);
    const atsSources = flattenSources(sources, ['profile', 'resume']);
    const githubSources = flattenSources(sources, ['github', 'projects']);
    const allSources = flattenSources(sources, ['profile', 'resume', 'projects', 'certificates', 'github', 'portfolio']);

    return {
      portfolioScore: mapScore(portfolioEvaluation, 'portfolioScore', portfolioSources),
      atsScore: mapScore(atsEvaluation, 'atsScore', atsSources),
      githubAnalytics: mapGithubAnalytics(githubAnalytics, githubSources),
      skills: mapSkillProfile(skillProfile, allSources)?.skills || [],
      skillProfile: mapSkillProfile(skillProfile, allSources),
      skillGaps: mapSkillGaps(skillGaps, allSources),
      recommendations: recommendations.map((recommendation) => mapRecommendation(recommendation, allSources)),
      industryReadiness: mapIndustryReadiness(industryReadiness, allSources),
      portfolioId: resolvedPortfolioId || null,
    };
  }

  async getPortfolioScore(studentId, portfolioId) {
    return (await this.getPortfolioAISummary(studentId, portfolioId)).portfolioScore;
  }

  async getATSScore(studentId, portfolioId) {
    return (await this.getPortfolioAISummary(studentId, portfolioId)).atsScore;
  }

  async getGitHubAnalytics(studentId, portfolioId) {
    return (await this.getPortfolioAISummary(studentId, portfolioId)).githubAnalytics;
  }

  async getSkillProfile(studentId, portfolioId) {
    return (await this.getPortfolioAISummary(studentId, portfolioId)).skillProfile;
  }

  async getSkillGaps(studentId, portfolioId) {
    return (await this.getPortfolioAISummary(studentId, portfolioId)).skillGaps;
  }

  async getRecommendations(studentId, portfolioId) {
    return (await this.getPortfolioAISummary(studentId, portfolioId)).recommendations;
  }

  async getIndustryReadiness(studentId, portfolioId) {
    return (await this.getPortfolioAISummary(studentId, portfolioId)).industryReadiness;
  }

  async getRecruiterAISummary(studentId) {
    const portfolio = await loadPublicPortfolio(studentId);
    if (!portfolio) {
      throw ApiError.notFound('No public verified AI summary is available for this candidate');
    }

    const summary = await this.getPortfolioAISummary(studentId, asId(portfolio._id));
    const verifiedSkills = Array.isArray(portfolio.skillsVerified) ? [...new Set(portfolio.skillsVerified)] : [];

    return {
      portfolioScore: summary.portfolioScore && withPublicScore(summary.portfolioScore),
      atsScore: summary.atsScore && withPublicScore(summary.atsScore),
      githubAnalyticsSummary: summary.githubAnalytics && withPublicGithub(summary.githubAnalytics),
      verifiedSkills,
      industryReadiness: summary.industryReadiness && withPublicReadiness(summary.industryReadiness),
      topStrengths: summary.industryReadiness?.strengths || [],
      topGaps: summary.industryReadiness?.gaps || summary.skillGaps?.missingRequiredSkills || [],
    };
  }

  async getPublicPortfolioAISummary(portfolioId) {
    const portfolio = await findOne(Portfolio, { _id: portfolioId });
    if (!isVerifiedPortfolio(portfolio) || !isPublicPortfolio(portfolio)) return null;

    const summary = await this.getPortfolioAISummary(asId(portfolio.student), asId(portfolio._id));
    return {
      portfolioScore: summary.portfolioScore && withPublicScore(summary.portfolioScore),
      verifiedSkills: Array.isArray(portfolio.skillsVerified) ? [...new Set(portfolio.skillsVerified)] : [],
      industryReadiness: summary.industryReadiness && withPublicReadiness(summary.industryReadiness),
    };
  }
}

const withPublicScore = (score) => ({
  score: score.score,
  category: score.category,
  evaluatedAt: score.evaluatedAt,
  scoringVersion: score.scoringVersion,
  sourceVersion: score.sourceVersion,
  isStale: score.isStale,
});

const withPublicGithub = (analytics) => ({
  repositoryCount: analytics.repositoryCount,
  activeRepositoryCount: analytics.activeRepositoryCount,
  commitCount: analytics.commitCount,
  recentCommitCount: analytics.recentCommitCount,
  languages: analytics.languages,
  recentActivityDate: analytics.recentActivityDate,
  evaluatedAt: analytics.evaluatedAt,
  scoringVersion: analytics.scoringVersion,
  sourceVersion: analytics.sourceVersion,
  isStale: analytics.isStale,
});

const withPublicReadiness = (readiness) => ({
  score: readiness.score,
  industryReadinessScore: readiness.industryReadinessScore,
  category: readiness.category,
  evaluatedAt: readiness.evaluatedAt,
  scoringVersion: readiness.scoringVersion,
  sourceVersion: readiness.sourceVersion,
  isStale: readiness.isStale,
});

export { isPublicPortfolio, isVerifiedPortfolio };
export default new AIResultsService();
