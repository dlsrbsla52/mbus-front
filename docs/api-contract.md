# 백엔드 API 추가 명세 (Frontend → Backend)

mbus v1 프론트엔드 구현에 필요하지만 **현재 백엔드(iam:8181, stop:8182, reservation:8183)에 노출되지 않은** 엔드포인트를 정의한다. 각 항목은 백엔드 팀과 합의 후 구현되며, 합의 사항이 바뀌면 본 문서를 먼저 업데이트한다.

## 공통 규약

- **베이스 URL**: 게이트웨이 `http://localhost:8080` 경유 (`NEXT_PUBLIC_API_BASE_URL`).
- **응답 봉투** (전 엔드포인트 동일):
  ```json
  { "code": "00000", "message": "성공", "data": <T> }
  ```
  `code === "00000"` 성공. 실패는 `lib/api/result-codes.ts` 의 `RESULT_CODES` 카탈로그를 따른다. 신규 코드가 필요하면 본 문서에 추가하고 카탈로그도 업데이트.
- **페이지 응답** `PageResult<T>`:
  ```json
  { "content": [...], "page": 0, "size": 20, "totalElements": 137, "totalPages": 7 }
  ```
  `page` 는 0-base.
- **인증**: `Authorization: Bearer <accessToken>` 헤더. 401 시 프론트가 `POST /api/v1/auth/token/refresh` 로 갱신.
- **관리자 권한**: `Member.permissions` 에 `MANAGE` 가 포함된 회원만 호출 가능. 본 문서에서 `(관리자)` 표기.
- **ADMIN_MASTER 권한**: `Member.memberType === 'ADMIN_MASTER'` 만 가능. `(MASTER)` 표기.
- **날짜·시각**: ISO 8601 (`2026-06-01`, `2026-06-01T09:00:00Z`).

---

## 🚨 즉시 정정 필요 — 이미 노출된 엔드포인트 결함

### ✅ (해결됨) 내 정보 조회 — `GET /api/v1/member/me`
- 백엔드 iam `MemberController` 에 `GET /api/v1/member/me` 추가 완료(`@Authorize`, body 없음).
  게이트웨이가 JWT 검증 후 주입한 `X-User-Id` 헤더로 본인 `MemberResponse` 를 반환한다.
  프론트 `MemberService.getMe()` 가 이 경로를 사용한다.
- **배경(과거 결함)**: 프론트는 한때 `POST /api/v1/member/internal/jwt` 를 호출했으나,
  게이트웨이가 `/api/v1/member/internal/**` 를 `SetStatus=403` 으로 차단(외부 호출 금지)해 **403** 발생.
  그 이전엔 `GET /api/v1/member/find/me`(실제로는 "아이디 찾기" — `findMe(FindMeRequest)`)를
  오용해 `Required request body is missing` 500 + 무한 logout 루프가 있었다.
- `GET /api/v1/member/find/me` 는 여전히 비로그인 **ID 복구**용이며 "내 정보 조회" 가 아니다.

### 회원 본인의 권한·역할 조회 API 부재
- 현재 권한 조회는 `GET /api/v1/admin/authorization/members/{id}/role` 뿐인데 `/admin/*` 권한 필요 → 일반 회원이 본인 권한을 알 수 없음.
- 프론트는 잠정적으로 `memberType` 으로 권한을 파생(`lib/api/member.ts`)하지만 정확하지 않다.
- **요청**: `GET /api/v1/member/me/role` 또는 `GET /api/v1/member/me/permissions` — 본인 JWT 기준 `MemberRoleResponse` 반환.

### `MemberResponse` 정합 가이드
- 프론트 `Member` 타입 (`lib/api/member.ts`) 은 이제 백엔드 `MemberResponse` 와 동일한 필드만 가정.
- `memberType` enum: `MEMBER | BUSINESS | ADMIN_USER | ADMIN_MASTER | ADMIN_DEVELOPER`
- `status` enum: `ACTIVE | SUSPENDED | WITHDRAWN`
- `emailVerified` 는 응답에 없으므로 프론트가 `true` 로 가정(추후 추가 시 사용). 회원가입 직후 이메일 미인증 라우팅을 살리려면 응답에 `emailVerified` 필드 추가 권장.

