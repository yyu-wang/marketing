import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { REQUEST_TIMEOUT } from '@/constants';

const http = axios.create({
  baseURL: '/api',
  timeout: REQUEST_TIMEOUT,
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default http;
