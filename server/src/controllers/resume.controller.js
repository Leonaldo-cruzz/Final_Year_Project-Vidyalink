import resumeService from '../services/resume.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const uploadResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.saveOrReplaceResume(req.user._id, req.file);
  return ApiResponse.created(res, 'Resume uploaded successfully', resume);
});

const getResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.getResume(req.user._id);
  if (!resume) {
    return ApiResponse.ok(res, 'No resume found', null);
  }
  return ApiResponse.ok(res, 'Resume fetched successfully', resume);
});

const replaceResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.saveOrReplaceResume(req.user._id, req.file);
  return ApiResponse.ok(res, 'Resume replaced successfully', resume);
});

const deleteResume = asyncHandler(async (req, res) => {
  await resumeService.deleteResume(req.user._id);
  return ApiResponse.ok(res, 'Resume deleted successfully', null);
});

export default {
  uploadResume,
  getResume,
  replaceResume,
  deleteResume,
};
