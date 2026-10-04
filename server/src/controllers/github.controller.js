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

/**
 * POST /github/sync
 *
 * Refreshes GitHub profile, fetches all repositories (paginated),
 * matches against existing VidyaLink projects, and imports new ones.
 *
 * Response includes:
 *   - account: updated GitHub account snapshot
 *   - syncResult: { repositoriesFound, projectsImported, projectsUpdated,
 *                   repositoriesMarkedDeleted, failed }
 */
const sync = asyncHandler(async (req, res) => {
  // userId is always derived from the authenticated JWT — never from the request body.
  const { account, syncResult } = await githubService.sync(req.user._id);
  return ApiResponse.ok(res, 'GitHub sync complete', { account, syncResult });
});

const getRepositories = asyncHandler(async (req, res) => {
  const repositories = await githubService.getRepositories(req.user._id);
  return ApiResponse.ok(res, 'GitHub repositories fetched successfully', repositories);
});

const disconnect = asyncHandler(async (req, res) => {
  const account = await githubService.disconnect(req.user._id);
  return ApiResponse.ok(res, 'GitHub account disconnected successfully', account);
});

export default {
  connect,
  getProfile,
  getRepositories,
  sync,
  disconnect,
};
