import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor placeholder
api.interceptors.request.use(
  (config) => {
    // Access token attachment logic will go here when connected
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor placeholder
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default api;
