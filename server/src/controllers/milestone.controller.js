import milestoneService from '../services/milestone.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class MilestoneController {
  createMilestone = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const milestone = await milestoneService.createMilestone(userId, req.body);
    return ApiResponse.created(res, 'Milestone created successfully', milestone);
  });

  getWorkspaceMilestones = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { workspaceId } = req.params;
    const milestones = await milestoneService.getWorkspaceMilestones(userId, workspaceId);
    return ApiResponse.ok(res, 'Milestones retrieved successfully', milestones);
  });

  updateMilestone = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const milestone = await milestoneService.updateMilestone(userId, id, req.body);
    return ApiResponse.ok(res, 'Milestone updated successfully', milestone);
  });

  deleteMilestone = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    await milestoneService.deleteMilestone(userId, id);
    return ApiResponse.ok(res, 'Milestone deleted successfully');
  });

  submitDeliverable = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const milestone = await milestoneService.submitDeliverable(userId, id, req.body);
    return ApiResponse.ok(res, 'Deliverable submitted successfully', milestone);
  });

  verifyMilestone = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;
    const result = await milestoneService.verifyMilestone(userId, id, req.body);
    return ApiResponse.ok(res, 'Milestone verification complete', result);
  });
}

export default new MilestoneController();
