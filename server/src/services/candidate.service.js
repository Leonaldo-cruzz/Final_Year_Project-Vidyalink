import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Portfolio from '../models/portfolio.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Resume from '../models/resume.model.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';

// Safe allowlist of fields permitted for sorting
const ALLOWED_SORT_FIELDS = {
  createdAt: 'createdAt',
  graduationYear: 'graduationYear',
  name: 'fullName',
  portfolioScore: 'createdAt', // placeholder until AI scoring is active
};

class CandidateService {
  /**
   * Search and filter student candidates for recruitment discovery.
   * @param {Object} filters
   * @returns {Promise<{candidates: Array, pagination: Object}>}
   */
  async searchCandidates(filters = {}) {
    const parsedPage = Number.parseInt(filters.page, 10) || 1;
    const parsedLimit = Number.parseInt(filters.limit, 10) || 20;
    const {
      search,
      skills,
      branch,
      graduationYear,
      domain,
      college,
      verificationStatus,
      minPortfolioScore,
      maxPortfolioScore,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const page = parsedPage;
    const limit = parsedLimit;

    // 1. Build MongoDB query criteria for Profile
    const query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { fullName: searchRegex },
        { college: searchRegex },
        { branch: searchRegex },
        { headline: searchRegex },
      ];
    }

    if (skills && skills.trim()) {
      const skillsList = skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (skillsList.length > 0) {
        query.skills = {
          $in: skillsList.map(
            (skill) => new RegExp(`^${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
          ),
        };
      }
    }

    if (branch && branch.trim()) {
      query.branch = new RegExp(branch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    if (graduationYear) {
      query.graduationYear = graduationYear;
    }

    if (college && college.trim()) {
      query.college = new RegExp(college.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    if (domain && domain.trim()) {
      const domainRegex = new RegExp(domain.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [{ interests: domainRegex }, { branch: domainRegex }] },
        ];
        delete query.$or;
      } else {
        query.$or = [{ interests: domainRegex }, { branch: domainRegex }];
      }
    }

    // 2. Determine sort order safely
    const sortField = ALLOWED_SORT_FIELDS[sortBy] || 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortDirection };

    // 3. Execute count and pagination queries in parallel
    const skip = (page - 1) * limit;

    const [totalProfiles, profiles] = await Promise.all([
      Profile.countDocuments(query),
      Profile.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'user',
          select: 'fullName email avatar role college branch status',
          match: { role: 'student', status: { $ne: 'blocked' } },
        })
        .lean(),
    ]);

    // Filter out profiles whose user reference did not match 'student' role
    const validProfiles = profiles.filter((p) => p.user && p.user._id);
    const studentIds = validProfiles.map((p) => p.user._id);

    if (studentIds.length === 0) {
      return {
        candidates: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasNext: false,
          hasPrev: page > 1,
        },
      };
    }

    // 4. Batch query associated projects, certificates, portfolios, and github accounts to prevent N+1
    const [projects, certificates, portfolios, githubAccounts] = await Promise.all([
      Project.find({ userId: { $in: studentIds } })
        .select('userId verificationStatus')
        .lean(),
      Certificate.find({ userId: { $in: studentIds } })
        .select('userId verificationStatus')
        .lean(),
      Portfolio.find({ student: { $in: studentIds } })
        .select('student')
        .lean(),
      GitHubAccount.find({ userId: { $in: studentIds } })
        .select('userId connectionStatus')
        .lean(),
    ]);

    // Aggregate counts by studentId
    const projectStatsByStudent = new Map();
    for (const proj of projects) {
      const sId = String(proj.userId);
      if (!projectStatsByStudent.has(sId)) {
        projectStatsByStudent.set(sId, { total: 0, verified: 0 });
      }
      const stats = projectStatsByStudent.get(sId);
      stats.total += 1;
      if (proj.verificationStatus === 'Verified') {
        stats.verified += 1;
      }
    }

    const portfolioSet = new Set(portfolios.map((p) => String(p.student)));
    const githubMap = new Map(
      githubAccounts.map((g) => [String(g.userId), g.connectionStatus === 'Connected'])
    );

    // 5. Construct recruitment candidate cards
    const candidates = validProfiles.map((profile) => {
      const sId = String(profile.user._id);
      const projStats = projectStatsByStudent.get(sId) || { total: 0, verified: 0 };
      const hasPortfolio = portfolioSet.has(sId) || projStats.verified > 0;
      const isGithubConnected = githubMap.get(sId) || false;

      return {
        studentId: String(profile.user._id),
        name: profile.fullName || profile.user.fullName,
        profilePhoto: profile.profilePicture || profile.user.avatar || null,
        college: profile.college || profile.user.college || 'Not specified',
        branch: profile.branch || profile.user.branch || 'Not specified',
        graduationYear: profile.graduationYear || null,
        headline: profile.headline || null,
        skills: Array.isArray(profile.skills) ? profile.skills : [],
        projectCount: projStats.total,
        verifiedProjectCount: projStats.verified,
        githubConnected: isGithubConnected,
        portfolioVerified: hasPortfolio,
        portfolioScore: null, // Nullable until AI scoring engine is connected
        publicPortfolioUrl: `/portfolio/${profile.user._id}`,
      };
    });

    const totalPages = Math.ceil(totalProfiles / limit) || 1;

    return {
      candidates,
      pagination: {
        total: totalProfiles,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get comprehensive, sanitized candidate details for recruiters.
   * @param {string} studentId
   * @returns {Promise<Object>}
   */
  async getCandidateDetails(studentId) {
    const user = await User.findById(studentId).select(
      'fullName email avatar role college branch status'
    );

    if (!user || user.role !== 'student' || user.status === 'blocked') {
      throw ApiError.notFound('Candidate not found');
    }

    const [profile, projects, certificates, resume, github, portfolios] = await Promise.all([
      Profile.findOne({ user: studentId }).lean(),
      Project.find({ userId: studentId })
        .select(
          'title shortDescription detailedDescription category technologies githubRepository liveDeployment demoVideo documentationUrl screenshots projectStatus verificationStatus createdAt'
        )
        .sort({ createdAt: -1 })
        .lean(),
      Certificate.find({ userId: studentId })
        .select(
          'title issuer category issueDate expiryDate credentialId credentialUrl skills certificateFile verificationStatus rejectionReason createdAt'
        )
        .sort({ issueDate: -1 })
        .lean(),
      Resume.findOne({ userId: studentId }).lean(),
      GitHubAccount.findOne({ userId: studentId }).lean(),
      Portfolio.find({ student: studentId }).lean(),
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
      email: user.email,
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
      portfolioScore: null, // Nullable until AI scoring engine is connected
      projects: formattedProjects,
      certificates: formattedCertificates,
      resume: resume
        ? {
            fileName: resume.originalFileName,
            fileUrl: resume.fileUrl,
            fileSize: resume.fileSize,
            uploadedAt: resume.uploadedAt,
            isAvailable: true,
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
        isPortfolioVerified: Boolean(portfolios.length > 0 || projectSummary.verified > 0),
      },
    };
  }
}

const candidateService = new CandidateService();
export default candidateService;
