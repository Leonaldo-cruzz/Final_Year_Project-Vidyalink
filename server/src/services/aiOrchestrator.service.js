/* global clearTimeout, setTimeout */

import { env } from '../config/env.js';
import AIAnalysis from '../models/aiAnalysis.model.js';
import AIEvaluation from '../models/aiEvaluation.model.js';
import aiIntegrationService from './aiIntegration.service.js';

export const AI_PIPELINE_STATUSES = [
  'NOT_EVALUATED',
  'ELIGIBLE',
  'EVALUATING',
  'COMPLETED',
  'PARTIAL',
  'INSUFFICIENT_EVIDENCE',
  'FAILED',
  'STALE',
];

const ANALYSIS_TYPES = ['skills_extract', 'github', 'ats', 'skills_gap', 'readiness', 'recommendations'];
const STAGE_NAMES = ['portfolio', ...ANALYSIS_TYPES];

const toId = (value) => (value?._id || value)?.toString();

const asDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const latestDate = (values) => values
  .map(asDate)
  .filter(Boolean)
  .sort((left, right) => right.getTime() - left.getTime())[0] || null;

const mapEvaluation = (evaluation) => (evaluation ? {
  id: evaluation._id,
  studentId: evaluation.studentId,
  portfolioId: evaluation.portfolioId,
  overallScore: evaluation.overallScore,
  category: evaluation.category,
  componentScores: evaluation.componentScores,
  weightedBreakdown: evaluation.weightedBreakdown,
  evidence: evaluation.evidence,
  strengths: evaluation.strengths,
  improvements: evaluation.improvements,
  dataCompleteness: evaluation.dataCompleteness,
  evidenceStatus: evaluation.evidenceStatus,
  provider: evaluation.provider,
  model: evaluation.model,
  version: evaluation.version,
  evaluationStatus: evaluation.evaluationStatus,
  evaluationVersion: evaluation.evaluationVersion,
  contentHash: evaluation.contentHash,
  sourceUpdatedAt: evaluation.sourceUpdatedAt,
  pipelineStatus: evaluation.pipelineStatus,
  createdAt: evaluation.createdAt,
  updatedAt: evaluation.updatedAt,
} : null);

const mapAnalysis = (analysis) => (analysis ? {
  id: analysis._id,
  analysisType: analysis.analysisType,
  result: analysis.result,
  provider: analysis.provider,
  model: analysis.model,
  version: analysis.version,
  evaluationVersion: analysis.evaluationVersion,
  contentHash: analysis.contentHash,
  sourceUpdatedAt: analysis.sourceUpdatedAt,
  createdAt: analysis.createdAt,
  updatedAt: analysis.updatedAt,
} : null);

const insufficientProfile = (reason) => ({
  status: 'INSUFFICIENT_EVIDENCE',
  portfolioId: null,
  studentId: null,
  evaluation: null,
  skills: null,
  skillGaps: null,
  github: null,
  ats: null,
  readiness: null,
  recommendations: null,
  lastUpdated: null,
  dataCompleteness: { verifiedPortfolio: false, availableComponents: [], missingComponents: STAGE_NAMES },
  componentStatus: Object.fromEntries(STAGE_NAMES.map((name) => [name, { status: 'unavailable' }])),
  source: null,
  stale: false,
  reason,
});

const withTimeout = (promise, timeoutMs) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    const error = new Error('AI orchestration timed out');
    error.code = 'AI_ORCHESTRATION_TIMEOUT';
    reject(error);
  }, timeoutMs);
  promise.then(resolve, reject).finally(() => clearTimeout(timer));
});

class AIOrchestratorService {
  constructor({ integration = aiIntegrationService, models = {} } = {}) {
    this.integration = integration;
    this.models = { AIAnalysis, AIEvaluation, ...models };
  }

  async findLatestEvaluation(portfolioId) {
    return this.models.AIEvaluation.findOne({ portfolioId })
      .sort({ evaluationVersion: -1, createdAt: -1 });
  }

