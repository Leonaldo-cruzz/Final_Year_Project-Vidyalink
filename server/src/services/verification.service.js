import Certificate from '../models/certificate.model.js';
import GitHubAccount from '../models/githubAccount.model.js';
import Profile from '../models/profile.model.js';
import Project from '../models/project.model.js';
import Resume from '../models/resume.model.js';
import Verification, { VERIFICATION_STATUSES, VERIFICATION_TARGET_TYPES } from '../models/verification.model.js';
import ApiError from '../utils/ApiError.js';

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
  buildFacultyQueueItem(verification, profile) {
    const verificationData = serialize(verification);
    const populatedStudent = serialize(verification.studentId) || {};
    const studentId = populatedStudent._id || verificationData.studentId;

    return {
      ...verificationData,
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

  async getFacultyDashboard({ status = 'ALL', targetType = 'ALL', search = '', sort = 'NEWEST' } = {}) {
    const startOfToday = getStartOfToday();
    const [
      verifications,
      pendingRequests,
      verifiedToday,
      rejectedToday,
      changesRequested,
      changesRequestedToday,
      reviewedVerifications,
    ] = await Promise.all([
      Verification.find()
        .populate('studentId', 'fullName email college branch')
        .populate('facultyId', 'fullName email role')
        .sort({ createdAt: -1, _id: -1 }),
      Verification.countDocuments({ status: 'PENDING' }),
      Verification.countDocuments({ status: 'VERIFIED', verifiedAt: { $gte: startOfToday } }),
      Verification.countDocuments({ status: 'REJECTED', updatedAt: { $gte: startOfToday } }),
      Verification.countDocuments({ status: 'CHANGES_REQUESTED' }),
      Verification.countDocuments({ status: 'CHANGES_REQUESTED', updatedAt: { $gte: startOfToday } }),
      Verification.find({
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
    };
  }

  async getFacultyVerificationDetail(id) {
    const verification = await Verification.findById(id)
      .populate('studentId', 'fullName email college branch')
      .populate('facultyId', 'fullName email role');
    if (!verification) {
      throw ApiError.notFound('Verification request not found');
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

    const pendingVerification = await Verification.exists({
      studentId,
      targetType,
      targetId,
      status: 'PENDING',
    });

    if (pendingVerification) {
      throw ApiError.conflict('This item already has a verification request pending');
    }

    try {
      return await Verification.create({
        studentId,
        targetType,
        targetId,
        status: 'PENDING',
        remarks,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw ApiError.conflict('This item already has a verification request pending');
      }
      throw error;
    }
  }

  async approve(id, facultyId, actorRole, remarks = null) {
    return this.setVerificationDecision(id, facultyId, actorRole, 'VERIFIED', remarks);
  }

  async reject(id, facultyId, actorRole, remarks) {
    return this.setVerificationDecision(id, facultyId, actorRole, 'REJECTED', remarks);
  }

  async requestChanges(id, facultyId, actorRole, remarks) {
    return this.setVerificationDecision(id, facultyId, actorRole, 'CHANGES_REQUESTED', remarks);
  }

  async setVerificationDecision(id, facultyId, actorRole, status, remarks) {
    if (!VERIFICATION_STATUSES.includes(status) || status === 'PENDING') {
      throw ApiError.badRequest('Invalid verification decision');
    }

    const verification = await Verification.findById(id);
    if (!verification) {
      throw ApiError.notFound('Verification request not found');
    }

    if (actorRole !== 'admin' && verification.status !== 'PENDING') {
      throw ApiError.conflict('Only pending verification requests can be reviewed');
    }

    verification.status = status;
    verification.facultyId = facultyId;
    verification.remarks = remarks ?? verification.remarks;
    verification.verifiedAt = status === 'VERIFIED' ? new Date() : null;
    await verification.save();

    return verification.populate([
      { path: 'studentId', select: 'fullName email role' },
      { path: 'facultyId', select: 'fullName email role' },
    ]);
  }

  async getPendingVerifications() {
    return Verification.find({ status: 'PENDING' })
      .populate('studentId', 'fullName email college branch')
      .sort({ createdAt: 1 });
  }

  async getVerificationHistory(studentId, { targetType, targetId } = {}) {
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
  async getStudentVerificationSummary(studentId) {
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
