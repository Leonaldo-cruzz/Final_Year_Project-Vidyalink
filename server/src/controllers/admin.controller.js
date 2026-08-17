import adminService from '../services/admin.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const getAnalytics = asyncHandler(async (_req, res) => {
  const analytics = await adminService.getAnalytics();
  return ApiResponse.ok(res, 'Admin analytics fetched successfully', analytics);
});

const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, role, status } = req.query;
  const result = await adminService.getUsers({ page, limit, search, role, status });
  return ApiResponse.ok(res, 'Users fetched successfully', result);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;
  const user = await adminService.updateUserStatus(userId, status);
  return ApiResponse.ok(res, `User status updated to ${status}`, user);
});

const getAllVerifications = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const result = await adminService.getAllVerifications({ page, limit, status });
  return ApiResponse.ok(res, 'All verifications fetched successfully', result);
});

export default {
  getAnalytics,
  getUsers,
  updateUserStatus,
  getAllVerifications,
};
