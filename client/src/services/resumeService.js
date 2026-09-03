import api from './api';

/**
 * Fetch current student's resume
 */
export const getResume = async () => {
  const response = await api.get('/resume');
  return response.data;
};

/**
 * Upload a new resume (PDF file)
 */
export const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await api.post('/resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Replace existing resume with a new PDF file
 */
export const replaceResume = async (file) => {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await api.put('/resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Delete student's resume
 */
export const deleteResume = async () => {
  const response = await api.delete('/resume');
  return response.data;
};

// Generated, ATS-friendly resume documents (kept separately from uploaded resumes).
export const generateResume = async (payload) => (await api.post('/resumes/generate', payload)).data;
export const getGeneratedResumes = async () => (await api.get('/resumes/generated')).data;
export const getGeneratedResume = async (id) => (await api.get(`/resumes/generated/${id}`)).data;
export const updateGeneratedResume = async (id, payload) => (await api.patch(`/resumes/generated/${id}`, payload)).data;
export const deleteGeneratedResume = async (id) => (await api.delete(`/resumes/generated/${id}`)).data;
export const regenerateResume = async (id) => (await api.post(`/resumes/generated/${id}/regenerate`)).data;
export const downloadGeneratedResume = async (id) => {
  const response = await api.get(`/resumes/generated/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `vidyalink-resume-v${id}.pdf`;
  link.click();
  window.URL.revokeObjectURL(url);
};

export default {
  getResume,
  uploadResume,
  replaceResume,
  deleteResume,
  generateResume,
  getGeneratedResumes,
  getGeneratedResume,
  updateGeneratedResume,
  deleteGeneratedResume,
  regenerateResume,
  downloadGeneratedResume,
};
