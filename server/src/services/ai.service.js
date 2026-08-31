/* global AbortController, clearTimeout, fetch, setTimeout */

import { z } from 'zod';

import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import Portfolio from '../models/portfolio.model.js';
import PortfolioEvaluation from '../models/portfolioEvaluation.model.js';
import ResumeEvaluation from '../models/resumeEvaluation.model.js';
import GitHubAnalytics from '../models/githubAnalytics.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import StudentSkillProfile from '../models/studentSkillProfile.model.js';
import SkillGapAnalysis from '../models/skillGapAnalysis.model.js';
import Recommendation from '../models/recommendation.model.js';
import Project from '../models/project.model.js';
import Certificate from '../models/certificate.model.js';
import IndustryReadinessEvaluation from '../models/industryReadinessEvaluation.model.js';

const SCORING_VERSION = '1.0';

const dimensionSchema = z.object({
  score: z.number().min(0).max(100),
  weight: z.number().min(0).max(100),
  weightedScore: z.number().min(0).max(100),
  evidence: z.array(z.string()),
  explanation: z.string(),
  details: z.record(z.any()).optional(),
}).passthrough();

const industryReadinessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    industryReadinessScore: z.number().min(0).max(100),
    category: z.enum([
      'Highly Industry Ready',
      'Industry Ready',
      'Progressing',
      'Developing',
      'Needs Development',
    ]),
    breakdown: z.object({
      portfolioQuality: dimensionSchema,
      technicalSkillProfile: dimensionSchema,
      githubEvidence: dimensionSchema,
      atsReadiness: dimensionSchema,
      verifiedAchievements: dimensionSchema,
      careerAlignment: dimensionSchema,
    }).passthrough(),
    strengths: z.array(z.string()),
    gaps: z.array(z.string()),
    topRecommendations: z.array(z.any()),
    scoringVersion: z.string().min(1),
    generatedAt: z.string().min(1),
    sourceVersions: z.record(z.string().nullable()).optional(),
  }).passthrough(),
}).strict();

const priorityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const sortQuery = (query, field = 'createdAt') => {
  if (query && typeof query.sort === 'function') return query.sort({ [field]: -1 });
  return query;
};

const asLean = async (query) => {
  const normalized = query && typeof query.lean === 'function' ? query.lean() : query;
  return normalized;
};

const safeBreakdown = (value, key = '') => {
  if (value === null || value === undefined) return value;
  const blockedKey = /^(raw|rawtext|text|content|filecontentbase64|resumecontents?)$/i.test(key);
  if (blockedKey) return undefined;
  if (Array.isArray(value)) return value.map((item) => safeBreakdown(item)).filter((item) => item !== undefined);
  if (typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .map(([entryKey, entryValue]) => [entryKey, safeBreakdown(entryValue, entryKey)])
      .filter(([, entryValue]) => entryValue !== undefined)
  );
};

const sourceVersion = (record, ...keys) => {
  if (!record) return null;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim()) {
      return String(record[key]);
    }
  }
  return null;
};

const sourceTimestamp = (record, ...keys) => {
  if (!record) return null;
  for (const key of keys) {
    const date = toDate(record[key]);
    if (date) return date;
  }
  return null;
};

const getNumericFromBreakdown = (value, names) => {
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    if (names.includes(key.toLowerCase()) && Number.isFinite(Number(child))) return Number(child);
    if (child && typeof child === 'object') {
      const nested = getNumericFromBreakdown(child, names);
      if (nested !== null) return nested;
    }
  }
  return null;
};

const toSkillSnapshot = (skill) => ({
  name: String(skill?.name || '').trim(),
  canonicalName: skill?.canonicalName || null,
  category: skill?.category || null,
  sources: Array.isArray(skill?.sources) ? skill.sources.slice(0, 20) : [],
  evidence: Array.isArray(skill?.evidence) ? skill.evidence.slice(0, 20) : [],
  evidenceCount: toFiniteNumber(skill?.evidenceCount),
  confidence: toFiniteNumber(skill?.confidence),
  verified: skill?.verified !== false,
  verifiedProjectUsage: skill?.verifiedProjectUsage === true,
  githubEvidence: skill?.githubEvidence === true,
  certificateEvidence: skill?.certificateEvidence === true,
  alumniEndorsements: skill?.alumniEndorsements === true,
});

