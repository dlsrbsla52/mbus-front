# 정류장 관리 카카오맵 연동

정류장 관리 화면(`/manager/stop`)을 좌측 지도 / 우측 목록 2단 구성으로 바꾸고, 지도 표시 영역에 들어오는
정류소를 마커로 표시한다. 지도 자체는 도메인 비종속 컴포넌트로 분리해 다른 화면에서도 재사용한다.

- 백엔드 구현 기록: `~/IdeaProjects/reservation/docs/feature/stop/정류소 좌표 지도 연동 구현.md`
- SDK 가이드: https://apis.map.kakao.com/web/guide/ · 문서: https://apis.map.kakao.com/web/documentation/

---

## 1. 추가·변경 파일

### 신규

| 파일 | 역할 |
|------|------|
| `types/kakao-maps.d.ts` | SDK 전역 타입 선언 (공식 `@types` 없음). 사용하는 API 만 선언 |
| `lib/kakao/sdk.ts` | SDK 로더. 스크립트 태그를 앱 전체에서 1회만 삽입 |
| `lib/api/stop-map.ts` | `StopMapService.bounds()` — bbox 마커 조회 |
| `components/common/KakaoMap.tsx` | **도메인 비종속 지도 컴포넌트 (재사용 지점)** |
| `components/manager/stop/StopMapPanel.tsx` | 지도 + 정류소 bbox 조회 결합 |

### 수정

| 파일 | 변경 |
|------|------|
| `app/(manager)/manager/stop/page.tsx` | 2단 레이아웃, 지도↔목록 연동, 에러 처리 `extractApiError` 로 통일 |
| `.env.local.example` | `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` 항목 추가 |

---

## 2. 환경 변수

```
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=<카카오 개발자 콘솔 JavaScript 키>
```

- 키가 비어 있으면 **지도 영역만 안내 문구로 대체**되고 목록·검색 등 나머지 기능은 정상 동작한다.
- JavaScript 키는 클라이언트에 노출되는 것이 정상이다. 접근 제어는 도메인 등록으로 한다.

### 콘솔 설정 (둘 다 필요)

키만 발급해서는 로드되지 않는다. 실제로 관측한 401 응답 두 가지:

| 조건 | 응답 |
|------|------|
| 제품 설정에서 카카오맵 사용 OFF | `NotAuthorizedError: App(...) disabled OPEN_MAP_AND_LOCAL service.` |
| 사이트 도메인 미등록 | `AccessDeniedError: domain mismatched! caller=http://localhost:3000` |

1. `내 애플리케이션 > 제품 설정 > 카카오맵 > 사용 ON`
2. `앱 설정 > 앱 키(플랫폼 키) > JavaScript 키 > JavaScript SDK 도메인`에 사용할 주소 등록
   (local / staging / prod 전부)

> **도메인 등록 자리를 헷갈리기 쉽다.** `제품 설정 > 카카오톡 공유 > 제품 링크 관리 > 웹 도메인` 은
> 카카오톡 공유 링크 이동 허용 도메인이라 SDK 로드와 무관하다. 여기에 등록하면 계속
> `domain mismatched` 가 난다. JavaScript SDK 는 **JavaScript 키에 딸린 SDK 도메인**을 본다.

**로컬 테스트에도 도메인 등록이 필요하다.** 다만 공개 도메인이 필요한 것은 아니고
`http://localhost:3000` 을 그대로 등록하면 된다(포트 포함, 끝 슬래시 없이).
Referer 검증은 카카오 서버에서 이뤄지므로 프론트에서 우회할 방법은 없다.

SDK 는 실패 사유를 JSON 본문으로 주지만 `<script>` 태그로는 본문을 읽을 수 없고 `dapi.kakao.com` 이
CORS 를 허용하지 않아 fetch 로 다시 읽을 수도 없다. 그래서 로더는 위 두 원인을 함께 안내한다.

---

## 3. 컴포넌트 경계

```
KakaoMap            지도 렌더링만. 마커 배열 + 콜백. 정류소를 모른다.
  └ StopMapPanel    bbox 조회 / 상한·에러·429 안내. 정류소 도메인 결합.
      └ page.tsx    지도 ↔ 목록 상호작용, 상세 모달.
```

### `KakaoMap` 사용 예

```tsx
<KakaoMap
  className="h-[480px]"          // 높이는 반드시 부모가 준다
  markers={[{ id, lat, lng, title }]}
  focus={{ lat, lng, level: 3 }} // 값이 바뀔 때마다 이동
  selectedId={selectedId}        // 해당 마커에 인포윈도우
  onBoundsChange={(b) => ...}    // idle 디바운스 후 bbox 통지 (최초 1회 포함)
  onMarkerClick={(m) => ...}
  cluster
/>
```

`initialCenter` / `initialLevel` 은 최초 1회만 적용된다. 사용자가 움직인 지도를 리렌더마다 되돌리지 않기
위함이며, 이동이 필요하면 `focus` 를 쓴다.

