import mongoose from 'mongoose';
import mockInterviewService from '../services/mockInterview.service.js';
import MockInterview from '../models/mockInterview.model.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';

class MockInterviewController {
  scheduleInterview = asyncHandler(async (req, res) => {
    const requesterId = req.user._id;
    const requesterRole = req.user.role;

    const interview = await mockInterviewService.scheduleInterview({
      requesterId,
      requesterRole,
      ...req.body,
    });

    return ApiResponse.created(res, 'Mock interview scheduled successfully', interview);
  });

  getMyInterviews = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    const { status } = req.query;

    const interviews = await mockInterviewService.getInterviewsForUser(userId, role, { status });
    return ApiResponse.ok(res, 'Mock interviews retrieved successfully', interviews);
  });

  getInterviewById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    const { id } = req.params;

    const interview = await mockInterviewService.getInterviewById(id, userId, role);
    return ApiResponse.ok(res, 'Mock interview details retrieved successfully', interview);
  });

  updateStatus = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    const { id } = req.params;

    const interview = await mockInterviewService.updateStatus(id, userId, role, req.body);
    return ApiResponse.ok(res, 'Mock interview status updated successfully', interview);
  });

  submitFeedback = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    const targetId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw ApiError.badRequest('Invalid interview identifier');
    }

    // Check if targetId is a MockInterview ID or Mentorship ID
    let resolvedInterviewId = targetId;
    const exists = await MockInterview.findById(targetId);
    if (!exists) {
      // Check if targetId is mentorship ID
      const byMentorship = await MockInterview.findOne({ mentorship: targetId }).sort({
        createdAt: -1,
      });
      if (byMentorship) {
        resolvedInterviewId = byMentorship._id.toString();
      } else {
        throw ApiError.notFound('Mock interview not found');
      }
    }

    const interview = await mockInterviewService.submitEvaluation(
      resolvedInterviewId,
      alumniId,
      req.body
    );

    return ApiResponse.ok(res, 'Mock interview evaluation submitted successfully', interview);
  });
}

export default new MockInterviewController();