  async findLatestAnalysis(studentId, portfolioId, analysisType) {
    return this.models.AIAnalysis.findOne({ studentId, portfolioId, analysisType })
      .sort({ evaluationVersion: -1, createdAt: -1 });
  }

  async getLatestResult(user, { portfolioId } = {}) {
    const portfolio = await this.integration.resolvePortfolio(user, portfolioId, { allowMissing: true });
    if (!portfolio) return insufficientProfile('No faculty-verified portfolio is available.');

    const studentId = toId(portfolio.student);
    const [source, evaluation, ...analyses] = await Promise.all([
      this.integration.getPortfolioSourceFingerprint(portfolio, studentId),
      this.findLatestEvaluation(portfolio._id),
      ...ANALYSIS_TYPES.map((type) => this.findLatestAnalysis(studentId, portfolio._id, type)),
    ]);
    const byType = Object.fromEntries(ANALYSIS_TYPES.map((type, index) => [type, analyses[index]]));
    const stale = Boolean(evaluation?.contentHash && source?.contentHash && evaluation.contentHash !== source.contentHash);
    const statuses = evaluation?.pipelineStatus || {};
    const componentStatus = {
      portfolio: evaluation ? { status: evaluation.evaluationStatus || 'COMPLETED' } : { status: 'not_evaluated' },
      ...Object.fromEntries(ANALYSIS_TYPES.map((type) => [
        type,
        statuses[type] || (byType[type] ? { status: 'available' } : { status: 'unavailable' }),
      ])),
    };
    const availableComponents = STAGE_NAMES.filter((name) => {
      if (name === 'portfolio') return Boolean(evaluation);
      return Boolean(byType[name]);
    });
    const missingComponents = STAGE_NAMES.filter((name) => !availableComponents.includes(name));
    const storedStatus = evaluation?.evaluationStatus || 'COMPLETED';
    const status = !evaluation
      ? 'NOT_EVALUATED'
      : stale
        ? 'STALE'
        : (storedStatus === 'COMPLETED' && missingComponents.length > 0 && !evaluation.pipelineStatus
          ? 'PARTIAL'
          : storedStatus);

    return {
      status,
      portfolioId: portfolio._id,
      studentId,
      evaluation: mapEvaluation(evaluation),
      skills: mapAnalysis(byType.skills_extract)?.result || null,
      skillGaps: mapAnalysis(byType.skills_gap)?.result || null,
      github: mapAnalysis(byType.github)?.result || null,
      ats: mapAnalysis(byType.ats)?.result || null,
      readiness: mapAnalysis(byType.readiness)?.result || null,
      recommendations: mapAnalysis(byType.recommendations)?.result || null,
      lastUpdated: latestDate([
        evaluation?.updatedAt,
        ...Object.values(byType).map((analysis) => analysis?.updatedAt),
      ]),
      evaluationVersion: evaluation?.evaluationVersion || null,
      dataCompleteness: {
        ...(evaluation?.dataCompleteness || {}),
        verifiedPortfolio: true,
        availableComponents,
        missingComponents,
      },
      componentStatus,
      source: {
        contentHash: source?.contentHash || null,
        sourceUpdatedAt: source?.sourceUpdatedAt || null,
      },
      stale,
      reason: stale ? 'Portfolio evidence changed since the last evaluation.' : null,
    };
  }