---

## 1. iam (8181) 신규/추가

### 1.1 비밀번호 재설정 흐름

#### `POST /api/v1/auth/password-reset/request`
이메일로 재설정 토큰 메일 발송.
```json
// Request
{ "email": "user@example.com" }
// Response.data
null
```
신규 코드: `AUTH_EMAIL_NOT_REGISTERED = "00310"` (선택적, 보안상 항상 성공 응답이어도 됨).

#### `POST /api/v1/auth/password-reset/verify`
토큰 유효성 확인 (UI에서 폼 진입 전 빠른 검증).
```json
// Request
{ "token": "..." }
// Response.data
null
```
실패 코드: `AUTH_TOKEN_INVALID = "00303"`, `AUTH_TOKEN_EXPIRED = "00302"`.

#### `POST /api/v1/auth/password-reset/confirm`
새 비밀번호 확정.
```json
// Request
{ "token": "...", "newPassword": "..." }
// Response.data
null
```

### 1.2 비밀번호 변경 (로그인 상태)

#### `POST /api/v1/auth/password/change`
```json
// Request
{ "currentPassword": "...", "newPassword": "..." }
// Response.data
null
```
실패 코드: `AUTH_INVALID_CREDENTIALS = "00301"` (현재 비번 불일치).

### 1.3 이메일 인증 재발송

#### `POST /api/v1/auth/email/resend`
로그인된 사용자가 이메일 인증 메일을 다시 받음.
```json
// Request
(empty)
// Response.data
null
```

### 1.4 회원 비활성화 (본인)

#### `POST /api/v1/member/deactivate`
탈퇴와 구분되는 일시 비활성화. 재로그인 시 `AUTH_ACCOUNT_DEACTIVATED` 응답으로 재활성화 안내.
```json
// Request
(empty)
// Response.data
null
```

### 1.5 회원 관리 (관리자)

#### `GET /api/v1/admin/members?page&size&keyword&memberType&status`
```
keyword: 이름/이메일/loginId 부분일치
memberType: MEMBER | ADMIN | ADMIN_MASTER (생략 시 전체)
status: ACTIVE | DEACTIVATED | WITHDRAWN
```
```json
// Response.data: PageResult<AdminMemberRow>
{
  "content": [
    {
      "id": "uuid",
      "loginId": "user01",
      "name": "홍길동",
      "email": "user01@example.com",
      "memberType": "MEMBER",
      "permissions": ["READ", "WRITE"],
      "emailVerified": true,
      "status": "ACTIVE",
      "createdAt": "2026-04-01T09:00:00Z",
      "lastLoginAt": "2026-05-25T11:23:00Z"
    }
  ],
  "page": 0, "size": 20, "totalElements": 137, "totalPages": 7
}
```

#### `GET /api/v1/admin/members/{id}`
단건 상세. `AdminMemberRow` 와 동일 + 누적 계약/예약 카운트.

#### `POST /api/v1/admin/members/{id}/deactivate`
관리자에 의한 강제 비활성화. `data: null`.

#### `POST /api/v1/admin/members/{id}/reactivate`
재활성화. `data: null`.

---

## 2. stop (8182) 신규/추가

### 2.1 단건 상세

#### `GET /api/v1/stop/{id}`
```json
// Response.data: BusStopDetail
{
  "id": "uuid",
  "arsId": "20-123",
  "name": "역삼역 4번 출구",
  "latitude": 37.5009,
  "longitude": 127.0364,
  "address": "서울 강남구 역삼동 ...",
  "district": "강남구",
  "regionCode": "GANGNAM",
  "currentPrice": 1500000,
  "occupied": false,
  "occupiedUntil": null
}
```

