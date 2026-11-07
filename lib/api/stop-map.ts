import { api } from './client';
import type { StopType } from './stop';
import type { ApiResponse } from './types';

/**
 * 지도 마커 전용 경량 조회 API.
 *
 * 백엔드 `modules/stop` 의 `map/` 읽기 슬라이스와 1:1 대응한다. 커맨드 경로(`/api/v1/stop`)와 달리
 * 단가·이력 결합이 없고 좌표 4개 컬럼만 내려온다. 마커 클릭 상세는 `StopService.detail(pk)` 로 별도 조회한다.
 */

/** 지도에 찍을 정류소 마커 1건. */
export interface StopMarker {
  /** 정류소 PK (UUID). 상세 조회 시 `pk` 로 사용. */
  id: string;
  /** ARS ID (백엔드 `stopId`). */
  arsId: string;
  name: string;
  lat: number;
  lng: number;
  stopsType: StopType;
}

export interface StopBoundsResult {
  items: StopMarker[];
  /** 상한(limit)에 걸려 일부만 내려온 경우 true — 사용자에게 확대를 안내한다. */
  truncated: boolean;
  limit: number;
}

export interface StopBoundsParams {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  /** 반환 상한. 기본 1,000 / 최대 2,000. */
  limit?: number;
  /** 정류소 유형 필터. 생략하면 전체 유형. */
  stopsType?: StopType;
}

interface StopMarkerRaw {
  id: string;
  stopId: string;
  stopName: string;
  /** 백엔드는 BigDecimal 이라 number 또는 string 으로 내려올 수 있다. */
  lat: number | string;
  lng: number | string;
  stopsType: StopType;
}

interface StopBoundsResponseRaw {
  items: StopMarkerRaw[];
  truncated: boolean;
  limit: number;
}

const toStopMarker = (raw: StopMarkerRaw): StopMarker => ({
  id: raw.id,
  arsId: raw.stopId,
  name: raw.stopName,
  lat: Number(raw.lat),
  lng: Number(raw.lng),
  stopsType: raw.stopsType,
});

/**
 * 좌표를 문자열로 직렬화한다.
 *
 * 백엔드가 좌표를 `String` 으로 받는 이유는 형식 오류를 도메인 예외(400)로 내리기 위함이다.
 * DB scale 이 7 이므로 그 이상 자리수는 의미가 없어 잘라 보낸다(쿼리스트링도 짧아진다).
 */
const coord = (value: number) => value.toFixed(7);

export const StopMapService = {
  /**
   * 지도 현재 영역(bbox)에 포함된 정류소 마커 조회.
   * `GET /api/v1/admin/stop/map/bounds` (iam 어드민 API 경유. 관리자 화면 전용)
   *
   * 지도 `idle` 마다 호출되는 고빈도 API 다. 호출부는 디바운스와 `AbortSignal` 로
   * 이전 요청을 취소해야 한다. 날짜변경선 교차(`swLng > neLng`)는 백엔드가 400 으로 거부한다.
   */
  bounds: (params: StopBoundsParams, signal?: AbortSignal): Promise<StopBoundsResult> =>
    api
      .get<ApiResponse<StopBoundsResponseRaw>>('/api/v1/admin/stop/map/bounds', {
        signal,
        params: {
          swLat: coord(params.swLat),
          swLng: coord(params.swLng),
          neLat: coord(params.neLat),
          neLng: coord(params.neLng),
          ...(params.limit ? { limit: params.limit } : {}),
          ...(params.stopsType ? { stopsType: params.stopsType } : {}),
        },
      })
      .then((res) => ({
        items: (res.data.data?.items ?? []).map(toStopMarker),
        truncated: res.data.data?.truncated ?? false,
        limit: res.data.data?.limit ?? 0,
      })),
};
