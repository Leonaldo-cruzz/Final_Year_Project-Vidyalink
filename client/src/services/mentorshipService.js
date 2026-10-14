import api from './api';

export const requestMentorship = async (data) => {
  const response = await api.post('/mentorship/request', data);
  return response.data?.data || response.data;
};

export const getMyRequests = async () => {
  const response = await api.get('/mentorship/my-requests');
  return response.data?.data || response.data;
};

export const getMentees = async () => {
  const response = await api.get('/mentorship/mentees');
  return response.data?.data || response.data;
};

export const acceptRequest = async (id, data = {}) => {
  const response = await api.patch(`/mentorship/${id}/accept`, data);
  return response.data?.data || response.data;
};

export const declineRequest = async (id) => {
  const response = await api.patch(`/mentorship/${id}/decline`);
  return response.data?.data || response.data;
};

// ── Skill Endorsements ─────────────────────────────────────────────────────────

export const endorseSkill = async ({ studentId, skill, notes }) => {
  const response = await api.post('/mentorship/endorse', { studentId, skill, notes });
  return response.data?.data || response.data;
};

export const getStudentEndorsements = async (studentId) => {
  const response = await api.get(`/mentorship/endorsements/student/${studentId}`);
  return response.data?.data || response.data;
};

export const getMyEndorsements = async () => {
  const response = await api.get('/mentorship/endorsements/my');
  return response.data?.data || response.data;
};

// ── Mock Interviews ────────────────────────────────────────────────────────────

export const scheduleMockInterview = async (data) => {
  const response = await api.post('/mentorship/mock-interviews', data);
  return response.data?.data || response.data;
};

export const getMyMockInterviews = async (params = {}) => {
  const response = await api.get('/mentorship/mock-interviews', { params });
  return response.data?.data || response.data;
};

export const getMockInterviewById = async (id) => {
  const response = await api.get(`/mentorship/mock-interviews/${id}`);
  return response.data?.data || response.data;
};

export const updateMockInterviewStatus = async (id, data) => {
  const response = await api.patch(`/mentorship/mock-interviews/${id}/status`, data);
  return response.data?.data || response.data;
};

export const submitMockInterviewFeedback = async (id, data) => {
  const response = await api.post(`/mentorship/mock-interviews/${id}/feedback`, data);
  return response.data?.data || response.data;
};

export default {
  requestMentorship,
  getMyRequests,
  getMentees,
  acceptRequest,
  declineRequest,
  endorseSkill,
  getStudentEndorsements,
  getMyEndorsements,
  scheduleMockInterview,
  getMyMockInterviews,
  getMockInterviewById,
  updateMockInterviewStatus,
  submitMockInterviewFeedback,
};
