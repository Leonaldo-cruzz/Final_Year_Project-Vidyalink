import applicationService from '../services/application.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class ApplicationController {
  applyToProject = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
    const application = await applicationService.applyToProject(studentId, req.body);
    return ApiResponse.created(res, 'Application submitted successfully', application);
  });

  getStudentApplications = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
    const applications = await applicationService.getStudentApplications(studentId);
    return ApiResponse.ok(res, 'Applications retrieved successfully', applications);
  });

  withdrawApplication = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
    const { id } = req.params;
    const application = await applicationService.withdrawApplication(studentId, id);
    return ApiResponse.ok(res, 'Application withdrawn successfully', application);
  });

  getProjectApplications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { projectId } = req.params;
    const applications = await applicationService.getProjectApplications(userId, projectId, userRole);
    return ApiResponse.ok(res, 'Project applications retrieved successfully', applications);
  });

  updateApplicationStatus = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { id } = req.params;
    const result = await applicationService.updateApplicationStatus(userId, id, req.body, userRole);
    return ApiResponse.ok(res, 'Application status updated successfully', result);
  });

  scheduleInterview = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { id } = req.params;
    const application = await applicationService.scheduleInterview(userId, id, req.body, userRole);
    return ApiResponse.ok(res, 'Interview scheduled successfully', application);
  });

  selectCandidate = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { id } = req.params;
    const result = await applicationService.selectCandidate(userId, id, req.body, userRole);
    return ApiResponse.ok(res, 'Candidate selected and ProjectEngagement created', result);
  });
}

export default new ApplicationController();
