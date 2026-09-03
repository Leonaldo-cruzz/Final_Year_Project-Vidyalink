import recruiterService from '../services/recruiter.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getRecruiterProfile = asyncHandler(async (req, res) => {
  const profile = await recruiterService.getProfile(req.user._id);
  return ApiResponse.ok(res, 'Recruiter profile fetched successfully', profile);
});

export const createRecruiterProfile = asyncHandler(async (req, res) => {
  const profile = await recruiterService.createProfile(req.user._id, req.body);
  return ApiResponse.created(res, 'Recruiter profile created successfully', profile);
});

export const updateRecruiterProfile = asyncHandler(async (req, res) => {
  const profile = await recruiterService.updateProfile(req.user._id, req.body);
  return ApiResponse.ok(res, 'Recruiter profile updated successfully', profile);
});


