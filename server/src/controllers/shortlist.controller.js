import shortlistService from '../services/shortlist.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const shortlistCandidate = asyncHandler(async (req, res) => {
  const { studentId, notes } = req.body;
  const shortlist = await shortlistService.shortlistCandidate(
    req.user._id,
    studentId,
    notes
  );
  return ApiResponse.created(res, 'Candidate shortlisted successfully', shortlist);
});

export const getShortlists = asyncHandler(async (req, res) => {
  const result = await shortlistService.getShortlists(req.user._id, req.query);
  return ApiResponse.ok(res, 'Shortlisted candidates retrieved successfully', result);
});

export const removeFromShortlist = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const result = await shortlistService.removeFromShortlist(req.user._id, studentId);
  return ApiResponse.ok(res, 'Candidate removed from shortlist', result);
});
