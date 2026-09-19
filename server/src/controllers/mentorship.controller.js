import mentorshipService from '../services/mentorship.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class MentorshipController {
  requestMentorship = asyncHandler(async (req, res) => {
    const studentId = req.user._id;
    const mentorship = await mentorshipService.requestMentorship(studentId, req.body);
    return ApiResponse.created(res, 'Mentorship request submitted successfully', mentorship);
  });

  getMyRequests = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    const requests = await mentorshipService.getMyRequests(userId, role);
    return ApiResponse.ok(res, 'Mentorship requests retrieved', requests);
  });

  acceptRequest = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    const { id } = req.params;
    const mentorship = await mentorshipService.acceptRequest(alumniId, id, req.body);
    return ApiResponse.ok(res, 'Mentorship accepted and scheduled', mentorship);
  });

  declineRequest = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    const { id } = req.params;
    const mentorship = await mentorshipService.declineRequest(alumniId, id);
    return ApiResponse.ok(res, 'Mentorship request declined', mentorship);
  });

  getMentees = asyncHandler(async (req, res) => {
    const alumniId = req.user._id;
    const mentees = await mentorshipService.getMentees(alumniId);
    return ApiResponse.ok(res, 'Active mentees retrieved', mentees);
  });
}

export default new MentorshipController();
