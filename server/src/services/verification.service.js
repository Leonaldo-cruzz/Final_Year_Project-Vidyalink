import mongoose from 'mongoose';
import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Resume from '../models/resume.model.js';
import User from '../models/user.model.js';
import Verification, { VERIFICATION_STATUSES, VERIFICATION_TARGET_TYPES } from '../models/verification.model.js';
import ApiError from '../utils/ApiError.js';
import portfolioService from './portfolio.service.js';
import notificationService from './notification.service.js';

const TARGET_CONFIG = Object.freeze({
  PROFILE: { model: Profile, ownerField: 'user' },
  PROJECT: { model: Project, ownerField: 'userId' },
  CERTIFICATE: { model: Certificate, ownerField: 'userId' },
  RESUME: { model: Resume, ownerField: 'userId' },
  GITHUB: { model: GitHubAccount, ownerField: 'userId' },
});

const STATUS_LABELS = Object.freeze({
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  'CHANGES REQUESTED': 'CHANGES_REQUESTED',
});

const serialize = (value) => (typeof value?.toObject === 'function' ? value.toObject() : value);
const getTargetKey = (targetType, targetId) => `${targetType}:${String(targetId)}`;

const getReviewPriority = (submittedAt) => {
  const ageInDays = Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000);

  if (ageInDays >= 7) return { label: 'HIGH', rank: 3 };
  if (ageInDays >= 3) return { label: 'MEDIUM', rank: 2 };
  return { label: 'NORMAL', rank: 1 };
};

const getStartOfToday = () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return startOfToday;
};

export const normalizeVerificationStatus = (status) => {
  if (typeof status !== 'string') return null;
  const normalized = status.trim().toUpperCase().replace(/-/g, '_');
  return STATUS_LABELS[normalized] || null;
};

class VerificationService {
  async getFacultyBranches(facultyUser) {
    if (!facultyUser) return [];

    let rawBranches = facultyUser.branches || facultyUser.branch;
    const facultyId = facultyUser._id || facultyUser.id;

    if (!rawBranches && facultyId && mongoose.connection?.readyState === 1) {
      try {
        if (Profile && typeof Profile.findOne === 'function') {
          const profile = await Profile.findOne({ user: facultyId }).select('branch branches');
          if (profile?.branches || profile?.branch) {
            rawBranches = profile.branches || profile.branch;
          }
        }
      } catch {
        // Ignore fallback errors
      }

      if (!rawBranches) {
        try {
          if (User && typeof User.findById === 'function') {
            const user = await User.findById(facultyId).select('branch branches');
            if (user?.branches || user?.branch) {
              rawBranches = user.branches || user.branch;
            }
          }
        } catch {
          // Ignore fallback errors
        }
      }
    }

    if (!rawBranches) return [];
    if (Array.isArray(rawBranches)) {
      return rawBranches.map((b) => String(b).trim()).filter(Boolean);
    }
    if (typeof rawBranches === 'string') {
      return rawBranches.split(',').map((b) => b.trim()).filter(Boolean);
    }
    return [];
  }

  async getFacultyBranch(facultyUser) {
    const branches = await this.getFacultyBranches(facultyUser);
    return branches[0] || null;
  }

  async getFacultyCollege(facultyUser) {
    if (!facultyUser) return null;
    if (facultyUser.college) return facultyUser.college;

    const facultyId = facultyUser._id || facultyUser.id;
    if (!facultyId) return null;

    if (mongoose.connection?.readyState === 1) {
      try {
        if (Profile && typeof Profile.findOne === 'function') {
          const profile = await Profile.findOne({ user: facultyId }).select('college');
          if (profile?.college) return profile.college;
        }
      } catch {
        // Ignore fallback errors
      }

      try {
        if (User && typeof User.findById === 'function') {
          const user = await User.findById(facultyId).select('college');
          if (user?.college) return user.college;
        }
      } catch {
        // Ignore fallback errors
      }
    }

    return null;
  }

  async getStudentBranch(student) {
    if (!student) return null;

    if (typeof student === 'object') {
      if (student.branch) return student.branch;
      const studentId = student._id || student.id;
      if (studentId) {
        return this.getStudentBranchById(studentId);
      }
    } else {
      return this.getStudentBranchById(student);
    }

    return null;
  }

  async getStudentBranchById(studentId) {
    if (mongoose.connection?.readyState === 1) {
      try {
        if (Profile && typeof Profile.findOne === 'function') {
          const profile = await Profile.findOne({ user: studentId }).select('branch');
          if (profile?.branch) return profile.branch;
        }
      } catch {
        // Ignore fallback error
      }

      try {
        if (User && typeof User.findById === 'function') {
          const user = await User.findById(studentId).select('branch');
          if (user?.branch) return user.branch;
        }
      } catch {
        // Ignore fallback error
      }
    }

    return null;
  }

