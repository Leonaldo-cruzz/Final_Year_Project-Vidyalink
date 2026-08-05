import projectService from '../services/project.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const createProject = asyncHandler(async (req, res) => {
  const project = await projectService.createProject(req.user._id, req.body, req.files);
  return ApiResponse.created(res, 'Project created successfully', project);
});

const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.getProjects(req.user._id, req.query);
  return ApiResponse.ok(res, 'Projects fetched successfully', projects);
});

const getProjectById = asyncHandler(async (req, res) => {
  const project = await projectService.getProjectById(req.user._id, req.params.id);
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

export default {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
