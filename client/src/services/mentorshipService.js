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

export default {
  requestMentorship,
  getMyRequests,
  getMentees,
  acceptRequest,
  declineRequest,
};
