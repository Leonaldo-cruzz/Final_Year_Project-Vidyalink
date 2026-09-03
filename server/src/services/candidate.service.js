import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Portfolio from '../models/portfolio.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Resume from '../models/resume.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import recruiterAIService from './recruiterAI.service.js';
import verificationService from './verification.service.js';

// Safe allowlist of fields permitted for sorting
const ALLOWED_SORT_FIELDS = {
  industryReadiness: 'industryReadinessScore',
  portfolioScore: 'portfolioScore',
  atsScore: 'atsScore',
  updatedAt: 'updatedAt',
  name: 'fullName',
};

class CandidateService {
  /**
   * Search and filter student candidates for recruitment discovery.
   * @param {Object} filters
   * @returns {Promise<{candidates: Array, pagination: Object}>}
   */
  async searchCandidates(filters = {}) {
    const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 20));
    const {
      search,
      skills,
      requiredSkills,
      branch,
      graduationYear,
      domain,
      college,
      verificationStatus,
      verifiedOnly,
      minIndustryReadiness,
      maxIndustryReadiness,
      minPortfolioScore,
      maxPortfolioScore,
      minATSScore,
      maxATSScore,
      sortBy = 'industryReadiness',
      sortOrder = 'desc',
    } = filters;

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { fullName: searchRegex },
        { college: searchRegex },
        { branch: searchRegex },
        { headline: searchRegex },
      ];
    }

    if (skills && skills.trim()) {
      const skillsList = skills.split(',').map((skill) => skill.trim()).filter(Boolean);
      if (skillsList.length) {
        query.skills = {
          $in: skillsList.map((skill) => new RegExp('^' + escapeRegex(skill) + '$', 'i')),
        };
      }
    }

    if (branch && branch.trim()) query.branch = new RegExp(escapeRegex(branch.trim()), 'i');
    if (graduationYear) query.graduationYear = graduationYear;
    if (college && college.trim()) query.college = new RegExp(escapeRegex(college.trim()), 'i');

    if (domain && domain.trim()) {
      const domainRegex = new RegExp(escapeRegex(domain.trim()), 'i');
      const domainClause = { $or: [{ interests: domainRegex }, { branch: domainRegex }] };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, domainClause];
        delete query.$or;
      } else {
        query.$or = domainClause.$or;
      }
    }

    const profiles = await Profile.find(query)
      .select('user fullName profilePicture college branch graduationYear headline skills interests updatedAt')
      .populate({
        path: 'user',
        select: 'fullName avatar role college branch status',
        match: { role: 'student', status: { $ne: 'blocked' } },
      })
      .lean();

    const validProfiles = profiles.filter((profile) => profile.user && profile.user._id);
    const studentIds = validProfiles.map((profile) => profile.user._id);
    if (studentIds.length === 0) {
      return {
        candidates: [],
        pagination: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: page > 1 },
      };
    }

    const [projects, portfolios, githubAccounts] = await Promise.all([
      Project.find({ userId: { $in: studentIds } }).select('userId verificationStatus').lean(),
      Portfolio.find({ student: { $in: studentIds }, isPublic: true })
        .select('student isPublic verifiedBy verificationHash verificationStatus status skillsVerified updatedAt createdAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean(),
      GitHubAccount.find({ userId: { $in: studentIds } }).select('userId connectionStatus').lean(),
    ]);

    const publicPortfolios = portfolios.filter((portfolio) => (
      portfolio.isPublic === true && verificationService.isPortfolioVerified(portfolio)
    ));
    const signalMap = await recruiterAIService.getCandidateSignals(studentIds, publicPortfolios);

    const projectStatsByStudent = new Map();
    for (const project of projects) {
      const studentId = String(project.userId);
      const stats = projectStatsByStudent.get(studentId) || { total: 0, verified: 0, pending: 0, rejected: 0 };
      stats.total += 1;
      if (project.verificationStatus === 'Verified') stats.verified += 1;
      else if (project.verificationStatus === 'Rejected') stats.rejected += 1;
      else stats.pending += 1;
      projectStatsByStudent.set(studentId, stats);
    }

    const portfolioSet = new Set(publicPortfolios.map((portfolio) => String(portfolio.student)));
    const githubMap = new Map(
      githubAccounts.map((account) => [String(account.userId), account.connectionStatus === 'Connected'])
    );
    const candidates = validProfiles.map((profile) => {
      const studentId = String(profile.user._id);
      const stats = projectStatsByStudent.get(studentId) || { total: 0, verified: 0, pending: 0, rejected: 0 };
      const signal = signalMap.get(studentId) || {};
      return {
        studentId,
        name: profile.fullName || profile.user.fullName,
        profilePhoto: profile.profilePicture || profile.user.avatar || null,
        college: profile.college || profile.user.college || 'Not specified',
        branch: profile.branch || profile.user.branch || 'Not specified',
        graduationYear: profile.graduationYear || null,
        headline: profile.headline || null,
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        verifiedSkills: Array.isArray(signal.verifiedSkills) ? signal.verifiedSkills : [],
        skillGaps: signal.skillGaps || null,
        topStrengths: Array.isArray(signal.topStrengths) ? signal.topStrengths : [],
        projectCount: stats.total,
        verifiedProjectCount: stats.verified,
        pendingProjectCount: stats.pending,
        rejectedProjectCount: stats.rejected,
        githubConnected: githubMap.get(studentId) === true,
        portfolioVerified: portfolioSet.has(studentId),
        portfolioScore: signal.portfolioScore ?? null,
        atsScore: signal.atsScore ?? null,
        githubEvidenceScore: signal.githubEvidenceScore ?? null,
        industryReadinessScore: signal.industryReadinessScore ?? null,
        updatedAt: profile.updatedAt || null,
        publicPortfolioUrl: '/portfolio/' + studentId,
      };
    });

    const normalizedVerification = String(verificationStatus || '').toLowerCase();
    const requiredSkillList = String(requiredSkills || '')
      .split(',').map((skill) => skill.trim().toLowerCase()).filter(Boolean);
    const isScoreAvailable = (value) => value !== null
      && value !== undefined && value !== '' && Number.isFinite(Number(value));
    const isWithinRange = (value, minimum, maximum) => {
      if (minimum === undefined && maximum === undefined) return true;
      if (!isScoreAvailable(value)) return false;
      const score = Number(value);
      return (minimum === undefined || score >= Number(minimum))
        && (maximum === undefined || score <= Number(maximum));
    };
    const verifiedOnlyRequested = verifiedOnly === true || String(verifiedOnly).toLowerCase() === 'true';
    const filteredCandidates = candidates.filter((candidate) => {
      const verificationMatches = !normalizedVerification
        || (normalizedVerification === 'verified' && candidate.portfolioVerified)
        || (normalizedVerification === 'pending' && candidate.pendingProjectCount > 0)
        || (normalizedVerification === 'rejected' && candidate.rejectedProjectCount > 0);
      const requiredSkillsMatch = requiredSkillList.every((requiredSkill) => candidate.verifiedSkills
        .some((skill) => String(skill).toLowerCase() === requiredSkill));
      return verificationMatches
        && (!verifiedOnlyRequested || candidate.portfolioVerified)
        && requiredSkillsMatch
        && isWithinRange(candidate.industryReadinessScore, minIndustryReadiness, maxIndustryReadiness)
        && isWithinRange(candidate.portfolioScore, minPortfolioScore, maxPortfolioScore)
        && isWithinRange(candidate.atsScore, minATSScore, maxATSScore);
    });

    const legacySortMap = {
      createdAt: 'updatedAt',
      graduationYear: 'graduationYear',
      relevance: 'industryReadinessScore',
      recentlyUpdated: 'updatedAt',
    };
    const sortField = ALLOWED_SORT_FIELDS[sortBy] || legacySortMap[sortBy] || ALLOWED_SORT_FIELDS.industryReadiness;
    const direction = sortOrder === 'asc' ? 1 : -1;
    const compareValues = (left, right) => {
      const leftAvailable = isScoreAvailable(left);
      const rightAvailable = isScoreAvailable(right);
      if (leftAvailable && !rightAvailable) return -1;
      if (!leftAvailable && rightAvailable) return 1;
      if (!leftAvailable && !rightAvailable) return 0;
      return Number(left) - Number(right);
    };
    filteredCandidates.sort((left, right) => {
      if (sortField === 'fullName') {
        return String(left.name || '').localeCompare(String(right.name || ''), undefined, { sensitivity: 'base' }) * direction;
      }
      if (sortField === 'updatedAt') {
        return (new Date(left.updatedAt || 0).getTime() - new Date(right.updatedAt || 0).getTime()) * direction;
      }
      if (sortField === 'graduationYear') {
        return (Number(left.graduationYear || 0) - Number(right.graduationYear || 0)) * direction;
      }
      return compareValues(left[sortField], right[sortField]) * direction;
    });

    const total = filteredCandidates.length;
    const totalPages = total ? Math.ceil(total / limit) : 0;
    const pagedCandidates = filteredCandidates.slice((page - 1) * limit, page * limit);
    return {
      candidates: pagedCandidates,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1 && totalPages > 0,
      },
    };
  }

  async compareCandidates(studentIds = []) {
    const ids = [...new Set((Array.isArray(studentIds) ? studentIds : []).map((id) => String(id)))];
    if (!ids.length) return [];

    const [users, profiles, studentProfiles, projects, portfolios] = await Promise.all([
      User.find({ _id: { $in: ids }, role: 'student', status: { $ne: 'blocked' } })
        .select('fullName avatar role status')
        .lean(),
      Profile.find({ user: { $in: ids } })
        .select('user fullName college degree branch graduationYear currentYear skills updatedAt')
        .lean(),
      StudentProfile.find({ user: { $in: ids } })
        .select('user education experience')
        .lean(),
      Project.find({ userId: { $in: ids }, verificationStatus: 'Verified' })
        .select('userId title')
        .sort({ createdAt: -1 })
        .lean(),
      Portfolio.find({ student: { $in: ids }, isPublic: true })
        .select('student isPublic verifiedBy verificationHash verificationStatus status skillsVerified updatedAt createdAt')
        .sort({ updatedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const publicPortfolios = portfolios.filter((portfolio) => (
      portfolio.isPublic === true && verificationService.isPortfolioVerified(portfolio)
    ));
    const signals = await recruiterAIService.getCandidateSignals(ids, publicPortfolios);
    const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));
    const studentProfileMap = new Map(studentProfiles.map((profile) => [String(profile.user), profile]));
    const userMap = new Map(users.map((user) => [String(user._id), user]));
    const projectsMap = new Map();
    for (const project of projects) {
      const key = String(project.userId);
      const current = projectsMap.get(key) || [];
      current.push(project.title);
      projectsMap.set(key, current);
    }

    return ids.flatMap((studentId) => {
      const user = userMap.get(studentId);
      if (!user) return [];
      const profile = profileMap.get(studentId) || {};
      const studentProfile = studentProfileMap.get(studentId) || {};
      const signal = signals.get(studentId) || {};
      return [{
        studentId,
        name: profile.fullName || user.fullName || 'Unnamed candidate',
        verifiedSkills: Array.isArray(signal.verifiedSkills) ? signal.verifiedSkills : [],
        skillGaps: signal.skillGaps || null,
        portfolioScore: signal.portfolioScore ?? null,
        atsScore: signal.atsScore ?? null,
        githubEvidence: signal.githubEvidenceScore ?? null,
        industryReadiness: signal.industryReadinessScore ?? null,
        verifiedProjects: projectsMap.get(studentId) || [],
        experience: Array.isArray(studentProfile.experience) ? studentProfile.experience.slice(0, 20).map((item) => ({
          company: item.company || null,
          position: item.position || null,
          employmentType: item.employmentType || null,
          startDate: item.startDate || null,
          endDate: item.endDate || null,
          isCurrent: Boolean(item.isCurrent),
        })) : [],
        education: Array.isArray(studentProfile.education) ? studentProfile.education.slice(0, 20).map((item) => ({
          institution: item.institution || null,
          degree: item.degree || null,
          fieldOfStudy: item.fieldOfStudy || null,
          startYear: item.startYear || null,
          endYear: item.endYear || null,
        })) : [{
          institution: profile.college || null,
          degree: profile.degree || null,
          fieldOfStudy: profile.branch || null,
          startYear: null,
          endYear: profile.graduationYear || null,
        }].filter((item) => item.institution || item.degree || item.fieldOfStudy || item.endYear),
      }];
    });
  }
  /**
   * Get comprehensive, sanitized candidate details for recruiters.
   * @param {string} studentId
   * @returns {Promise<Object>}
   */
  async getCandidateDetails(studentId) {
    const user = await User.findById(studentId).select(
      'fullName avatar role college branch status'
    );

    if (!user || user.role !== 'student' || user.status === 'blocked') {
      throw ApiError.notFound('Candidate not found');
    }

    const [profile, projects, certificates, resume, github, portfolios] = await Promise.all([
      Profile.findOne({ user: studentId }).lean(),
      Project.find({ userId: studentId, verificationStatus: 'Verified' })
        .select(
          'title shortDescription detailedDescription category technologies githubRepository liveDeployment demoVideo documentationUrl screenshots projectStatus verificationStatus createdAt'
        )
        .sort({ createdAt: -1 })
        .lean(),
      Certificate.find({ userId: studentId, verificationStatus: 'Verified' })
        .select(
          'title issuer category issueDate expiryDate credentialId credentialUrl skills certificateFile verificationStatus rejectionReason createdAt'
        )
        .sort({ issueDate: -1 })
        .lean(),
      Resume.findOne({ userId: studentId }).lean(),
      GitHubAccount.findOne({ userId: studentId }).lean(),
      Portfolio.find({ student: studentId, isPublic: true })
        .select('certificateId projectTitle skillsVerified milestonesSummary verifiedBy verificationHash issuedAt isPublic')
        .lean(),
    ]);

    // Format projects with explicit verification status
    const formattedProjects = projects.map((p) => ({
      id: String(p._id),
      title: p.title,
      shortDescription: p.shortDescription,
      detailedDescription: p.detailedDescription,
      category: p.category,
      technologies: p.technologies || [],
      githubRepository: p.githubRepository,
      liveDeployment: p.liveDeployment,
      demoVideo: p.demoVideo || null,
      documentationUrl: p.documentationUrl || null,
      screenshots: p.screenshots || [],
      projectStatus: p.projectStatus,
      verificationStatus: p.verificationStatus || 'Pending',
    }));

    // Format certificates with explicit verification status
    const formattedCertificates = certificates.map((c) => ({
      id: String(c._id),
      title: c.title,
      issuer: c.issuer,
      category: c.category,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate || null,
      credentialId: c.credentialId,
      credentialUrl: c.credentialUrl,
      skills: c.skills || [],
      hasDocument: Boolean(c.certificateFile?.fileUrl),
      verificationStatus: c.verificationStatus || 'Pending',
      rejectionReason: c.rejectionReason || null,
    }));

    const formattedPortfolios = portfolios
      .filter((portfolio) => verificationService.isPortfolioVerified(portfolio))
      .map((portfolio) => ({
        id: String(portfolio._id),
        certificateId: portfolio.certificateId,
        projectTitle: portfolio.projectTitle,
        skillsVerified: portfolio.skillsVerified || [],
        milestonesSummary: portfolio.milestonesSummary || [],
        issuedAt: portfolio.issuedAt,
        isPublic: true,
      }));

    // Calculate verification breakdown summary
    const projectSummary = {
      total: formattedProjects.length,
      verified: formattedProjects.filter((p) => p.verificationStatus === 'Verified').length,
      pending: formattedProjects.filter((p) => p.verificationStatus === 'Pending').length,
      rejected: formattedProjects.filter((p) => p.verificationStatus === 'Rejected').length,
    };

    const certificateSummary = {
      total: formattedCertificates.length,
      verified: formattedCertificates.filter((c) => c.verificationStatus === 'Verified').length,
      pending: formattedCertificates.filter((c) => c.verificationStatus === 'Pending').length,
      rejected: formattedCertificates.filter((c) => c.verificationStatus === 'Rejected').length,
    };

    const isGithubConnected = github && github.connectionStatus === 'Connected';

    return {
      studentId: String(user._id),
      name: profile?.fullName || user.fullName,
      profilePhoto: profile?.profilePicture || user.avatar || null,
      headline: profile?.headline || null,
      bio: profile?.bio || null,
      college: profile?.college || user.college || 'Not specified',
      degree: profile?.degree || null,
      branch: profile?.branch || user.branch || 'Not specified',
      graduationYear: profile?.graduationYear || null,
      currentYear: profile?.currentYear || null,
      cgpa: profile?.cgpa || null,
      skills: Array.isArray(profile?.skills) ? profile.skills : [],
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      githubUrl: profile?.github || null,
      linkedinUrl: profile?.linkedin || null,
      portfolioUrl: profile?.portfolio || null,
      publicPortfolioUrl: `/portfolio/${user._id}`,
      portfolioScore: null,
      projects: formattedProjects,
      certificates: formattedCertificates,
      verifiedPortfolios: formattedPortfolios,
      resume: resume
        ? {
            fileName: resume.originalFileName,
            fileUrl: resume.fileUrl,
            fileSize: resume.fileSize,
            uploadedAt: resume.uploadedAt,
            isAvailable: formattedPortfolios.length > 0,
            visibility: formattedPortfolios.length > 0 ? 'public' : 'restricted',
          }
        : {
            isAvailable: false,
          },
      github: isGithubConnected
        ? {
            username: github.githubUsername,
            bio: github.bio || null,
            publicRepos: github.publicRepos || 0,
            followers: github.followers || 0,
            following: github.following || 0,
            githubProfileUrl: github.githubProfileUrl,
            isConnected: true,
          }
        : {
            isConnected: false,
          },
      verificationSummary: {
        projects: projectSummary,
        certificates: certificateSummary,
        isProfileVerified: true,
        isGithubVerified: Boolean(isGithubConnected),
        isPortfolioVerified: Boolean(formattedPortfolios.length > 0),
      },
    };
  }
}

const candidateService = new CandidateService();
export default candidateService;