---

## 4. 백엔드 계약

`GET /api/v1/stop/map/bounds` — `swLat` / `swLng` / `neLat` / `neLng` (문자열),
`limit`(기본 1,000 · 최대 2,000), `stopsType`(선택).

응답 `{ items: [{ id, stopId, stopName, lat, lng, stopsType }], truncated, limit }`.

- 좌표는 **`toFixed(7)` 문자열**로 보낸다. 백엔드가 `String` 으로 받아 `Coordinate` 검증을 거쳐 도메인
  400 을 내리기 때문이고, DB scale 이 7 이라 그 이상 자리수는 의미가 없다.
- `id` 는 정류소 PK(UUID), `stopId` 는 ARS ID 다. 프론트에서는 `arsId` 로 정규화한다.
- **지도 응답에는 단가가 없다.** 마커 클릭 상세는 `StopService.detail(pk)` 로 별도 조회한다.
- 날짜변경선 교차(`swLng > neLng`)는 백엔드가 400 으로 거부한다.

---

## 5. 고빈도 호출 대비

`idle` 은 팬/줌마다 발생하므로 그대로 호출하면 요청이 폭증한다. 3중으로 막는다.

1. **디바운스 300ms** — `KakaoMap` 이 `idle` 을 모아 한 번만 `onBoundsChange` 를 부른다.
2. **`AbortController`** — `StopMapPanel` 이 새 요청 전에 이전 요청을 취소한다. 취소 오류는 무시한다
   (`ERR_CANCELED` / `AbortError`).
3. **429 쿨다운 30초** — 쿼터 초과 시 재조회를 멈추고 안내한다. 지도를 계속 움직여도 요청하지 않는다.

`truncated: true` 면 "표시 상한을 넘었습니다 — 확대해서 보세요" 배지를 띄운다.

## 6. 클러스터링

`libraries=clusterer` 로 SDK 를 받고 `MarkerClusterer` 를 항상 켠다.

### `minLevel` 을 작게 잡아야 한다

`minLevel` 은 **"지도 레벨이 이 값보다 작아지면(확대되면) 클러스터링이 해제"** 되는 임계값이다.
직관과 반대로 **값이 클수록 클러스터가 안 생긴다.** 카카오 기본값은 10 이라 사실상 대부분의 확대
구간에서 클러스터가 풀린다.

최초 구현에서 `minLevel: 7` + 초기 레벨 6 으로 두어 **클러스터가 한 번도 동작하지 않았고**, 서울 도심
한 화면에 개별 마커 712 개가 그대로 그려졌다. 현재 기본값은 `clusterMinLevel = 3` — 레벨 1~2(약 20~30m,
길 하나 수준)에서만 개별 마커가 보인다.

### 선택된 마커는 클러스터에서 빼낸다

목록에서 정류장을 골라 지도가 이동해도, 그 마커가 클러스터에 묶여 있으면 **어디인지 확인할 수 없다.**
클러스터 간격을 넓힐수록 이 문제는 더 심해진다(간격을 좁히면 마커가 겹쳐 뭉개지므로 어느 쪽으로도 해결되지 않는다).

`KakaoMap` 은 `selectedId` 마커 **하나만** `clusterer.removeMarkers()` 로 빼내 `setMap(map)` 으로
지도에 직접 붙이고, z-index 를 올려 주변에 가리지 않게 한다. 선택이 풀리면 클러스터로 되돌린다.

주의:
- `removeMarkers()` 가 마커를 지도에서 내리므로 **반드시 그 뒤에** `setMap(map)` 을 호출해야 한다.
- 이 이펙트는 `markers` 에도 의존해야 한다. 영역 재조회로 선택 마커가 새로 만들어지면 클러스터러에
  다시 들어가므로, 마커 동기화 직후 다시 빼내야 한다(이펙트 선언 순서가 곧 실행 순서다).
- 클러스터러를 재생성할 때(`clusterGridSize` 등 변경) 기존 마커를 다시 붙이는데, 이때 빼둔 마커는 제외한다.

### 마커는 증분 동기화한다

`markers` 가 바뀔 때마다 전량 파괴 후 재생성하면, 조금만 팬해도 겹치는 수백 개까지 버리고 다시 만든다.
`KakaoMap` 은 id 기준으로 **사라진 것만 `removeMarkers`, 새로 들어온 것만 `addMarkers`** 한다.

### 너무 넓으면 조회하지 않는다

`StopMapPanel.MAX_FETCH_LEVEL = 10`. 이보다 축소하면 요청을 보내지 않고 "확대하면 정류장이 표시됩니다"
를 띄운다. 서울 전역이 2만 건이 넘어 어차피 상한에 잘리는데, 잘린 일부만 그리면 정류장이 없는 지역처럼
보여 지도가 거짓말을 하고 쿼터만 소모하기 때문이다.

