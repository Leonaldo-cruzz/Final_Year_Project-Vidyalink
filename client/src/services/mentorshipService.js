import api from './api';

export const getMentorsList = async () => {
  const response = await api.get('/mentorship/mentors');
  return response.data;
};

export const getMyMentorships = async () => {
  const response = await api.get('/mentorship');
  return response.data;
};

export const requestMentorship = async (data) => {
  const response = await api.post('/mentorship/request', data);
  return response.data;
};

export const updateMentorshipStatus = async (id, data) => {
  const response = await api.patch(`/mentorship/${id}/status`, data);
  return response.data;
};

export default {
  getMentorsList,
  getMyMentorships,
  requestMentorship,
  updateMentorshipStatus,
};
