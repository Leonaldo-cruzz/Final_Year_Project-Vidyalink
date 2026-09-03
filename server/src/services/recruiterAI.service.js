import IndustryReadinessEvaluation from '../models/industryReadinessEvaluation.model.js';
import Portfolio from '../models/portfolio.model.js';
import PortfolioEvaluation from '../models/portfolioEvaluation.model.js';
import ResumeEvaluation from '../models/resumeEvaluation.model.js';
import SkillGapAnalysis from '../models/skillGapAnalysis.model.js';
import aiResultsService, { isValidScore } from './aiResults.service.js';
import verificationService from './verification.service.js';

const execute = async (query) => {
  const leanQuery = query && typeof query.lean === 'function' ? query.lean() : query;
  return leanQuery && typeof leanQuery.then === 'function' ? leanQuery : Promise.resolve(leanQuery);
};

const findMany = async (Model, filter, sort, projection) => {
  let query = Model.find(filter);
  if (projection && query && typeof query.select === 'function') query = query.select(projection);
  if (sort && query && typeof query.sort === 'function') query = query.sort(sort);
  const result = await execute(query);
  return Array.isArray(result) ? result : [];
};

const asId = (value) => String(value?._id || value);

const asScore = (value) => (isValidScore(value) ? Number(value) : null);

const asDateValue = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
};

const latestRecordByStudent = (records, preferredPortfolioIds = new Set()) => {
  const result = new Map();
  for (const record of records) {
    const studentId = asId(record.studentId);
    const current = result.get(studentId);
    const recordIsPortfolioScoped = record.portfolioId && preferredPortfolioIds.has(asId(record.portfolioId));
    const currentIsPortfolioScoped = current?.portfolioId && preferredPortfolioIds.has(asId(current.portfolioId));
    const shouldReplace = !current
      || (recordIsPortfolioScoped && !currentIsPortfolioScoped)
      || (recordIsPortfolioScoped === currentIsPortfolioScoped
        && asDateValue(record.evaluatedAt || record.generatedAt || record.calculatedAt || record.createdAt)
          > asDateValue(current.evaluatedAt || current.generatedAt || current.calculatedAt || current.createdAt));
    if (shouldReplace) result.set(studentId, record);
  }
  return result;
};

const safeSkillGaps = (record) => {
  if (!record) return null;
  return {
    targetRole: record.targetRole || null,
    missingRequiredSkills: Array.isArray(record.missingRequiredSkills) ? record.missingRequiredSkills.slice(0, 50) : [],
    missingPreferredSkills: Array.isArray(record.missingPreferredSkills) ? record.missingPreferredSkills.slice(0, 50) : [],
    weakEvidenceSkills: Array.isArray(record.weakEvidenceSkills)
      ? record.weakEvidenceSkills.slice(0, 50).map((skill) => ({
          name: skill?.name || String(skill),
          reason: skill?.reason || null,
          confidence: Number.isFinite(Number(skill?.confidence)) ? Number(skill.confidence) : null,
        }))
      : [],
    matchPercentage: asScore(record.matchPercentage),
  };
};

const publicPortfolio = (portfolio) => Boolean(
  portfolio?.isPublic === true && verificationService.isPortfolioVerified(portfolio)
);

const safeRecommendations = (recommendations) => (Array.isArray(recommendations) ? recommendations : [])
  .slice(0, 50)
  .map((recommendation) => ({
    type: recommendation?.type || null,
    title: recommendation?.title || null,
    text: recommendation?.text || null,
    reasons: Array.isArray(recommendation?.reasons) ? recommendation.reasons.slice(0, 20) : [],
    matchedSkills: Array.isArray(recommendation?.matchedSkills) ? recommendation.matchedSkills.slice(0, 50) : [],
    missingSkills: Array.isArray(recommendation?.missingSkills) ? recommendation.missingSkills.slice(0, 50) : [],
    matchScore: isValidScore(recommendation?.matchScore) ? Number(recommendation.matchScore) : null,
    priority: recommendation?.priority || null,
    status: recommendation?.status || null,
    evaluatedAt: recommendation?.evaluatedAt || null,
    scoringVersion: recommendation?.scoringVersion || null,
  }));

