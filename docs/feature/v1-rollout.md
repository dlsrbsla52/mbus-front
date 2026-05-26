# 미디어버스(mbus) v1 — 온라인 예약·계약 플랫폼 롤아웃 플랜

> 광고주 셀프 예약/계약 + 영업·관리자 콘솔을 단일 Next.js 앱으로 출시하기 위한 작업 계획.
> 백엔드(iam/stop/reservation 3개 모듈) 가동 상태에서 작성됨 (2026-05-26 기준).

## Context

cafe24 기반 영업·관리 환경을 자체 스택(Next.js 16 + Kotlin/Spring MSA + PostgreSQL/Valkey)으로 이전하면서, **광고주가 직접 정류장을 골라 예약·계약**할 수 있는 셀프 채널과 **영업·관리자 콘솔**을 동시에 구축한다. 백엔드는 `iam(8181) / stop(8182) / reservation(8183)` 모듈이 떠 있지만 v1 요구사항을 충족하기에는 엔드포인트가 크게 부족하다. 프론트엔드는 **어드민을 별도 앱이 아닌 `(manager)` 라우트 그룹**으로 통합 운영해 인증/세션/배포를 단일화하고, 향후 `admin.*` 호스트 분리가 필요해질 때 middleware 한 줄로 전환할 수 있게 설계한다.

기존 자산(메모리 토큰 + silent refresh 인증, `lib/api/{auth,member,contract,reservation,stop}.ts`, `ProtectedShell + useRequireAuth + requirePermission`, brand-black/brand-blue + Noto Sans KR + Tailwind v4 토큰, `Section` 등 공통 컴포넌트)은 그대로 유지하면서 **영역만 확장**한다.

## 결정 사항

1. **Admin 라우팅**: `(manager)/manager/*` 라우트 그룹 단일. 추후 호스트 분리는 `middleware.ts` 의 환경변수 토글로 추가.
2. **MVP 범위**: 광고주 전 흐름 + 관리자 풀스택 + 알림/통계(정산은 placeholder).
3. **백엔드 우선**: 부족한 API 를 `docs/api-contract.md` 에 먼저 명세하고 합의된 스펙으로 백엔드가 구현 → 프론트 연결. mock 의존 최소화.

---

## 1. 백엔드 API 갭 — `docs/api-contract.md` 작성

현재 노출 + 추가 필요 항목. **신규 항목은 contract 문서로 작성하여 백엔드 팀 합의 선행.**

### 1.1 iam (8181) — 추가 필요
- `POST /api/v1/auth/password-reset/request` `{ email }`
- `POST /api/v1/auth/password-reset/verify` `{ token }`
- `POST /api/v1/auth/password-reset/confirm` `{ token, newPassword }`
- `POST /api/v1/auth/password/change` `{ currentPassword, newPassword }`
- `POST /api/v1/auth/email/resend`
- `POST /api/v1/member/deactivate`
- `GET  /api/v1/admin/members?page&size&keyword&memberType` — 회원 목록
- `GET  /api/v1/admin/members/{id}` — 상세
- `POST /api/v1/admin/members/{id}/deactivate|reactivate`

> 이미 있음: 로그인/로그아웃/회원가입/refresh/verify-email, member find/me·modify·withdraw, **admin authorization 전체 (role/permission CRUD)**.

### 1.2 stop (8182) — 추가 필요
- `GET    /api/v1/stop/{id}` — 단건 상세
- `PUT    /api/v1/admin/stop/{id}` / `DELETE /api/v1/admin/stop/{id}`
- `GET    /api/v1/stop/nearby?lat&lng&radiusM` — 지도용 반경 검색
- `GET    /api/v1/stop/search?keyword` — 주소·이름 키워드 검색
- `GET    /api/v1/stop/{id}/availability?from&to` — 점유 구간 마스킹
- `GET    /api/v1/stop-price?page&size&region`
- `POST   /api/v1/admin/stop-price` / `PUT|DELETE /api/v1/admin/stop-price/{id}`
- `GET    /api/v1/stop/{id}/price?date` — 특정 시점 적용 단가

> 이미 있음: `GET /stop`(페이지), `POST /stop/simple`, `POST /stop/register/bulk`.