  async getHistory(user, { portfolioId } = {}) {
    const portfolio = await this.integration.resolvePortfolio(user, portfolioId, { allowMissing: true });
    if (!portfolio) return [];

    const history = await this.models.AIEvaluation.find({ portfolioId: portfolio._id })
      .sort({ evaluationVersion: -1, createdAt: -1 });

    return Promise.all(history.map(async (evaluation) => {
      const readiness = await this.models.AIAnalysis.findOne({
        portfolioId: portfolio._id,
        analysisType: 'readiness',
        evaluationVersion: evaluation.evaluationVersion,
      }).sort({ createdAt: -1 });
      return {
        id: evaluation._id,
        evaluationVersion: evaluation.evaluationVersion,
        contentHash: evaluation.contentHash || null,
        evaluationStatus: evaluation.evaluationStatus,
        status: evaluation.status || evaluation.evaluationStatus,
        overallScore: evaluation.overallScore,
        category: evaluation.category,
        componentScores: evaluation.componentScores,
        projectEvaluations: evaluation.projectEvaluations || [],
        readinessScore: evaluation.readiness?.readiness_score ?? readiness?.result?.readiness_score ?? null,
        sourceUpdatedAt: evaluation.sourceUpdatedAt || null,
        createdAt: evaluation.createdAt,
        updatedAt: evaluation.updatedAt,
      };
    }));
  }

  async getResults(user, { portfolioId, latestOnly = false } = {}) {
    const latest = await this.getLatestResult(user, { portfolioId });
    if (latestOnly) return latest;

    if (!latest.portfolioId) return { ...latest, history: [] };
    const history = await this.getHistory(user, { portfolioId: latest.portfolioId });
    return { ...latest, history };
  }

  async evaluate(user, { portfolioId, force = false, targetRole = null, requiredSkills = [] } = {}) {
    const work = this._evaluate(user, { portfolioId, force, targetRole, requiredSkills });
    try {
      return await withTimeout(work, env.AI_ORCHESTRATION_TIMEOUT);
    } catch (error) {
      if (error.code !== 'AI_ORCHESTRATION_TIMEOUT') throw error;
      return {
        ...(await this.getLatestResult(user, { portfolioId }).catch(() => insufficientProfile('Unable to read the current AI result.'))),
        status: 'FAILED',
        reason: 'AI evaluation exceeded the configured time limit. No fabricated result was stored.',
      };
    }
  }

