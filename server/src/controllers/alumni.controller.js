import alumniService from '../services/alumni.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

class AlumniController {
  // ==========================================
  // PART 1 — ALUMNI PROFILE
  // ==========================================

  getProfile = asyncHandler(async (req, res) => {
    const profile = await alumniService.getProfile(req.user._id);
    return ApiResponse.ok(res, 'Alumni profile retrieved successfully', { profile });
  });

  createProfile = asyncHandler(async (req, res) => {
    const profile = await alumniService.createProfile(req.user._id, req.body);
    return ApiResponse.created(res, 'Alumni profile created successfully', { profile });
  });

  updateProfile = asyncHandler(async (req, res) => {
    const profile = await alumniService.updateProfile(req.user._id, req.body);
    return ApiResponse.ok(res, 'Alumni profile updated successfully', { profile });
  });

  // ==========================================
  // PART 2 — VERIFIED STUDENT DISCOVERY
  // ==========================================

  getStudents = asyncHandler(async (req, res) => {
    const result = await alumniService.searchStudents(req.query);
    return ApiResponse.ok(res, 'Verified students retrieved successfully', result);
  });

  // ==========================================
  // PART 3 — STUDENT PORTFOLIO VIEW
  // ==========================================

  getStudentPortfolio = asyncHandler(async (req, res) => {
    const portfolio = await alumniService.getStudentPortfolio(req.params.studentId);
    return ApiResponse.ok(res, 'Student portfolio details retrieved successfully', portfolio);
  });

  // ==========================================
  // PART 4 — MENTORSHIP
  // ==========================================

  getMentorshipRequests = asyncHandler(async (req, res) => {
    const result = await alumniService.getMentorshipRequests(req.user._id, req.user.role, req.query);
    return ApiResponse.ok(res, 'Mentorship requests retrieved successfully', result);
  });

  requestMentorship = asyncHandler(async (req, res) => {
    const request = await alumniService.requestMentorship(req.user._id, req.body);
    return ApiResponse.created(res, 'Mentorship request submitted successfully', { request });
  });

  acceptMentorship = asyncHandler(async (req, res) => {
    const request = await alumniService.acceptMentorship(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Mentorship request accepted', { request });
  });

  declineMentorship = asyncHandler(async (req, res) => {
    const request = await alumniService.declineMentorship(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Mentorship request declined', { request });
  });

  completeMentorship = asyncHandler(async (req, res) => {
    const request = await alumniService.completeMentorship(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Mentorship session marked completed', { request });
  });

  cancelMentorship = asyncHandler(async (req, res) => {
    const request = await alumniService.cancelMentorship(req.user._id, req.params.id);
    return ApiResponse.ok(res, 'Mentorship request cancelled', { request });
  });

  // ==========================================
  // PART 5 — SKILL ENDORSEMENTS
  // ==========================================

  getEndorsements = asyncHandler(async (req, res) => {
    const result = await alumniService.getEndorsements(req.query);
    return ApiResponse.ok(res, 'Endorsements retrieved successfully', result);
  });

  createEndorsement = asyncHandler(async (req, res) => {
    const endorsement = await alumniService.createEndorsement(req.user._id, req.body);
    return ApiResponse.created(res, 'Skill endorsed successfully', { endorsement });
  });

  deleteEndorsement = asyncHandler(async (req, res) => {
    const result = await alumniService.deleteEndorsement(req.user._id, req.params.id);
    return ApiResponse.ok(res, result.message);
  });

  // ==========================================
  // PART 6 — MOCK INTERVIEWS
  // ==========================================

  getMockInterviews = asyncHandler(async (req, res) => {
    const result = await alumniService.getMockInterviews(req.user._id, req.user.role, req.query);
    return ApiResponse.ok(res, 'Mock interviews retrieved successfully', result);
  });

  requestMockInterview = asyncHandler(async (req, res) => {
    const interview = await alumniService.requestMockInterview(req.user._id, req.body);
    return ApiResponse.created(res, 'Mock interview requested successfully', { interview });
  });

  acceptMockInterview = asyncHandler(async (req, res) => {
    const interview = await alumniService.acceptMockInterview(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Mock interview accepted', { interview });
  });

  scheduleMockInterview = asyncHandler(async (req, res) => {
    const interview = await alumniService.scheduleMockInterview(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Mock interview scheduled successfully', { interview });
  });

  declineMockInterview = asyncHandler(async (req, res) => {
    const interview = await alumniService.declineMockInterview(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Mock interview declined', { interview });
  });

  completeMockInterview = asyncHandler(async (req, res) => {
    const interview = await alumniService.completeMockInterview(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Mock interview completed with feedback recorded', { interview });
  });

  // ==========================================
  // PART 7 — REFERRALS
  // ==========================================

  getReferrals = asyncHandler(async (req, res) => {
    const result = await alumniService.getReferrals(req.user._id, req.user.role, req.query);
    return ApiResponse.ok(res, 'Referrals retrieved successfully', result);
  });

  getReferralById = asyncHandler(async (req, res) => {
    const referral = await alumniService.getReferralById(req.params.id, req.user._id);
    return ApiResponse.ok(res, 'Referral retrieved successfully', { referral });
  });

  createReferral = asyncHandler(async (req, res) => {
    const referral = await alumniService.createReferral(req.user._id, req.body);
    return ApiResponse.created(res, 'Referral created successfully', { referral });
  });

  updateReferral = asyncHandler(async (req, res) => {
    const referral = await alumniService.updateReferral(req.user._id, req.params.id, req.body);
    return ApiResponse.ok(res, 'Referral updated successfully', { referral });
  });

  // ==========================================
  // PART 8 — DASHBOARD STATS
  // ==========================================

  getDashboardStats = asyncHandler(async (req, res) => {
    const stats = await alumniService.getDashboardStats(req.user._id);
    return ApiResponse.ok(res, 'Alumni dashboard statistics retrieved successfully', stats);
  });
}

export default new AlumniController();
