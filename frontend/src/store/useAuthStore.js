import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, tokens } = data;
    localStorage.setItem('token', tokens.accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token: tokens.accessToken, isAuthenticated: true });
    return user;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  register: async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    return data;
  },

  verifyEmail: async (email, otp) => {
    const { data } = await api.post('/auth/verify-email', { email, otp });
    return data;
  },
  
  resendOTP: async (email) => {
    const { data } = await api.post('/auth/resend-otp', { email });
    return data;
  },

  forgotPassword: async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  verifyResetOTP: async (email, otp) => {
    const { data } = await api.post('/auth/verify-reset-otp', { email, otp });
    return data;
  },

  resetPassword: async (email, otp, password) => {
    const { data } = await api.post('/auth/reset-password', { email, otp, password });
    return data;
  }
}));

export default useAuthStore;