### 2.2 정류장 수정 (관리자)

#### `PUT /api/v1/admin/stop/{id}`
```json
// Request
{ "name": "...", "latitude": 37.5, "longitude": 127.0, "district": "...", "regionCode": "..." }
```

### 2.3 정류장 삭제 (관리자)

#### `DELETE /api/v1/admin/stop/{id}`
활성 계약이 있으면 거절. `STOP_DELETE_LOCKED = "40002"`.

### 2.4 지도용 반경 검색

#### `GET /api/v1/stop/nearby?lat&lng&radiusM&available`
```
radiusM: 미터 (기본 1000)
available: true 면 현재 점유되지 않은 정류장만
```
```json
// Response.data: BusStopDetail[]  (페이지 아님, 최대 200건)
[ { "id": "...", "name": "...", "latitude": 37.5, "longitude": 127.0, "occupied": false, "currentPrice": 1500000 }, ... ]
```

### 2.5 키워드 검색 (주소·이름)

#### `GET /api/v1/stop/search?keyword&page&size`
```json
// Response.data: PageResult<BusStopDetail>
```

### 2.6 점유 구간 조회

#### `GET /api/v1/stop/{id}/availability?from&to`
프론트에서 캘린더에 회색 마스킹 표시용.
```json
// Response.data: OccupiedRange[]
[
  { "startDate": "2026-06-01", "endDate": "2027-05-31" },
  { "startDate": "2027-08-01", "endDate": "2028-07-31" }
]
```

### 2.7 단가 정책 (`stop-price`)

#### `GET /api/v1/stop-price?page&size&regionCode`
```json
// Response.data: PageResult<StopPriceRow>
{ "content": [
  { "id": "uuid", "regionCode": "GANGNAM", "monthlyPrice": 1500000, "effectiveFrom": "2026-01-01", "effectiveTo": null, "createdAt": "..." }
] }
```

#### `POST /api/v1/admin/stop-price`
```json
// Request
{ "regionCode": "GANGNAM", "monthlyPrice": 1500000, "effectiveFrom": "2026-06-01", "effectiveTo": null }
```

#### `PUT /api/v1/admin/stop-price/{id}`
부분 갱신 (`effectiveTo`, `monthlyPrice` 만 허용).

#### `DELETE /api/v1/admin/stop-price/{id}`
효력 시작 전(미래) 정책만 삭제 가능. 그 외 `STOP_PRICE_LOCKED = "40010"`.

#### `GET /api/v1/stop/{id}/price?date=YYYY-MM-DD`
특정 시점 적용 단가 조회 (예약 화면용).
```json
// Response.data
{ "stopId": "uuid", "date": "2026-06-01", "monthlyPrice": 1500000, "regionCode": "GANGNAM" }
```

---

## 3. reservation (8183) 신규/추가

### 3.1 예약 상세·취소

#### `GET /api/v1/reservation/{id}`
본인 예약 조회.
```json
// Response.data: Reservation
{ "id": "uuid", "contractId": "uuid|null", "stopId": "uuid", "startAt": "2026-06-01T00:00:00Z", "endAt": "2027-05-31T23:59:59Z", "status": "PENDING", "createdAt": "..." }
```

#### `DELETE /api/v1/reservation/{id}`
본인 예약 취소. `PENDING` 만 허용 (`RESERVATION_NOT_CANCELABLE = "20002"`).

### 3.2 계약 (내 영역)

#### `GET /api/v1/contract/me?page&size&status`
```json
// Response.data: PageResult<Contract>
{ "content": [{ "id": "uuid", "stopId": "uuid", "ownerId": "uuid", "stopName": "역삼역 4번 출구",
  "startDate": "2026-06-01", "endDate": "2027-05-31", "status": "ACTIVE",
  "amount": 18000000, "paymentStatus": "PAID", "signedAt": "...", "createdAt": "..." }] }
```
> 기존 `lib/api/contract.ts` 는 이미 이 경로를 호출하므로 백엔드만 노출하면 즉시 동작.

