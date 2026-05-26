import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import type { ApiResponse } from './types';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

type RetryableRequest = AxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  });
  failedQueue = [];
};

const REFRESH_PATH = '/api/v1/auth/token/refresh';
const AUTH_NO_REFRESH_PATHS = new Set<string>([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/logout',
  REFRESH_PATH,
]);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    if (!originalRequest) return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url && AUTH_NO_REFRESH_PATHS.has(originalRequest.url)) {
        if (originalRequest.url === REFRESH_PATH) {
          useAuthStore.getState().logout();
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = {
            ...(originalRequest.headers ?? {}),
            Authorization: `Bearer ${token}`,
          };
          return api(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const response = await axios.post<ApiResponse<{ accessToken: string }>>(
          `${API_BASE_URL}${REFRESH_PATH}`,
          {},
          { withCredentials: true },
        );

        const newAccessToken = response.data.data.accessToken;
        useAuthStore.getState().setTokens(newAccessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${newAccessToken}`,
        };

        processQueue(null, newAccessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
