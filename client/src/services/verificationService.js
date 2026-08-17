import api from './api';

export const submitVerification = async (data) => {
  const response = await api.post('/verification/submit', data);
  return response.data;
};

export const getVerificationStatus = async (targetType, targetId) => {
  const response = await api.get(`/verification/${targetType}/${targetId}`);
  return response.data;
};

export const getPendingVerifications = async () => {
  const response = await api.get('/verification/pending');
  return response.data;
};

export const getFacultyVerificationDashboard = async ({ status, targetType, search, sort } = {}) => {
  const params = {};
  if (status && status !== 'ALL') params.status = status;
  if (targetType && targetType !== 'ALL') params.targetType = targetType;
  if (search) params.search = search;
  if (sort) params.sort = sort;

  const response = await api.get('/verification/dashboard', { params });
  return response.data;
};

export const getFacultyVerificationDetail = async (id) => {
  const response = await api.get(`/verification/dashboard/${id}`);
  return response.data;
};

export const approveVerification = async (id, remarks) => {
  const response = await api.patch(`/verification/${id}/approve`, { remarks });
  return response.data;
};

export const rejectVerification = async (id, remarks) => {
  const response = await api.patch(`/verification/${id}/reject`, { remarks });
  return response.data;
};

export const requestVerificationChanges = async (id, remarks) => {
  const response = await api.patch(`/verification/${id}/request-changes`, { remarks });
  return response.data;
};

export const getVerificationHistory = async (params = {}) => {
  const response = await api.get('/verification/history', { params });
  return response.data;
};

export const getStudentVerificationSummary = async (studentId) => {
  const response = await api.get(`/verification/student/${studentId}/summary`);
  return response.data;
};

export default {
  submitVerification,
  getVerificationStatus,
  getPendingVerifications,
  getFacultyVerificationDashboard,
  getFacultyVerificationDetail,
  approveVerification,
  rejectVerification,
  requestVerificationChanges,
  getVerificationHistory,
  getStudentVerificationSummary,
};