  async _evaluate(user, { portfolioId, force, targetRole, requiredSkills }) {
    const portfolio = await this.integration.resolvePortfolio(user, portfolioId, { allowMissing: true });
    if (!portfolio) return insufficientProfile('No faculty-verified portfolio is available.');

    const studentId = toId(portfolio.student);
    const preparedSource = await this.integration.getPortfolioSourceFingerprint(portfolio, studentId);
    if (!preparedSource.project || !preparedSource.payload.projects?.[0]?.verified) {
      return insufficientProfile('No verified project evidence is available for official evaluation.');
    }

    const previous = await this.findLatestEvaluation(portfolio._id);
    if (!force && previous?.contentHash && previous.contentHash === preparedSource.contentHash) {
      return this.getLatestResult(user, { portfolioId: portfolio._id });
    }

    let evaluationResult;
    try {
      evaluationResult = await this.integration.evaluatePortfolio(user, portfolio._id, {
        force: true,
        preparedSource,
      });
    } catch (_error) {
      const current = await this.getLatestResult(user, { portfolioId: portfolio._id });
      return { ...current, status: 'FAILED', reason: 'Portfolio evaluation could not be completed.' };
    }

    if (evaluationResult.status !== 'evaluated' || !evaluationResult.evaluation) {
      return { ...await this.getLatestResult(user, { portfolioId: portfolio._id }), status: 'INSUFFICIENT_EVIDENCE' };
    }

    const metadata = {
      evaluationVersion: evaluationResult.evaluation.evaluationVersion,
      contentHash: preparedSource.contentHash,
      sourceUpdatedAt: preparedSource.sourceUpdatedAt,
    };
    const componentStatus = {
      portfolio: { status: 'available' },
    };

    const startMs = Date.now();
    console.info(`[AI_OBSERVABILITY] START evaluation studentId=${studentId} portfolioId=${portfolio._id}`);

    const runStage = async (name, callback, unavailableReason = null) => {
      const stageStart = Date.now();
      if (unavailableReason) {
        componentStatus[name] = { status: 'unavailable', reason: unavailableReason };
        console.info(`[AI_OBSERVABILITY] STAGE ${name} status=unavailable reason="${unavailableReason}"`);
        return;
      }
      try {
        await callback();
        componentStatus[name] = { status: 'available' };
        console.info(`[AI_OBSERVABILITY] STAGE ${name} status=available durationMs=${Date.now() - stageStart}`);
      } catch (error) {
        componentStatus[name] = { status: 'failed', reason: error.message || 'Component analysis failed.' };
        console.warn(`[AI_OBSERVABILITY] STAGE ${name} status=failed durationMs=${Date.now() - stageStart} error="${error.message}"`);
      }
    };

    await Promise.all([
      runStage('skills_extract', () => this.integration.extractSkills(user, { portfolioId: portfolio._id }, metadata)),
      runStage(
        'github',
        () => this.integration.analyzeGithub(user, { portfolioId: portfolio._id }, metadata),
        preparedSource.context?.github?.connectionStatus !== 'Connected' ? 'No connected GitHub account is available.' : null,
      ),
      runStage(
        'ats',
        () => this.integration.analyzeATS(user, { portfolioId: portfolio._id }, metadata),
        !preparedSource.payload.resume ? 'No readable stored resume text is available.' : null,
      ),
      runStage(
        'skills_gap',
        () => this.integration.analyzeSkillGap(user, { portfolioId: portfolio._id, targetRole, requiredSkills }, metadata),
        !(targetRole || requiredSkills?.length) ? 'A target role or required skills were not supplied.' : null,
      ),
    ]);

    await Promise.all([
      runStage('readiness', () => this.integration.calculateReadiness(user, { portfolioId: portfolio._id }, metadata)),
      runStage(
        'recommendations',
        () => this.integration.getRecommendations(user, { portfolioId: portfolio._id }, metadata),
        user.role !== 'student' ? 'Recommendations are available to the student account only.' : null,
      ),
    ]);

    const analyses = await Promise.all(ANALYSIS_TYPES.map((type) => this.findLatestAnalysis(studentId, portfolio._id, type)));
    const byType = Object.fromEntries(ANALYSIS_TYPES.map((type, index) => [type, analyses[index]]));

    const optionalStatuses = ANALYSIS_TYPES.map((type) => componentStatus[type]?.status);
    const complete = optionalStatuses.every((status) => status === 'available');
    const finalStatus = complete ? 'COMPLETED' : 'PARTIAL';

    await this.models.AIEvaluation.findByIdAndUpdate(evaluationResult.evaluation.id, {
      evaluationStatus: finalStatus,
      status: finalStatus,
      pipelineStatus: componentStatus,
      portfolio: evaluationResult.evaluation,
      projectEvaluations: evaluationResult.evaluation.projectEvaluations || evaluationResult.evaluation.project_evaluations || [],
      skills: mapAnalysis(byType.skills_extract)?.result || null,
      skillGap: mapAnalysis(byType.skills_gap)?.result || null,
      github: mapAnalysis(byType.github)?.result || null,
      ats: mapAnalysis(byType.ats)?.result || null,
      readiness: mapAnalysis(byType.readiness)?.result || null,
      recommendations: mapAnalysis(byType.recommendations)?.result || null,
      dataCompleteness: {
        ...(evaluationResult.evaluation.dataCompleteness || {}),
        verifiedPortfolio: true,
        availableComponents: STAGE_NAMES.filter((name) => componentStatus[name]?.status === 'available'),
        missingComponents: STAGE_NAMES.filter((name) => componentStatus[name]?.status !== 'available'),
      },
    });

    console.info(`[AI_OBSERVABILITY] END evaluation studentId=${studentId} portfolioId=${portfolio._id} status=${finalStatus} totalDurationMs=${Date.now() - startMs}`);

    return this.getLatestResult(user, { portfolioId: portfolio._id });
  }
}

export { AIOrchestratorService };
export default new AIOrchestratorService();
