import workspaceService from '../services/workspace.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class WorkspaceController {
  getUserWorkspaces = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    const workspaces = await workspaceService.getUserWorkspaces(userId, role);
    return ApiResponse.ok(res, 'Workspaces retrieved successfully', workspaces);
  });

  getWorkspaceById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const workspace = await workspaceService.getWorkspaceById(userId, id);
    return ApiResponse.ok(res, 'Workspace retrieved successfully', workspace);
  });
}

export default new WorkspaceController();
