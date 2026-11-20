import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage, PageResult } from '../types';
import { toStop, type BusStopResponseRaw, type Stop, type StopType, type StopListParams } from '../stop-model';

export interface StopCreateRequest {
  arsId: string;
  name: string;
  latitude: number;
  longitude: number;
  nodeId: string;
  stopsType: StopType;
}

export interface StopBulkRegisterResult {
  savedCount: number;
  updatedCount: number;
  skippedCount: number;
  totalCount: number;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

/**
 * `GET /api/v1/admin/stop` 는 `GET /api/v1/stop` 과 동일하게 pk/stopId/stopName 중 하나가 있으면
 * 해당 기준 조회, 없으면 keyword 기반 페이지 목록을 반환한다(둘 다 BackendPage 봉투).
 * ADMIN_MASTER/ADMIN_DEVELOPER + MANAGE 권한 전용.
 */
const adminStop = (params: object): Promise<PageResult<Stop>> =>
  api
    .get<ApiResponse<BackendPage<BusStopResponseRaw>>>('/api/v1/admin/stop', { params })
    .then((res) => toPageResult(res.data.data, toStop));

export const AdminStopService = {
  /** 어드민 전용 정류소 목록 조회(정류장 관리 화면용). ADMIN_MASTER/ADMIN_DEVELOPER 전용. */
  list: (params: StopListParams = {}): Promise<PageResult<Stop>> => adminStop(params),
  /** 어드민 전용 정류소 검색(이름·ARS ID 부분 일치). ADMIN_MASTER/ADMIN_DEVELOPER 전용. */
  search: (keyword: string, params: { page?: number; size?: number } = {}): Promise<Stop[]> => {
    const q = keyword.trim();
    if (!q) return Promise.resolve([]);
    return adminStop({ keyword: q, size: 20, ...params }).then((result) => result.content);
  },
  /** 어드민 전용 정류소 상세 조회(pk 기준). ADMIN_MASTER/ADMIN_DEVELOPER 전용. */
  detail: (id: string): Promise<Stop | null> =>
    adminStop({ pk: id }).then((result) => result.content[0] ?? null),

  createSimple: (data: StopCreateRequest) =>
    unwrap<null>(
      api.post('/api/v1/admin/stop/simple', {
        stopId: data.arsId,
        stopName: data.name,
        xCrd: String(data.longitude),
        yCrd: String(data.latitude),
        nodeId: data.nodeId,
        stopsType: data.stopsType,
      }),
    ),
  registerBulk: () => unwrap<StopBulkRegisterResult>(api.post('/api/v1/admin/stop/register/bulk')),
};
