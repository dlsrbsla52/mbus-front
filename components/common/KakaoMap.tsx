'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadKakaoMaps, isKakaoMapConfigured } from '@/lib/kakao/sdk';

/** 지도에 표시할 마커 1건. 도메인에 종속되지 않도록 최소 필드만 받는다. */
export interface KakaoMapMarker {
  id: string;
  lat: number;
  lng: number;
  /** 마커 hover 툴팁 및 선택 시 인포윈도우 문구. */
  title?: string;
}

/** 지도 표시 영역(bbox). 백엔드 bounds 조회 파라미터와 같은 형태. */
export interface KakaoMapBounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface KakaoMapProps {
  markers?: KakaoMapMarker[];
  /** 최초 중심 좌표. 이후 변경은 무시된다(사용자 조작을 덮어쓰지 않기 위함). */
  initialCenter?: { lat: number; lng: number };
  /** 최초 확대 레벨. 숫자가 작을수록 확대. */
  initialLevel?: number;
  /** 값이 바뀔 때마다 해당 좌표로 지도를 이동시킨다. 리스트 → 지도 연동용. */
  focus?: { lat: number; lng: number; level?: number } | null;
  /** 인포윈도우를 띄울 마커 id. 해당 마커가 현재 목록에 없으면 아무 것도 하지 않는다. */
  selectedId?: string | null;
  onMarkerClick?: (marker: KakaoMapMarker) => void;
  /**
   * 지도 이동/확대가 멈춘 뒤(디바운스 후) 현재 bbox 와 지도 레벨을 알린다.
   * 최초 렌더 직후에도 1회 호출된다. 레벨은 "너무 넓으면 조회하지 않기" 같은 판단에 쓴다.
   */
  onBoundsChange?: (bounds: KakaoMapBounds, level: number) => void;
  /** `idle` 디바운스(ms). 고빈도 조회 API 를 붙일 때 필수. */
  debounceMs?: number;
  /** 마커 클러스터링 사용 여부. 수백 건 이상이면 반드시 켤 것. */
  cluster?: boolean;
  /**
   * 지도 레벨이 이 값보다 **작아지면(확대되면) 클러스터가 해제**되고 개별 마커가 보인다.
   * 카카오 기본값 10 은 밀집 데이터에 너무 커서 클러스터가 거의 생기지 않는다.
   */
  clusterMinLevel?: number;
  /**
   * 클러스터 묶음 격자 크기(px). 카카오 기본값 60 은 핀 아이콘 폭(약 30px)에 비해 좁아
   * 격자 밖에 남은 마커들이 서로 겹쳐 뭉개진다. 넓게 잡을수록 덜 겹치고 단계적으로 풀린다.
   */
  clusterGridSize?: number;
  /** 지도 컨테이너 크기는 부모가 결정한다. 반드시 높이를 주어야 한다. */
  className?: string;
  /** 지도 위에 겹쳐 띄울 요소(안내 배지 등). */
  children?: React.ReactNode;
}

/** 서울시청 — 좌표가 없을 때의 기본 중심. */
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };

/** 클러스터 크기 구간. 기본값과 동일하게 두되 스타일과 짝을 맞추기 위해 명시한다. */
const CLUSTER_CALCULATOR = [10, 100, 1000];

/** 선택 마커가 주변 마커·클러스터에 가리지 않도록 올려둘 z-index. */
const SELECTED_MARKER_Z_INDEX = 100;

/** 구간별 클러스터 원 스타일. 브랜드 블루 기반으로 커질수록 크고 진하게. */
const CLUSTER_STYLES = [36, 44, 54, 64].map((size, i) => ({
  width: `${size}px`,
  height: `${size}px`,
  lineHeight: `${size}px`,
  background: `rgba(0, 86, 179, ${0.7 + i * 0.08})`,
  borderRadius: `${size / 2}px`,
  border: '2px solid rgba(255,255,255,0.9)',
  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  color: '#fff',
  textAlign: 'center',
  fontSize: `${11 + i}px`,
  fontWeight: '700',
}));

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * 카카오맵 래퍼. 도메인 로직을 담지 않으며 마커 배열과 콜백만 다룬다.
 *
 * SDK 는 명령형 API 라 지도/마커 인스턴스를 ref 로 들고, props 변화에 맞춰 수동 동기화한다.
 * 콜백은 latest-ref 로 참조해 함수 정체성이 바뀌어도 이벤트 리스너를 재등록하지 않는다.
 */