const toRecommendationSnapshot = (recommendation) => {
  if (typeof recommendation === 'string') return recommendation;
  if (!recommendation || typeof recommendation !== 'object') return null;
  return {
    entityId: recommendation.entityId || recommendation.targetId || String(recommendation._id || ''),
    type: recommendation.type || 'PROJECT_IMPROVEMENT',
    matchScore: toFiniteNumber(recommendation.matchScore),
    reasons: Array.isArray(recommendation.reasons) ? recommendation.reasons.slice(0, 30) : [],
    matchedSkills: Array.isArray(recommendation.matchedSkills) ? recommendation.matchedSkills.slice(0, 30) : [],
    missingSkills: Array.isArray(recommendation.missingSkills) ? recommendation.missingSkills.slice(0, 30) : [],
    priority: recommendation.priority || 'LOW',
    algorithmVersion: recommendation.algorithmVersion || null,
    generatedAt: recommendation.generatedAt || null,
  };
};

const asPublicEvaluation = (record) => {
  if (!record) return null;
  const value = typeof record.toObject === 'function' ? record.toObject() : record;
  return {
    id: String(value._id),
    studentId: String(value.studentId),
    portfolioId: String(value.portfolioId),
    industryReadinessScore: value.industryReadinessScore,
    category: value.category,
    breakdown: value.breakdown,
    strengths: value.strengths,
    gaps: value.gaps,
    topRecommendations: value.topRecommendations,
    scoringVersion: value.scoringVersion,
    generatedAt: value.generatedAt,
    createdAt: value.createdAt,
    sourceVersions: {
      portfolioEvaluationVersion: value.portfolioEvaluationVersion || null,
      atsEvaluationVersion: value.atsEvaluationVersion || null,
      githubAnalyticsVersion: value.githubAnalyticsVersion || null,
      skillProfileVersion: value.skillProfileVersion || null,
      skillGapAnalysisVersion: value.skillGapAnalysisVersion || null,
    },
  };
};

class AIService {
  constructor() {
    this.baseUrl = (env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
    this.timeoutMs = env.AI_SERVICE_TIMEOUT_MS || 8_000;
  }

  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(env.AI_SERVICE_API_KEY ? { 'X-AI-Service-Key': env.AI_SERVICE_API_KEY } : {}),
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        if (response.status === 422) throw ApiError.badRequest('AI service rejected the readiness payload');
        if (response.status === 503) throw ApiError.serviceUnavailable('AI service is temporarily unavailable');
        if (response.status === 504) throw ApiError.gatewayTimeout('AI service timed out');
        throw ApiError.badGateway('AI service returned an unexpected response');
      }