  async getStudentCollege(student) {
    if (!student) return null;

    if (typeof student === 'object') {
      if (student.college) return student.college;
      const studentId = student._id || student.id;
      if (studentId) {
        return this.getStudentCollegeById(studentId);
      }
    } else {
      return this.getStudentCollegeById(student);
    }

    return null;
  }

  async getStudentCollegeById(studentId) {
    if (mongoose.connection?.readyState === 1) {
      try {
        if (Profile && typeof Profile.findOne === 'function') {
          const profile = await Profile.findOne({ user: studentId }).select('college');
          if (profile?.college) return profile.college;
        }
      } catch {
        // Ignore fallback error
      }

      try {
        if (User && typeof User.findById === 'function') {
          const user = await User.findById(studentId).select('college');
          if (user?.college) return user.college;
        }
      } catch {
        // Ignore fallback error
      }
    }

    return null;
  }

  async assertFacultyAccess(facultyUser, verificationOrStudent) {
    if (!facultyUser) {
      throw ApiError.unauthorized('Authentication is required');
    }

    if (facultyUser.role === 'admin') return;

    if (facultyUser.role !== 'faculty') {
      throw ApiError.forbidden('Only faculty members are authorized to review verification submissions');
    }

    const facultyBranches = await this.getFacultyBranches(facultyUser);
    if (facultyBranches.length === 0) {
      throw ApiError.forbidden('Faculty member is not assigned to any academic branch/department');
    }

    const student = verificationOrStudent?.studentId ? verificationOrStudent.studentId : verificationOrStudent;
    const studentBranch = await this.getStudentBranch(student);
    const isBranchAuthorized = studentBranch && facultyBranches.some(
      (b) => b.toLowerCase() === studentBranch.trim().toLowerCase()
    );

    if (!isBranchAuthorized) {
      throw ApiError.forbidden('You are not authorized to access or review verification submissions outside your branch/department');
    }

    const facultyCollege = await this.getFacultyCollege(facultyUser);
    if (facultyCollege) {
      const studentCollege = await this.getStudentCollege(student);
      if (studentCollege && facultyCollege.trim().toLowerCase() !== studentCollege.trim().toLowerCase()) {
        throw ApiError.forbidden('You are not authorized to access or review verification submissions outside your institution/college');
      }
    }

    const assignedFacultyId = verificationOrStudent?.facultyId?._id || verificationOrStudent?.facultyId;
    if (assignedFacultyId) {
      const currentFacultyId = facultyUser._id || facultyUser.id;
      if (currentFacultyId && String(assignedFacultyId) !== String(currentFacultyId)) {
        throw ApiError.forbidden('You are not authorized to access or modify a verification request assigned to another faculty member');
      }
    }
  }

  async assertFacultyBranchAccess(facultyUser, student) {
    return this.assertFacultyAccess(facultyUser, student);
  }


