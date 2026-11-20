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

/** 백엔드 stop 서비스의 정류소 응답 원형 (BusStopResponse / 어드민 StopResponse 공통 형태). */
export interface BusStopResponseRaw {
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

export const toStop = (raw: BusStopResponseRaw): Stop => ({
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
