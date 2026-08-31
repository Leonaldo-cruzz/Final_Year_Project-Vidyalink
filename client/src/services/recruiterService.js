import api from './api';

const cleanParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
);

export const getRecruiterProfile = async () => (await api.get('/recruiter/profile')).data;

export const createRecruiterProfile = async (payload) => (
  (await api.post('/recruiter/profile', payload)).data
);

export const updateRecruiterProfile = async (payload) => (
  (await api.patch('/recruiter/profile', payload)).data
);

export const searchCandidates = async (filters = {}) => (
  (await api.get('/recruiter/candidates', { params: cleanParams(filters) })).data
);

export const getCandidateDetails = async (studentId) => (
  (await api.get(`/recruiter/candidates/${studentId}`)).data
);

export const getCandidateAISummary = async (studentId) => (
  (await api.get(`/recruiter/candidates/${studentId}/ai-summary`)).data
);

export const getShortlists = async (params = {}) => (
  (await api.get('/recruiter/shortlists', { params: cleanParams(params) })).data
);

export const addShortlist = async (studentId, notes = null) => (
  (await api.post('/recruiter/shortlists', { studentId, notes })).data
);

export const removeShortlist = async (studentId) => (
  (await api.delete(`/recruiter/shortlists/${studentId}`)).data
);

export const getInterviews = async (params = {}) => (
  (await api.get('/recruiter/interviews', { params: cleanParams(params) })).data
);

export const scheduleInterview = async (payload) => (
  (await api.post('/recruiter/interviews', payload)).data
);

export const rescheduleInterview = async (interviewId, payload) => (
  (await api.patch(`/recruiter/interviews/${interviewId}/reschedule`, payload)).data
);

export const cancelInterview = async (interviewId, cancelReason) => (
  (await api.patch(`/recruiter/interviews/${interviewId}/cancel`, { cancelReason })).data
);

export const completeInterview = async (interviewId) => (
  (await api.patch(`/recruiter/interviews/${interviewId}/complete`)).data
);

const recruiterService = {
  getRecruiterProfile,
  createRecruiterProfile,
  updateRecruiterProfile,
  searchCandidates,
  getCandidateDetails,
  getCandidateAISummary,
  getShortlists,
  addShortlist,
  removeShortlist,
  getInterviews,
  scheduleInterview,
  rescheduleInterview,
  cancelInterview,
  completeInterview,
};

export default recruiterService;