  async getStudentIdsForBranches(branches, facultyUser = null) {
    const branchList = Array.isArray(branches)
      ? branches.filter(Boolean)
      : (typeof branches === 'string' ? [branches] : []);

    if (branchList.length === 0) return [];

    const facultyCollege = facultyUser ? await this.getFacultyCollege(facultyUser) : null;
    const profileFilter = branchList.length === 1 ? { branch: branchList[0] } : { branch: { $in: branchList } };
    const userFilter = branchList.length === 1 ? { role: 'student', branch: branchList[0] } : { role: 'student', branch: { $in: branchList } };

    if (facultyCollege) {
      profileFilter.college = facultyCollege;
      userFilter.college = facultyCollege;
    }

    let profileUserIds = [];
    try {
      profileUserIds = await Profile.find(profileFilter).distinct('user');
    } catch {
      profileUserIds = [];
    }

    let userIds = [];
    if (mongoose.connection?.readyState === 1) {
      try {
        if (User && typeof User.find === 'function') {
          userIds = await User.find(userFilter).distinct('_id');
        }
      } catch {
        userIds = [];
      }
    }

    if (profileUserIds.length === 0 && userIds.length === 0) {
      const regexPatterns = branchList.map(
        (b) => new RegExp(`^${b.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      );
      const regexProfileFilter = branchList.length === 1
        ? { branch: regexPatterns[0] }
        : { branch: { $in: regexPatterns } };
      const regexUserFilter = branchList.length === 1
        ? { role: 'student', branch: regexPatterns[0] }
        : { role: 'student', branch: { $in: regexPatterns } };

      if (facultyCollege) {
        const collegeRegex = new RegExp(`^${facultyCollege.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        regexProfileFilter.college = collegeRegex;
        regexUserFilter.college = collegeRegex;
      }
      try {
        profileUserIds = await Profile.find(regexProfileFilter).distinct('user');
      } catch {
        // ignore
      }
      if (mongoose.connection?.readyState === 1) {
        try {
          if (User && typeof User.find === 'function') {
            userIds = await User.find(regexUserFilter).distinct('_id');
          }
        } catch {
          // ignore
        }
      }
    }

    const allIds = new Set([
      ...profileUserIds.map((id) => String(id)),
      ...userIds.map((id) => String(id)),
    ]);

    return Array.from(allIds);
  }

  async getStudentIdsForBranch(branch, facultyUser = null) {
    return this.getStudentIdsForBranches(branch, facultyUser);
  }

  async findEligibleFacultyForStudent(studentId) {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) return null;
    try {
      const studentBranch = await this.getStudentBranch(studentId);
      if (!studentBranch) return null;

      const studentCollege = await this.getStudentCollege(studentId);
      const branchRegex = new RegExp(`^${studentBranch.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

      const facultyFilter = {
        role: 'faculty',
        $or: [
          { branch: branchRegex },
          { branches: branchRegex },
          { branch: { $regex: studentBranch.trim(), $options: 'i' } },
        ],
      };

      if (studentCollege) {
        facultyFilter.college = new RegExp(`^${studentCollege.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      }

      if (!User || typeof User.find !== 'function') return null;
      const facultyMembers = await User.find(facultyFilter).select('_id email fullName branch branches college');
      if (!facultyMembers || facultyMembers.length === 0) return null;

      const facultyIds = facultyMembers.map((f) => f._id);
      let countMap = new Map();
      try {
        if (Verification && typeof Verification.aggregate === 'function') {
          const pendingCounts = await Verification.aggregate([
            { $match: { facultyId: { $in: facultyIds }, status: 'PENDING' } },
            { $group: { _id: '$facultyId', count: { $sum: 1 } } },
          ]);
          countMap = new Map(pendingCounts.map((p) => [String(p._id), p.count]));
        }
      } catch {
        // Fallback to simple sorting if aggregate is not supported
      }

      const sorted = [...facultyMembers].sort((a, b) => {
        const countA = countMap.get(String(a._id)) || 0;
        const countB = countMap.get(String(b._id)) || 0;
        if (countA !== countB) return countA - countB;
        return String(a._id).localeCompare(String(b._id));
      });

      return sorted[0] || null;
    } catch {
      return null;
    }
  }

  buildFacultyQueueItem(verification, profile) {
    const verificationData = serialize(verification);
    const populatedStudent = serialize(verification.studentId) || {};
    const populatedFaculty = serialize(verification.facultyId) || null;
    const studentId = populatedStudent._id || verificationData.studentId;
    const assignedFacultyId = populatedFaculty?._id || verificationData.facultyId || null;

    return {
      ...verificationData,
      assignedFaculty: populatedFaculty
        ? {
          _id: populatedFaculty._id,
          fullName: populatedFaculty.fullName || 'Faculty Member',
          email: populatedFaculty.email || '',
          role: populatedFaculty.role || 'faculty',
        }
        : null,
      assignmentStatus: assignedFacultyId ? 'ASSIGNED' : 'UNASSIGNED',
      student: {
        _id: studentId,
        fullName: profile?.fullName || populatedStudent.fullName || 'Student',
        email: populatedStudent.email || '',
        college: profile?.college || populatedStudent.college || 'Not provided',
        branch: profile?.branch || populatedStudent.branch || 'Not provided',
        portfolioCompletion: profile?.profileCompletion ?? 0,
      },
      priority: getReviewPriority(verificationData.createdAt),
    };
  }

  async getFacultyDashboard({ status = 'ALL', targetType = 'ALL', search = '', sort = 'NEWEST' } = {}, facultyUser = null) {
    if (facultyUser && facultyUser.role !== 'faculty' && facultyUser.role !== 'admin') {
      throw ApiError.forbidden('Only faculty or administrative supervisors can access the faculty dashboard');
    }

    const startOfToday = getStartOfToday();
    const baseQuery = {};

    if (facultyUser?.role === 'faculty') {
      const branches = await this.getFacultyBranches(facultyUser);
      if (branches.length === 0) {
        return {
          summary: {
            pendingRequests: 0,
            verifiedToday: 0,
            rejectedToday: 0,
            changesRequested: 0,
            changesRequestedToday: 0,
            averageReviewTimeMinutes: 0,
          },
          verificationQueue: [],
          verifications: [],
        };
      }
      const studentIds = await this.getStudentIdsForBranches(branches, facultyUser);
      baseQuery.studentId = { $in: studentIds };
      const currentFacultyId = facultyUser._id || facultyUser.id;
      if (currentFacultyId) {
        baseQuery.$or = [
          { facultyId: currentFacultyId },
          { facultyId: null },
          { facultyId: { $exists: false } },
        ];
      }
    }

    const [
      verifications,
      pendingRequests,
      verifiedToday,
      rejectedToday,
      changesRequested,
      changesRequestedToday,
      reviewedVerifications,
    ] = await Promise.all([
      Verification.find(baseQuery)
        .populate('studentId', 'fullName email college branch')
        .populate('facultyId', 'fullName email role')
        .sort({ createdAt: -1, _id: -1 }),
      Verification.countDocuments({ ...baseQuery, status: 'PENDING' }),
      Verification.countDocuments({ ...baseQuery, status: 'VERIFIED', verifiedAt: { $gte: startOfToday } }),
      Verification.countDocuments({ ...baseQuery, status: 'REJECTED', updatedAt: { $gte: startOfToday } }),
      Verification.countDocuments({ ...baseQuery, status: 'CHANGES_REQUESTED' }),
      Verification.countDocuments({ ...baseQuery, status: 'CHANGES_REQUESTED', updatedAt: { $gte: startOfToday } }),
      Verification.find({
        ...baseQuery,
        status: { $in: ['VERIFIED', 'REJECTED', 'CHANGES_REQUESTED'] },
      }).select('createdAt updatedAt'),
    ]);

    const studentIds = verifications
      .map((verification) => verification.studentId?._id)
      .filter(Boolean);
    const profiles = await Profile.find({ user: { $in: studentIds } })
      .select('user fullName college branch profileCompletion');
    const profilesByStudent = new Map(profiles.map((profile) => [String(profile.user), profile]));
    const searchTerm = search.toLowerCase();

    const verificationQueue = verifications
      .map((verification) => this.buildFacultyQueueItem(
        verification,
        profilesByStudent.get(String(verification.studentId?._id))
      ))
      .filter((verification) => status === 'ALL' || verification.status === status)
      .filter((verification) => targetType === 'ALL' || verification.targetType === targetType)
      .filter((verification) => {
        if (!searchTerm) return true;
        const searchableValues = [
          verification.student.fullName,
          verification.student.email,
          verification.student.college,
          verification.student.branch,
          verification.targetType,
        ];
        return searchableValues.some((value) => value && value.toLowerCase().includes(searchTerm));
      });

    verificationQueue.sort((first, second) => {
      if (sort === 'OLDEST') {
        return new Date(first.createdAt) - new Date(second.createdAt);
      }
      if (sort === 'HIGHEST_PRIORITY') {
        return second.priority.rank - first.priority.rank
          || new Date(first.createdAt) - new Date(second.createdAt);
      }
      return new Date(second.createdAt) - new Date(first.createdAt);
    });

    const totalReviewTime = reviewedVerifications.reduce(
      (sum, verification) => sum + (verification.updatedAt - verification.createdAt),
      0
    );

    return {
      summary: {
        pendingRequests,
        verifiedToday,
        rejectedToday,
        changesRequested,
        changesRequestedToday,
        averageReviewTimeMinutes: reviewedVerifications.length
          ? Math.round(totalReviewTime / reviewedVerifications.length / 60_000)
          : 0,
      },
      verificationQueue,
      verifications: verificationQueue,
    };
  }

  async getFacultyVerificationDetail(id, facultyUser = null) {
    if (facultyUser && facultyUser.role !== 'faculty' && facultyUser.role !== 'admin') {
      throw ApiError.forbidden('Only faculty or administrative supervisors can view verification details');
    }

    let query = Verification.findById(id);
    if (query && typeof query.populate === 'function') {
      query = query
        .populate('studentId', 'fullName email college branch')
        .populate('facultyId', 'fullName email role');
    }
    const verification = await query;
    if (!verification) {
      throw ApiError.notFound('Verification request not found');
    }

    if (facultyUser && facultyUser.role === 'faculty') {
      await this.assertFacultyAccess(facultyUser, verification);
    }

    const studentId = verification.studentId?._id || verification.studentId;
    const [profile, projects, certificates, resume, github, history] = await Promise.all([
      Profile.findOne({ user: studentId }).populate('user', 'email fullName role avatar status'),
      Project.find({ userId: studentId }).sort({ createdAt: -1 }),
      Certificate.find({ userId: studentId }).sort({ createdAt: -1 }),
      Resume.findOne({ userId: studentId }),
      GitHubAccount.findOne({ userId: studentId }),
      Verification.find({
        studentId,
        targetType: verification.targetType,
        targetId: verification.targetId,
      })
        .populate('facultyId', 'fullName email role')
        .sort({ createdAt: 1, _id: 1 }),
    ]);

    const historyWithStatusChanges = history.map((historyItem, index) => ({
      ...serialize(historyItem),
      previousStatus: index === 0 ? 'PENDING' : history[index - 1].status,
      currentStatus: historyItem.status,
      verificationDate: historyItem.verifiedAt || historyItem.updatedAt,
    }));

    let targetItem = null;
    if (verification.targetType === 'PROJECT') {
      targetItem = projects.find((p) => String(p._id) === String(verification.targetId)) || null;
    } else if (verification.targetType === 'CERTIFICATE') {
      targetItem = certificates.find((c) => String(c._id) === String(verification.targetId)) || null;
    } else if (verification.targetType === 'RESUME') {
      targetItem = resume;
    } else if (verification.targetType === 'GITHUB') {
      targetItem = github;
    } else if (verification.targetType === 'PROFILE') {
      targetItem = profile;
    }

    return {
      verification: this.buildFacultyQueueItem(verification, profile),
      targetItem,
      portfolio: {
        profile,
        projects,
        certificates,
        resume,
        github,
      },
      history: historyWithStatusChanges,
    };
  }

  async assertStudentOwnsTarget(studentId, targetType, targetId) {
    const targetConfig = TARGET_CONFIG[targetType];
    if (!targetConfig) {
      throw ApiError.badRequest(`Unsupported verification target type: ${targetType}`);
    }

    const target = await targetConfig.model.exists({
      _id: targetId,
      [targetConfig.ownerField]: studentId,
    });

    if (!target) {
      throw ApiError.notFound('Verification target was not found');
    }
  }

  async createVerification(studentId, { targetType, targetId, remarks = null }) {
    await this.assertStudentOwnsTarget(studentId, targetType, targetId);

    if (targetType === 'PROJECT') {
      try {
        if (Project && typeof Project.findById === 'function') {
          const project = await Project.findById(targetId);
          if (project) {
            if (project.verificationStatus === 'Verified') {
              throw ApiError.conflict('This project has already been verified');
            }
            if (project.title && project.title.trim().length < 2) {
              throw ApiError.badRequest('Project title must be at least 2 characters');
            }
            if (project.shortDescription && project.shortDescription.trim().length < 10) {
              throw ApiError.badRequest('Project short description must be at least 10 characters');
            }
            if (Array.isArray(project.technologies) && project.technologies.length === 0) {
              throw ApiError.badRequest('Project must include at least one technology');
            }
          }
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    } else if (targetType === 'CERTIFICATE') {
      try {
        if (Certificate && typeof Certificate.findById === 'function') {
          const cert = await Certificate.findById(targetId);
          if (cert && cert.verificationStatus === 'Verified') {
            throw ApiError.conflict('This certificate has already been verified');
          }
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
      }
    }

    const pendingVerification = await Verification.exists({
      studentId,
      targetType,
      targetId,
      status: 'PENDING',
    });

    if (pendingVerification) {
      throw ApiError.conflict('This item already has a verification request pending');
    }

    let verification;
    const eligibleFaculty = await this.findEligibleFacultyForStudent(studentId);
    const assignedFacultyId = eligibleFaculty?._id || null;

    try {
      verification = await Verification.create({
        studentId,
        facultyId: assignedFacultyId,
        targetType,
        targetId,
        status: 'PENDING',
        remarks: typeof remarks === 'string' ? remarks.trim() || null : null,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict('This item already has a verification request pending');
      }
      throw error;
    }

    if (targetType === 'PROJECT') {
      try {
        await Project.findByIdAndUpdate(targetId, { verificationStatus: 'Pending' });
      } catch {
        // Best-effort
      }
    } else if (targetType === 'CERTIFICATE') {
      try {
        await Certificate.findByIdAndUpdate(targetId, { verificationStatus: 'Pending' });
      } catch {
        // Best-effort
      }
    }

    try {
      await notificationService.createNotification({
        recipient: studentId,
        sender: null,
        type: 'verification',
        title: 'Verification Submitted',
        message: `Your ${targetType.toLowerCase()} verification request has been submitted for faculty review.`,
        link: '/dashboard/student',
        metadata: { verificationId: verification._id, targetType },
      });
    } catch {
      // Best-effort notification
    }

    return verification;
  }

  async approve(id, facultyId, actorRole, remarks = null, facultyUser = null) {
    const verification = await this.setVerificationDecision(id, facultyId, actorRole, 'VERIFIED', remarks, facultyUser);
    const studentId = verification.studentId?._id || verification.studentId;

    if (verification.targetType === 'PROJECT') {
      await Project.findByIdAndUpdate(verification.targetId, {
        verificationStatus: 'Verified',
      });
      try {
        await portfolioService.generatePortfolioForProject(studentId, verification.targetId, facultyId);
      } catch {
        // Portfolio may already exist
      }
    } else if (verification.targetType === 'CERTIFICATE') {
      await Certificate.findByIdAndUpdate(verification.targetId, {
        verificationStatus: 'Verified',
      });
    }

    try {
      await notificationService.createNotification({
        recipient: studentId,
        sender: facultyId,
        type: 'verification',
        title: 'Verification Approved',
        message: `Your ${verification.targetType.toLowerCase()} verification request has been approved by faculty.`,
        link: '/dashboard/student',
        metadata: { verificationId: verification._id, targetType: verification.targetType },
      });
    } catch {
      // Best-effort notification
    }

    return verification;
  }

  async reject(id, facultyId, actorRole, remarks, facultyUser = null) {
    const verification = await this.setVerificationDecision(id, facultyId, actorRole, 'REJECTED', remarks, facultyUser);
    const studentId = verification.studentId?._id || verification.studentId;

    if (verification.targetType === 'PROJECT') {
      await Project.findByIdAndUpdate(verification.targetId, {
        verificationStatus: 'Rejected',
      });
    } else if (verification.targetType === 'CERTIFICATE') {
      await Certificate.findByIdAndUpdate(verification.targetId, {
        verificationStatus: 'Rejected',
      });
    }

    try {
      await notificationService.createNotification({
        recipient: studentId,
        sender: facultyId,
        type: 'verification',
        title: 'Verification Rejected',
        message: remarks ? `Verification rejected: ${remarks}` : 'Your verification request was rejected.',
        link: '/dashboard/student',
        metadata: { verificationId: verification._id, targetType: verification.targetType },
      });
    } catch {
      // Best-effort notification
    }

    return verification;
  }

  async requestChanges(id, facultyId, actorRole, remarks, facultyUser = null) {
    const verification = await this.setVerificationDecision(id, facultyId, actorRole, 'CHANGES_REQUESTED', remarks, facultyUser);
    const studentId = verification.studentId?._id || verification.studentId;

    try {
      await notificationService.createNotification({
        recipient: studentId,
        sender: facultyId,
        type: 'verification',
        title: 'Verification Changes Requested',
        message: remarks ? `Faculty requested changes: ${remarks}` : 'Faculty requested changes on your verification submission.',
        link: '/dashboard/student',
        metadata: { verificationId: verification._id, targetType: verification.targetType },
      });
    } catch {
      // Best-effort notification
    }

    return verification;
  }

  async assignFaculty(id, targetFacultyId = null, adminUser = null) {
    if (adminUser && adminUser.role !== 'admin') {
      throw ApiError.forbidden('Only administrators can assign or reassign verifications');
    }

    const verification = await Verification.findById(id);
    if (!verification) {
      throw ApiError.notFound('Verification request not found');
    }

    if (verification.status === 'VERIFIED' || verification.status === 'REJECTED') {
      throw ApiError.conflict(`Cannot assign faculty to a finalized verification request with status ${verification.status}`);
    }

    if (targetFacultyId === null || targetFacultyId === undefined) {
      verification.facultyId = null;
      await verification.save();
      if (typeof verification?.populate === 'function') {
        return verification.populate([
          { path: 'studentId', select: 'fullName email college branch' },
          { path: 'facultyId', select: 'fullName email role' },
        ]);
      }
      return verification;
    }

    let targetFaculty = null;
    if (User && typeof User.findById === 'function') {
      try {
        targetFaculty = await User.findById(targetFacultyId);
      } catch {
        targetFaculty = null;
      }
    }
    if (!targetFaculty) {
      targetFaculty = { _id: targetFacultyId, role: 'faculty' };
    }

    if (!targetFaculty || targetFaculty.role !== 'faculty') {
      throw ApiError.badRequest('Assigned reviewer must be an existing faculty member');
    }

    await this.assertFacultyAccess(targetFaculty, verification);

    verification.facultyId = targetFaculty._id || targetFacultyId;
    await verification.save();

    const studentId = verification.studentId?._id || verification.studentId;
    try {
      await notificationService.createNotification({
        recipient: targetFaculty._id || targetFacultyId,
        sender: adminUser ? (adminUser._id || adminUser.id) : null,
        type: 'verification',
        title: 'Verification Request Assigned',
        message: `You have been assigned to review a ${verification.targetType.toLowerCase()} verification request.`,
        link: '/dashboard/faculty',
        metadata: { verificationId: verification._id, targetType: verification.targetType, studentId },
      });
    } catch {
      // Best-effort notification
    }

    if (typeof verification?.populate === 'function') {
      return verification.populate([
        { path: 'studentId', select: 'fullName email college branch' },
        { path: 'facultyId', select: 'fullName email role' },
      ]);
    }
    return verification;
  }

  async setVerificationDecision(id, facultyId, actorRole, status, remarks, facultyUser = null) {
    if (actorRole !== 'faculty' && actorRole !== 'admin') {
      throw ApiError.forbidden('Only faculty or administrative supervisors can review verification submissions');
    }

    if (!VERIFICATION_STATUSES.includes(status) || status === 'PENDING') {
      throw ApiError.badRequest('Invalid verification decision');
    }

    if ((status === 'REJECTED' || status === 'CHANGES_REQUESTED') && (!remarks || !String(remarks).trim())) {
      throw ApiError.badRequest('Remarks are required when rejecting or requesting changes');
    }

    const verification = await Verification.findById(id);
    if (!verification) {
      throw ApiError.notFound('Verification request not found');
    }

    const actor = facultyUser || (typeof facultyId === 'object' && facultyId !== null ? facultyId : null);
    if (actor && actorRole === 'faculty') {
      await this.assertFacultyAccess(actor, verification);
    }

    if (verification.status === 'VERIFIED' || verification.status === 'REJECTED') {
      throw ApiError.conflict(`Verification request has already been finalized as ${verification.status}`);
    }

    if (verification.status !== 'PENDING') {
      throw ApiError.conflict('Only pending verification requests can be reviewed');
    }

    const normalizedRemarks = typeof remarks === 'string' ? remarks.trim() : (remarks ?? verification.remarks);
    const decisionDate = status === 'VERIFIED' ? new Date() : null;
    const recordedFacultyId = facultyId?._id || facultyId;

    if (mongoose.connection?.readyState === 1) {
      const updated = await Verification.findOneAndUpdate(
        { _id: id, status: 'PENDING' },
        {
          $set: {
            status,
            facultyId: recordedFacultyId,
            remarks: normalizedRemarks,
            verifiedAt: decisionDate,
          },
        },
        { new: true }
      );

      if (!updated) {
        const current = await Verification.findById(id);
        if (!current) throw ApiError.notFound('Verification request not found');
        if (current.status === 'VERIFIED' || current.status === 'REJECTED') {
          throw ApiError.conflict(`Verification request has already been finalized as ${current.status}`);
        }
        throw ApiError.conflict('Only pending verification requests can be reviewed');
      }

      if (typeof updated?.populate === 'function') {
        return updated.populate([
          { path: 'studentId', select: 'fullName email role' },
          { path: 'facultyId', select: 'fullName email role' },
        ]);
      }
      return updated;
    }

    verification.status = status;
    verification.facultyId = recordedFacultyId;
    verification.remarks = normalizedRemarks;
    verification.verifiedAt = decisionDate;
    await verification.save();

    if (typeof verification?.populate === 'function') {
      return verification.populate([
        { path: 'studentId', select: 'fullName email role' },
        { path: 'facultyId', select: 'fullName email role' },
      ]);
    }
    return verification;
  }

  async getPendingVerifications(facultyUser = null) {
    if (facultyUser && facultyUser.role !== 'faculty' && facultyUser.role !== 'admin') {
      throw ApiError.forbidden('Only faculty or administrative supervisors can access pending verifications');
    }

    const query = { status: 'PENDING' };

    if (facultyUser?.role === 'faculty') {
      const branches = await this.getFacultyBranches(facultyUser);
      if (branches.length === 0) {
        return [];
      }
      const studentIds = await this.getStudentIdsForBranches(branches, facultyUser);
      query.studentId = { $in: studentIds };
      const currentFacultyId = facultyUser._id || facultyUser.id;
      if (currentFacultyId) {
        query.$or = [
          { facultyId: currentFacultyId },
          { facultyId: null },
          { facultyId: { $exists: false } },
        ];
      }
    }

    return Verification.find(query)
      .populate('studentId', 'fullName email college branch')
      .sort({ createdAt: 1 });
  }

  async getVerificationHistory(studentId, { targetType, targetId } = {}) {
    if (targetType && targetId) {
      await this.assertStudentOwnsTarget(studentId, targetType, targetId);
    }

    const query = { studentId };
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;

    return Verification.find(query)
      .populate('facultyId', 'fullName email role')
      .sort({ createdAt: -1, _id: -1 });
  }


  async getVerificationStatus(studentId, targetType, targetId) {
    await this.assertStudentOwnsTarget(studentId, targetType, targetId);

    return Verification.findOne({ studentId, targetType, targetId })
      .populate('facultyId', 'fullName email role')
      .sort({ createdAt: -1, _id: -1 });
  }

  async getLatestVerifications(studentId, { targetType, targetIds } = {}) {
    const query = { studentId };
    if (targetType) query.targetType = targetType;
    if (targetIds) query.targetId = { $in: targetIds };

    const records = await Verification.find(query)
      .populate('facultyId', 'fullName email role')
      .sort({ createdAt: -1, _id: -1 });
    const latestByTarget = new Map();

    for (const record of records) {
      const key = getTargetKey(record.targetType, record.targetId);
      if (!latestByTarget.has(key)) latestByTarget.set(key, record);
    }

    return latestByTarget;
  }

  async getLatestVerificationRecords(studentId) {
    const latestByTarget = await this.getLatestVerifications(studentId);
    return [...latestByTarget.values()];
  }

  async getTargetIdsByStatus(studentId, targetType, status) {
    const normalizedStatus = normalizeVerificationStatus(status);
    if (!normalizedStatus) return null;

    const latestByTarget = await this.getLatestVerifications(studentId, { targetType });

    if (normalizedStatus === 'PENDING') {
      const nonPendingTargetIds = new Set(
        [...latestByTarget.values()]
          .filter((v) => v.status !== 'PENDING')
          .map((v) => String(v.targetId))
      );

      const targetConfig = TARGET_CONFIG[targetType];
      if (!targetConfig) return [];

      const allTargets = await targetConfig.model.find({ [targetConfig.ownerField]: studentId }).select('_id');
      return allTargets
        .map((t) => t._id)
        .filter((id) => !nonPendingTargetIds.has(String(id)));
    }

    return [...latestByTarget.values()]
      .filter((verification) => verification.status === normalizedStatus)
      .map((verification) => verification.targetId);
  }

  async attachToTarget(studentId, targetType, target) {
    const [targetWithVerification] = await this.attachToTargets(studentId, targetType, target ? [target] : []);
    return targetWithVerification || null;
  }

  async attachToTargets(studentId, targetType, targets) {
    if (!targets.length) return [];

    const targetIds = targets.map((target) => target._id);
    const latestByTarget = await this.getLatestVerifications(studentId, { targetType, targetIds });

    return targets.map((target) => {
      const targetData = serialize(target);
      return {
        ...targetData,
        verification: latestByTarget.get(getTargetKey(targetType, target._id)) || null,
      };
    });
  }

  /**
   * Returns a verification summary for a given student:
   *   - Per-targetType breakdown of counts by status
   *   - The latest verification record for each owned asset
   *   - Overall total counts across all target types
   *
   * @param {string|ObjectId} studentId
   * @returns {Promise<object>} Summary object
   */
  async getStudentVerificationSummary(studentId, actorUser = null) {
    if (actorUser) {
      if (actorUser.role === 'student') {
        const actorId = actorUser._id || actorUser.id;
        if (String(actorId) !== String(studentId)) {
          throw ApiError.forbidden('Students are only authorized to view their own verification summary');
        }
      } else if (actorUser.role === 'faculty') {
        await this.assertFacultyAccess(actorUser, { studentId });
      } else if (actorUser.role !== 'admin') {
        throw ApiError.forbidden('You are not authorized to view student verification summaries');
      }
    }

    if (mongoose.connection?.readyState === 1) {
      let studentExists = false;
      try {
        if (User && typeof User.exists === 'function') {
          studentExists = Boolean(await User.exists({ _id: studentId, role: 'student' }));
        }
        if (!studentExists && Profile && typeof Profile.exists === 'function') {
          studentExists = Boolean(await Profile.exists({ user: studentId }));
        }
      } catch {
        // fallback
      }
      if (!studentExists) {
        throw ApiError.notFound('Student not found');
      }
    }

    // Fetch all verifications for this student, newest first
    const allVerifications = await Verification.find({ studentId })
      .populate('facultyId', 'fullName email role')
      .sort({ createdAt: -1, _id: -1 });

    // Build a map of the latest record per (targetType, targetId) pair
    const latestByTarget = new Map();
    for (const record of allVerifications) {
      const key = getTargetKey(record.targetType, record.targetId);
      if (!latestByTarget.has(key)) latestByTarget.set(key, record);
    }

    // Aggregate counts per targetType per status
    const byTargetType = {};
    for (const type of VERIFICATION_TARGET_TYPES) {
      byTargetType[type] = { PENDING: 0, VERIFIED: 0, REJECTED: 0, CHANGES_REQUESTED: 0, total: 0 };
    }

    const overallCounts = { PENDING: 0, VERIFIED: 0, REJECTED: 0, CHANGES_REQUESTED: 0, total: 0 };

    for (const record of latestByTarget.values()) {
      const { targetType, status } = record;
      if (byTargetType[targetType]) {
        byTargetType[targetType][status] = (byTargetType[targetType][status] || 0) + 1;
        byTargetType[targetType].total += 1;
      }
      overallCounts[status] = (overallCounts[status] || 0) + 1;
      overallCounts.total += 1;
    }

    return {
      studentId,
      overall: overallCounts,
      byTargetType,
      latestVerifications: [...latestByTarget.values()].map(serialize),
    };
  }
}

export { VERIFICATION_TARGET_TYPES };
export default new VerificationService();