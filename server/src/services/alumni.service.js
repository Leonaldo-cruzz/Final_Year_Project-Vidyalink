import AlumniProfile from '../models/alumniProfile.model.js';
import Mentorship from '../models/mentorship.model.js';
import Endorsement from '../models/endorsement.model.js';
import MockInterview from '../models/mockInterview.model.js';
import Referral from '../models/referral.model.js';
import User from '../models/user.model.js';
import Profile from '../models/profile.model.js';
import StudentProfile from '../models/studentProfile.model.js';
import Portfolio from '../models/portfolio.model.js';
import Project from '../models/project.model.js';
import Certificate from '../models/certificate.model.js';
import GithubAccount from '../models/githubAccount.model.js';
import notificationService from './notification.service.js';
import ApiError from '../utils/ApiError.js';

class AlumniService {
  constructor() {
    // Sync schema indexes to drop any legacy indexes like userId_1
    AlumniProfile.syncIndexes().catch(() => {});
  }

  // ==========================================
  // PART 1 — ALUMNI PROFILE
  // ==========================================

  async getProfile(userId) {
    let profile = await AlumniProfile.findOne({ user: userId }).populate(
      'user',
      'fullName email avatar college branch graduationYear role'
    );

    if (!profile) {
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      profile = await AlumniProfile.create({
        user: userId,
        company: user.college || 'Technology Company',
        designation: 'Software Professional',
        industry: 'Information Technology',
        experience: 2,
        experienceSummary: 'Experienced professional mentoring upcoming engineers.',
        skills: ['JavaScript', 'Node.js', 'React', 'System Design'],
        bio: 'Passionate alumni giving back to the student community.',
        location: 'Bengaluru, India',
        isVerifiedAlumni: true,
      });

      profile = await AlumniProfile.findById(profile._id).populate(
        'user',
        'fullName email avatar college branch graduationYear role'
      );
    }

    return profile;
  }

  async createProfile(userId, data) {
    const existing = await AlumniProfile.findOne({ user: userId });
    if (existing) {
      throw ApiError.conflict('Alumni profile already exists');
    }

    const profile = await AlumniProfile.create({
      user: userId,
      ...data,
    });

    return AlumniProfile.findById(profile._id).populate(
      'user',
      'fullName email avatar college branch graduationYear role'
    );
  }

  async updateProfile(userId, updateData) {
    let profile = await AlumniProfile.findOne({ user: userId });

    if (!profile) {
      profile = await AlumniProfile.create({
        user: userId,
        company: updateData.company || 'Company',
        designation: updateData.designation || 'Specialist',
        industry: updateData.industry || 'Technology',
        ...updateData,
      });
    } else {
      Object.assign(profile, updateData);
      await profile.save();
    }

    return AlumniProfile.findById(profile._id).populate(
      'user',
      'fullName email avatar college branch graduationYear role'
    );
  }

  // ==========================================
  // PART 2 — VERIFIED STUDENT DISCOVERY
  // ==========================================

