import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage, PageResult } from './types';

/** 서울 열린데이터광장 STOPS_TYPE 에 대응하는 정류소 유형 (백엔드 StopType enum). */
export type StopType =
  | 'VILLAGE_BUS'
  | 'ROADSIDE_ALL_DAY'
  | 'ROADSIDE_TIMED'
  | 'CENTER_LANE'
  | 'GENERAL_LANE'
  | 'HANGANG_DOCK';

export const STOP_TYPE_LABEL: Record<StopType, string> = {
  VILLAGE_BUS: '마을버스',
  ROADSIDE_ALL_DAY: '가로변전일',
  ROADSIDE_TIMED: '가로변시간',
  CENTER_LANE: '중앙차로',
  GENERAL_LANE: '일반차로',
  HANGANG_DOCK: '한강선착장',
};

export const STOP_TYPE_OPTIONS = Object.entries(STOP_TYPE_LABEL) as [StopType, string][];

export interface Stop {
  id: string;
  arsId: string;
  name: string;
  latitude: number;
  longitude: number;
  nodeId: string;
  stopsType: StopType;
  createdAt: string;
  updatedAt: string;
  /**
   * 정류소 현재 단가. 어드민 목록(`GET /api/v1/admin/stop`)에서만 내려온다.
   * 미등록은 `null`(0원과 구분). 공개 목록(`GET /api/v1/stop`)에는 없어 `null`.
   */
  unitPrice: number | null;
}

export interface StopListParams {
  page?: number;
  size?: number;
  keyword?: string;
  /** 정류소 유형 필터. 생략하면 전체 유형. keyword 와 AND 로 결합된다. */
  stopsType?: StopType;
}

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

/** 백엔드 stop 서비스의 정류소 응답 원형 (BusStopResponse / 어드민 StopResponse 공통 형태). */
interface BusStopResponseRaw {
  id: string;
  stopId: string;
  stopName: string;
  xCrd: string; // 경도(longitude) 문자열
  yCrd: string; // 위도(latitude) 문자열
  nodeId: string;
  stopsType: StopType;
  createdAt: string;
  updatedAt: string;
  /** 어드민 StopResponse 전용. BigDecimal 이라 number("1500") 또는 string("1500.00"). 미등록 시 null/부재. */
  unitPrice?: number | string | null;
}

const toStop = (raw: BusStopResponseRaw): Stop => ({
  id: raw.id,
  arsId: raw.stopId,
  name: raw.stopName,
  latitude: Number(raw.yCrd),
  longitude: Number(raw.xCrd),
  nodeId: raw.nodeId,
  stopsType: raw.stopsType,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  unitPrice: raw.unitPrice == null ? null : Number(raw.unitPrice),
});

/**
 * `GET /api/v1/admin/stop` 는 `GET /api/v1/stop` 과 동일하게 pk/stopId/stopName 중 하나가 있으면
 * 해당 기준 조회, 없으면 keyword 기반 페이지 목록을 반환한다(둘 다 BackendPage 봉투).
 * ADMIN_MASTER/ADMIN_DEVELOPER + MANAGE 권한 전용.
 */
const adminStop = (params: object): Promise<PageResult<Stop>> =>
  api
    .get<ApiResponse<BackendPage<BusStopResponseRaw>>>('/api/v1/admin/stop', { params })
    .then((res) => toPageResult(res.data.data, toStop));

export const StopService = {
  /** 공개 정류소 목록 조회. 매니저 외 일반/비즈니스 회원도 사용(예: 예약 생성 시 정류장 선택). */
  list: (params: StopListParams = {}): Promise<PageResult<Stop>> =>
    api
      .get<ApiResponse<BackendPage<BusStopResponseRaw>>>('/api/v1/stop', { params })
      .then((res) => toPageResult(res.data.data, toStop)),
  /** 어드민 전용 정류소 목록 조회(정류장 관리 화면용). ADMIN_MASTER/ADMIN_DEVELOPER 전용. */
  adminList: (params: StopListParams = {}): Promise<PageResult<Stop>> => adminStop(params),
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
