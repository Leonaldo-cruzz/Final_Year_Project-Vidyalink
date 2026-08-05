import api from './api';

/**
 * Fetch student certificates with filters, search, and sorting
 */
export const getCertificates = async ({ status, search, sort } = {}) => {
  const params = {};
  if (status && status !== 'All') params.status = status;
  if (search) params.search = search;
  if (sort) params.sort = sort;

  const response = await api.get('/certificates', { params });
  return response.data;
};

/**
 * Fetch a single certificate by ID
 */
export const getCertificateById = async (id) => {
  const response = await api.get(`/certificates/${id}`);
  return response.data;
};

/**
 * Create a new certificate with document upload
 */
export const createCertificate = async (formData) => {
  const response = await api.post('/certificates', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Update an existing certificate (with optional document upload)
 */
export const updateCertificate = async (id, formData) => {
  const response = await api.put(`/certificates/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Delete a certificate by ID
 */
export const deleteCertificate = async (id) => {
  const response = await api.delete(`/certificates/${id}`);
  return response.data;
};

export default {
  getCertificates,
  getCertificateById,
  createCertificate,
  updateCertificate,
  deleteCertificate,
};