#### `GET /api/v1/contract/{id}`
계약 상세 — 위 행 + 결제 영수증 URL, 서명 이미지 URL.

#### `POST /api/v1/contract/{id}/sign`
전자서명 완료 처리 (canvas 이미지를 base64 로 업로드 후 백엔드가 저장).
```json
// Request
{ "signatureImageBase64": "data:image/png;base64,..." }
// Response.data: Contract
```
실패: `CONTRACT_NOT_SIGNABLE = "30002"` (이미 서명됨).

#### `POST /api/v1/contract/{id}/pay`
PG 콜백 또는 결제 확정. 결제 수단·금액 명세는 PG 합의 후 보강.
```json
// Request (잠정)
{ "method": "CARD", "amount": 18000000, "transactionId": "PG-..." }
// Response.data: Contract
```

#### `POST /api/v1/contract/{id}/renew`
1년 갱신 계약 자동 생성. 단가는 현재 시점 stop-price 로 재산정.
```json
// Request
(empty)
// Response.data: Contract  (신규 계약 row)
```

### 3.3 관리자 조회

#### `GET /api/v1/admin/reservation?page&size&memberId&stopId&from&to&status`
```json
// Response.data: PageResult<ReservationRow>
// ReservationRow = Reservation + { memberName, stopName }
```

#### `GET /api/v1/admin/contract?page&size&salesRepId&stopId&from&to&status`
```json
// Response.data: PageResult<ContractRow>
// ContractRow = Contract + { memberName, stopName, salesRepName }
```

#### `GET /api/v1/admin/contract/stats?groupBy=salesRep|stop|month&from&to`
대시보드/통계 페이지용 집계.
```json
// Response.data
{
  "groupBy": "month",
  "rows": [
    { "key": "2026-04", "label": "2026년 4월", "contractCount": 12, "totalAmount": 180000000 },
    { "key": "2026-05", "label": "2026년 5월", "contractCount": 18, "totalAmount": 260000000 }
  ],
  "summary": { "contractCount": 30, "totalAmount": 440000000 }
}
```

### 3.4 갱신 알림

#### `POST /api/v1/admin/notification/renewal`
대상 자동 추출 (만료 ≤ 30일 + 미발송) 후 카카오 알림톡/이메일/SMS 일괄 발송.
```json
// Request
{ "dryRun": false, "channels": ["KAKAO", "EMAIL", "SMS"] }
// Response.data
{ "targetCount": 24, "sent": [{ "memberId": "uuid", "channel": "KAKAO", "status": "SENT" }, ...] }
```

#### `GET /api/v1/admin/notification?page&size&channel&status&from&to`
```json
// Response.data: PageResult<NotificationRow>
{ "content": [{ "id": "uuid", "contractId": "uuid", "memberName": "홍길동",
  "channel": "KAKAO", "status": "SENT|FAILED|PENDING", "sentAt": "...", "errorMessage": null }] }
```

---

## 4. settlement (8184) — v1 placeholder

별도 합의 후 작성. UI 에서는 "준비 중" 표시.

---

## 5. 신규 응답 코드 (`lib/api/result-codes.ts` 보강 예정)

| 코드 | 상수 | 의미 |
|---|---|---|
| 00310 | AUTH_EMAIL_NOT_REGISTERED | 가입되지 않은 이메일 (선택) |
| 30002 | CONTRACT_NOT_SIGNABLE | 이미 서명된 계약 |
| 30003 | CONTRACT_NOT_PAYABLE | 결제 불가 상태 |
| 30004 | CONTRACT_RENEWAL_DENIED | 갱신 우선권 만료 등 |
| 40002 | STOP_DELETE_LOCKED | 활성 계약이 있어 삭제 불가 |
| 40010 | STOP_PRICE_LOCKED | 적용 중 단가는 수정/삭제 불가 |

---

## 6. 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-05-27 | 초안 작성 | frontend |