## 7. 주의 사항

- **SDK 는 `autoload=false` + `kakao.maps.load()`** 로 초기화한다. 기본값은 스크립트 평가 시점에 즉시
  초기화를 시도해 SSR/CSR 경계에서 타이밍이 흔들린다.
- **지도 파괴 API 가 없다.** 언마운트 시 컨테이너 `innerHTML` 을 비워야 StrictMode 이중 마운트와 HMR 에서
  지도가 겹쳐 쌓이지 않는다.
- 콜백은 latest-ref 로 참조한다. 함수 정체성이 바뀔 때마다 `kakao.maps.event.addListener` 를 다시 붙이면
  리스너가 누적된다.
- 컨테이너 크기를 나중에 바꾸면 `map.relayout()` 이 필요하다 (현재 레이아웃은 CSS 고정이라 미사용).

## 8. 목록 ↔ 지도 연동과 유형 필터

### 유형 필터 — 백엔드 확장이 선행되었다

프론트만으로는 불가능했다. 지도 마커 DTO에 `stopsType`이 없어 클라이언트 필터가 불가능했고,
목록 API에도 유형 파라미터가 없어 거르면 **현재 페이지 20건 안에서만** 걸렸다(전체 22,485건 중).

`~/IdeaProjects/reservation`에 아래를 추가했다.

| 모듈 | 변경 |
|------|------|
| stop | `StopMarkerResponse.stopsType` 필드 추가 |
| stop | `bounds` / `/api/v1/stop` / `/api/v1/internal/stop/page` 에 `stopsType` 파라미터 |
| stop | `StopRepository` 를 `listPredicate` 기반 `countList` / `findListPaged` 로 통합 |
| stop | `StopType.parseFilter` — 문자열 → enum 변환·검증 단일 지점 |
| iam | `StopApi` → `StopServiceClient` → `AdminStopPriceFacade` → `AdminStopPriceController` 통과 |

주의할 점:

- **`stopsType`은 컨트롤러에서 `String`으로 받는다.** enum으로 직접 바인딩하면 실패 시
  `ExceptionAdvisor`를 타지 않아 프레임워크 기본 메시지가 나간다(좌표를 `String`으로 받는 것과 같은 이유).
  또한 iam은 모듈 경계 원칙상 stop의 `StopType`을 참조할 수 없어 S2S로도 문자열이 넘어온다.
- **목록 쿼리와 카운트 쿼리는 같은 술어를 써야 한다.** 조건이 늘면 둘이 어긋나 총 건수가 실제와
  달라지기 쉬워 `listPredicate` 한 곳으로 모았다.
- **식별자(pk/stopId/stopName) 조회에는 유형 필터를 적용하지 않는다.** 적용하면 pk 조회가 빈 결과가 될 수 있다.
- 유형은 bbox 범위 스캔 **뒤에** 걸리는 필터다. `idx_stop_coord`가 범위를 좁힌 결과(최대 limit+1건)에
  대한 조건이라 별도 인덱스가 필요 없다.

### 지도 영역만 보기 (토글)

`mapLinked` 가 켜지면 목록은 서버 조회를 멈추고 **지도 bbox 조회 결과를 그대로** 그린다
(`StopMapPanel.onStopsChange` → 페이지 state). 두 소스의 행을 `StopRow` 하나로 맞춰 테이블 정의를 나누지 않았다.

- **유형**은 지도·목록 모두 서버에서 걸러지므로 마커와 목록이 항상 일치한다.
- **검색어**는 지도 조회 파라미터가 아니라서 영역 내에서 클라이언트로 거른다(전체 집합이 손에 있어 오해가 없다).
- 페이지네이션은 영역 내 최대 1,000건에 대한 클라이언트 페이징이다.
- 상세 모달: 목록 모드는 행이 전체 `Stop`을 갖고 있어 재조회가 없고, 지도 모드는 경량 DTO라 `pk`로 재조회한다
  (`StopRow.full` 유무로 분기).

## 9. 남은 작업

- [ ] **stop(8182) / iam(8181) 재기동** — 유형 필터는 백엔드 변경이 배포되어야 동작한다
- [ ] 카카오 개발자 콘솔에 staging / prod 도메인 등록 (JavaScript 키의 SDK 도메인)
- [ ] 배포 파이프라인에 `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` 주입
- [ ] 쿼터 모니터링 (월 300만 건)
- [ ] 단가 관리 화면(`/manager/stop-price`)에도 `StopMapPanel` 적용 검토
- [ ] `StopRepository.listPredicate` 의 keyword 는 `%`/`_` 를 이스케이프하지 않는다.
      `ContractRepository` 는 `LikePattern.ofLiteral` 로 처리 중이라 같은 방식으로 맞출 여지가 있다
      (기존 동작이라 이번 변경 범위에서는 유지)
