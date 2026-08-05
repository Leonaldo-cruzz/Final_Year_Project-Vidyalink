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
  const account = await githubService.sync(req.user._id);
  return ApiResponse.ok(res, 'GitHub profile synced successfully', account);
});

const disconnect = asyncHandler(async (req, res) => {
  const account = await githubService.disconnect(req.user._id);
  return ApiResponse.ok(res, 'GitHub account disconnected successfully', account);
});

export default {
  connect,
  getProfile,
  sync,
  disconnect,
};
