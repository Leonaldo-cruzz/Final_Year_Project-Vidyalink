import githubService from '../services/github.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const connect = asyncHandler(async (req, res) => {
  const account = await githubService.connect(req.user._id, req.body.githubUsername);
  return ApiResponse.created(res, 'GitHub account connected successfully', account);
});

const getProfile = asyncHandler(async (req, res) => {
  const account = await githubService.getProfile(req.user._id);
  return ApiResponse.ok(res, 'GitHub profile fetched successfully', account);
});

const sync = asyncHandler(async (req, res) => {
  const result = await githubService.sync(req.user._id);
  return ApiResponse.ok(res, 'GitHub profile and repositories synced successfully', result);
});

const disconnect = asyncHandler(async (req, res) => {
  const account = await githubService.disconnect(req.user._id);
  return ApiResponse.ok(res, 'GitHub account disconnected successfully', account);
});

const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await githubService.getAnalytics(req.user._id);
  return ApiResponse.ok(res, 'GitHub analytics fetched successfully', analytics);
});

const getRepositories = asyncHandler(async (req, res) => {
  const repositories = await githubService.getRepositories(req.user._id);
  return ApiResponse.ok(res, 'GitHub repositories fetched successfully', repositories);
});

const getRepository = asyncHandler(async (req, res) => {
  const { owner, repo } = req.params;
  const repository = await githubService.getRepository(req.user._id, owner, repo);
  return ApiResponse.ok(res, 'GitHub repository fetched successfully', repository);
});

const verifyProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const verification = await githubService.verifyProjectRepository(req.user._id, projectId);
  return ApiResponse.ok(res, 'Project GitHub repository verification completed', verification);
});

export default {
  connect,
  getProfile,
  sync,
  disconnect,
  getAnalytics,
  getRepositories,
  getRepository,
  verifyProject,
};
