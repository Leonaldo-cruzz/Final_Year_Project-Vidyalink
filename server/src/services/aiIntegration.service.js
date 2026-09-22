import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import mongoose from 'mongoose';

import { env } from '../config/env.js';
import Application from '../models/application.model.js';
import AIAnalysis from '../models/aiAnalysis.model.js';
import AIEvaluation from '../models/aiEvaluation.model.js';
import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Portfolio from '../models/portfolio.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Resume from '../models/resume.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import { RESUME_DIRECTORY } from '../middleware/resumeUpload.middleware.js';
import aiService from './ai.service.js';

const AI_VERSION = '1.0.0';

const toId = (value) => (value?._id || value)?.toString();

const uniqueStrings = (values = []) => [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];

const isValidId = (value) => mongoose.isValidObjectId(value);

const insufficientEvidence = (reason, extra = {}) => ({
  status: 'insufficient_evidence',
  reason,
  ...extra,
});

const mapEvaluation = (evaluation) => ({
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
  createdAt: evaluation.createdAt,
  updatedAt: evaluation.updatedAt,
  evaluationStatus: evaluation.evaluationStatus,
  status: evaluation.status || evaluation.evaluationStatus,
  projectEvaluations: evaluation.projectEvaluations || evaluation.project_evaluations || [],
  evaluationVersion: evaluation.evaluationVersion,
  contentHash: evaluation.contentHash,
  sourceUpdatedAt: evaluation.sourceUpdatedAt,
  pipelineStatus: evaluation.pipelineStatus,
});

const mapAnalysis = (analysis) => ({
  id: analysis._id,
  studentId: analysis.studentId,
  portfolioId: analysis.portfolioId,
  analysisType: analysis.analysisType,
  result: analysis.result,
  provider: analysis.provider,
  model: analysis.model,
  version: analysis.version,
  createdAt: analysis.createdAt,
  updatedAt: analysis.updatedAt,
  evaluationVersion: analysis.evaluationVersion,
  contentHash: analysis.contentHash,
  sourceUpdatedAt: analysis.sourceUpdatedAt,
});

const stableValue = (value) => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key]);
      return result;
    }, {});
  }
  return value;
};

const fingerprint = (value) => crypto
  .createHash('sha256')
  .update(JSON.stringify(stableValue(value)))
  .digest('hex');

const extractResumeText = async (resume) => {
  if (!resume?.storedFileName) return null;

  const safeFileName = path.basename(resume.storedFileName);
  const resumeDirectory = path.resolve(RESUME_DIRECTORY);
  const filePath = path.resolve(resumeDirectory, safeFileName);
  if (!filePath.startsWith(`${resumeDirectory}${path.sep}`)) return null;

  try {
    const buffer = await fs.readFile(filePath);
    const module = await import('pdf-parse');
    const parsePdf = module.default || module;
    const parsed = await parsePdf(buffer);
    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
    return text || null;
  } catch {
    return null;
  }
};

class AIIntegrationService {
  constructor({ client = aiService, models = {} } = {}) {
    this.client = client;
    this.models = {
      AIAnalysis,
      AIEvaluation,
      Application,
      Certificate,
      GitHubAccount,
      Portfolio,
      Profile,
      Project,
      Resume,
      User,
      ...models,
    };
  }

  async health() {
    return this.client.health();
  }

  async resolvePortfolio(user, portfolioId, { allowMissing = false } = {}) {
    if (portfolioId && !isValidId(portfolioId)) {
      throw ApiError.badRequest('Invalid portfolio id');
    }
    if (!portfolioId && user.role !== 'student') {
      throw ApiError.badRequest('portfolioId is required for this role');
    }

    const query = portfolioId ? { _id: portfolioId } : { student: user._id };
    if (user.role === 'student') query.student = user._id;

    const portfolio = await this.models.Portfolio.findOne(query)
      .populate('student', 'fullName email college branch graduationYear role')
      .populate('verifiedBy', 'fullName email role')
      .populate('project')
      .populate({
        path: 'workspace',
        populate: { path: 'project' },
      })
      .sort({ createdAt: -1 });

    if (!portfolio && !allowMissing) throw ApiError.notFound('Verified portfolio not found');
    if (portfolio && user.role === 'recruiter') {
      const studentId = toId(portfolio.student);
      const hasCandidateAccess = await this.models.Application.exists({
        $or: [
          { studentId, recruiterId: user._id },
          { student: studentId, recruiterId: user._id },
        ],
      });
      if (!hasCandidateAccess) throw ApiError.forbidden('Recruiters may only access AI results for their candidates');
    }
    return portfolio;
  }

