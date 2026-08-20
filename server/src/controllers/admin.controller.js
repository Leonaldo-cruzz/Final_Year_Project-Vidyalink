import adminService from '../services/admin.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class AdminController {
  getUsers = asyncHandler(async (req, res) => {
    const users = await adminService.getUsers(req.validated.query);
    return ApiResponse.ok(res, 'Users retrieved successfully', users);
  });

  getUser = asyncHandler(async (req, res) => {
    const user = await adminService.getUser(req.params.id);
    return ApiResponse.ok(res, 'User retrieved successfully', user);
  });

  updateUserStatus = asyncHandler(async (req, res) => {
    const user = await adminService.updateUserStatus(req.user._id, req.params.id, req.body.status);
    return ApiResponse.ok(res, 'User status updated successfully', user);
  });

  updateUserRole = asyncHandler(async (req, res) => {
    const user = await adminService.updateUserRole(req.user._id, req.params.id, req.body.role);
    return ApiResponse.ok(res, 'User role updated successfully', user);
  });
}

export default new AdminController();
