import mentorshipService from '../services/mentorship.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const requestMentorship = asyncHandler(async (req, res) => {
  const result = await mentorshipService.requestMentorship(req.user._id, req.body);
  return ApiResponse.created(res, 'Mentorship request sent successfully', result);
});

const getMyMentorships = asyncHandler(async (req, res) => {
  const result = await mentorshipService.getMentorshipRequests(req.user._id, req.user.role);
  return ApiResponse.ok(res, 'Mentorship requests fetched successfully', result);
});

const updateMentorshipStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await mentorshipService.updateMentorshipStatus(id, req.user._id, req.body);
  return ApiResponse.ok(res, 'Mentorship status updated successfully', result);
});

const getMentorsList = asyncHandler(async (_req, res) => {
  const mentors = await mentorshipService.getMentorsList();
  return ApiResponse.ok(res, 'Mentors list fetched successfully', mentors);
});

export default {
  requestMentorship,
  getMyMentorships,
  updateMentorshipStatus,
  getMentorsList,
};