  async resolveTarget(user, { portfolioId, studentId } = {}) {
    if (user.role === 'student') {
      if (studentId && toId(studentId) !== toId(user._id)) {
        throw ApiError.forbidden('Students may only analyze their own records');
      }
      const portfolio = await this.resolvePortfolio(user, portfolioId, { allowMissing: true });
      return { studentId: user._id, portfolio };
    }

    if (user.role === 'recruiter' && !portfolioId) {
      throw ApiError.badRequest('portfolioId is required for recruiter analysis');
    }

    let portfolio = null;
    if (portfolioId) portfolio = await this.resolvePortfolio(user, portfolioId);
    const resolvedStudentId = studentId || toId(portfolio?.student);
    if (!resolvedStudentId || !isValidId(resolvedStudentId)) {
      throw ApiError.badRequest('A valid studentId or portfolioId is required');
    }
    return { studentId: resolvedStudentId, portfolio };
  }

  async getStudentContext(studentId) {
    const [student, profile, resume, github, certificates] = await Promise.all([
      this.models.User.findById(studentId).select('fullName email college branch graduationYear role').lean(),
      this.models.Profile.findOne({ user: studentId }).lean(),
      this.models.Resume.findOne({ userId: studentId }).lean(),
      this.models.GitHubAccount.findOne({ userId: studentId }).lean(),
      this.models.Certificate.find({ userId: studentId, verificationStatus: 'Verified' }).lean(),
    ]);

    if (!student) throw ApiError.notFound('Student not found');
    return { student, profile, resume, github, certificates };
  }

  async buildPortfolioPayload(portfolio, studentId) {
    const context = await this.getStudentContext(studentId);
    let project = portfolio?.workspace?.project || portfolio?.project;
    const resumeText = context.resume?.rawText || await extractResumeText(context.resume);
    const profile = context.profile || {};
    const student = context.student;

    const payload = {
      student_id: studentId.toString(),
      name: student.fullName,
      skills: uniqueStrings([...(profile.skills || []), ...(portfolio?.skillsVerified || [])]),
      education: [
        {
          institution: profile.college || student.college || null,
          degree: profile.degree || null,
          field_of_study: profile.branch || student.branch || null,
          graduation_year: profile.graduationYear || student.graduationYear || null,
        },
      ].filter((education) => Object.values(education).some(Boolean)),
      projects: [],
      certificates: context.certificates.map((certificate) => ({
        name: certificate.title,
        issuer: certificate.issuer,
        verification_url: certificate.credentialUrl,
        verified: certificate.verificationStatus === 'Verified',
      })),
      resume: resumeText ? { text: resumeText } : null,
      career_interests: uniqueStrings(profile.interests || []),
      graduation_year: profile.graduationYear || student.graduationYear || null,
    };

    if (context.github?.connectionStatus === 'Connected') {
      const recentlySynced = context.github.lastSyncedAt
        && (Date.now() - new Date(context.github.lastSyncedAt).getTime()) <= 90 * 24 * 60 * 60 * 1000;
      payload.github = {
        repository_count: context.github.publicRepos,
        public_repository_count: context.github.publicRepos,
        recent_activity: Boolean(recentlySynced),
      };
    }

    const mapProject = (p, isVerified) => ({
      title: p.title,
      description: p.detailedDescription || p.shortDescription || '',
      technologies: p.technologies || [],
      github_url: p.githubRepository || null,
      demo_url: p.liveDeployment || p.demoVideo || null,
      deployment_url: p.liveDeployment || null,
      deployment_status: p.deploymentStatus || null,
      documentation: p.documentationUrl || null,
      complexity_indicators: uniqueStrings([p.category, p.domain]),
      innovation_indicators: [],
      code_quality_indicators: [],
      verified: Boolean(isVerified),
      verification_status: isVerified ? 'verified' : (p.verificationStatus ? p.verificationStatus.toLowerCase() : 'pending'),
    });

    let studentProjects = [];
    if (this.models.Project?.find) {
      studentProjects = await this.models.Project.find({ userId: studentId }).lean();
    }

    const seenProjectIds = new Set();
    for (const p of studentProjects) {
      seenProjectIds.add(p._id.toString());
      const isVerified = p.verificationStatus === 'Verified' || Boolean(
        portfolio?.verifiedBy && portfolio?.verificationHash && (
          portfolio.project?.toString() === p._id.toString() ||
          portfolio.workspace?.project?.toString() === p._id.toString()
        )
      );
      payload.projects.push(mapProject(p, isVerified));
    }

    if (project && (!project._id || !seenProjectIds.has(project._id.toString()))) {
      payload.projects.push(mapProject(project, Boolean(portfolio?.verifiedBy && portfolio?.verificationHash)));
    }

    return { payload, context, project: project || studentProjects[0] || null };
  }

