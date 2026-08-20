import mentorshipService from '../services/mentorship.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class MentorshipController {
  requestMentorship = asyncHandler(async (req, res) => {
    const request = await mentorshipService.requestMentorship(req.user._id, req.body);
    return ApiResponse.created(res, 'Mentorship request sent successfully', { request });
  });

  getStudentRequests = asyncHandler(async (req, res) => {
    const requests = await mentorshipService.getStudentRequests(req.user._id);
    return ApiResponse.ok(res, 'Mentorship requests fetched successfully', { requests });
  });

  getAlumniRequests = asyncHandler(async (req, res) => {
    const requests = await mentorshipService.getAlumniRequests(req.user._id);
    return ApiResponse.ok(res, 'Mentorship requests fetched successfully', { requests });
  });

  getRequestById = asyncHandler(async (req, res) => {
    const request = await mentorshipService.getRequestById(req.params.id, req.user._id);
    return ApiResponse.ok(res, 'Mentorship request fetched successfully', { request });
  });

  acceptRequest = asyncHandler(async (req, res) => {
    const request = await mentorshipService.acceptRequest(
      req.user._id,
      req.params.id,
      req.body.responseMessage
    );
    return ApiResponse.ok(res, 'Mentorship request accepted', { request });
  });

  declineRequest = asyncHandler(async (req, res) => {
    const request = await mentorshipService.declineRequest(
      req.user._id,
      req.params.id,
      req.body.responseMessage
    );
    return ApiResponse.ok(res, 'Mentorship request declined', { request });
  });

  cancelRequest = asyncHandler(async (req, res) => {
    const request = await mentorshipService.cancelRequest(req.user._id, req.params.id);
    return ApiResponse.ok(res, 'Mentorship request cancelled', { request });
  });

  completeRequest = asyncHandler(async (req, res) => {
    const request = await mentorshipService.completeRequest(req.user._id, req.params.id);
    return ApiResponse.ok(res, 'Mentorship request marked as completed', { request });
  });
}

export default new MentorshipController();
