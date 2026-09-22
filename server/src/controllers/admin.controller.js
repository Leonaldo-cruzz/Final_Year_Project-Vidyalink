import User from '../models/user.model.js';
import Project from '../models/project.model.js';
import Portfolio from '../models/portfolio.model.js';
import Application from '../models/application.model.js';
import Mentorship from '../models/mentorship.model.js';
import Referral from '../models/referral.model.js';
import Verification from '../models/verification.model.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getAdminStats = asyncHandler(async (_req, res) => {
  const [
    totalUsers,
    activeProjects,
    verifiedPortfolios,
    totalApplications,
    totalMentorships,
    totalReferrals,
    totalInterviews,
    pendingVerifications,
    verifiedVerifications,
    rejectedVerifications,
    changesRequestedVerifications,
    usersByRole,
  ] = await Promise.all([
    User.countDocuments(),
    Project.countDocuments({ projectStatus: { $ne: 'Archived' } }),
    Portfolio.countDocuments(),
    Application.countDocuments(),
    Mentorship.countDocuments(),
    Referral.countDocuments(),
    Application.countDocuments({ status: 'Interview Scheduled' }),
    Verification.countDocuments({ status: 'PENDING' }),
    Verification.countDocuments({ status: 'VERIFIED' }),
    Verification.countDocuments({ status: 'REJECTED' }),
    Verification.countDocuments({ status: 'CHANGES_REQUESTED' }),
    User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]),
  ]);

  const roleCounts = usersByRole.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  return ApiResponse.ok(res, 'Admin stats retrieved successfully', {
    totalUsers,
    activeProjects,
    verifiedPortfolios,
    totalApplications,
    totalMentorships,
    totalReferrals,
    totalInterviews,
    pendingVerifications,
    verifiedVerifications,
    rejectedVerifications,
    changesRequestedVerifications,
    roleCounts,
  });
});

export const getAdminUsers = asyncHandler(async (req, res) => {
  const { role, search, page = '1', limit = '50' } = req.query;
  const filter = {};

  if (role && role !== 'all') {
    filter.role = role;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { college: searchRegex },
    ];
  }

  const parsedLimit = Math.max(1, Math.min(Number.parseInt(limit, 10) || 50, 200));
  const parsedPage  = Math.max(1, Number.parseInt(page, 10) || 1);
  const skip        = (parsedPage - 1) * parsedLimit;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('_id fullName email role college branch status isEmailVerified createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return ApiResponse.ok(res, 'Admin users retrieved successfully', {
    users,
    total,
    page: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
  });
});

export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.status = user.status === 'active' ? 'inactive' : 'active';
  await user.save();

  return ApiResponse.ok(res, `User status updated to ${user.status}`, {
    _id: user._id,
    status: user.status,
  });
});
