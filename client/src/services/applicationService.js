import api from './api';

export const applyToProject = async (data) => {
  const response = await api.post('/applications', data);
  return response.data;
};

export const getStudentApplications = async () => {
  const response = await api.get('/applications/my');
  return response.data;
};

export const withdrawApplication = async (applicationId) => {
  const response = await api.delete(`/applications/${applicationId}/withdraw`);
  return response.data;
};

export const getProjectApplications = async (projectId) => {
  const response = await api.get(`/applications/project/${projectId}`);
  return response.data;
};

export const updateApplicationStatus = async (applicationId, { status, recruiterNotes }) => {
  const response = await api.patch(`/applications/${applicationId}/status`, { status, recruiterNotes });
  return response.data;
};

export const scheduleInterview = async (applicationId, { interviewDate, interviewMode, recruiterNotes }) => {
  const response = await api.patch(`/applications/${applicationId}/interview`, {
    interviewDate,
    interviewMode,
    recruiterNotes,
  });
  return response.data;
};

export const selectCandidate = async (applicationId, { recruiterNotes } = {}) => {
  const response = await api.patch(`/applications/${applicationId}/select`, { recruiterNotes });
  return response.data;
};