### 1.3 reservation (8183) — 추가 필요
- `GET    /api/v1/reservation/{id}` / `DELETE /api/v1/reservation/{id}`
- `GET    /api/v1/contract/me?page&size`
- `GET    /api/v1/contract/{id}`
- `POST   /api/v1/contract/{id}/sign` — 전자서명 완료
- `POST   /api/v1/contract/{id}/pay` — 결제(또는 PG 콜백)
- `POST   /api/v1/contract/{id}/renew`
- `GET    /api/v1/admin/reservation?page&size&memberId&stopId&from&to`
- `GET    /api/v1/admin/contract?page&size&salesRepId&stopId&from&to`
- `GET    /api/v1/admin/contract/stats?groupBy=salesRep|stop|month`
- `POST   /api/v1/admin/notification/renewal` — 대상 자동 추출 후 일괄 발송
- `GET    /api/v1/admin/notification?page&size&channel&status`

> 이미 있음: `POST /reservation`, `GET /reservation/me`, `POST /contract`.

### 1.4 settlement (8184, 신규 모듈) — v1 placeholder
UI 는 "준비 중" 상태로 두고 별도 합의 후 v2 에서 본격 구현.

---

## 2. 프론트엔드 라우팅 구조

```
app/
├── layout.tsx                    (기존 유지: AuthGate + Header + Footer)
├── middleware.ts                 (신규 — host 기반 admin 분리 토글)
│
├── (auth)/
│   ├── login/page.tsx
│   ├── join/page.tsx
│   └── password-reset/{request,confirm}/page.tsx        (신규)
│
├── (protected)/                                          (광고주)
│   ├── layout.tsx                (ProtectedShell)
│   ├── reservation/
│   │   ├── new/page.tsx          (지도→정류장→기간→단가→예약)  (신규)
│   │   └── page.tsx              (내 예약 목록 — 기존)
│   ├── contract/
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx         (상세/결제/서명)           (신규)
│   │   └── [id]/renew/page.tsx                              (신규)
│   └── mypage/
│       ├── page.tsx
│       ├── password/page.tsx                                (신규)
│       └── deactivate/page.tsx                              (신규)
│
├── (manager)/                                            (관리자 — 신규)
│   ├── layout.tsx                (ManagerShell — sidebar+topbar, requirePermission=MANAGE)
│   └── manager/
│       ├── page.tsx              (대시보드)
│       ├── stop/{page,new,[id]}/page.tsx
│       ├── stop-price/page.tsx
│       ├── reservation/page.tsx
│       ├── contract/page.tsx
│       ├── member/page.tsx
│       ├── notification/page.tsx
│       ├── role/page.tsx         (requireMemberType=ADMIN_MASTER)
│       └── stats/page.tsx
│
├── verify-email/page.tsx
└── 403/page.tsx
```

기존 `app/(protected)/admin/` 디렉터리는 **제거** (역할은 `(manager)/manager/`가 대체).

## 3. middleware — host 토글 (v2 대비)

`middleware.ts` 에서 `NEXT_PUBLIC_ADMIN_HOST` 환경변수가 설정되고 요청 host 와 일치하면 `/manager/*` 로 rewrite. v1 은 변수 비워두면 동작 안 함 → `/manager/*` 경로 그대로 사용.

