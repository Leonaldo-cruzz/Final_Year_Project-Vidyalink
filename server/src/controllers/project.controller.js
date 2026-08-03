import projectService from '../services/project.service.js';
import applicationService from '../services/application.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class ProjectController {
  createProject = asyncHandler(async (req, res) => {
    const project = await projectService.createProject(req.user._id, req.body);
    return ApiResponse.created(res, 'Project created successfully', project);
  });

  getProjects = asyncHandler(async (req, res) => {
    const projects = await projectService.getProjects(req.query);
    return ApiResponse.ok(res, 'Projects fetched successfully', projects);
  });

  getMyProjects = asyncHandler(async (req, res) => {
    const projects = await projectService.getMyProjects(req.user._id);
    return ApiResponse.ok(res, 'Recruiter projects fetched successfully', projects);
  });

  getProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    return ApiResponse.ok(res, 'Project fetched successfully', project);
  });

  updateProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await projectService.updateProject(
      req.user._id,
      id,
      req.body,
      req.user.role
    );
    return ApiResponse.ok(res, 'Project updated successfully', project);
  });

  deleteProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await projectService.deleteProject(req.user._id, id, req.user.role);
    return ApiResponse.ok(res, 'Project deleted successfully');
  });

  applyToProject = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
    const { id } = req.params;
    const application = await applicationService.applyToProject(studentId, {
      projectId: id,
      pitch: req.body.pitch || 'Interested in contributing to this project.',
      resumeUrl: req.body.resumeUrl || null,
      githubUrl: req.body.githubUrl || null,
      skills: req.body.skills || [],
    });
    return ApiResponse.created(res, 'Application submitted successfully', application);
  });
}

export default new ProjectController();
