/**
 * 카카오맵 JavaScript SDK 전역 타입 (공식 @types 패키지가 없어 직접 선언).
 *
 * 실제 SDK 표면 전체가 아니라 **이 프로젝트에서 사용하는 API 만** 선언한다.
 * 새 기능을 쓸 때 여기에 시그니처를 추가할 것 — 공식 문서:
 * https://apis.map.kakao.com/web/documentation/
 *
 * 로드는 `lib/kakao/sdk.ts` 의 `loadKakaoMaps()` 만 사용한다 (`autoload=false` + `kakao.maps.load`).
 */
declare namespace kakao.maps {
  /** `autoload=false` 로 로드한 SDK 의 실제 초기화. 콜백 이후에야 아래 생성자들이 존재한다. */
  function load(callback: () => void): void;

  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng);
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    extend(latlng: LatLng): void;
    isEmpty(): boolean;
  }

  class Size {
    constructor(width: number, height: number);
  }

  class Point {
    constructor(x: number, y: number);
  }

  interface MapOptions {
    center: LatLng;
    /** 숫자가 작을수록 확대. 기본 3 */
    level?: number;
    draggable?: boolean;
    scrollwheel?: boolean;
  }

  class Map {
    constructor(container: HTMLElement, options: MapOptions);
    getBounds(): LatLngBounds;
    getCenter(): LatLng;
    getLevel(): number;
    setCenter(latlng: LatLng): void;
    setLevel(level: number, options?: { animate?: boolean }): void;
    setBounds(bounds: LatLngBounds): void;
    panTo(latlng: LatLng): void;
    /** 컨테이너 크기가 바뀐 뒤 반드시 호출해야 지도가 잘리지 않는다. */
    relayout(): void;
    addControl(control: object, position: number): void;
  }

  interface MarkerOptions {
    position: LatLng;
    map?: Map;
    title?: string;
    zIndex?: number;
    clickable?: boolean;
    image?: MarkerImage;
  }

  class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
    setZIndex(zIndex: number): void;
    setImage(image: MarkerImage | null): void;
  }

  class MarkerImage {
    constructor(src: string, size: Size, options?: { offset?: Point; alt?: string });
  }

  interface InfoWindowOptions {
    content?: string | HTMLElement;
    position?: LatLng;
    removable?: boolean;
    zIndex?: number;
  }

  class InfoWindow {
    constructor(options?: InfoWindowOptions);
    open(map: Map, marker?: Marker): void;
    close(): void;
    setContent(content: string | HTMLElement): void;
    setPosition(position: LatLng): void;
  }

  interface MarkerClustererOptions {
    map?: Map;
    markers?: Marker[];
    /**
     * 지도 레벨이 이 값보다 **작아지면(확대되면) 클러스터링이 해제**된다. 기본 10.
     * 값이 클수록 클러스터가 잘 안 생긴다 — 밀집 데이터에서는 작게 잡아야 한다.
     */
    minLevel?: number;
    /** 클러스터를 이룰 최소 마커 수. 기본 2. */
    minClusterSize?: number;
    /** 묶음 판정 격자 크기(px). 기본 60. */
    gridSize?: number;
    averageCenter?: boolean;
    disableClickZoom?: boolean;
    /** 크기 구간 경계. 기본 [10, 100, 1000] → styles 는 구간 수 + 1 개가 필요하다. */
    calculator?: number[];
    /** 구간별 표시 문구. 생략하면 마커 개수가 그대로 표시된다. */
    texts?: string[] | ((count: number) => string);
    /** 구간별 CSS 속성 객체 배열. */
    styles?: Record<string, string>[];
  }

  /** `libraries=clusterer` 로 로드해야 존재한다. */
  class MarkerClusterer {
    constructor(options: MarkerClustererOptions);
    addMarkers(markers: Marker[], nodraw?: boolean): void;
    removeMarkers(markers: Marker[], nodraw?: boolean): void;
    clear(): void;
    setMap(map: Map | null): void;
  }

  class Cluster {
    getCenter(): LatLng;
    getSize(): number;
    getMarkers(): Marker[];
  }

  class ZoomControl {}

  const ControlPosition: {
    TOP: number;
    TOPLEFT: number;
    TOPRIGHT: number;
    LEFT: number;
    RIGHT: number;
    BOTTOMLEFT: number;
    BOTTOM: number;
    BOTTOMRIGHT: number;
  };

  namespace event {
    function addListener(
      target: object,
      type: string,
      handler: (...args: never[]) => void,
    ): void;
    function removeListener(
      target: object,
      type: string,
      handler: (...args: never[]) => void,
    ): void;
  }
}

interface Window {
  kakao: { maps: typeof kakao.maps };
}
