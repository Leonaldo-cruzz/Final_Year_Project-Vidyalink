import candidateService from '../services/candidate.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const searchCandidates = asyncHandler(async (req, res) => {
  const result = await candidateService.searchCandidates(req.validated?.query || req.query);
  return ApiResponse.ok(res, 'Candidates retrieved successfully', result);
});

export const compareCandidates = asyncHandler(async (req, res) => {
  const result = await candidateService.compareCandidates(req.validated?.query?.ids || req.query.ids);
  return ApiResponse.ok(res, 'Candidates compared successfully', { candidates: result });
});

export const getCandidateDetails = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const candidate = await candidateService.getCandidateDetails(studentId);
  return ApiResponse.ok(res, 'Candidate details retrieved successfully', candidate);
});
