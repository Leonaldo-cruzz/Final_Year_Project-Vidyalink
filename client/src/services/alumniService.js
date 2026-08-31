import api from './api';

const alumniService = {
  // ==========================================
  // PART 1 — ALUMNI PROFILE
  // ==========================================

  getProfile: async () => {
    const response = await api.get('/alumni/profile');
    return response.data?.data?.profile || response.data?.data;
  },

  createProfile: async (data) => {
    const response = await api.post('/alumni/profile', data);
    return response.data?.data?.profile || response.data?.data;
  },

  updateProfile: async (data) => {
    const response = await api.patch('/alumni/profile', data);
    return response.data?.data?.profile || response.data?.data;
  },

  // ==========================================
  // PART 2 & 3 — STUDENT DISCOVERY & PORTFOLIO
  // ==========================================

  searchStudents: async (params = {}) => {
    const response = await api.get('/alumni/students', { params });
    return response.data?.data || response.data;
  },

  getStudentPortfolio: async (studentId) => {
    const response = await api.get(`/alumni/students/${studentId}`);
    return response.data?.data || response.data;
  },

  // ==========================================
  // PART 4 — MENTORSHIP
  // ==========================================

  getMentorshipRequests: async (params = {}) => {
    const response = await api.get('/alumni/mentorship/requests', { params });
    return response.data?.data || response.data;
  },

  requestMentorship: async (data) => {
    const response = await api.post('/alumni/mentorship/requests', data);
    return response.data?.data?.request || response.data?.data;
  },

  acceptMentorship: async (id, data = {}) => {
    const response = await api.patch(`/alumni/mentorship/requests/${id}/accept`, data);
    return response.data?.data?.request || response.data?.data;
  },

  declineMentorship: async (id, data = {}) => {
    const response = await api.patch(`/alumni/mentorship/requests/${id}/decline`, data);
    return response.data?.data?.request || response.data?.data;
  },

  completeMentorship: async (id, data = {}) => {
    const response = await api.patch(`/alumni/mentorship/requests/${id}/complete`, data);
    return response.data?.data?.request || response.data?.data;
  },

  cancelMentorship: async (id) => {
    const response = await api.patch(`/alumni/mentorship/requests/${id}/cancel`);
    return response.data?.data?.request || response.data?.data;
  },

  // ==========================================
  // PART 5 — SKILL ENDORSEMENTS
  // ==========================================

  getEndorsements: async (params = {}) => {
    const response = await api.get('/alumni/endorsements', { params });
    return response.data?.data || response.data;
  },

  createEndorsement: async (data) => {
    const response = await api.post('/alumni/endorsements', data);
    return response.data?.data?.endorsement || response.data?.data;
  },

  deleteEndorsement: async (id) => {
    const response = await api.delete(`/alumni/endorsements/${id}`);
    return response.data?.data || response.data;
  },

  // ==========================================
  // PART 6 — MOCK INTERVIEWS
  // ==========================================

  getMockInterviews: async (params = {}) => {
    const response = await api.get('/alumni/mock-interviews', { params });
    return response.data?.data || response.data;
  },

  requestMockInterview: async (data) => {
    const response = await api.post('/alumni/mock-interviews', data);
    return response.data?.data?.interview || response.data?.data;
  },

  acceptMockInterview: async (id, data = {}) => {
    const response = await api.patch(`/alumni/mock-interviews/${id}/accept`, data);
    return response.data?.data?.interview || response.data?.data;
  },

  scheduleMockInterview: async (id, data) => {
    const response = await api.patch(`/alumni/mock-interviews/${id}/schedule`, data);
    return response.data?.data?.interview || response.data?.data;
  },

  rescheduleMockInterview: async (id, data) => {
    const response = await api.patch(`/alumni/mock-interviews/${id}/schedule`, data);
    return response.data?.data?.interview || response.data?.data;
  },

  declineMockInterview: async (id, data = {}) => {
    const response = await api.patch(`/alumni/mock-interviews/${id}/decline`, data);
    return response.data?.data?.interview || response.data?.data;
  },

  completeMockInterview: async (id, data) => {
    const response = await api.patch(`/alumni/mock-interviews/${id}/complete`, data);
    return response.data?.data?.interview || response.data?.data;
  },

  // ==========================================
  // PART 7 — REFERRALS
  // ==========================================

  getReferrals: async (params = {}) => {
    const response = await api.get('/alumni/referrals', { params });
    return response.data?.data || response.data;
  },

  getReferral: async (id) => {
    const response = await api.get(`/alumni/referrals/${id}`);
    return response.data?.data?.referral || response.data?.data;
  },

  createReferral: async (data) => {
    const response = await api.post('/alumni/referrals', data);
    return response.data?.data?.referral || response.data?.data;
  },

  updateReferral: async (id, data) => {
    const response = await api.patch(`/alumni/referrals/${id}`, data);
    return response.data?.data?.referral || response.data?.data;
  },

  // ==========================================
  // PART 8 — DASHBOARD STATS
  // ==========================================

  getDashboardStats: async () => {
    const response = await api.get('/alumni/dashboard/stats');
    return response.data?.data || response.data;
  },
};

export default alumniService;
