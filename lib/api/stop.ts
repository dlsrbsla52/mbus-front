import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage, PageResult } from './types';

export interface Stop {
  id: string;
  arsId: string;
  name: string;
  latitude: number;
  longitude: number;
  district?: string;
}

export interface BusStopDetail extends Stop {
  address?: string;
  regionCode?: string;
  currentPrice?: number;
  occupied?: boolean;
  occupiedUntil?: string | null;
}

export interface StopListParams {
  page?: number;
  size?: number;
  keyword?: string;
  district?: string;
}

export interface StopCreateRequest {
  arsId: string;
  name: string;
  latitude: number;
  longitude: number;
  district?: string;
}

export interface StopUpdateRequest {
  name?: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  regionCode?: string;
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusM?: number;
  available?: boolean;
}

export interface OccupiedRange {
  startDate: string;
  endDate: string;
}

export interface StopPriceAt {
  stopId: string;
  date: string;
  monthlyPrice: number;
  regionCode: string;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

/** 백엔드 stop 서비스의 정류소 응답 원형 (BusStopResponse). */
interface BusStopResponseRaw {
  id: string;
  stopId: string;
  stopName: string;
  xCrd: string; // 경도(longitude) 문자열
  yCrd: string; // 위도(latitude) 문자열
  nodeId: string;
  stopsType: string;
  createdAt: string;
  updatedAt: string;
}

const toStop = (raw: BusStopResponseRaw): Stop => ({
  id: raw.id,
  arsId: raw.stopId,
  name: raw.stopName,
  latitude: Number(raw.yCrd),
  longitude: Number(raw.xCrd),
  // 백엔드 정류소 모델에는 자치구(district) 개념이 없어 미설정.
});

export const StopService = {
  list: (params: StopListParams = {}): Promise<PageResult<Stop>> =>
    api
      .get<ApiResponse<BackendPage<BusStopResponseRaw>>>('/api/v1/stop', { params })
      .then((res) => toPageResult(res.data.data, toStop)),
  detail: (id: string) =>
    unwrap<BusStopDetail>(api.get(`/api/v1/stop/${id}`)),
  search: (keyword: string, params: { page?: number; size?: number } = {}): Promise<PageResult<BusStopDetail>> =>
    api
      .get<ApiResponse<BackendPage<BusStopResponseRaw>>>('/api/v1/stop/search', {
        params: { keyword, ...params },
      })
      .then((res) => toPageResult<BusStopResponseRaw, BusStopDetail>(res.data.data, toStop)),
  nearby: (params: NearbyParams) =>
    unwrap<BusStopDetail[]>(api.get('/api/v1/stop/nearby', { params })),
  availability: (id: string, from: string, to: string) =>
    unwrap<OccupiedRange[]>(
      api.get(`/api/v1/stop/${id}/availability`, { params: { from, to } }),
    ),
  priceAt: (id: string, date: string) =>
    unwrap<StopPriceAt>(api.get(`/api/v1/stop/${id}/price`, { params: { date } })),

  createSimple: (data: StopCreateRequest) =>
    unwrap<Stop>(api.post('/api/v1/stop/simple', data)),
  registerBulk: () => unwrap<null>(api.post('/api/v1/stop/register/bulk')),
  update: (id: string, data: StopUpdateRequest) =>
    unwrap<BusStopDetail>(api.put(`/api/v1/admin/stop/${id}`, data)),
  remove: (id: string) =>
    unwrap<null>(api.delete(`/api/v1/admin/stop/${id}`)),
};
