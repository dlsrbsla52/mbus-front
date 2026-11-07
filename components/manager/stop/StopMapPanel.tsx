'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KakaoMap, { type KakaoMapBounds, type KakaoMapMarker } from '@/components/common/KakaoMap';
import { StopMapService, type StopMarker } from '@/lib/api/stop-map';
import { extractApiError } from '@/lib/api/result-codes';
import type { StopType } from '@/lib/api/stop';

/** 429(쿼터 초과) 응답 후 재조회를 억제할 시간. 지도 조작마다 재시도하면 상황이 악화된다. */
const RATE_LIMIT_COOLDOWN_MS = 30_000;

/**
 * 이 레벨보다 넓게 축소하면 조회하지 않는다(숫자가 클수록 축소).
 *
 * 서울 전역이 2만 건이 넘어 넓은 화면에서는 어차피 상한(기본 1,000)에 잘린다.
 * 잘린 일부만 그리면 "정류장이 없는 지역"처럼 보여 지도가 거짓말을 하고, 쿼터만 소모한다.
 * 차라리 조회를 멈추고 확대를 안내한다.
 */
const MAX_FETCH_LEVEL = 10;

const isAbortError = (e: unknown) => {
  const err = e as { code?: string; name?: string };
  return err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || err?.name === 'AbortError';
};

const statusOf = (e: unknown) => (e as { response?: { status?: number } })?.response?.status;

export interface StopMapPanelProps {
  /** 인포윈도우를 띄울 정류소 PK. */
  selectedStopId?: string | null;
  /** 값이 바뀔 때마다 지도를 해당 좌표로 이동시킨다. */
  focus?: { lat: number; lng: number; level?: number } | null;
  /** 마커 클릭. 지도 응답은 경량이라 상세가 필요하면 호출부에서 별도 조회한다. */
  onSelectStop?: (marker: StopMarker) => void;
  /** 정류소 유형 필터. 서버(bbox 조회)에서 걸러지므로 마커와 목록이 항상 일치한다. */
  stopsType?: StopType | null;
  /**
   * 현재 지도 영역의 정류소가 갱신될 때마다 알린다.
   * 호출부가 "지도 영역만 보기" 목록을 같은 데이터로 그릴 수 있게 하기 위함이다.
   */
  onStopsChange?: (stops: StopMarker[]) => void;
  className?: string;
}

/**
 * 정류소 지도 패널 — 지도 표시 영역(bbox)에 들어오는 정류소 마커를 조회해 그린다.
 *
 * 지도 자체는 `KakaoMap` 이 담당하고 이 컴포넌트는 정류소 도메인 결합만 맡는다.
 * `idle` 디바운스(KakaoMap) + `AbortController`(여기) 로 연속 조작 시 요청이 쌓이지 않게 한다.
 */
export default function StopMapPanel({
  selectedStopId = null,
  focus = null,
  onSelectStop,
  stopsType = null,
  onStopsChange,
  className = '',
}: StopMapPanelProps) {
  const [stops, setStops] = useState<StopMarker[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimited, setRateLimited] = useState(false);
  const [tooWide, setTooWide] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const cooldownUntilRef = useRef(0);
  /** 마지막으로 조회한 영역. 유형 필터가 바뀌면 지도를 움직이지 않아도 이 영역으로 재조회한다. */
  const lastBoundsRef = useRef<KakaoMapBounds | null>(null);
  // 콜백을 안정적으로 유지하기 위해 최신 필터 값은 ref 로 참조한다.
  const stopsTypeRef = useRef(stopsType);
  useEffect(() => {
    stopsTypeRef.current = stopsType;
  });

  const fetchBounds = useCallback(async (bounds: KakaoMapBounds) => {
    if (Date.now() < cooldownUntilRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const result = await StopMapService.bounds(
        { ...bounds, ...(stopsTypeRef.current ? { stopsType: stopsTypeRef.current } : {}) },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setStops(result.items);
      setTruncated(result.truncated);
      setError('');
      setRateLimited(false);
    } catch (e) {
      if (isAbortError(e)) return;
      if (statusOf(e) === 429) {
        cooldownUntilRef.current = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        setRateLimited(true);
        setError('지도 조회 요청이 많아 잠시 중단되었습니다. 30초 후 다시 시도해주세요.');
      } else {
        setError(extractApiError(e, '지도 정류소를 불러오지 못했습니다.'));
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  const handleBoundsChange = useCallback(
    (bounds: KakaoMapBounds, level: number) => {
      lastBoundsRef.current = bounds;

      if (level > MAX_FETCH_LEVEL) {
        abortRef.current?.abort();
        setTooWide(true);
        setStops([]);
        setTruncated(false);
        setLoading(false);
        return;
      }
      setTooWide(false);
      void fetchBounds(bounds);
    },
    [fetchBounds],
  );

  // 유형 필터 변경 — 지도는 그대로 두고 같은 영역을 다시 조회한다.
  // 첫 렌더에서는 lastBounds 가 없어 아무 일도 하지 않는다(지도 초기화 후 idle 이 조회를 시작한다).
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    const bounds = lastBoundsRef.current;
    if (!bounds || tooWide) return;
    void fetchBounds(bounds);
    // tooWide 는 조회 여부 판단에만 쓰고, 이 이펙트는 필터 변경에만 반응해야 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsType, fetchBounds]);

  // 지도 영역 정류소가 갱신되면 호출부에 알린다("지도 영역만 보기" 목록이 같은 데이터를 쓴다).
  const onStopsChangeRef = useRef(onStopsChange);
  useEffect(() => {
    onStopsChangeRef.current = onStopsChange;
  });
  useEffect(() => {
    onStopsChangeRef.current?.(stops);
  }, [stops]);

  const markers = useMemo<KakaoMapMarker[]>(
    () => stops.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, title: `${s.name} (${s.arsId})` })),
    [stops],
  );

  const handleMarkerClick = useCallback(
    (marker: KakaoMapMarker) => {
      const stop = stops.find((s) => s.id === marker.id);
      if (stop) onSelectStop?.(stop);
    },
    [stops, onSelectStop],
  );

  return (
    <KakaoMap
      className={className}
      markers={markers}
      selectedId={selectedStopId}
      focus={focus}
      onBoundsChange={handleBoundsChange}
      onMarkerClick={handleMarkerClick}
      cluster
    >
      {/* 지도 위 상태 배지 — 지도 조작을 막지 않도록 pointer-events 를 끈다. */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-5rem)] flex-col gap-1.5">
        <span className="w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-gray-700 shadow-sm">
          {tooWide
            ? '범위가 넓어 표시하지 않음'
            : loading
              ? '정류장 불러오는 중…'
              : `이 영역 정류장 ${stops.length.toLocaleString('ko-KR')}개`}
        </span>

        {tooWide && (
          <span className="w-fit rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue shadow-sm">
            확대하면 정류장이 표시됩니다
          </span>
        )}

        {truncated && !rateLimited && !tooWide && (
          <span className="w-fit rounded-full bg-amber-100/95 px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
            표시 상한을 넘었습니다 — 확대해서 보세요
          </span>
        )}

        {error && (
          <span
            role="alert"
            className="w-fit rounded-md bg-danger-soft/95 px-3 py-1 text-xs font-semibold text-danger shadow-sm"
          >
            {error}
          </span>
        )}
      </div>
    </KakaoMap>
  );
}
