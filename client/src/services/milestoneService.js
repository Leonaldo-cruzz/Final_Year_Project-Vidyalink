import api from './api';

export const getWorkspaceMilestones = async (workspaceId) => {
  const response = await api.get(`/milestones/workspace/${workspaceId}`);
  return response.data;
};

export const createMilestone = async (data) => {
  const response = await api.post('/milestones', data);
  return response.data;
};

export const updateMilestone = async (milestoneId, data) => {
  const response = await api.patch(`/milestones/${milestoneId}`, data);
  return response.data;
};

export const deleteMilestone = async (milestoneId) => {
  const response = await api.delete(`/milestones/${milestoneId}`);
  return response.data;
};

export const submitDeliverable = async (milestoneId, data) => {
  const response = await api.post(`/milestones/${milestoneId}/submit`, data);
  return response.data;
};

export const verifyMilestone = async (milestoneId, data) => {
  const response = await api.post(`/milestones/${milestoneId}/verify`, data);
  return response.data;
};
