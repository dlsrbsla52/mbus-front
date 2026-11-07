# 단가 관리 — 정류장 목록 + 단가 동시 조회 API 추가

> 백엔드(admin/iam 서비스, `localhost:8181`, Kotlin + Spring Boot) 담당 AI에게 전달하는 작업 지시서.
> 프론트(`mbus`)의 `단가 관리`(`/manager/stop-price`) 화면을 "검색 없이 진입 즉시 정류장 + 현재 단가 목록"으로 바꾸기 위해 필요한 백엔드 변경.

## 1. 배경 / 문제

현재 admin 서비스(8181)의 단가 관련 엔드포인트는 **전부 `stopId` 단건**뿐이다.

```
POST   /api/v1/admin/stop/price
GET    /api/v1/admin/stop/{stopId}/price
PUT    /api/v1/admin/stop/{stopId}/price
DELETE /api/v1/admin/stop/{stopId}/price
```

정류장 목록 `GET /api/v1/admin/stop` 의 응답 `StopResponse` 에는 **`unitPrice` 가 없다.**

그래서 프론트는 "검색 없이 전체 정류장 + 단가"를 한 번에 못 띄우고, 목록을 불러온 뒤 각 정류장마다 `.../{stopId}/price` 를 **N번 호출(N+1)** 해야 한다. 이걸 백엔드 한 번의 join 조회로 없애는 것이 목표.

## 2. 핵심 데이터 모델 (주의: 조인 키)

swagger 실측 기준:

| 스키마 | 필드 | 타입 |
|---|---|---|
| `StopResponse` | `id` | `string(uuid)` ← **정류장 PK** |
| | `stopId` | `string` (ARS ID, 예: `"12345"`) |
| | `stopName`, `xCrd`, `yCrd`, `nodeId`, `stopsType` | string |
| | `createdAt`, `updatedAt` | date-time |
| `StopPriceResponse` | `id` | `string(uuid)` (단가 레코드 PK) |
| | `stopId` | `string(uuid)` ← **정류장 PK(uuid)를 참조** |
| | `unitPrice` | `number` (Kotlin `BigDecimal`) |
| | `registeredById` | `string(uuid)` |
| | `createdAt`, `updatedAt` | date-time |

⚠️ **조인 키는 `StopResponse.id`(uuid) = `StopPrice.stopId`(uuid)** 다. ARS 문자열 `StopResponse.stopId` 가 아니다. 단건 조회 경로 `/{stopId}/price` 의 `{stopId}` 도 uuid PK를 받는다(프론트가 `stop.id` 를 넘김).

단가는 **정류장당 0 또는 1건**(현재 단가). 미등록이면 `null`.

## 3. 권장 방안 — 기존 admin 목록에 `unitPrice` 추가

새 엔드포인트를 만들기보다, **`GET /api/v1/admin/stop` 응답 아이템에 `unitPrice`(nullable) 를 left join 으로 추가**하는 것이 가장 단순하다. 파라미터/페이징/필터를 그대로 재사용하고 프론트도 기존 `StopService.adminList` 를 그대로 쓴다.

### 3-1. 응답 스키마 변경

`StopResponse`(admin 목록 아이템)에 필드 1개 추가:

```
StopResponse {
  id, stopId, stopName, xCrd, yCrd, nodeId, stopsType, createdAt, updatedAt,
+ unitPrice: BigDecimal?   // 단가 미등록 정류장은 null
}
```

- **nullable 필수.** 단가 없는 정류장은 `null` 로 내려간다(0 아님 — 미등록과 0원을 구분).
- 봉투/페이징 형식은 기존 그대로: `ApiResponse<PageResultStopResponse>`
  = `{ code, message, data: { items: StopResponse[], totalCnt, pageRows, pageNum } }`, `code == "00000"` 성공.
- 파라미터 변경 없음: `pk, stopId, stopName, keyword, page, size` (전부 optional 유지).

