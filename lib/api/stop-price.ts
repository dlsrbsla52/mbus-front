import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage } from './types';

export interface StopPrice {
  id: string;
  regionCode: string;
  monthlyPrice: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

export interface StopPriceListParams {
  page?: number;
  size?: number;
  regionCode?: string;
}

export interface StopPriceCreateRequest {
  regionCode: string;
  monthlyPrice: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface StopPriceUpdateRequest {
  monthlyPrice?: number;
  effectiveTo?: string | null;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const StopPriceService = {
  list: (params: StopPriceListParams = {}) =>
    api
      .get<ApiResponse<BackendPage<StopPrice>>>('/api/v1/stop-price', { params })
      .then((res) => toPageResult(res.data.data)),
  create: (data: StopPriceCreateRequest) =>
    unwrap<StopPrice>(api.post('/api/v1/admin/stop-price', data)),
  update: (id: string, data: StopPriceUpdateRequest) =>
    unwrap<StopPrice>(api.put(`/api/v1/admin/stop-price/${id}`, data)),
  remove: (id: string) =>
    unwrap<null>(api.delete(`/api/v1/admin/stop-price/${id}`)),
};