      const parsed = industryReadinessResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw ApiError.badGateway('AI service returned an invalid readiness response');
      return parsed.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error?.name === 'AbortError') throw ApiError.gatewayTimeout('AI service request timed out');
      throw ApiError.serviceUnavailable('Unable to reach the AI service right now');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async calculateIndustryReadiness(payload) {
    if (!payload || typeof payload !== 'object' || payload.verificationStatus !== 'VERIFIED') {
      throw ApiError.badRequest('Only a verified, server-built readiness snapshot can be evaluated');
    }
    return this.request('/api/v1/evaluation/industry-readiness', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async loadVerifiedPortfolio(studentId, portfolioId) {
    let query = portfolioId
      ? Portfolio.findOne({ _id: portfolioId, student: studentId })
      : sortQuery(Portfolio.findOne({ student: studentId }));
    if (query && typeof query.populate === 'function') {
      query = query.populate({ path: 'workspace', populate: { path: 'project' } });
    }
    query = sortQuery(query);
    const portfolio = await asLean(query);
    if (!portfolio) throw ApiError.notFound('Verified portfolio not found');

    const explicitStatus = portfolio.verificationStatus;
    const isVerified = explicitStatus
      ? String(explicitStatus).toUpperCase() === 'VERIFIED'
      : Boolean(portfolio.verifiedBy && portfolio.verificationHash);
    if (!isVerified) throw ApiError.forbidden('Only verified portfolios can receive an Industry Readiness Score');
    return portfolio;
  }

  async buildTrustedIndustryReadinessPayload(studentId, portfolioId) {
    const portfolio = await this.loadVerifiedPortfolio(studentId, portfolioId);
    const resolvedPortfolioId = String(portfolio._id);

    const [portfolioEvaluation, atsEvaluation, githubAnalytics, skillProfile, skillGapAnalysis, recommendations, projects, certificates, githubAccount] = await Promise.all([
      asLean(sortQuery(PortfolioEvaluation.findOne({ studentId, portfolioId: resolvedPortfolioId }))),
      asLean(sortQuery(ResumeEvaluation.findOne({ studentId, portfolioId: resolvedPortfolioId }))),
      asLean(sortQuery(GitHubAnalytics.findOne({ userId: studentId }), 'calculatedAt')),
      asLean(sortQuery(StudentSkillProfile.findOne({ studentId, portfolioId: resolvedPortfolioId }))),
      asLean(sortQuery(SkillGapAnalysis.findOne({ studentId }))),
      asLean(sortQuery(Recommendation.find({ studentId, status: 'ACTIVE' }))),
      asLean(Project.find({ userId: studentId, verificationStatus: 'Verified' })),
      asLean(Certificate.find({ userId: studentId, verificationStatus: 'Verified' })),
      asLean(GitHubAccount.findOne({ userId: studentId })),
    ]);

    const project = portfolio.workspace?.project || {};
    const recommendationList = (Array.isArray(recommendations) ? recommendations : [recommendations])
      .map(toRecommendationSnapshot)
      .filter(Boolean)
      .sort((left, right) => (priorityRank[right.priority] || 0) - (priorityRank[left.priority] || 0));

    const verifiedAchievements = [
      {
        type: 'verified_portfolio',
        label: `Verified portfolio: ${portfolio.projectTitle || project.title || resolvedPortfolioId}`,
        verified: true,
        evidence: portfolio.verificationHash ? ['Portfolio verification hash is present.'] : [],
      },
      ...(Array.isArray(projects) ? projects : []).map((item) => ({
        type: 'verified_project',
        label: `Verified project: ${item.title}`,
        verified: true,
        evidence: item.githubRepository ? ['Project has an associated GitHub repository.'] : [],
      })),
      ...(Array.isArray(certificates) ? certificates : []).map((item) => ({
        type: 'verified_certificate',
        label: `Verified certificate: ${item.title}`,
        verified: true,
        evidence: item.issuer ? [`Issued by ${item.issuer}.`] : [],
      })),
      ...(githubAccount?.connectionStatus === 'Connected' ? [{
        type: 'verified_github_association',
        label: `Verified GitHub association: ${githubAccount.githubUsername}`,
        verified: true,
        evidence: githubAccount.lastSyncedAt ? [`Last synchronized at ${githubAccount.lastSyncedAt.toISOString()}.`] : [],
      }] : []),
    ];

    const skillGap = skillGapAnalysis || {};
    const sourceVersions = {
      portfolioEvaluationVersion: sourceVersion(portfolioEvaluation, 'scoringVersion', 'version'),
      atsEvaluationVersion: sourceVersion(atsEvaluation, 'scoringVersion', 'version'),
      githubAnalyticsVersion: sourceVersion(githubAnalytics, 'analyticsVersion', 'version'),
      skillProfileVersion: sourceVersion(skillProfile, 'version', 'scoringVersion'),
      skillGapAnalysisVersion: sourceVersion(skillGap, 'analysisVersion', 'version'),
    };

    return {
      studentId: String(studentId),
      portfolioId: resolvedPortfolioId,
      verificationStatus: 'VERIFIED',
      portfolioEvaluation: {
        portfolioScore: toFiniteNumber(portfolioEvaluation?.portfolioScore),
        breakdown: safeBreakdown(portfolioEvaluation?.breakdown) || {},
        scoringVersion: sourceVersions.portfolioEvaluationVersion,
      },
      atsEvaluation: {
        atsScore: toFiniteNumber(atsEvaluation?.atsScore),
        breakdown: safeBreakdown(atsEvaluation?.breakdown) || {},
        scoringVersion: sourceVersions.atsEvaluationVersion,
      },
      githubAnalytics: {
        repositoryCount: toFiniteNumber(githubAnalytics?.repositoryCount),
        activeRepositoryCount: toFiniteNumber(githubAnalytics?.activeRepositoryCount),
        commitCount: toFiniteNumber(githubAnalytics?.commitCount),
        recentCommitCount: toFiniteNumber(githubAnalytics?.recentCommitCount),
        readmeCoverage: toFiniteNumber(githubAnalytics?.readmeCoverage),
        documentationCoverage: toFiniteNumber(githubAnalytics?.documentationCoverage),
        languages: Array.isArray(githubAnalytics?.languages) ? githubAnalytics.languages.slice(0, 50) : [],
        analyticsVersion: sourceVersions.githubAnalyticsVersion,
        recentActivityDate: githubAnalytics?.recentActivityDate || null,
      },
      skillProfile: {
        skills: Array.isArray(skillProfile?.skills)
          ? skillProfile.skills.map(toSkillSnapshot).filter((skill) => skill.name)
          : [],
        version: sourceVersions.skillProfileVersion,
      },
      skillGapAnalysis: {
        missingRequiredSkills: Array.isArray(skillGap.missingRequiredSkills) ? skillGap.missingRequiredSkills.slice(0, 50) : [],
        missingPreferredSkills: Array.isArray(skillGap.missingPreferredSkills) ? skillGap.missingPreferredSkills.slice(0, 50) : [],
        weakEvidenceSkills: Array.isArray(skillGap.weakEvidenceSkills) ? skillGap.weakEvidenceSkills.slice(0, 50) : [],
        targetRole: skillGap.targetRole || '',
        matchedSkills: Array.isArray(skillGap.matchedSkills) ? skillGap.matchedSkills.slice(0, 100) : [],
        matchPercentage: Number.isFinite(Number(skillGap.matchPercentage)) ? Number(skillGap.matchPercentage) : null,
        portfolioDomain: project.domain || project.category || '',
        projectTitle: project.title || portfolio.projectTitle || '',
        projectTechnologies: Array.isArray(project.technologies) ? project.technologies.slice(0, 50) : [],
        projectRelevance: getNumericFromBreakdown(portfolioEvaluation?.breakdown, ['projectrelevance']),
        analysisVersion: sourceVersions.skillGapAnalysisVersion,
      },
      recommendations: recommendationList,
      verifiedAchievements,
    };
  }

  async persistIndustryReadiness(studentId, portfolioId, response) {
    const result = response.data;
    const sourceVersions = result.sourceVersions || {};
    const saved = await IndustryReadinessEvaluation.create({
      studentId,
      portfolioId,
      industryReadinessScore: result.industryReadinessScore,
      category: result.category,
      breakdown: result.breakdown,
      strengths: result.strengths,
      gaps: result.gaps,
      topRecommendations: result.topRecommendations,
      scoringVersion: result.scoringVersion || SCORING_VERSION,
      portfolioEvaluationVersion: sourceVersions.portfolioEvaluationVersion || null,
      atsEvaluationVersion: sourceVersions.atsEvaluationVersion || null,
      githubAnalyticsVersion: sourceVersions.githubAnalyticsVersion || null,
      skillProfileVersion: sourceVersions.skillProfileVersion || null,
      skillGapAnalysisVersion: sourceVersions.skillGapAnalysisVersion || null,
      generatedAt: toDate(result.generatedAt) || new Date(),
    });
    return asPublicEvaluation(saved);
  }

  async isCachedEvaluationFresh(cached, sourceRecords, currentSourceVersions = {}) {
    if (!cached || cached.scoringVersion !== SCORING_VERSION) return false;
    const generatedAt = toDate(cached.generatedAt);
    if (!generatedAt) return false;
    const versionFields = [
      'portfolioEvaluationVersion',
      'atsEvaluationVersion',
      'githubAnalyticsVersion',
      'skillProfileVersion',
      'skillGapAnalysisVersion',
    ];
    if (versionFields.some((field) => (cached[field] || null) !== (currentSourceVersions[field] || null))) {
      return false;
    }
    const newestSource = sourceRecords
      .map((record) => sourceTimestamp(record, 'generatedAt', 'evaluatedAt', 'calculatedAt', 'updatedAt', 'createdAt'))
      .filter(Boolean)
      .reduce((newest, current) => (current > newest ? current : newest), new Date(0));
    return generatedAt >= newestSource;
  }

  async getCachedIndustryReadiness(studentId, portfolioId) {
    return asLean(sortQuery(IndustryReadinessEvaluation.findOne({ studentId, portfolioId })));
  }

  async getIndustryReadiness(studentId, portfolioId) {
    const payload = await this.buildTrustedIndustryReadinessPayload(studentId, portfolioId);
    const cached = await this.getCachedIndustryReadiness(studentId, payload.portfolioId);
    const sourceRecords = await Promise.all([
      asLean(sortQuery(PortfolioEvaluation.findOne({ studentId, portfolioId: payload.portfolioId }))),
      asLean(sortQuery(ResumeEvaluation.findOne({ studentId, portfolioId: payload.portfolioId }))),
      asLean(sortQuery(GitHubAnalytics.findOne({ userId: studentId }), 'calculatedAt')),
      asLean(sortQuery(StudentSkillProfile.findOne({ studentId, portfolioId: payload.portfolioId }))),
      asLean(sortQuery(SkillGapAnalysis.findOne({ studentId }))),
      asLean(sortQuery(Portfolio.findOne({ _id: payload.portfolioId }))),
      asLean(sortQuery(Project.findOne({ userId: studentId }))),
      asLean(sortQuery(Certificate.findOne({ userId: studentId }))),
      asLean(sortQuery(GitHubAccount.findOne({ userId: studentId }))),
      asLean(sortQuery(Recommendation.findOne({ studentId, status: 'ACTIVE' }))),
    ]);
    const currentSourceVersions = {
      portfolioEvaluationVersion: payload.portfolioEvaluation.scoringVersion || null,
      atsEvaluationVersion: payload.atsEvaluation.scoringVersion || null,
      githubAnalyticsVersion: payload.githubAnalytics.analyticsVersion || null,
      skillProfileVersion: payload.skillProfile.version || null,
      skillGapAnalysisVersion: payload.skillGapAnalysis.analysisVersion || null,
    };
    if (await this.isCachedEvaluationFresh(cached, sourceRecords, currentSourceVersions)) {
      return asPublicEvaluation(cached);
    }

    return this.evaluateTrustedIndustryReadiness(studentId, payload, true);
  }

  async evaluateTrustedIndustryReadiness(studentId, payload, persist = true) {
    const response = await this.calculateIndustryReadiness(payload);
    if (!persist) return response.data;
    return this.persistIndustryReadiness(studentId, payload.portfolioId, response);
  }

  async evaluateIndustryReadiness(studentId, portfolioId) {
    // Supports direct use with a server-built snapshot as well as the
    // authenticated orchestration form used by the API controller.
    if (studentId && typeof studentId === 'object' && portfolioId === undefined) {
      return this.calculateIndustryReadiness(studentId);
    }
    const payload = await this.buildTrustedIndustryReadinessPayload(studentId, portfolioId);
    return this.evaluateTrustedIndustryReadiness(studentId, payload, true);
  }

  async evaluateVerifiedIndustryReadiness(studentId, portfolioId) {
    return this.evaluateIndustryReadiness(studentId, portfolioId);
  }

  async refreshIndustryReadiness(studentId, portfolioId) {
    return this.evaluateIndustryReadiness(studentId, portfolioId);
  }
}

const aiService = new AIService();

export { AIService, industryReadinessResponseSchema };
export default aiService;