class RecruiterAIService {
  async getCandidateSignals(studentIds, suppliedPortfolios = null) {
    const ids = Array.isArray(studentIds) ? studentIds : [];
    const portfolios = suppliedPortfolios || await findMany(
      Portfolio,
      { student: { $in: ids }, isPublic: true },
      { updatedAt: -1, createdAt: -1 },
      'student isPublic verifiedBy verificationHash verificationStatus status skillsVerified updatedAt createdAt'
    );
    const verifiedPublicPortfolios = portfolios.filter(publicPortfolio);
    const portfolioByStudent = new Map();
    for (const portfolio of verifiedPublicPortfolios) {
      const key = asId(portfolio.student);
      if (!portfolioByStudent.has(key)) portfolioByStudent.set(key, portfolio);
    }

    const eligibleIds = [...portfolioByStudent.keys()];
    const portfolioIds = [...portfolioByStudent.values()].map((portfolio) => portfolio._id);
    const signalMap = new Map(ids.map((studentId) => [asId(studentId), {
      portfolioScore: null,
      atsScore: null,
      githubEvidenceScore: null,
      industryReadinessScore: null,
      verifiedSkills: [],
      skillGaps: null,
      topStrengths: [],
    }]));

    if (eligibleIds.length === 0) return signalMap;

    const [portfolioEvaluations, atsEvaluations, readinessEvaluations, skillGaps] = await Promise.all([
      findMany(
        PortfolioEvaluation,
        { studentId: { $in: eligibleIds }, portfolioId: { $in: portfolioIds }, portfolioScore: { $gte: 0, $lte: 100 } },
        { evaluatedAt: -1, createdAt: -1 },
        'studentId portfolioId portfolioScore category scoringVersion evaluatedAt createdAt'
      ),
      findMany(
        ResumeEvaluation,
        {
          studentId: { $in: eligibleIds },
          atsScore: { $gte: 0, $lte: 100 },
          $or: [{ portfolioId: { $in: portfolioIds } }, { portfolioId: null }],
        },
        { evaluatedAt: -1, createdAt: -1 },
        'studentId portfolioId atsScore category scoringVersion evaluatedAt createdAt'
      ),
      findMany(
        IndustryReadinessEvaluation,
        { studentId: { $in: eligibleIds }, portfolioId: { $in: portfolioIds }, industryReadinessScore: { $gte: 0, $lte: 100 } },
        { generatedAt: -1, createdAt: -1 },
        'studentId portfolioId industryReadinessScore category breakdown strengths gaps scoringVersion generatedAt createdAt'
      ),
      findMany(
        SkillGapAnalysis,
        { studentId: { $in: eligibleIds } },
        { generatedAt: -1, createdAt: -1 },
        'studentId targetRole missingRequiredSkills missingPreferredSkills weakEvidenceSkills matchPercentage analysisVersion generatedAt createdAt'
      ),
    ]);

    const preferredPortfolioIds = new Set(portfolioIds.map(asId));
    const portfolioMap = latestRecordByStudent(portfolioEvaluations, preferredPortfolioIds);
    const atsMap = latestRecordByStudent(atsEvaluations, preferredPortfolioIds);
    const readinessMap = latestRecordByStudent(readinessEvaluations, preferredPortfolioIds);
    const skillGapMap = latestRecordByStudent(skillGaps);

    for (const [studentId, portfolio] of portfolioByStudent.entries()) {
      const portfolioEvaluation = portfolioMap.get(studentId);
      const atsEvaluation = atsMap.get(studentId);
      const readiness = readinessMap.get(studentId);
      const readinessGithubScore = readiness?.breakdown?.githubEvidence?.score;
      const signal = signalMap.get(studentId);
      if (!signal) continue;

      signal.portfolioScore = asScore(portfolioEvaluation?.portfolioScore);
      signal.atsScore = asScore(atsEvaluation?.atsScore);
      signal.githubEvidenceScore = asScore(readinessGithubScore);
      signal.industryReadinessScore = asScore(readiness?.industryReadinessScore);
      signal.verifiedSkills = Array.isArray(portfolio.skillsVerified)
        ? [...new Set(portfolio.skillsVerified)].slice(0, 100)
        : [];
      signal.skillGaps = safeSkillGaps(skillGapMap.get(studentId));
      signal.topStrengths = Array.isArray(readiness?.strengths) ? readiness.strengths.slice(0, 10) : [];
    }

    return signalMap;
  }

  async getCandidateAISummary(studentId) {
    const portfolios = await findMany(
      Portfolio,
      { student: studentId, isPublic: true },
      { updatedAt: -1, createdAt: -1 },
      'student isPublic verifiedBy verificationHash verificationStatus status skillsVerified updatedAt createdAt'
    );
    const portfolio = portfolios.find(publicPortfolio);
    if (!portfolio) return null;

    const summary = await aiResultsService.getPortfolioAISummary(studentId, asId(portfolio._id));
    const evaluationRecords = [
      summary.portfolioScore,
      summary.atsScore,
      summary.githubAnalytics,
      summary.skillGaps,
      summary.industryReadiness,
    ].filter(Boolean);
    const evaluationDates = evaluationRecords.map((record) => record.evaluatedAt).filter(Boolean).sort();
    return {
      portfolioScore: summary.portfolioScore,
      atsScore: summary.atsScore,
      github: summary.githubAnalytics,
      verifiedSkills: [...new Set(portfolio.skillsVerified || [])],
      skillGaps: summary.skillGaps,
      industryReadiness: summary.industryReadiness,
      strengths: summary.industryReadiness?.strengths || [],
      recommendations: safeRecommendations(summary.recommendations),
      metadata: {
        evaluatedAt: evaluationDates.at(-1) || null,
        isStale: evaluationRecords.some((record) => record.isStale === true),
        scoringVersions: [...new Set(evaluationRecords.map((record) => record.scoringVersion).filter(Boolean))],
      },
    };
  }
}

export { publicPortfolio };
export default new RecruiterAIService();
