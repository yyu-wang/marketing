import axios from 'axios';
import { message } from 'antd';
import { useAuthStore } from '@/stores/auth';
import { REQUEST_TIMEOUT } from '@/constants';
import type { ApiResponse } from '@/types/api';

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
  (res) => {
    const body = res.data as ApiResponse | undefined;
    if (body && typeof body.code === 'number' && body.code !== 200) {
      if (body.code === 401) {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      message.error(body.message || '请求失败');
      return Promise.reject(new Error(body.message || '请求失败'));
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const msg = err.response?.data?.message || err.message || '网络异常，请稍后重试';
    message.error(msg);
    return Promise.reject(err);
  },
);

export default http;