  async getPortfolioSourceFingerprint(portfolio, studentId) {
    const built = await this.buildPortfolioPayload(portfolio, studentId) || {};
    const context = built.context || {};
    const project = built.project || null;
    const sourceSnapshot = {
      portfolio: {
        id: toId(portfolio),
        updatedAt: portfolio?.updatedAt,
        issuedAt: portfolio?.issuedAt,
        verificationHash: portfolio?.verificationHash,
        skillsVerified: portfolio?.skillsVerified || [],
        milestonesSummary: portfolio?.milestonesSummary || [],
      },
      project: project && {
        id: toId(project),
        updatedAt: project.updatedAt,
        title: project.title,
        detailedDescription: project.detailedDescription,
        shortDescription: project.shortDescription,
        technologies: project.technologies || [],
        githubRepository: project.githubRepository,
        liveDeployment: project.liveDeployment,
        documentationUrl: project.documentationUrl,
        category: project.category,
        domain: project.domain,
      },
      profile: context.profile && {
        id: toId(context.profile),
        updatedAt: context.profile.updatedAt,
        skills: context.profile.skills || [],
        interests: context.profile.interests || [],
        college: context.profile.college,
        branch: context.profile.branch,
        degree: context.profile.degree,
        graduationYear: context.profile.graduationYear,
      },
      resume: context.resume && {
        id: toId(context.resume),
        updatedAt: context.resume.updatedAt,
        storedFileName: context.resume.storedFileName,
      },
      github: context.github && {
        id: toId(context.github),
        updatedAt: context.github.updatedAt,
        lastSyncedAt: context.github.lastSyncedAt,
        connectionStatus: context.github.connectionStatus,
        publicRepos: context.github.publicRepos,
      },
      certificates: (context.certificates || []).map((certificate) => ({
        id: toId(certificate),
        updatedAt: certificate.updatedAt,
        title: certificate.title,
        issuer: certificate.issuer,
        verificationStatus: certificate.verificationStatus,
      })),
    };
    const timestamps = Object.values(sourceSnapshot)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .flatMap((value) => (value && typeof value === 'object' ? [value.updatedAt, value.lastSyncedAt, value.issuedAt] : []))
      .filter(Boolean)
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite);