export default function KakaoMap({
  markers = [],
  initialCenter = DEFAULT_CENTER,
  initialLevel = 6,
  focus = null,
  selectedId = null,
  onMarkerClick,
  onBoundsChange,
  debounceMs = 300,
  cluster = true,
  clusterMinLevel = 2,
  clusterGridSize = 120,
  className = '',
  children,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null);
  const markerMapRef = useRef(new globalThis.Map<string, kakao.maps.Marker>());
  const infoWindowRef = useRef<kakao.maps.InfoWindow | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  /** 클러스터에서 빼내 지도에 직접 올려둔 마커 id. 선택이 바뀌면 되돌린다. */
  const detachedIdRef = useRef<string | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  // 최신 콜백/설정값 참조 — 이벤트 리스너를 다시 붙이지 않기 위함.
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMarkerClickRef = useRef(onMarkerClick);
  const debounceMsRef = useRef(debounceMs);
  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onMarkerClickRef.current = onMarkerClick;
    debounceMsRef.current = debounceMs;
  });

  const emitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    onBoundsChangeRef.current?.(
      {
        swLat: sw.getLat(),
        swLng: sw.getLng(),
        neLat: ne.getLat(),
        neLng: ne.getLng(),
      },
      map.getLevel(),
    );
  }, []);

  // ── 지도 생성 (마운트당 1회) ────────────────────────────────────────────────
  useEffect(() => {
    if (!isKakaoMapConfigured()) {
      setLoadError('카카오맵 앱 키가 설정되지 않았습니다. (NEXT_PUBLIC_KAKAO_MAP_APP_KEY)');
      return;
    }

    let disposed = false;
    // cleanup 시점에도 같은 대상을 가리키도록 ref 내용을 지역 변수로 잡아둔다.
    const markerStore = markerMapRef.current;
    const container = containerRef.current;
    if (!container) return;

    const handleIdle = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(emitBounds, debounceMsRef.current);
    };

    loadKakaoMaps()
      .then((maps) => {
        if (disposed || mapRef.current) return;
        const map = new maps.Map(container, {
          center: new maps.LatLng(initialCenter.lat, initialCenter.lng),
          level: initialLevel,
        });
        map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
        maps.event.addListener(map, 'idle', handleIdle);
        mapRef.current = map;
        setReady(true);
        // 최초 화면의 bbox 도 알려야 첫 조회가 일어난다.
        emitBounds();
      })
      .catch((e: unknown) => {
        if (disposed) return;
        setLoadError(e instanceof Error ? e.message : '지도를 불러오지 못했습니다.');
      });

    return () => {
      disposed = true;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      infoWindowRef.current?.close();
      clustererRef.current?.clear();
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
      markerStore.forEach((marker) => marker.setMap(null));
      markerStore.clear();
      mapRef.current = null;
      // SDK 에 지도 파괴 API 가 없다. StrictMode 이중 마운트/HMR 에서 지도가 겹쳐 쌓이지 않도록
      // 컨테이너를 비운다. 이 div 는 React 가 자식을 관리하지 않으므로 안전하다.
      container.innerHTML = '';
    };
    // 최초 중심/레벨은 의도적으로 재적용하지 않는다(사용자 조작 덮어쓰기 방지).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitBounds]);

  // ── 클러스터러 생성/해제 ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !cluster) return;
    const maps = window.kakao.maps;

    const clusterer = new maps.MarkerClusterer({
      map,
      averageCenter: true,
      minLevel: clusterMinLevel,
      gridSize: clusterGridSize,
      calculator: CLUSTER_CALCULATOR,
      styles: CLUSTER_STYLES,
    });
    clustererRef.current = clusterer;
    // 설정 변경으로 재생성된 경우 이미 만들어둔 마커를 다시 붙인다.
    // 선택되어 클러스터에서 빼둔 마커는 제외한다 — 다시 넣으면 선택 표시가 사라진다.
    const existing = [...markerMapRef.current.entries()]
      .filter(([id]) => id !== detachedIdRef.current)
      .map(([, marker]) => marker);
    if (existing.length) clusterer.addMarkers(existing);

    return () => {
      clusterer.clear();
      clusterer.setMap(null);
      clustererRef.current = null;
    };
  }, [ready, cluster, clusterMinLevel, clusterGridSize]);

  // ── 마커 증분 동기화 ───────────────────────────────────────────────────────
  // 팬/줌마다 전량 재생성하면 겹치는 마커까지 버리고 다시 만든다(수백 개 단위).
  // id 기준으로 사라진 것만 제거하고 새로 들어온 것만 생성한다.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const maps = window.kakao.maps;
    const store = markerMapRef.current;

    const nextIds = new Set(markers.map((m) => m.id));
    const removed: kakao.maps.Marker[] = [];
    store.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        removed.push(marker);
        store.delete(id);
      }
    });

    const added = markers
      .filter((item) => !store.has(item.id))
      .map((item) => {
        const marker = new maps.Marker({
          position: new maps.LatLng(item.lat, item.lng),
          title: item.title,
        });
        maps.event.addListener(marker, 'click', () => onMarkerClickRef.current?.(item));
        store.set(item.id, marker);
        return marker;
      });

    const clusterer = clustererRef.current;
    if (clusterer) {
      if (removed.length) clusterer.removeMarkers(removed);
      if (added.length) clusterer.addMarkers(added);
    } else {
      added.forEach((marker) => marker.setMap(map));
    }
    // 클러스터러에서 뺀 뒤에도 지도에 남을 수 있어 명시적으로 떼어낸다.
    removed.forEach((marker) => marker.setMap(null));
  }, [markers, ready]);

  // ── 외부 요청에 의한 지도 이동 ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    const maps = window.kakao.maps;
    if (focus.level !== undefined) map.setLevel(focus.level);
    map.panTo(new maps.LatLng(focus.lat, focus.lng));
  }, [ready, focus]);

  // ── 선택 마커는 클러스터에서 빼낸다 ─────────────────────────────────────────
  // 목록에서 정류장을 고르면 해당 마커가 클러스터에 묶여 있어 위치를 확인할 수 없다.
  // 선택된 하나만 클러스터러에서 제거해 지도에 직접 붙이고, 선택이 풀리면 되돌린다.
  //
  // `markers` 를 의존성에 두는 이유: 영역 재조회로 마커가 새로 생기면 그 마커는 다시
  // 클러스터러에 들어간다. 이 이펙트가 뒤이어 실행되어 선택 마커를 다시 빼낸다.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const clusterer = clustererRef.current;
    const store = markerMapRef.current;

    // 이전에 빼둔 마커를 클러스터로 되돌린다(이미 화면에서 사라졌으면 아무 일도 하지 않는다).
    const previousId = detachedIdRef.current;
    if (previousId && previousId !== selectedId) {
      const previous = store.get(previousId);
      if (previous) {
        previous.setZIndex(0);
        if (clusterer) {
          previous.setMap(null);
          clusterer.addMarkers([previous]);
        }
      }
      detachedIdRef.current = null;
    }

    if (!selectedId) return;
    const marker = store.get(selectedId);
    if (!marker) return;

    // removeMarkers 가 마커를 지도에서 내리므로 반드시 그 다음에 setMap 으로 다시 올린다.
    clusterer?.removeMarkers([marker]);
    marker.setMap(map);
    marker.setZIndex(SELECTED_MARKER_Z_INDEX);
    detachedIdRef.current = selectedId;
  }, [ready, selectedId, markers]);

  // ── 선택 마커 인포윈도우 ───────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    if (!selectedId) {
      infoWindowRef.current?.close();
      return;
    }
    // 선택된 정류소가 아직 현재 bbox 조회 결과에 없을 수 있다(이동 직후).
    // 다음 조회로 마커가 생기면 이 이펙트가 markers 변화로 다시 실행된다.
    const target = markers.find((m) => m.id === selectedId);
    const marker = markerMapRef.current.get(selectedId);
    if (!target || !marker) return;

    const maps = window.kakao.maps;
    if (!infoWindowRef.current) {
      infoWindowRef.current = new maps.InfoWindow({ removable: true });
    }
    infoWindowRef.current.setContent(
      `<div style="padding:6px 10px;font-size:12px;font-weight:600;white-space:nowrap;">${escapeHtml(
        target.title ?? '',
      )}</div>`,
    );
    infoWindowRef.current.open(map, marker);
  }, [ready, selectedId, markers]);

  return (
    <div className={`relative overflow-hidden rounded-lg border border-brand-gray-200 bg-brand-gray-100 ${className}`}>
      <div ref={containerRef} className="h-full w-full" />

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-gray-50 px-6 text-center">
          <p role="alert" className="whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
            {loadError}
          </p>
        </div>
      )}

      {!ready && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-brand-gray-50">
          <p className="text-sm text-brand-gray-400">지도를 불러오는 중…</p>
        </div>
      )}

      {children}
    </div>
  );
}
