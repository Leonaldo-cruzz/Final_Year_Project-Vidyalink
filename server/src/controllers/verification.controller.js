import verificationService from '../services/verification.service.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const submit = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'student') {
    throw ApiError.forbidden('Only students can submit verification requests');
  }
  const verification = await verificationService.createVerification(req.user._id, req.body, req.user);
  return ApiResponse.created(res, 'Verification submitted successfully', verification);
});

const getPending = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    throw ApiError.forbidden('Only faculty or administrative supervisors are authorized to view pending verifications');
  }
  const verifications = await verificationService.getPendingVerifications(req.user);
  return ApiResponse.ok(res, 'Pending verifications fetched successfully', verifications);
});

const getFacultyDashboard = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    throw ApiError.forbidden('Only faculty or administrative supervisors are authorized to access the faculty dashboard');
  }
  const dashboard = await verificationService.getFacultyDashboard(req.validated.query, req.user);
  return ApiResponse.ok(res, 'Faculty verification dashboard fetched successfully', dashboard);
});

const getFacultyVerificationDetail = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    throw ApiError.forbidden('Only faculty or administrative supervisors are authorized to view verification details');
  }
  const detail = await verificationService.getFacultyVerificationDetail(req.validated.params.id, req.user);
  return ApiResponse.ok(res, 'Verification detail fetched successfully', detail);
});

const getHistory = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'student') {
    throw ApiError.forbidden('Only students can view their verification history');
  }
  const verifications = await verificationService.getVerificationHistory(req.user._id, req.validated.query);
  return ApiResponse.ok(res, 'Verification history fetched successfully', verifications);
});

const getStatus = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'student') {
    throw ApiError.forbidden('Only students can view verification status');
  }
  const { targetType, targetId } = req.validated.params;
  const verification = await verificationService.getVerificationStatus(req.user._id, targetType, targetId);
  return ApiResponse.ok(res, 'Verification status fetched successfully', verification);
});

const approve = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    throw ApiError.forbidden('Only faculty or administrative supervisors are authorized to approve verification requests');
  }
  const verification = await verificationService.approve(
    req.validated.params.id,
    req.user._id,
    req.user.role,
    req.body?.remarks,
    req.user
  );
  return ApiResponse.ok(res, 'Verification approved successfully', verification);
});

const reject = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    throw ApiError.forbidden('Only faculty or administrative supervisors are authorized to reject verification requests');
  }
  const verification = await verificationService.reject(
    req.validated.params.id,
    req.user._id,
    req.user.role,
    req.body?.remarks,
    req.user
  );
  return ApiResponse.ok(res, 'Verification rejected successfully', verification);
});

const requestChanges = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    throw ApiError.forbidden('Only faculty or administrative supervisors are authorized to request verification changes');
  }
  const verification = await verificationService.requestChanges(
    req.validated.params.id,
    req.user._id,
    req.user.role,
    req.body?.remarks,
    req.user
  );
  return ApiResponse.ok(res, 'Changes requested successfully', verification);
});

const getStudentVerificationSummary = asyncHandler(async (req, res) => {
  if (req.user?.role === 'student' && String(req.user._id) !== String(req.validated.params.studentId)) {
    throw ApiError.forbidden('Students are only authorized to view their own verification summary');
  }
  if (req.user?.role !== 'student' && req.user?.role !== 'faculty' && req.user?.role !== 'admin') {
    throw ApiError.forbidden('You are not authorized to view student verification summaries');
  }
  const summary = await verificationService.getStudentVerificationSummary(
    req.validated.params.studentId,
    req.user
  );
  return ApiResponse.ok(res, 'Student verification summary fetched successfully', summary);
});

const assign = asyncHandler(async (req, res) => {
  if (req.user?.role !== 'admin') {
    throw ApiError.forbidden('Only administrators can assign or reassign verifications');
  }
  const verification = await verificationService.assignFaculty(
    req.validated.params.id,
    req.body.facultyId ?? null,
    req.user
  );
  return ApiResponse.ok(res, 'Verification assigned successfully', verification);
});

export default {
  submit,
  getPending,
  getFacultyDashboard,
  getFacultyVerificationDetail,
  getHistory,
  getStatus,
  approve,
  reject,
  requestChanges,
  getStudentVerificationSummary,
  assign,
};