    return {
      ...built,
      sourceSnapshot,
      contentHash: fingerprint(sourceSnapshot),
      sourceUpdatedAt: timestamps.length ? new Date(Math.max(...timestamps)) : new Date(),
    };
  }

  async storePortfolioEvaluation({ portfolio, studentId, result, contentHash, sourceUpdatedAt, force = false }) {
    const previous = isValidId(portfolio._id) && this.models.AIEvaluation.findOne
      ? await this.models.AIEvaluation.findOne({ portfolioId: portfolio._id })
        .sort({ evaluationVersion: -1, createdAt: -1 })
      : null;
    if (!force && contentHash && previous?.contentHash === contentHash) return previous;
    const evaluationVersion = (previous?.evaluationVersion || 0) + 1;
    const dedupeKey = contentHash
      ? (force ? `${contentHash}:reevaluate:${evaluationVersion}` : contentHash)
      : undefined;
    try {
      return await this.models.AIEvaluation.create({
        studentId,
        portfolioId: portfolio._id,
        overallScore: result.overall_score,
        category: result.category,
        componentScores: result.component_scores,
        weightedBreakdown: result.weighted_breakdown,
        evidence: result.evidence,
        strengths: result.strengths,
        improvements: result.improvements || result.improvement_suggestions,
        dataCompleteness: result.data_completeness,
        evidenceStatus: result.evidence_status,
        provider: env.AI_PROVIDER,
        model: 'deterministic-heuristics',
        version: AI_VERSION,
        evaluationStatus: 'COMPLETED',
        status: 'COMPLETED',
        projectEvaluations: result.project_evaluations || [],
        evaluationVersion,
        contentHash,
        dedupeKey,
        sourceUpdatedAt,
      });
    } catch (error) {
      if (error?.code !== 11000 || !dedupeKey || !this.models.AIEvaluation.findOne) throw error;
      return this.models.AIEvaluation.findOne({ portfolioId: portfolio._id, dedupeKey });
    }
  }

  async evaluatePortfolio(user, portfolioId, { force = false, preparedSource = null } = {}) {
    const portfolio = await this.resolvePortfolio(user, portfolioId, { allowMissing: true });
    if (!portfolio) return insufficientEvidence('No faculty-verified portfolio is available.');

    const studentId = toId(portfolio.student);
    const prepared = preparedSource || await this.getPortfolioSourceFingerprint(portfolio, studentId);
    const { payload, project } = prepared;
    if (!project || !payload.projects[0].verified) {
      return insufficientEvidence('No verified project evidence is available for official evaluation.');
    }

    const previous = isValidId(portfolio._id) && this.models.AIEvaluation.findOne
      ? await this.models.AIEvaluation.findOne({ portfolioId: portfolio._id })
        .sort({ evaluationVersion: -1, createdAt: -1 })
      : null;
    if (!force && previous?.contentHash && previous.contentHash === prepared.contentHash) {
      return { status: 'evaluated', deduplicated: true, evaluation: mapEvaluation(previous) };
    }
    const result = await this.client.evaluatePortfolio(payload);
    const evaluation = await this.storePortfolioEvaluation({
      portfolio,
      studentId,
      result,
      contentHash: prepared.contentHash,
      sourceUpdatedAt: prepared.sourceUpdatedAt,
      force,
    });
    return { status: 'evaluated', evaluation: mapEvaluation(evaluation) };
  }

  async getPortfolioEvaluation(user, portfolioId) {
    const portfolio = await this.resolvePortfolio(user, portfolioId, { allowMissing: true });
    if (!portfolio) return insufficientEvidence('No faculty-verified portfolio is available.');
    const evaluation = await this.models.AIEvaluation.findOne({ portfolioId: portfolio._id }).sort({ createdAt: -1 });
    if (!evaluation) return { status: 'not_evaluated', portfolioId: portfolio._id };
    return { status: 'evaluated', evaluation: mapEvaluation(evaluation) };
  }

  async storeAnalysis({
    studentId,
    portfolioId = null,
    analysisType,
    result,
    evaluationVersion,
    contentHash,
    sourceUpdatedAt,
  }) {
    const analysis = await this.models.AIAnalysis.create({
      studentId,
      portfolioId,
      analysisType,
      result,
      provider: env.AI_PROVIDER,
      model: 'deterministic-heuristics',
      version: AI_VERSION,
      evaluationVersion,
      contentHash,
      sourceUpdatedAt,
    });
    return mapAnalysis(analysis);
  }

  async analyzeATS(user, body = {}, metadata = {}) {
    const target = await this.resolveTarget(user, body);
    const context = await this.getStudentContext(target.studentId);
    const resumeText = body.resumeText || context.resume?.rawText || await extractResumeText(context.resume);
    if (!resumeText || !resumeText.trim()) return insufficientEvidence('No readable stored resume text is available.');

    const result = await this.client.analyzeATS({
      resume_text: resumeText.trim(),
      job_description: body.jobDescription || body.targetJobDescription || null,
    });
    const analysis = await this.storeAnalysis({
      studentId: target.studentId,
      portfolioId: target.portfolio?._id || null,
      analysisType: 'ats',
      result,
      resumeVersion: metadata.resumeVersion || context.resume?.version || null,
      resumeId: metadata.resumeId || context.resume?._id || null,
      ...metadata,
    });
    return { status: 'analyzed', analysis };
  }

  async extractSkills(user, body = {}, metadata = {}) {
    const target = await this.resolveTarget(user, body);
    const portfolio = target.portfolio;
    const { payload } = portfolio
      ? await this.buildPortfolioPayload(portfolio, target.studentId)
      : { payload: { student_id: target.studentId.toString(), skills: [], projects: [], resume: null } };
    const result = await this.client.extractSkills(payload);
    const analysis = await this.storeAnalysis({
      studentId: target.studentId,
      portfolioId: portfolio?._id || null,
      analysisType: 'skills_extract',
      result,
      ...metadata,
    });
    return { status: 'analyzed', analysis };
  }

  async analyzeSkillGap(user, body = {}, metadata = {}) {
    const target = await this.resolveTarget(user, body);
    const context = await this.getStudentContext(target.studentId);
    const currentSkills = Array.isArray(body.currentSkills)
      ? body.currentSkills
      : (context.profile?.skills || []);
    const requiredSkills = Array.isArray(body.requiredSkills) ? body.requiredSkills : [];
    const result = await this.client.analyzeSkillGap({
      current_skills: currentSkills,
      required_skills: requiredSkills,
      target_role: body.targetRole || null,
    });
    const analysis = await this.storeAnalysis({
      studentId: target.studentId,
      portfolioId: target.portfolio?._id || null,
      analysisType: 'skills_gap',
      result,
      ...metadata,
    });
    return { status: 'analyzed', analysis };
  }

  async analyzeGithub(user, body = {}, metadata = {}) {
    const target = await this.resolveTarget(user, body);
    const context = await this.getStudentContext(target.studentId);
    if (!context.github || context.github.connectionStatus !== 'Connected') {
      return insufficientEvidence('No connected GitHub account is available.');
    }

    const result = await this.client.analyzeGithub({
      repository_count: context.github.publicRepos,
      public_repository_count: context.github.publicRepos,
      recent_activity: Boolean(context.github.lastSyncedAt),
    });
    const analysis = await this.storeAnalysis({
      studentId: target.studentId,
      portfolioId: target.portfolio?._id || null,
      analysisType: 'github',
      result,
      ...metadata,
    });
    return { status: 'analyzed', analysis };
  }

  async calculateReadiness(user, body = {}, metadata = {}) {
    const target = await this.resolveTarget(user, body);
    const [portfolioEvaluation, ats, gap, github] = await Promise.all([
      target.portfolio
        ? this.models.AIEvaluation.findOne({ portfolioId: target.portfolio._id }).sort({ createdAt: -1 })
        : null,
      this.models.AIAnalysis.findOne({ studentId: target.studentId, ...(target.portfolio?._id ? { portfolioId: target.portfolio._id } : {}), analysisType: 'ats' }).sort({ createdAt: -1 }),
      this.models.AIAnalysis.findOne({ studentId: target.studentId, ...(target.portfolio?._id ? { portfolioId: target.portfolio._id } : {}), analysisType: 'skills_gap' }).sort({ createdAt: -1 }),
      this.models.AIAnalysis.findOne({ studentId: target.studentId, ...(target.portfolio?._id ? { portfolioId: target.portfolio._id } : {}), analysisType: 'github' }).sort({ createdAt: -1 }),
    ]);

    const payload = {
      portfolio_score: portfolioEvaluation?.overallScore ?? null,
      ats_score: ats?.result?.ats_score ?? null,
      skills_coverage: gap?.result?.coverage_percentage ?? null,
      github_activity_score: github?.result?.derived_activity_score ?? github?.result?.derived_score ?? null,
      verification_completeness: portfolioEvaluation ? 100 : null,
    };
    if (Object.values(payload).every((value) => value === null)) {
      return insufficientEvidence('No stored AI evidence is available to calculate readiness.');
    }

    const result = await this.client.calculateReadiness(payload);
    const analysis = await this.storeAnalysis({
      studentId: target.studentId,
      portfolioId: target.portfolio?._id || null,
      analysisType: 'readiness',
      result,
      ...metadata,
    });
    return { status: 'analyzed', analysis };
  }

  async getRecommendations(user, body = {}, metadata = {}) {
    const target = await this.resolveTarget(user, body);
    const context = await this.getStudentContext(target.studentId);
    const portfolio = target.portfolio;
    const { payload } = portfolio
      ? await this.buildPortfolioPayload(portfolio, target.studentId)
      : { payload: { skills: context.profile?.skills || [], projects: [] } };

    const latestEvaluation = portfolio?._id && this.models.AIEvaluation.findOne
      ? await this.models.AIEvaluation.findOne({ portfolioId: portfolio._id }).sort({ createdAt: -1 }).lean()
      : null;

    const alumni = await this.models.User.find({ role: 'alumni', status: 'active' })
      .select('_id fullName college branch graduationYear')
      .lean();
    const alumniProfiles = await this.models.Profile.find({ user: { $in: alumni.map((item) => item._id) } }).lean();
    const alumniProfileByUser = new Map(alumniProfiles.map((profile) => [profile.user.toString(), profile]));
    const availableAlumniMentors = alumni.map((person) => {
      const profile = alumniProfileByUser.get(person._id.toString()) || {};
      return {
        id: person._id.toString(),
        name: person.fullName,
        title: profile.headline || null,
        organization: profile.college || person.college || null,
        skills: profile.skills || [],
        domains: profile.interests || [],
        graduation_year: person.graduationYear || profile.graduationYear || null,
      };
    });

    const recruiters = await this.models.User.find({ role: 'recruiter', status: 'active' }).select('_id fullName college').lean();
    const opportunities = await this.models.Project.find({
      userId: { $in: recruiters.map((person) => person._id) },
      projectStatus: { $ne: 'Archived' },
      verificationStatus: { $ne: 'Rejected' },
    }).populate('userId', 'fullName college').lean();
    const availableJobOpportunities = opportunities.map((project) => ({
      id: project._id.toString(),
      name: project.title,
      title: project.category,
      organization: project.userId?.college || project.userId?.fullName || null,
      skills: project.technologies || [],
      required_skills: project.technologies || [],
      domains: uniqueStrings([project.domain, project.category]),
      description: project.shortDescription || null,
    }));

    const rawResult = await this.client.getRecommendations({
      technical_skills: uniqueStrings([...(payload.skills || []), ...(payload.projects?.flatMap((item) => item.technologies || []) || [])]),
      project_domains: payload.projects?.flatMap((item) => item.complexity_indicators || []) || [],
      technologies: payload.projects?.flatMap((item) => item.technologies || []) || [],
      career_interests: payload.career_interests || [],
      graduation_year: payload.graduation_year || null,
      portfolio_score: latestEvaluation?.overallScore ?? null,
      available_alumni_mentors: availableAlumniMentors,
      available_job_opportunities: availableJobOpportunities,
    });

    const formattedResult = {
      skills: rawResult.skills || rawResult.skills_to_develop || [],
      alumni: (rawResult.alumni || rawResult.alumni_mentors || []).map((mentor) => ({
        alumniId: mentor.id,
        id: mentor.id,
        name: mentor.name,
        title: mentor.title,
        organization: mentor.organization,
        matchScore: mentor.match_score !== undefined ? mentor.match_score : mentor.matchScore,
        match_score: mentor.match_score !== undefined ? mentor.match_score : mentor.matchScore,
        matchedSignals: mentor.matched_signals || mentor.matchedSignals || [],
        matched_signals: mentor.matched_signals || mentor.matchedSignals || [],
        matchedSkills: mentor.matched_skills || mentor.matchedSkills || [],
        matched_skills: mentor.matched_skills || mentor.matchedSkills || [],
        reason: mentor.reason,
      })),
      opportunities: (rawResult.opportunities || rawResult.recruiter_opportunities || []).map((opp) => ({
        opportunityId: opp.id,
        id: opp.id,
        name: opp.name,
        title: opp.title,
        organization: opp.organization,
        matchScore: opp.match_score !== undefined ? opp.match_score : opp.matchScore,
        match_score: opp.match_score !== undefined ? opp.match_score : opp.matchScore,
        matchedSkills: opp.matched_skills || opp.matchedSkills || [],
        matched_skills: opp.matched_skills || opp.matchedSkills || [],
        missingSkills: opp.missing_skills || opp.missingSkills || [],
        missing_skills: opp.missing_skills || opp.missingSkills || [],
        matchedSignals: opp.matched_signals || opp.matchedSignals || [],
        matched_signals: opp.matched_signals || opp.matchedSignals || [],
        reason: opp.reason,
      })),
      skills_to_develop: rawResult.skills_to_develop || rawResult.skills || [],
      alumni_mentors: rawResult.alumni_mentors || rawResult.alumni || [],
      recruiter_opportunities: rawResult.recruiter_opportunities || rawResult.opportunities || [],
      notes: rawResult.notes || [],
    };

    if (metadata?.evaluationVersion) {
      const analysis = await this.storeAnalysis({
        studentId: target.studentId,
        portfolioId: portfolio?._id || null,
        analysisType: 'recommendations',
        result: formattedResult,
        ...metadata,
      });
      return { status: 'analyzed', analysis, ...formattedResult };
    }

    return { status: 'analyzed', ...formattedResult };
  }
}

export {
  AIIntegrationService,
  extractResumeText,
  insufficientEvidence,
};

export default new AIIntegrationService();
