import api from './api';

export const getProjects = async (params = {}) => {
  const response = await api.get('/projects', { params });
  return response.data;
};

export const getMyProjects = getProjects;

export const getProjectById = async (id) => {
  const response = await api.get(`/projects/${id}`);
  return response.data;
};

const buildProjectFormData = (data = {}) => {
  const formData = new FormData();
  const arrayFields = ['technologies', 'teamMembers', 'existingScreenshots'];
  const fileFields = data.screenshots || [];

  Object.entries(data).forEach(([key, value]) => {
    if (key === 'screenshots' || value === undefined || value === null) return;

    if (arrayFields.includes(key)) {
      formData.append(key, JSON.stringify(value));
    } else if (typeof value === 'boolean') {
      formData.append(key, String(value));
    } else {
      formData.append(key, value);
    }
  });

  fileFields.forEach((file) => formData.append('screenshots', file));
  return formData;
};

export const createProject = async (data) => {
  const response = await api.post('/projects', buildProjectFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await api.put(`/projects/${id}`, buildProjectFormData(data), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await api.delete(`/projects/${id}`);
  return response.data;
};

/**
 * Triggers a real HTTP HEAD check on the project's liveDeployment URL.
 * The server updates deploymentStatus to: reachable | unreachable | failed | not_provided
 */
export const verifyDeployment = async (id) => {
  const response = await api.post(`/projects/${id}/verify-deployment`);
  return response.data;
};

export default {
  getProjects,
  getMyProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  verifyDeployment,
};
