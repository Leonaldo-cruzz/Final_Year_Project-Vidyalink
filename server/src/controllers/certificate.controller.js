import certificateService from '../services/certificate.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const createCertificate = asyncHandler(async (req, res) => {
  const certificate = await certificateService.createCertificate(req.user._id, req.body, req.file);
  return ApiResponse.created(res, 'Certificate created successfully', certificate);
});

const getCertificates = asyncHandler(async (req, res) => {
  const { status, search, sort } = req.query;
  const certificates = await certificateService.getCertificates(req.user._id, { status, search, sort });
  return ApiResponse.ok(res, 'Certificates fetched successfully', certificates);
});

const getCertificateById = asyncHandler(async (req, res) => {
  const certificate = await certificateService.getCertificateById(req.params.id, req.user._id);
  return ApiResponse.ok(res, 'Certificate fetched successfully', certificate);
});

const updateCertificate = asyncHandler(async (req, res) => {
  const certificate = await certificateService.updateCertificate(req.params.id, req.user._id, req.body, req.file);
  return ApiResponse.ok(res, 'Certificate updated successfully', certificate);
});

const deleteCertificate = asyncHandler(async (req, res) => {
  await certificateService.deleteCertificate(req.params.id, req.user._id);
  return ApiResponse.ok(res, 'Certificate deleted successfully', null);
});

export default {
  createCertificate,
  getCertificates,
  getCertificateById,
  updateCertificate,
  deleteCertificate,
};
