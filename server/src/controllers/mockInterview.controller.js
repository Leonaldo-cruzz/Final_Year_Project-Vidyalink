import mockInterviewService from '../services/mockInterview.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class MockInterviewController {
  createRequest = asyncHandler(async (req, res) => {
    const request = await mockInterviewService.createRequest(req.user._id, req.body);
    return ApiResponse.created(res, 'Mock interview request sent successfully', { request });
  });

  getStudentRequests = asyncHandler(async (req, res) => {
    const requests = await mockInterviewService.getStudentRequests(req.user._id);
    return ApiResponse.ok(res, 'Mock interview requests fetched successfully', { requests });
  });

  getAlumniRequests = asyncHandler(async (req, res) => {
    const requests = await mockInterviewService.getAlumniRequests(req.user._id);
    return ApiResponse.ok(res, 'Mock interview requests fetched successfully', { requests });
  });

  getRequestById = asyncHandler(async (req, res) => {
    const request = await mockInterviewService.getRequestById(req.params.id, req.user._id);
    return ApiResponse.ok(res, 'Mock interview request fetched successfully', { request });
  });

  acceptRequest = asyncHandler(async (req, res) => {
    const request = await mockInterviewService.acceptRequest(
      req.user._id,
      req.params.id,
      req.body
    );
    return ApiResponse.ok(res, 'Mock interview accepted', { request });
  });

  declineRequest = asyncHandler(async (req, res) => {
    const request = await mockInterviewService.declineRequest(req.user._id, req.params.id);
    return ApiResponse.ok(res, 'Mock interview declined', { request });
  });

  rescheduleRequest = asyncHandler(async (req, res) => {
    const request = await mockInterviewService.rescheduleRequest(
      req.user._id,
      req.params.id,
      req.body
    );
    return ApiResponse.ok(res, 'Mock interview rescheduled', { request });
  });

  completeRequest = asyncHandler(async (req, res) => {
    const request = await mockInterviewService.completeRequest(
      req.user._id,
      req.params.id,
      req.body.feedback
    );
    return ApiResponse.ok(res, 'Mock interview marked as completed', { request });
  });

  cancelRequest = asyncHandler(async (req, res) => {
    const request = await mockInterviewService.cancelRequest(
      req.user._id,
      req.user.role,
      req.params.id
    );
    return ApiResponse.ok(res, 'Mock interview cancelled', { request });
  });
}

export default new MockInterviewController();
