import { api } from './client';
import type { ApiResponse } from './types';

export const apiFetcher = async <T>(url: string): Promise<T> => {
  const res = await api.get<ApiResponse<T>>(url);
  return res.data.data;
};

export const apiKeyFetcher = async <T>([url, params]: [
  string,
  Record<string, unknown> | undefined,
]): Promise<T> => {
  const res = await api.get<ApiResponse<T>>(url, { params });
  return res.data.data;
};
