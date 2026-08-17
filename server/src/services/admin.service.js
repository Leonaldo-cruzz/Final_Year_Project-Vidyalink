import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import Verification from '../models/verification.model.js';
import Application from '../models/application.model.js';
import Certificate from '../models/certificate.model.js';
import ApiError from '../utils/ApiError.js';

class AdminService {
  async getAnalytics() {
    const [
      totalUsers,
      roleCounts,
      totalProjects,
      activeProjects,
      totalApplications,
      totalCertificates,
      totalVerifications,
      pendingVerifications,
      verifiedCount,
      rejectedCount,
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Project.countDocuments(),
      Project.countDocuments({ status: { $in: ['active', 'Open', 'In Progress'] } }),
      Application.countDocuments(),
      Certificate.countDocuments(),
      Verification.countDocuments(),
      Verification.countDocuments({ status: 'PENDING' }),
      Verification.countDocuments({ status: 'VERIFIED' }),
      Verification.countDocuments({ status: 'REJECTED' }),
    ]);

    const rolesMap = { student: 0, faculty: 0, recruiter: 0, alumni: 0, admin: 0 };
    roleCounts.forEach((r) => {
      if (r._id) rolesMap[r._id] = r.count;
    });

    const recentUsers = await User.find()
      .select('fullName email role status createdAt')
      .sort({ createdAt: -1 })
      .limit(10);

    return {
      stats: {
        totalUsers,
        roles: rolesMap,
        totalProjects,
        activeProjects,
        totalApplications,
        totalCertificates,
        verifications: {
          total: totalVerifications,
          pending: pendingVerifications,
          verified: verifiedCount,
          rejected: rejectedCount,
        },
      },
      recentUsers,
    };
  }

  async getUsers({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) {
    const query = {};
    if (role && role !== 'all') query.role = role;
    if (status && status !== 'all') query.status = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ fullName: regex }, { email: regex }];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateUserStatus(userId, status) {
    if (!['active', 'inactive', 'blocked'].includes(status)) {
      throw ApiError.badRequest('Invalid user status');
    }

    const user = await User.findByIdAndUpdate(userId, { status }, { new: true }).select('-password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user;
  }

  async getAllVerifications({ page = 1, limit = 20, status = 'ALL' } = {}) {
    const query = {};
    if (status && status !== 'ALL') query.status = status;

    const skip = (page - 1) * limit;
    const [verifications, total] = await Promise.all([
      Verification.find(query)
        .populate('studentId', 'fullName email college branch')
        .populate('facultyId', 'fullName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Verification.countDocuments(query),
    ]);

    return {
      verifications,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    };
  }
}

export default new AdminService();