```ts
export function middleware(req) {
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST;
  if (adminHost && req.headers.get('host') === adminHost) {
    const url = req.nextUrl.clone();
    if (!url.pathname.startsWith('/manager')) {
      url.pathname = `/manager${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }
}
export const config = { matcher: '/((?!_next|api|favicon).*)' };
```

## 4. 권한 가드 확장

- `(manager)/layout.tsx` → `<ProtectedShell requirePermission="MANAGE">` (기존 prop 활용).
- `hooks/useRequireAuth.ts` 에 `requireMemberType?: MemberType[]` 옵션 추가, `ProtectedShell` 에 전달. `role/` 페이지는 `['ADMIN_MASTER']` 로 한정.
- `useAuthStore.hasPermission` 은 그대로. `hasMemberType(types)` 헬퍼 추가.

## 5. API 모듈 (`lib/api/`)

기존 9개 파일 유지 + 신규/확장. 모두 `unwrap` 헬퍼 + `lib/api/swr.ts` 패턴 따름.

- 확장: `member.ts`(admin 회원조회 추가), `stop.ts`(상세/검색/nearby/availability), `contract.ts`(getMy/getOne/sign/pay/renew), `reservation.ts`(getOne/cancel).
- 신규:
  - `lib/api/stop-price.ts`
  - `lib/api/admin/contract.ts`, `lib/api/admin/reservation.ts`, `lib/api/admin/notification.ts`, `lib/api/admin/authorization.ts` (iam 의 admin/authorization 즉시 연결 가능)
- `npm run gen:api` 로 `lib/api/generated/{iam,stop,reservation}.ts` 정기 생성 (백엔드 안정화 후).

## 6. 카카오맵 / 주소검색

- 패키지: `react-kakao-maps-sdk` + `react-daum-postcode`.
- 환경변수: `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` (JS 키).
- 로더: `next/script` 로 SDK 동적 로드, `autoload=false` + `libraries=services`.
- 사용처: `app/(protected)/reservation/new/page.tsx` 와 `app/(manager)/manager/stop/{new,[id]}` 의 좌표 픽커.

## 7. 디자인 시스템 (기존 유지 + 보조 토큰만 추가)

`app/globals.css` `@theme inline` 에 데이터 UI 보조 토큰만 추가:
```css
--color-brand-gray-{50,100,300,500,700};
--color-success: #16a34a; --color-warning: #f59e0b; --color-danger: #dc2626;
```

신규 공통 컴포넌트:
- `components/manager/{ManagerShell,Sidebar,PageHeader}.tsx`
- `components/common/{DataTable,Pagination,Modal,StatCard,FormField,EmptyState}.tsx`
- 기존 `components/common/Section.tsx` 그대로 활용.

`constants/navigation.ts` 분리:
- `NAV_ITEMS` (마케팅용 — 그대로)
- `MANAGER_NAV` (어드민 사이드바 — 신규)

## 8. 실행 순서 (병렬 트랙)

세 트랙 병렬, 각 트랙 내부는 순차.

**트랙 A — 백엔드 계약 (선행 합의 필수)**
1. `docs/api-contract.md` 작성 (§1 항목 전부, path/method/req/res JSON 예시)
2. 백엔드 팀 리뷰 → iam/stop/reservation/settlement 분담 구현

**트랙 B — 프론트엔드 골격 (백엔드 무관, 즉시 시작)**
1. `(manager)` 라우트 그룹 + `ManagerShell` + `Sidebar`
2. 디자인 보조 토큰 + 공통 컴포넌트(DataTable/Modal/FormField/StatCard/Pagination)
3. `middleware.ts` + `NEXT_PUBLIC_ADMIN_HOST` 토글
4. `useRequireAuth` `requireMemberType` 옵션 확장
5. `constants/navigation.ts` 분리, 기존 `(protected)/admin/` 제거

**트랙 C — 회원 흐름 (지도는 마지막)**
1. password-reset, 비밀번호 변경, 마이페이지 디테일
2. 예약 생성 페이지 정적 UI (검색·캘린더·요약)
3. 카카오맵 통합 (지도/주소검색)
4. 정류장 상세 → 기간/단가 → 예약 → 계약 → 결제 → 서명 → 마이페이지 연결

**트랙 D — 관리자 (트랙 B 완료 후)**
1. 대시보드(StatCard placeholder → 통계 API 연결)
2. 정류장 CRUD + 단가
3. 계약/예약 관리 테이블 (필터·페이지네이션)
4. 회원 관리
5. 갱신 알림 발송/이력
6. 역할·권한 (iam admin/authorization 즉시 연결)
7. 통계 차트

## 9. 검증

- `npm run lint` / `npm run build` 통과 (Next.js 16 strict mode + TS strict).
- 백엔드 가동 상태에서 수동 시나리오:
  - 광고주: 회원가입 → 이메일 인증 → 로그인 → 예약 생성(지도 포함) → 계약·결제·서명 → 마이페이지.
  - 관리자: 일반 MEMBER 로 `/manager` 접근 차단 → MANAGE 권한 부여 → 대시보드/CRUD 동작 → ADMIN_MASTER 만 `role` 페이지 진입.
  - 인증: 새로고침 후 silent refresh 로 세션 복원, 401 큐 동작, refresh 실패 시 `/login?next=` 리다이렉트.
- middleware host 분리: `/etc/hosts` 로 `admin.mbus.local` → 127.0.0.1 매핑 + `NEXT_PUBLIC_ADMIN_HOST=admin.mbus.local` 로 켜고 동작 확인.
- 백엔드 안정화 후 `npm run gen:api` 실행 → 직접 작성 도메인 타입과 충돌 없는지 확인.

## 10. 미정 / 추가 합의 필요

- 결제 PG 연동(이니시스/토스/포트원 등) — `contract/pay` 의 콜백 명세 백엔드와 합의.
- 전자서명 방식 — 자체 캔버스 vs 외부(모두싸인 등). v1 은 최소 자체 캔버스 가정.
- 갱신 우선권 유효기간(N일) / 미응답 자동해제 정책 — 기획에서 미정.
- 정산(settlement 8184) 모듈 스펙.
- 카카오 알림톡 발신 프로필 / 템플릿 코드 — 운영 팀과 별도 협의.