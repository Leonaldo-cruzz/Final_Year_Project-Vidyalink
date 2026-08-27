import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Portfolio from '../models/portfolio.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Recommendation from '../models/recommendation.model.js';
import RecommendationRun from '../models/recommendationRun.model.js';
import Resume from '../models/resume.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import User from '../models/user.model.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import aiService from './ai.service.js';

export const RECOMMENDATION_ALGORITHM_VERSION = '1.0';

const SCOPES = Object.freeze({
  ALUMNI: ['ALUMNI_MENTOR'],
  RECRUITERS: ['RECRUITER_OPPORTUNITY'],
  IMPROVEMENTS: ['SKILL_IMPROVEMENT', 'PROJECT_IMPROVEMENT', 'RESUME_IMPROVEMENT'],
});

const uniqueStrings = (...lists) => [...new Set(
  lists
    .flat()
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())
)].sort((left, right) => left.localeCompare(right));

const yearsOfExperience = (experiences = []) => experiences.reduce((total, experience) => {
  if (!experience?.startDate) return total;
  const started = new Date(experience.startDate).getTime();
  const ended = experience.isCurrent || !experience.endDate
    ? Date.now()
    : new Date(experience.endDate).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started) return total;
  return total + ((ended - started) / (365.25 * 24 * 60 * 60 * 1000));
}, 0);

const hasProjectEvidence = (project) => Boolean(
  project.githubRepository
  || project.liveDeployment
  || project.demoVideo
  || project.screenshots?.length
);

const projectSnapshot = (project) => ({
  domain: project.domain || null,
  category: project.category || null,
  technologies: uniqueStrings(project.technologies),
  hasDocumentation: Boolean(project.documentationUrl),
  hasProjectEvidence: hasProjectEvidence(project),
  verified: project.verificationStatus === 'Verified',
});

const asPublicRecommendation = (recommendation) => ({
  id: String(recommendation._id),
  entityId: recommendation.targetId,
  type: recommendation.type,
  matchScore: recommendation.matchScore,
  reasons: recommendation.reasons,
  matchedSkills: recommendation.matchedSkills,
  missingSkills: recommendation.missingSkills,
  priority: recommendation.priority,
  status: recommendation.status,
  algorithmVersion: recommendation.algorithmVersion,
  generatedAt: recommendation.generatedAt,
  createdAt: recommendation.createdAt,
  updatedAt: recommendation.updatedAt,
});

class RecommendationService {
  constructor() {
    this.inFlightRefreshes = new Map();
  }

  assertSelf(authenticatedStudentId, requestedStudentId) {
    if (String(authenticatedStudentId) !== String(requestedStudentId)) {
      throw ApiError.forbidden('Students can only request recommendations for themselves');
    }
  }

  async listActive(studentId) {
    const recommendations = await Recommendation.find({
      studentId,
      status: 'ACTIVE',
      algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
    }).sort({ matchScore: -1, generatedAt: -1, targetId: 1 }).lean();

    return recommendations.map(asPublicRecommendation);
  }

  async getForScope(authenticatedStudentId, requestedStudentId, scope) {
    this.assertSelf(authenticatedStudentId, requestedStudentId);
    if (!SCOPES[scope]) throw ApiError.badRequest('Unsupported recommendation scope');

    if (await this.isFresh(authenticatedStudentId, scope)) {
      return this.listScope(authenticatedStudentId, scope);
    }

    return this.refreshScope(authenticatedStudentId, scope);
  }

  async refresh(studentId, requestedScopes = Object.keys(SCOPES)) {
    const scopes = [...new Set(requestedScopes)];
    const refreshed = await Promise.all(scopes.map(async (scope) => [
      scope.toLowerCase(),
      await this.refreshScope(studentId, scope),
    ]));
    return Object.fromEntries(refreshed);
  }