  async searchStudents({ search, skills, branch, graduationYear, domain, page = 1, limit = 12 } = {}) {
    const userQuery = { role: 'student', status: 'active' };

    if (search) {
      const regex = new RegExp(search, 'i');
      userQuery.$or = [
        { fullName: regex },
        { email: regex },
        { college: regex },
        { branch: regex },
      ];
    }

    if (branch) {
      userQuery.branch = new RegExp(branch, 'i');
    }

    if (graduationYear) {
      userQuery.graduationYear = Number(graduationYear);
    }

    // Filter by skills via database lookup
    if (skills) {
      const filterSkills = skills.split(',').map((s) => s.trim()).filter(Boolean);
      if (filterSkills.length > 0) {
        const skillRegexes = filterSkills.map((sk) => new RegExp(sk, 'i'));
        const [matchingProfiles, matchingStudentProfiles, matchingPortfolios] = await Promise.all([
          Profile.find({ skills: { $in: skillRegexes } }).select('user').lean(),
          StudentProfile.find({ skills: { $in: skillRegexes } }).select('user').lean(),
          Portfolio.find({ skillsVerified: { $in: skillRegexes } }).select('student').lean(),
        ]);
        const matchingUserIds = [
          ...matchingProfiles.map((p) => p.user),
          ...matchingStudentProfiles.map((p) => p.user),
          ...matchingPortfolios.map((p) => p.student),
        ];
        userQuery._id = { $in: matchingUserIds };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [students, total] = await Promise.all([
      User.find(userQuery)
        .select('fullName email avatar college branch graduationYear createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(userQuery),
    ]);

    const studentIds = students.map((s) => s._id);

    // Fetch associated portfolios, profiles, projects, certificates in parallel
    const [profiles, studentProfiles, portfolios, projects, certificates] = await Promise.all([
      Profile.find({ user: { $in: studentIds } }).lean(),
      StudentProfile.find({ user: { $in: studentIds } }).lean(),
      Portfolio.find({ student: { $in: studentIds } }).lean(),
      Project.find({ owner: { $in: studentIds } }).lean(),
      Certificate.find({ student: { $in: studentIds } }).lean(),
    ]);

    // Build lookup maps
    const profileMap = new Map(profiles.map((p) => [String(p.user), p]));
    const studentProfileMap = new Map(studentProfiles.map((p) => [String(p.user), p]));
    const portfolioMap = new Map();
    portfolios.forEach((p) => {
      const key = String(p.student);
      if (!portfolioMap.has(key)) portfolioMap.set(key, []);
      portfolioMap.get(key).push(p);
    });

    const projectMap = new Map();
    projects.forEach((p) => {
      const key = String(p.owner);
      if (!projectMap.has(key)) projectMap.set(key, []);
      projectMap.get(key).push(p);
    });

    const certificateMap = new Map();
    certificates.forEach((c) => {
      const key = String(c.student);
      if (!certificateMap.has(key)) certificateMap.set(key, []);
      certificateMap.get(key).push(c);
    });

    // Map enriched students
    let enrichedStudents = students.map((student) => {
      const sId = String(student._id);
      const prof = profileMap.get(sId) || {};
      const sProf = studentProfileMap.get(sId) || {};
      const ports = portfolioMap.get(sId) || [];
      const projs = projectMap.get(sId) || [];
      const certs = certificateMap.get(sId) || [];

      // Consolidate skills
      const combinedSkills = Array.from(
        new Set([
          ...(prof.skills || []),
          ...(sProf.skills || []),
          ...ports.flatMap((p) => p.skillsVerified || []),
        ])
      );

      const verifiedPortfoliosCount = ports.length;
      const verifiedCertificatesCount = certs.filter((c) => c.status === 'VERIFIED' || c.status === 'ISSUED').length;
      const isPortfolioVerified = verifiedPortfoliosCount > 0 || verifiedCertificatesCount > 0;

      // Mock AI readiness metrics where available
      const readinessScore = isPortfolioVerified ? Math.min(95, 70 + verifiedPortfoliosCount * 8 + combinedSkills.length * 2) : 65;

      return {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        avatar: student.avatar || prof.profilePicture || sProf.profilePicture,
        college: student.college || prof.college || sProf.college,
        branch: student.branch || prof.branch || sProf.branch,
        graduationYear: student.graduationYear || prof.graduationYear || sProf.graduationYear,
        bio: prof.bio || sProf.bio || prof.headline || '',
        skills: combinedSkills,
        verifiedSkills: ports.flatMap((p) => p.skillsVerified || []),
        projectCount: projs.length,
        verifiedPortfolioCount: verifiedPortfoliosCount,
        verifiedCertificateCount: verifiedCertificatesCount,
        isPortfolioVerified,
        industryReadinessScore: readinessScore,
        location: sProf.location || 'Remote, India',
      };
    });

    // Apply skill filter if present
    if (skills) {
      const filterSkills = skills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (filterSkills.length > 0) {
        enrichedStudents = enrichedStudents.filter((st) =>
          filterSkills.some((fSkill) => st.skills.some((s) => s.toLowerCase().includes(fSkill)))
        );
      }
    }

    // Apply domain filter if present
    if (domain) {
      const dRegex = new RegExp(domain, 'i');
      enrichedStudents = enrichedStudents.filter(
        (st) =>
          dRegex.test(st.branch) ||
          dRegex.test(st.bio) ||
          st.skills.some((s) => dRegex.test(s))
      );
    }

    return {
      students: enrichedStudents,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  // ==========================================
  // PART 3 — STUDENT PORTFOLIO VIEW
  // ==========================================

  async getStudentPortfolio(studentId) {
    const student = await User.findOne({ _id: studentId, role: 'student' }).select(
      'fullName email avatar college branch graduationYear createdAt'
    );

    if (!student) {
      throw ApiError.notFound('Student not found');
    }

    const [profile, studentProfile, portfolios, projects, certificates, githubAccount, endorsements] =
      await Promise.all([
        Profile.findOne({ user: studentId }).lean(),
        StudentProfile.findOne({ user: studentId }).lean(),
        Portfolio.find({ student: studentId }).populate('verifiedBy', 'fullName role').lean(),
        Project.find({ owner: studentId }).lean(),
        Certificate.find({ student: studentId }).populate('issuedBy', 'fullName role').lean(),
        GithubAccount.findOne({ user: studentId }).lean(),
        Endorsement.find({ student: studentId, status: 'ACTIVE' }).populate('alumni', 'fullName').lean(),
      ]);

    const combinedSkills = Array.from(
      new Set([
        ...(profile?.skills || []),
        ...(studentProfile?.skills || []),
        ...portfolios.flatMap((p) => p.skillsVerified || []),
      ])
    );

    const verifiedSkills = Array.from(new Set(portfolios.flatMap((p) => p.skillsVerified || [])));
    const skillGaps = ['Cloud Architecture (AWS/GCP)', 'Kubernetes', 'CI/CD Pipelines'].filter(
      (gap) => !combinedSkills.some((sk) => sk.toLowerCase().includes(gap.toLowerCase()))
    );

    const readinessScore = portfolios.length > 0 ? Math.min(96, 75 + portfolios.length * 7 + verifiedSkills.length * 2) : 68;

    return {
      student: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        avatar: student.avatar || profile?.profilePicture || studentProfile?.profilePicture,
        college: student.college || profile?.college || studentProfile?.college,
        branch: student.branch || profile?.branch || studentProfile?.branch,
        graduationYear: student.graduationYear || profile?.graduationYear || studentProfile?.graduationYear,
        cgpa: profile?.cgpa || studentProfile?.cgpa || null,
        bio: profile?.bio || studentProfile?.bio || profile?.headline || '',
        location: studentProfile?.location || 'India',
        linkedin: profile?.linkedin || studentProfile?.linkedin || null,
        githubUsername: profile?.githubUsername || studentProfile?.githubUsername || githubAccount?.username || null,
        portfolioWebsite: profile?.portfolio || studentProfile?.portfolioWebsite || null,
      },
      skills: combinedSkills,
      verifiedSkills,
      skillGaps,
      industryReadiness: {
        score: readinessScore,
        status: readinessScore >= 80 ? 'HIGH' : readinessScore >= 65 ? 'MODERATE' : 'EMERGING',
        strengths: [
          'Strong full-stack architecture fundamentals',
          'Verified milestone deliverables by faculty',
          'Active version control contribution record',
        ],
        recommendations: [
          'Pursue industry mock interviews to hone system design communication',
          'Contribute to open-source enterprise modules',
        ],
      },
      portfolios: portfolios.map((p) => ({
        _id: p._id,
        certificateId: p.certificateId,
        projectTitle: p.projectTitle,
        verifiedBy: p.verifiedBy?.fullName || 'Faculty Mentor',
        skillsVerified: p.skillsVerified,
        verificationHash: p.verificationHash,
        issuedAt: p.issuedAt,
      })),
      projects: projects.map((pr) => ({
        _id: pr._id,
        title: pr.title,
        description: pr.description,
        tags: pr.tags || [],
        status: pr.status,
        liveUrl: pr.liveUrl,
        githubUrl: pr.githubUrl,
        deliverablesCount: pr.deliverablesCount || 0,
      })),
      certificates: certificates.map((c) => ({
        _id: c._id,
        title: c.title,
        issuingOrg: c.issuingOrg,
        issueDate: c.issueDate,
        credentialUrl: c.credentialUrl,
        status: c.status,
      })),
      githubSummary: githubAccount
        ? {
            username: githubAccount.username,
            publicRepos: githubAccount.publicRepos || 12,
            totalStars: githubAccount.totalStars || 8,
            topLanguages: githubAccount.topLanguages || ['JavaScript', 'Python', 'TypeScript'],
          }
        : null,
      endorsements: endorsements.map((e) => ({
        _id: e._id,
        skill: e.skill,
        alumniName: e.alumni?.fullName || 'Alumni Mentor',
        message: e.message,
        createdAt: e.createdAt,
      })),
    };
  }

  // ==========================================
  // PART 4 — MENTORSHIP
  // ==========================================

  async getMentorshipRequests(userId, role, { status, page = 1, limit = 20 } = {}) {
    const query = {};
    if (role === 'alumni') {
      query.alumni = userId;
    } else {
      query.student = userId;
    }

    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [requests, total] = await Promise.all([
      Mentorship.find(query)
        .populate('student', 'fullName email avatar college branch graduationYear')
        .populate('alumni', 'fullName email avatar college')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Mentorship.countDocuments(query),
    ]);

    return {
      requests,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  async requestMentorship(studentId, { alumniId, topic, message, goals = [] }) {
    const alumni = await User.findById(alumniId);
    if (!alumni || alumni.role !== 'alumni') {
      throw ApiError.notFound('Alumni mentor not found');
    }

    const existingPending = await Mentorship.findOne({
      student: studentId,
      alumni: alumniId,
      status: 'PENDING',
    });

    if (existingPending) {
      throw ApiError.conflict('You already have a pending mentorship request with this mentor');
    }

    const request = await Mentorship.create({
      student: studentId,
      alumni: alumniId,
      topic,
      message,
      goals,
      status: 'PENDING',
    });

    const student = await User.findById(studentId);

    // Notify alumni
    await notificationService.createNotification({
      recipient: alumniId,
      sender: studentId,
      type: 'MENTORSHIP_REQUEST',
      title: 'New Mentorship Request',
      message: `${student?.fullName || 'A student'} requested mentorship for "${topic}"`,
      link: '/alumni/mentorship',
      metadata: { mentorshipId: request._id },
    });

    return request;
  }

  async acceptMentorship(alumniId, requestId, { notes = '' } = {}) {
    const mentorship = await Mentorship.findOne({ _id: requestId, alumni: alumniId });
    if (!mentorship) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (mentorship.status !== 'PENDING') {
      throw ApiError.badRequest(`Cannot accept request in '${mentorship.status}' state`);
    }

    mentorship.status = 'ACCEPTED';
    if (notes) mentorship.alumniNotes = notes;
    await mentorship.save();

    const alumni = await User.findById(alumniId);

    // Notify student
    await notificationService.createNotification({
      recipient: mentorship.student,
      sender: alumniId,
      type: 'MENTORSHIP_ACCEPTED',
      title: 'Mentorship Request Accepted',
      message: `${alumni?.fullName || 'Your mentor'} accepted your mentorship request for "${mentorship.topic}"`,
      link: '/dashboard/student',
      metadata: { mentorshipId: mentorship._id },
    });

    return mentorship;
  }

  async declineMentorship(alumniId, requestId, { notes = '' } = {}) {
    const mentorship = await Mentorship.findOne({ _id: requestId, alumni: alumniId });
    if (!mentorship) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (mentorship.status !== 'PENDING') {
      throw ApiError.badRequest(`Cannot decline request in '${mentorship.status}' state`);
    }

    mentorship.status = 'DECLINED';
    if (notes) mentorship.alumniNotes = notes;
    await mentorship.save();

    const alumni = await User.findById(alumniId);

    // Notify student
    await notificationService.createNotification({
      recipient: mentorship.student,
      sender: alumniId,
      type: 'MENTORSHIP_DECLINED',
      title: 'Mentorship Request Update',
      message: `${alumni?.fullName || 'Alumni mentor'} was unable to accept your request at this time.`,
      link: '/dashboard/student',
      metadata: { mentorshipId: mentorship._id },
    });

    return mentorship;
  }

  async completeMentorship(alumniId, requestId, { feedback = {}, notes = '' } = {}) {
    const mentorship = await Mentorship.findOne({ _id: requestId, alumni: alumniId });
    if (!mentorship) {
      throw ApiError.notFound('Mentorship request not found');
    }

    if (mentorship.status !== 'ACCEPTED') {
      throw ApiError.badRequest('Only accepted mentorship sessions can be marked completed');
    }

    mentorship.status = 'COMPLETED';
    if (notes) mentorship.alumniNotes = notes;
    mentorship.feedback = {
      rating: feedback.rating || 5,
      comment: feedback.comment || 'Mentorship session successfully completed.',
      completedAt: new Date(),
    };
    await mentorship.save();

    const alumni = await User.findById(alumniId);

    // Notify student
    await notificationService.createNotification({
      recipient: mentorship.student,
      sender: alumniId,
      type: 'MENTORSHIP_COMPLETED',
      title: 'Mentorship Session Completed',
      message: `${alumni?.fullName || 'Your mentor'} marked the mentorship on "${mentorship.topic}" as completed!`,
      link: '/dashboard/student',
      metadata: { mentorshipId: mentorship._id },
    });

    return mentorship;
  }

  async cancelMentorship(userId, requestId) {
    const mentorship = await Mentorship.findOne({
      _id: requestId,
      $or: [{ student: userId }, { alumni: userId }],
    });

    if (!mentorship) {
      throw ApiError.notFound('Mentorship request not found');
    }

    mentorship.status = 'CANCELLED';
    await mentorship.save();
    return mentorship;
  }

  // ==========================================
  // PART 5 — SKILL ENDORSEMENTS
  // ==========================================

  async getEndorsements({ studentId, alumniId, page = 1, limit = 20 } = {}) {
    const query = { status: 'ACTIVE' };
    if (studentId) query.student = studentId;
    if (alumniId) query.alumni = alumniId;

    const skip = (Number(page) - 1) * Number(limit);
    const [endorsements, total] = await Promise.all([
      Endorsement.find(query)
        .populate('student', 'fullName email avatar college branch')
        .populate('alumni', 'fullName email avatar college')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Endorsement.countDocuments(query),
    ]);

    return {
      endorsements,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  async createEndorsement(alumniId, { studentId, skill, message = '' }) {
    if (!studentId || !skill) {
      throw ApiError.badRequest('Student ID and skill name are required');
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw ApiError.notFound('Student not found');
    }

    // Verify skill exists in student's profile or verified portfolio
    const [prof, sProf, ports] = await Promise.all([
      Profile.findOne({ user: studentId }),
      StudentProfile.findOne({ user: studentId }),
      Portfolio.find({ student: studentId }),
    ]);

    const studentSkills = [
      ...(prof?.skills || []),
      ...(sProf?.skills || []),
      ...ports.flatMap((p) => p.skillsVerified || []),
    ].map((s) => s.toLowerCase());

    const hasSkill = studentSkills.some((s) => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s));

    if (!hasSkill && studentSkills.length > 0) {
      throw ApiError.badRequest(`Skill "${skill}" is not present in the student's profile skills`);
    }

    // Check duplicate active endorsement
    const existing = await Endorsement.findOne({
      student: studentId,
      alumni: alumniId,
      skill: new RegExp(`^${skill.trim()}$`, 'i'),
      status: 'ACTIVE',
    });

    if (existing) {
      throw ApiError.conflict(`You have already endorsed ${student.fullName} for ${skill}`);
    }

    const endorsement = await Endorsement.create({
      student: studentId,
      alumni: alumniId,
      skill: skill.trim(),
      message: message.trim(),
      status: 'ACTIVE',
    });

    const alumni = await User.findById(alumniId);

    // Notify student
    await notificationService.createNotification({
      recipient: studentId,
      sender: alumniId,
      type: 'SKILL_ENDORSEMENT',
      title: 'New Skill Endorsement!',
      message: `${alumni?.fullName || 'An alumni mentor'} endorsed you for "${skill}"!`,
      link: '/portfolio/me',
      metadata: { endorsementId: endorsement._id, skill },
    });

    return Endorsement.findById(endorsement._id)
      .populate('student', 'fullName email avatar college branch')
      .populate('alumni', 'fullName email avatar college');
  }

  async deleteEndorsement(alumniId, endorsementId) {
    const endorsement = await Endorsement.findOneAndDelete({
      _id: endorsementId,
      alumni: alumniId,
    });

    if (!endorsement) {
      throw ApiError.notFound('Endorsement not found or unauthorized');
    }

    return { message: 'Endorsement removed successfully' };
  }

  // ==========================================
  // PART 6 — MOCK INTERVIEWS
  // ==========================================

  async getMockInterviews(userId, role, { status, page = 1, limit = 20 } = {}) {
    const query = {};
    if (role === 'alumni') {
      query.alumni = userId;
    } else {
      query.student = userId;
    }

    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [interviews, total] = await Promise.all([
      MockInterview.find(query)
        .populate('student', 'fullName email avatar college branch graduationYear')
        .populate('alumni', 'fullName email avatar college')
        .sort({ scheduledDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MockInterview.countDocuments(query),
    ]);

    return {
      interviews,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  async requestMockInterview(studentId, { alumniId, roleTarget, mode = 'ONLINE', scheduledDate, durationMinutes = 45, notes = '' }) {
    const alumni = await User.findById(alumniId);
    if (!alumni || alumni.role !== 'alumni') {
      throw ApiError.notFound('Alumni mentor not found');
    }

    const interview = await MockInterview.create({
      student: studentId,
      alumni: alumniId,
      roleTarget,
      mode,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      durationMinutes,
      notes,
      status: 'REQUESTED',
    });

    const student = await User.findById(studentId);

    // Notify alumni
    await notificationService.createNotification({
      recipient: alumniId,
      sender: studentId,
      type: 'MOCK_INTERVIEW_REQUESTED',
      title: 'Mock Interview Requested',
      message: `${student?.fullName || 'A student'} requested a mock interview for "${roleTarget}"`,
      link: '/alumni/mock-interviews',
      metadata: { mockInterviewId: interview._id },
    });

    return interview;
  }

  async acceptMockInterview(alumniId, interviewId, { meetingLink, location, scheduledDate } = {}) {
    const interview = await MockInterview.findOne({ _id: interviewId, alumni: alumniId });
    if (!interview) {
      throw ApiError.notFound('Mock interview request not found');
    }

    if (interview.status !== 'REQUESTED') {
      throw ApiError.badRequest(`Cannot accept interview in '${interview.status}' status`);
    }

    interview.status = 'ACCEPTED';
    if (meetingLink) interview.meetingLink = meetingLink;
    if (location) interview.location = location;
    if (scheduledDate) interview.scheduledDate = new Date(scheduledDate);
    await interview.save();

    const alumni = await User.findById(alumniId);

    // Notify student
    await notificationService.createNotification({
      recipient: interview.student,
      sender: alumniId,
      type: 'MOCK_INTERVIEW_ACCEPTED',
      title: 'Mock Interview Accepted',
      message: `${alumni?.fullName || 'Your alumni interviewer'} accepted your interview for "${interview.roleTarget}"`,
      link: '/dashboard/student',
      metadata: { mockInterviewId: interview._id },
    });

    return interview;
  }

  async scheduleMockInterview(alumniId, interviewId, { scheduledDate, mode, meetingLink, location, durationMinutes }) {
    const interview = await MockInterview.findOne({ _id: interviewId, alumni: alumniId });
    if (!interview) {
      throw ApiError.notFound('Mock interview not found');
    }

    if (mode) interview.mode = mode;
    if (scheduledDate) interview.scheduledDate = new Date(scheduledDate);
    if (durationMinutes) interview.durationMinutes = durationMinutes;

    if (interview.mode === 'ONLINE') {
      if (meetingLink) interview.meetingLink = meetingLink;
      if (!interview.meetingLink) {
        throw ApiError.badRequest('Online mock interview requires a valid meeting link (Google Meet / Zoom)');
      }
    } else {
      if (location) interview.location = location;
      if (!interview.location) {
        throw ApiError.badRequest('Offline mock interview requires a campus or office location');
      }
    }

    interview.status = 'SCHEDULED';
    await interview.save();

    const alumni = await User.findById(alumniId);

    // Notify student
    await notificationService.createNotification({
      recipient: interview.student,
      sender: alumniId,
      type: 'MOCK_INTERVIEW_SCHEDULED',
      title: 'Mock Interview Scheduled',
      message: `${alumni?.fullName || 'Interviewer'} scheduled your interview on ${new Date(interview.scheduledDate).toLocaleString()}`,
      link: '/dashboard/student',
      metadata: { mockInterviewId: interview._id },
    });

    return interview;
  }

  async declineMockInterview(alumniId, interviewId, { notes = '' } = {}) {
    const interview = await MockInterview.findOne({ _id: interviewId, alumni: alumniId });
    if (!interview) {
      throw ApiError.notFound('Mock interview not found');
    }

    interview.status = 'DECLINED';
    if (notes) interview.notes = notes;
    await interview.save();

    return interview;
  }

  async completeMockInterview(alumniId, interviewId, { feedback = {} }) {
    const interview = await MockInterview.findOne({ _id: interviewId, alumni: alumniId });
    if (!interview) {
      throw ApiError.notFound('Mock interview not found');
    }

    if (!['ACCEPTED', 'SCHEDULED'].includes(interview.status)) {
      throw ApiError.badRequest('Only accepted or scheduled interviews can be completed');
    }

    interview.status = 'COMPLETED';
    interview.feedback = {
      rating: feedback.rating || 4,
      technicalSkills: feedback.technicalSkills || 'Good understanding of core concepts.',
      communication: feedback.communication || 'Clear presentation and articulation.',
      strengths: feedback.strengths || ['Problem Solving', 'Data Structures'],
      improvements: feedback.improvements || ['System scalability discussions'],
      detailedSummary: feedback.detailedSummary || 'Solid candidate with good technical aptitude.',
      completedAt: new Date(),
    };
    await interview.save();

    const alumni = await User.findById(alumniId);

    // Notify student
    await notificationService.createNotification({
      recipient: interview.student,
      sender: alumniId,
      type: 'MOCK_INTERVIEW_COMPLETED',
      title: 'Mock Interview Feedback Available',
      message: `${alumni?.fullName || 'Your interviewer'} completed your mock interview for "${interview.roleTarget}" and provided scorecard feedback!`,
      link: '/dashboard/student',
      metadata: { mockInterviewId: interview._id },
    });

    return interview;
  }

  // ==========================================
  // PART 7 — REFERRALS
  // ==========================================

  async getReferrals(userId, role, { status, studentId, page = 1, limit = 20 } = {}) {
    const query = {};
    if (role === 'alumni') {
      query.alumni = userId;
    } else {
      query.student = userId;
    }

    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }
    if (studentId) {
      query.student = studentId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [referrals, total] = await Promise.all([
      Referral.find(query)
        .populate('student', 'fullName email avatar college branch graduationYear')
        .populate('alumni', 'fullName email avatar college')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Referral.countDocuments(query),
    ]);

    return {
      referrals,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
    };
  }

  async getReferralById(referralId, userId) {
    const referral = await Referral.findOne({
      _id: referralId,
      $or: [{ alumni: userId }, { student: userId }],
    })
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('alumni', 'fullName email avatar college');

    if (!referral) {
      throw ApiError.notFound('Referral not found');
    }

    return referral;
  }

  async createReferral(alumniId, { studentId, company, jobTitle, jobUrl = '', message = '', status = 'SUBMITTED', internalNotes = '' }) {
    if (!studentId || !company || !jobTitle) {
      throw ApiError.badRequest('Student ID, company, and job title are required');
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw ApiError.notFound('Student not found');
    }

    const referral = await Referral.create({
      student: studentId,
      alumni: alumniId,
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      jobUrl: jobUrl.trim(),
      message: message.trim(),
      status: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'REFERRED', 'REJECTED', 'CLOSED'].includes(status)
        ? status
        : 'SUBMITTED',
      internalNotes: internalNotes.trim(),
    });

    const alumni = await User.findById(alumniId);

    // Notify student if not draft
    if (referral.status !== 'DRAFT') {
      await notificationService.createNotification({
        recipient: studentId,
        sender: alumniId,
        type: 'REFERRAL_CREATED',
        title: 'New Job Referral!',
        message: `${alumni?.fullName || 'An alumni mentor'} submitted a referral for you at "${company}" for the role of ${jobTitle}!`,
        link: '/dashboard/student',
        metadata: { referralId: referral._id },
      });
    }

    return Referral.findById(referral._id)
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('alumni', 'fullName email avatar college');
  }

  async updateReferral(alumniId, referralId, updateData) {
    const referral = await Referral.findOne({ _id: referralId, alumni: alumniId });
    if (!referral) {
      throw ApiError.notFound('Referral not found');
    }

    const oldStatus = referral.status;
    const allowedUpdates = ['company', 'jobTitle', 'jobUrl', 'message', 'status', 'internalNotes'];
    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        referral[field] = updateData[field];
      }
    });

    await referral.save();

    // If status changed, notify student
    if (updateData.status && updateData.status !== oldStatus) {
      await notificationService.createNotification({
        recipient: referral.student,
        sender: alumniId,
        type: 'REFERRAL_STATUS_CHANGED',
        title: 'Referral Status Updated',
        message: `Your referral at "${referral.company}" for ${referral.jobTitle} status updated to: ${referral.status}`,
        link: '/dashboard/student',
        metadata: { referralId: referral._id, status: referral.status },
      });
    }

    return Referral.findById(referral._id)
      .populate('student', 'fullName email avatar college branch graduationYear')
      .populate('alumni', 'fullName email avatar college');
  }

  // ==========================================
  // PART 8 — ALUMNI DASHBOARD STATS & AGGREGATES
  // ==========================================

  async getDashboardStats(alumniId) {
    const [
      studentsMentoredCount,
      pendingMentorshipsCount,
      endorsementsGivenCount,
      activeReferralsCount,
      upcomingInterviewsCount,
      pendingRequests,
      upcomingInterviews,
      recentReferrals,
      topStudentsData,
    ] = await Promise.all([
      // Students Mentored (accepted or completed)
      Mentorship.countDocuments({ alumni: alumniId, status: { $in: ['ACCEPTED', 'COMPLETED'] } }),
      // Pending Mentorships
      Mentorship.countDocuments({ alumni: alumniId, status: 'PENDING' }),
      // Endorsements Given
      Endorsement.countDocuments({ alumni: alumniId, status: 'ACTIVE' }),
      // Active Referrals (submitted, under_review, referred)
      Referral.countDocuments({ alumni: alumniId, status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'REFERRED'] } }),
      // Upcoming Mock Interviews
      MockInterview.countDocuments({
        alumni: alumniId,
        status: { $in: ['ACCEPTED', 'SCHEDULED'] },
      }),
      // Recent pending requests
      Mentorship.find({ alumni: alumniId, status: 'PENDING' })
        .populate('student', 'fullName email avatar college branch graduationYear')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      // Upcoming Interviews
      MockInterview.find({ alumni: alumniId, status: { $in: ['ACCEPTED', 'SCHEDULED', 'REQUESTED'] } })
        .populate('student', 'fullName email avatar college branch graduationYear')
        .sort({ scheduledDate: 1, createdAt: -1 })
        .limit(5)
        .lean(),
      // Recent referrals
      Referral.find({ alumni: alumniId })
        .populate('student', 'fullName email avatar college branch graduationYear')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      // Recommended students
      this.searchStudents({ page: 1, limit: 4 }),
    ]);

    return {
      stats: {
        studentsMentored: studentsMentoredCount,
        pendingMentorships: pendingMentorshipsCount,
        endorsementsGiven: endorsementsGivenCount,
        activeReferrals: activeReferralsCount,
        upcomingMockInterviews: upcomingInterviewsCount,
      },
      pendingRequests,
      upcomingInterviews,
      recentReferrals,
      recommendedStudents: topStudentsData.students || [],
    };
  }
}

export default new AlumniService();
