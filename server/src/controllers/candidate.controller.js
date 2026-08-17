import candidateService from '../services/candidate.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const searchCandidates = asyncHandler(async (req, res) => {
  const result = await candidateService.searchCandidates(req.query);
  return ApiResponse.ok(res, 'Candidates retrieved successfully', result);
});

export const getCandidateDetails = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const candidate = await candidateService.getCandidateDetails(studentId);
  return ApiResponse.ok(res, 'Candidate details retrieved successfully', candidate);
});
