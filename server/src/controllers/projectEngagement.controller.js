import projectEngagementService from '../services/projectEngagement.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class ProjectEngagementController {
  createEngagement = asyncHandler(async (req, res) => {
    const engagement = await projectEngagementService.createEngagement(req.user._id, req.body);
    return ApiResponse.created(res, 'Project engagement created successfully', engagement);
  });

  getEngagement = asyncHandler(async (req, res) => {
    const engagement = await projectEngagementService.getEngagementById(
      req.user._id,
      req.user.role,
      req.params.id
    );
    return ApiResponse.ok(res, 'Project engagement retrieved successfully', engagement);
  });

  updateEngagement = asyncHandler(async (req, res) => {
    const engagement = await projectEngagementService.updateEngagement(
      req.user._id,
      req.user.role,
      req.params.id,
      req.body
    );
    return ApiResponse.ok(res, 'Project engagement updated successfully', engagement);
  });

  getStudentEngagements = asyncHandler(async (req, res) => {
    const engagements = await projectEngagementService.getStudentEngagements(req.user._id);
    return ApiResponse.ok(res, 'Student engagements retrieved successfully', engagements);
  });

  getRecruiterEngagements = asyncHandler(async (req, res) => {
    const engagements = await projectEngagementService.getRecruiterEngagements(req.user._id);
    return ApiResponse.ok(res, 'Recruiter engagements retrieved successfully', engagements);
  });

  getFacultyEngagements = asyncHandler(async (req, res) => {
    const engagements = await projectEngagementService.getFacultyEngagements(req.user._id);
    return ApiResponse.ok(res, 'Faculty engagements retrieved successfully', engagements);
  });
}

export default new ProjectEngagementController();
