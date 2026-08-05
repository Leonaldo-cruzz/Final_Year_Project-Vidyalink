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

export default {
  getResume,
  uploadResume,
  replaceResume,
  deleteResume,
};
