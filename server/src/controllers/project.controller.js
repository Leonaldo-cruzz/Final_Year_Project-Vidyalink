import projectService from '../services/project.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.user._id, req.body, req.files);
  return ApiResponse.created(res, 'Project created successfully', project);
});

const getProjects = asyncHandler(async (req, res) => {
  const queryParams = req.validated?.query || req.query;
  const result = await projectService.getProjects(req.user._id, queryParams, req.user.role);
  const projects = Array.isArray(result) ? result : (result.projects || []);
  const pagination = result.pagination || {
    total: projects.length,
    page: 1,
    limit: projects.length || 12,
    totalPages: 1,
    hasMore: false,
  };
  return ApiResponse.ok(res, 'Projects fetched successfully', {
    projects,
    pagination,
    total: pagination.total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: pagination.totalPages,
    hasMore: pagination.hasMore,
  });
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.user._id, req.params.id, req.user.role);
  return ApiResponse.ok(res, 'Project fetched successfully', project);
});

const updateProject = asyncHandler(async (req, res) => {
  const project = await projectService.updateProject(req.user._id, req.params.id, req.body, req.files);
  return ApiResponse.ok(res, 'Project updated successfully', project);
});

const deleteProject = asyncHandler(async (req, res) => {
  await projectService.deleteProject(req.user._id, req.params.id);
  return ApiResponse.ok(res, 'Project deleted successfully', null);
});

const verifyDeployment = asyncHandler(async (req, res) => {
  const project = await projectService.verifyDeployment(req.user._id, req.params.id);
  return ApiResponse.ok(res, 'Deployment verification completed', project);
});

export default {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  verifyDeployment,
};
