import api from './api';

export const getUserWorkspaces = async () => {
  const response = await api.get('/workspaces');
  return response.data;
};

export const getWorkspaceById = async (workspaceId) => {
  const response = await api.get(`/workspaces/${workspaceId}`);
  return response.data;
};