### 3-2. 쿼리 (N+1 금지)

정류장 페이지를 먼저 뽑고 그 PK 집합으로 단가를 **한 번에** 조회해 메모리에서 매핑하거나, QueryDSL/네이티브 `LEFT JOIN` 한 방으로 처리한다. 정류장별 단가가 여러 건 쌓이는 이력 테이블이라면 "현재 단가 1건"을 고르는 규칙(최신 `updatedAt`/유효 플래그 등 기존 단건 조회와 동일한 규칙)을 그대로 적용할 것.

```sql
-- 개념 예시 (실제는 QueryDSL 등 기존 컨벤션 따를 것)
SELECT s.*, p.unit_price
FROM stop s
LEFT JOIN stop_price p ON p.stop_id = s.id   -- ★ uuid 조인
WHERE (:keyword IS NULL OR s.stop_name LIKE %:keyword% OR s.stop_id LIKE %:keyword%)
ORDER BY ...
LIMIT :size OFFSET :page*:size
```

⚠️ 기존 단건 `GET /{stopId}/price` 가 "미등록 시 404 아니라 `data` 키 생략된 성공 응답"을 주는 특이 동작이 있다(프론트 `lib/api/stop-price.ts` 주석 참고). 목록에서는 그 관례를 따르지 말고 **`unitPrice: null`** 로 명확히 내려줄 것.

### 3-3. 권한 / 안전

- 기존 `GET /api/v1/admin/stop` 과 **동일한 권한**(ADMIN_MASTER / ADMIN_DEVELOPER)으로 강제. 별도 완화 금지.
- `/api/v1/internal/...` 이 아니라 `/api/v1/admin/...` 계열 유지(프론트 직접 호출 대상).
- `unitPrice` 직렬화는 기존 `StopPriceResponse.unitPrice` 와 동일하게(BigDecimal → number/string 어느 쪽이든, 프론트 `Number()` 로 정규화 중이므로 기존 방식 유지).

## 4. 대안 (원치 않으면 무시)

`StopResponse` 를 건드리고 싶지 않다면 **신규 엔드포인트**로 분리:

```
GET /api/v1/admin/stop/prices?keyword=&page=&size=
→ ApiResponse<PageResult<AdminStopPriceRow>>
  AdminStopPriceRow { stopPk: uuid, stopId(ARS): string, stopName, unitPrice: BigDecimal?, updatedAt }
```

장점: 기존 목록 응답 무변경(다른 소비자 영향 0). 단점: 엔드포인트 하나 늘고 프론트에 새 API 메서드 추가 필요. → **3안(기존 목록 확장)을 우선 권장.**

## 5. 이 변경 이후 프론트에서 할 일 (참고용, 백엔드 작업 아님)

- `lib/api/stop.ts` 의 `Stop` 타입 / `toStop` 매퍼에 `unitPrice?: number | null` 추가.
- `app/(manager)/manager/stop-price/page.tsx` 를 진입 즉시 `StopService.adminList({ page, size })` 로 목록 표시하도록 변경, 행별 lazy `StopPriceService.get` 호출 제거.
- 등록/수정/삭제는 기존 단건 엔드포인트(`POST/PUT/DELETE .../price`) 그대로 사용.

## 6. 완료 기준

- [ ] `GET /api/v1/admin/stop` 응답 아이템에 `unitPrice`(nullable) 포함.
- [ ] 단가 미등록 정류장은 `unitPrice: null`.
- [ ] 목록 N건 조회 시 단가 조회가 **쿼리 1~2회**로 끝남(정류장당 1회 아님).
- [ ] 조인 키가 `stop.id`(uuid) = `stop_price.stop_id`(uuid) 인지 확인.
- [ ] 권한이 기존 admin stop 목록과 동일하게 강제됨.
- [ ] swagger(`/api-docs`) 재생성 시 `StopResponse.unitPrice` 노출 → 프론트 `npm run gen:api` 로 타입 동기화 가능.
