import verificationService from '../services/verification.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const submit = asyncHandler(async (req, res) => {
  const verification = await verificationService.createVerification(req.user._id, req.body);
  return ApiResponse.created(res, 'Verification submitted successfully', verification);
});

const getPending = asyncHandler(async (_req, res) => {
  const verifications = await verificationService.getPendingVerifications();
  return ApiResponse.ok(res, 'Pending verifications fetched successfully', verifications);
});

const getFacultyDashboard = asyncHandler(async (req, res) => {
  const dashboard = await verificationService.getFacultyDashboard(req.validated.query);
  return ApiResponse.ok(res, 'Faculty verification dashboard fetched successfully', dashboard);
});

const getFacultyVerificationDetail = asyncHandler(async (req, res) => {
  const detail = await verificationService.getFacultyVerificationDetail(req.validated.params.id);
  return ApiResponse.ok(res, 'Verification detail fetched successfully', detail);
});

const getHistory = asyncHandler(async (req, res) => {
  const verifications = await verificationService.getVerificationHistory(req.user._id, req.validated.query);
  return ApiResponse.ok(res, 'Verification history fetched successfully', verifications);
});

const getStatus = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.validated.params;
  const verification = await verificationService.getVerificationStatus(req.user._id, targetType, targetId);
  return ApiResponse.ok(res, 'Verification status fetched successfully', verification);
});

const approve = asyncHandler(async (req, res) => {
  const verification = await verificationService.approve(
    req.validated.params.id,
    req.user._id,
    req.user.role,
    req.body.remarks
  );
  return ApiResponse.ok(res, 'Verification approved successfully', verification);
});

const reject = asyncHandler(async (req, res) => {
  const verification = await verificationService.reject(
    req.validated.params.id,
    req.user._id,
    req.user.role,
    req.body.remarks
  );
  return ApiResponse.ok(res, 'Verification rejected successfully', verification);
});

const requestChanges = asyncHandler(async (req, res) => {
  const verification = await verificationService.requestChanges(
    req.validated.params.id,
    req.user._id,
    req.user.role,
    req.body.remarks
  );
  return ApiResponse.ok(res, 'Changes requested successfully', verification);
});

const getStudentVerificationSummary = asyncHandler(async (req, res) => {
  const summary = await verificationService.getStudentVerificationSummary(req.validated.params.studentId);
  return ApiResponse.ok(res, 'Student verification summary fetched successfully', summary);
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
};