  async setStatus(studentId, recommendationId, status) {
    const recommendation = await Recommendation.findOneAndUpdate(
      {
        _id: recommendationId,
        studentId,
        status: 'ACTIVE',
        algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
      },
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();

    if (!recommendation) {
      throw ApiError.notFound('Active recommendation not found');
    }

    return asPublicRecommendation(recommendation);
  }

  async isFresh(studentId, scope) {
    const run = await RecommendationRun.findOne({
      studentId,
      scope,
      algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
    }).lean();
    if (!run) return false;

    return (Date.now() - new Date(run.generatedAt).getTime()) < env.RECOMMENDATION_CACHE_TTL_MS;
  }

  async listScope(studentId, scope) {
    const recommendations = await Recommendation.find({
      studentId,
      type: { $in: SCOPES[scope] },
      status: 'ACTIVE',
      algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
    }).sort({ matchScore: -1, targetId: 1 }).lean();
    return recommendations.map(asPublicRecommendation);
  }

  async refreshScope(studentId, scope) {
    if (!SCOPES[scope]) throw ApiError.badRequest('Unsupported recommendation scope');
    const key = `${studentId}:${scope}`;
    if (this.inFlightRefreshes.has(key)) return this.inFlightRefreshes.get(key);

    const refreshPromise = this.generateAndPersistScope(studentId, scope)
      .finally(() => this.inFlightRefreshes.delete(key));
    this.inFlightRefreshes.set(key, refreshPromise);
    return refreshPromise;
  }

  async generateAndPersistScope(studentId, scope) {
    const student = await this.getTrustedStudentSnapshot(studentId);
    let computed;

    if (scope === 'ALUMNI') {
      computed = await aiService.getAlumniRecommendations(student, await this.getEligibleAlumni(studentId));
    } else if (scope === 'RECRUITERS') {
      computed = await aiService.getRecruiterRecommendations(student, await this.getEligibleOpportunities());
    } else {
      computed = await aiService.getImprovementRecommendations(student);
    }

    return this.persistScope(studentId, scope, computed);
  }

  async persistScope(studentId, scope, computedRecommendations) {
    const allowedTypes = SCOPES[scope];
    const now = new Date();
    const recommendations = computedRecommendations
      .filter((recommendation) => allowedTypes.includes(recommendation.type))
      .map((recommendation) => ({
        studentId,
        type: recommendation.type,
        targetId: recommendation.entityId,
        matchScore: recommendation.matchScore,
        reasons: recommendation.reasons,
        matchedSkills: recommendation.matchedSkills,
        missingSkills: recommendation.missingSkills,
        priority: recommendation.priority,
        status: 'ACTIVE',
        algorithmVersion: recommendation.algorithmVersion,
        generatedAt: now,
      }));

    // Calculate first, then replace only active cache rows.  Accepted and
    // dismissed records remain as user-action history and are never returned.
    await Recommendation.deleteMany({
      studentId,
      type: { $in: allowedTypes },
      status: 'ACTIVE',
      algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION,
    });
    if (recommendations.length) await Recommendation.insertMany(recommendations, { ordered: true });
    await RecommendationRun.findOneAndUpdate(
      { studentId, scope, algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION },
      { $set: { generatedAt: now } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return this.listScope(studentId, scope);
  }

  async getTrustedStudentSnapshot(studentId) {
    const [profile, studentProfile, projects, portfolios, certificates, resume, githubAccount] = await Promise.all([
      Profile.findOne({ user: studentId }).lean(),
      StudentProfile.findOne({ user: studentId }).lean(),
      Project.find({ userId: studentId }).lean(),
      Portfolio.find({ student: studentId }).lean(),
      Certificate.find({ userId: studentId }).lean(),
      Resume.findOne({ userId: studentId }).lean(),
      GitHubAccount.findOne({ userId: studentId }).lean(),
    ]);

    const verifiedProjects = projects.filter((project) => project.verificationStatus === 'Verified');
    const verifiedCertificates = certificates.filter((certificate) => certificate.verificationStatus === 'Verified');
    const allProjects = projects.map(projectSnapshot);
    const documentedProjects = allProjects.filter((project) => project.hasDocumentation).length;
    const projectsWithEvidence = allProjects.filter((project) => project.hasProjectEvidence).length;
    const projectCount = allProjects.length;
    const portfolioScore = Math.round(Math.min(100,
      (projectCount > 0 ? 25 : 0)
      + (projectCount ? (documentedProjects / projectCount) * 20 : 0)
      + (projectCount ? (verifiedProjects.length / projectCount) * 25 : 0)
      + (portfolios.length > 0 ? 20 : 0)
      + (githubAccount?.connectionStatus === 'Connected' ? 10 : 0)
    ));
    const githubScore = githubAccount?.connectionStatus === 'Connected'
      ? Math.round(50 + (Math.min(githubAccount.publicRepos || 0, 10) * 5))
      : 0;

    const profileSkills = uniqueStrings(profile?.skills, studentProfile?.skills);
    const verifiedEvidenceSkills = uniqueStrings(
      verifiedProjects.flatMap((project) => project.technologies || []),
      portfolios.flatMap((portfolio) => portfolio.skillsVerified || []),
      verifiedCertificates.flatMap((certificate) => certificate.skills || [])
    );
    const skills = uniqueStrings(profileSkills, verifiedEvidenceSkills);
    const domains = uniqueStrings(
      allProjects.map((project) => project.domain || project.category),
      studentProfile?.branch ? [studentProfile.branch] : [],
      profile?.branch ? [profile.branch] : []
    );
    const relevantOpportunitySkills = await this.getVisibleOpportunitySkills();
    const skillGaps = relevantOpportunitySkills.filter((skill) => !skills.some(
      (studentSkill) => studentSkill.toLowerCase() === skill.toLowerCase()
    ));

    return {
      studentId: String(studentId),
      skills,
      skillGaps,
      projects: allProjects,
      interests: uniqueStrings(profile?.interests),
      domains,
      portfolioScore,
      // ATS analysis is not persisted by the current platform schema, so it
      // stays null rather than claiming a client-provided score is trusted.
      atsScore: null,
      githubScore,
      experienceYears: Number(yearsOfExperience(studentProfile?.experience).toFixed(2)),
      verificationEvidence: verifiedProjects.length > 0 || verifiedCertificates.length > 0 || portfolios.length > 0,
      evidence: {
        projectCount,
        undocumentedProjectCount: projectCount - documentedProjects,
        projectEvidenceMissingCount: projectCount - projectsWithEvidence,
        hasResume: Boolean(resume),
        githubConnected: githubAccount?.connectionStatus === 'Connected',
        githubPublicRepos: githubAccount?.publicRepos || 0,
        verifiedCertificateCount: verifiedCertificates.length,
        profileCompletion: Number.isFinite(profile?.profileCompletion)
          ? profile.profileCompletion
          : null,
        weakEvidenceSkills: profileSkills.filter((skill) => !verifiedEvidenceSkills.some(
          (evidenceSkill) => evidenceSkill.toLowerCase() === skill.toLowerCase()
        )),
      },
    };
  }

  async getEligibleAlumni(studentId) {
    const alumni = await User.find({
      _id: { $ne: studentId },
      role: 'alumni',
      status: 'active',
      isEmailVerified: true,
      'mentorProfile.available': true,
      'mentorProfile.visibility': 'public',
    }).select('_id mentorProfile isEmailVerified status').lean();

    return alumni
      .map((alumnus) => ({
        entityId: String(alumnus._id),
        expertise: uniqueStrings(alumnus.mentorProfile?.expertise),
        domains: uniqueStrings(alumnus.mentorProfile?.domains),
        interests: uniqueStrings(alumnus.mentorProfile?.interests),
        industries: uniqueStrings(alumnus.mentorProfile?.industries),
        experienceYears: alumnus.mentorProfile?.experienceYears || 0,
        verified: alumnus.isEmailVerified,
        active: alumnus.status === 'active',
        visible: alumnus.mentorProfile?.visibility === 'public',
      }))
      .filter((candidate) => candidate.expertise.length > 0);
  }

  async getEligibleOpportunities() {
    const recruiters = await User.find({
      role: 'recruiter',
      status: 'active',
      isEmailVerified: true,
    }).select('_id').lean();
    const recruiterIds = recruiters.map((recruiter) => recruiter._id);
    if (!recruiterIds.length) return [];

    const opportunities = await Project.find({
      userId: { $in: recruiterIds },
      'opportunity.isOpen': true,
      'opportunity.visibility': 'public',
    }).select('userId technologies domain category opportunity').lean();

    return opportunities.map((opportunity) => ({
      entityId: String(opportunity._id),
      requiredSkills: uniqueStrings(
        opportunity.opportunity?.requiredSkills?.length
          ? opportunity.opportunity.requiredSkills
          : opportunity.technologies
      ),
      preferredSkills: uniqueStrings(opportunity.opportunity?.preferredSkills),
      domains: uniqueStrings([opportunity.domain || opportunity.category]),
      minimumExperienceYears: opportunity.opportunity?.minimumExperienceYears || 0,
      verified: true,
      active: true,
      visible: opportunity.opportunity?.visibility === 'public',
    }));
  }

  async getVisibleOpportunitySkills() {
    const opportunities = await this.getEligibleOpportunities();
    return uniqueStrings(opportunities.flatMap((opportunity) => opportunity.requiredSkills));
  }
}

export { SCOPES, asPublicRecommendation, uniqueStrings };
export default new RecommendationService();
