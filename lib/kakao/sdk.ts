/**
 * 카카오맵 SDK 로더.
 *
 * - `autoload=false` 로 받고 `kakao.maps.load()` 로 명시 초기화한다.
 *   기본(autoload=true)은 스크립트 평가 시점에 즉시 초기화를 시도해 SSR/CSR 경계에서 타이밍이 흔들린다.
 * - `libraries=clusterer` — 정류소는 수천 건이라 마커를 그대로 그리면 브라우저가 멈춘다.
 * - 스크립트 태그는 앱 전체에서 **한 번만** 삽입한다. 여러 지도가 동시에 떠도 같은 Promise 를 공유한다.
 */

/** SDK 와 함께 받을 확장 라이브러리. 로더가 싱글턴이라 호출부에서 바꿀 수 없다. */
const LIBRARIES = ['clusterer'] as const;

const SDK_ORIGIN = 'https://dapi.kakao.com/v2/maps/sdk.js';

/** 카카오 개발자 콘솔에서 발급한 JavaScript 키. 미설정이면 지도 기능을 비활성화한다. */
export const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? '';

export const isKakaoMapConfigured = () => KAKAO_MAP_APP_KEY.length > 0;

let loading: Promise<typeof kakao.maps> | null = null;

export function loadKakaoMaps(): Promise<typeof kakao.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('카카오맵은 브라우저에서만 로드할 수 있습니다.'));
  }
  if (!isKakaoMapConfigured()) {
    return Promise.reject(new Error('NEXT_PUBLIC_KAKAO_MAP_APP_KEY 가 설정되지 않았습니다.'));
  }
  if (loading) return loading;

  loading = new Promise<typeof kakao.maps>((resolve, reject) => {
    // HMR 등으로 스크립트가 이미 살아 있는 경우 재삽입하지 않는다.
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => resolve(window.kakao.maps));
      return;
    }

    const script = document.createElement('script');
    script.src =
      `${SDK_ORIGIN}?appkey=${KAKAO_MAP_APP_KEY}&autoload=false` +
      `&libraries=${LIBRARIES.join(',')}`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao.maps));
    script.onerror = () => {
      // 재시도 가능하도록 캐시를 비운다.
      //
      // 카카오는 실패 사유를 JSON 본문으로 주지만 <script> 태그로는 본문을 읽을 수 없고,
      // dapi.kakao.com 이 CORS 를 허용하지 않아 fetch 로 다시 읽어올 수도 없다.
      // 그래서 실제로 발생하는 401 사유 두 가지를 그대로 안내한다.
      //   - AccessDeniedError  "domain mismatched!"        → 사이트 도메인 미등록
      //   - NotAuthorizedError "disabled OPEN_MAP_AND_LOCAL" → 카카오맵 제품 사용 OFF
      loading = null;
      reject(
        new Error(
          '카카오맵 SDK 를 불러오지 못했습니다.\n' +
            '카카오 개발자 콘솔에서 ① 제품 설정 > 카카오맵 사용 ON, ' +
            '② 앱 설정 > 플랫폼 > Web 사이트 도메인에 현재 주소 등록을 확인해주세요.',
        ),
      );
    };
    document.head.appendChild(script);
  });

  return loading;
}
