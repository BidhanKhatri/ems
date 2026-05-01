import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for token expiry/401 logic, clear token and redirect if needed
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login handled by AuthStore / router guards
    }
    // Keep UI stable under rapid refresh/load spikes
    if (error.response?.status === 429) {
      return Promise.reject(new Error('Too many requests. Please wait a few seconds and try again.'));
    }
    return Promise.reject(error);
  }
);

export default api;
