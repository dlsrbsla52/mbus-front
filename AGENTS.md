# AGENTS.md

## AI 작업 지침

이 프로젝트는 최신 Next.js/React/Tailwind 조합을 사용한다. 일반적인 과거 Next.js 지식으로 단정하지 말고, 현재 설치된 패키지 버전과 로컬 코드를 기준으로 판단한다.

- Next.js 16.2.2 App Router
- React 19
- Tailwind CSS v4
- TypeScript strict mode

코드를 수정하기 전에는 관련 파일, 타입, 설정을 먼저 확인한다. Next.js API나 동작이 불확실하면 현재 설치된 패키지의 타입, 소스, 로컬 문서를 확인한다.

## 기술 스택

- **Next.js 16.2.2** App Router, React 19, TypeScript strict mode
- **Tailwind CSS v4**: `tailwind.config.js` 없이 `app/globals.css`의 `@theme inline`으로 토큰 정의
- **Zustand v5**: auth 전역 상태. `persist` 사용 안 함. accessToken은 메모리 보관, 부팅 시 silent refresh로 복원
- **axios**: `lib/api/client.ts`에 JWT interceptor와 401 자동 재발급 queue
- **SWR v2**: `lib/api/swr.ts`의 `apiFetcher` / `apiKeyFetcher`
- **react-hook-form v7 + zod v4**: form validation
- **@sentry/nextjs**: DSN이 비어 있으면 no-op
- **openapi-typescript**: `npm run gen:api`로 backend spec에서 타입 생성

## 명령어

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run check    # 경고 0개 lint + lint 규칙 테스트 + 라우트 타입 생성 및 타입 검사
npm run lint     # ESLint만 실행
npm run gen:api  # OpenAPI 타입 재생성 (iam:8181 / stop:8182 / reservation:8183 필요)
```

프로젝트 lint의 허용·차단 사례는 Node 내장 테스트 러너로 실행한다.

```bash
npm run test:lint
```

## 코드 작성 전 참조할 구현

| 작업 | 먼저 확인할 코드 | 적용 기준 |
| --- | --- | --- |
| 토큰 발급·복원 | `store/useAuthStore.ts`, `components/auth/AuthGate.tsx` | 발급된 토큰은 `setTokens`로 저장하고 부팅 시 현재 사이트의 refresh 쿠키로 복원한다. |
| 일반 예약의 정류소 선택 | `lib/api/stop.ts`, `app/(protected)/reservation/new/page.tsx` | `StopService.list()`로 공개 목록을 조회한다. |
| 관리자 정류소 관리 | `lib/api/admin/stop.ts`, `app/(manager)/manager/stop/page.tsx` | `AdminStopService.list()`와 `.detail()`을 사용한다. 지도와 단가도 같은 admin 폴더의 서비스를 사용한다. |
| 정류소 표시와 응답 변환 | `lib/api/stop-model.ts` | 양쪽 화면은 `Stop` 타입과 라벨을 공유하고, 서비스는 `toStop`으로 좌표와 단가를 변환한다. |
| 인증 후 목록 조회 | `app/(protected)/reservation/new/page.tsx`, `components/auth/ProtectedShell.tsx` | SWR 키에 조회 조건을 포함하고 fetcher는 도메인 서비스를 호출한다. 인증 셸에서 계정별 캐시를 제공한다. |
| 요청 날짜 조립 | `lib/api/date-serializer.ts`, `app/(manager)/manager/reservation/page.tsx` | 백엔드 필드가 LocalDate이면 `toApiLocalDate`, OffsetDateTime이면 `toApiOffsetDateTime`을 사용한다. |
| 목록 응답 변환 | `lib/api/admin/contract.ts`의 `listByMember` | 도메인 서비스에서 `toPageResult`로 변환하고 화면에는 변환된 값을 전달한다. |

### ESLint로 검사하는 프로젝트 규칙

`npm run lint`는 Next.js·TypeScript 기본 규칙과 아래 프로젝트 규칙을 함께 실행한다.

- `mbus/ui-api-boundary`는 화면과 훅의 axios·공용 client·SWR fetcher 직접 import, 코드에 직접 쓴 백엔드 경로를 검사한다. 도메인 서비스에서 요청을 정의하고 화면이나 훅은 그 서비스를 호출한다.
- 관리자 route group, `components/manager`, `hooks/manager`에서는 공개 정류소·예약·계약·회원 서비스 사용을 제한한다. 일반 화면과 공용 훅에서는 `lib/api/admin/`의 실행 코드 import를 제한한다. 타입 전용 import는 허용한다. 서버 Route Handler는 이 UI 규칙의 범위 밖이다.
- `mbus/no-stored-access-token`은 앱 코드에서 Web Storage의 `setItem`과 속성 대입으로 고정된 토큰 키(`accessToken`, `access_token`, `access-token`)에 쓰는 코드를 검사한다.
- `mbus/no-internal-api-path`는 앱 코드의 문자열과 템플릿에 직접 쓴 `/api/v1/internal` 경로를 검사한다. 동적으로 조립한 경로는 리뷰에서 호출 대상을 확인한다.
- `store/useAuthStore.ts`에서는 `no-restricted-imports`로 `zustand/middleware`의 `persist` import를 제한한다.

규칙을 추가할 때는 여기에 적용 범위와 참조 파일을 기록한다. ESLint 기본 규칙은 `eslint.config.mjs`에 설정하고, 코드 구조를 직접 판별해야 하는 규칙은 `scripts/eslint/mbus.mjs`에 작성한다. 오류 메시지에는 고치는 방법과 참고할 구현을 적는다.

## 프로젝트 핵심 규칙

- `@/*`는 프로젝트 루트를 가리킨다.
- accessToken은 `localStorage`나 `sessionStorage`에 저장하지 않는다.
- refresh token은 HttpOnly cookie를 전제로 한다.
- 인증 API는 사이트별로 나뉜다(`lib/auth/site.ts`의 `AUTH_PATHS`). 일반 사이트는 `/api/v1/auth/{login,token/refresh,logout}`, 관리자 사이트(`/manager` 경로 또는 `NEXT_PUBLIC_ADMIN_HOST`)는 `/api/v1/auth/admin/{login,token/refresh,logout}`이다. 관리자 계정은 일반 로그인을 할 수 없고, `/api/v1/admin/**`는 관리자 사이트 토큰으로만 호출된다.
- 관리자 화면에서 서비스 공개 API(`/api/v1/stop/**` 등)를 직접 호출하지 않는다. 필요한 기능은 백엔드 iam의 `/api/v1/admin/**` API를 쓴다.
- axios client는 cookie 전송을 위해 `withCredentials: true`를 사용한다.
- API 응답은 `ApiResponse<T> = { code, message, data }` 형태다.
- 성공 코드는 `"00000"`이다.
- `/api/v1/internal/...` 경로는 S2S 전용이므로 프론트엔드에서 호출하지 않는다.
- backend page 응답 `{ items, totalCnt, pageRows, pageNum }`은 `toPageResult()`로 변환한다.
- API 요청 날짜값은 `lib/api/date-serializer.ts`를 거친다.
- `new Date().toISOString()`을 요청값으로 직접 사용하지 않는다. UTC 변환으로 한국 시간 의미가 틀어질 수 있다.
- nav link와 service card 데이터는 `constants/navigation.ts`에서 관리한다. 컴포넌트 내부에 인라인으로 흩뿌리지 않는다.

## 라우팅 구조

App Router route group 이름은 URL에 포함되지 않는다.

- `app/(auth)/{login,join}`: 공개 페이지 (`/login`, `/join`)
- `app/(protected)/...`: 로그인 사용자 영역. `(protected)/layout.tsx`가 `ProtectedShell`로 감싼다.
- `app/(manager)/manager/...`: 관리자 영역. `(manager)/layout.tsx`가 `ManagerShell`로 감싼다.
- `app/(manager-auth)/manager/login`: 관리자 로그인 (`/manager/login`). `ManagerShell` 가드를 피하려고 별도 route group에 둔다.
- `app/verify-email`, `app/403`: auth guard redirect target

## 인증 흐름

1. `components/auth/AuthGate.tsx`가 root layout에서 mount된다.
2. 메모리에 `accessToken`이 없으면 `AuthService.refreshFor(currentAuthSite())`로 현재 사이트의 refresh 쿠키를 써서 silent refresh를 시도한다.
3. refresh 성공 후 `MemberService.getMe()`로 사용자 정보를 로드한다.
4. bootstrap이 끝나면 `isBootstrapped=true`가 된다. route guard는 이 값을 기다린다.
5. `lib/api/client.ts` request interceptor가 현재 accessToken을 `Authorization: Bearer <token>`으로 붙인다.
6. response interceptor는 401을 받으면 현재 사이트의 refresh 경로로 token refresh 후 원요청을 재시도한다. refresh 중 들어온 요청은 `failedQueue`에 대기시킨다.
7. login/register/logout/refresh 계열 요청은 401이어도 refresh를 재시도하지 않는다.

## 권한 모델

- 현재 `Member.memberType`과 `Member.permissions[]`가 분리되어 있다.
- 권한 체크는 `useAuthStore((s) => s.hasPermission('WRITE'))` 또는 `<ProtectedShell requirePermission="WRITE">` 패턴을 사용한다.
- 관리자 라우트와 메뉴 노출 정책은 서로 어긋나지 않아야 한다. 메뉴에서 숨긴 기능도 직접 URL 접근이 가능하면 안 된다.
- 실제 운영 권한은 backend가 최종 강제해야 한다. frontend guard는 UX와 화면 노출 제어 용도다.

## API 모듈 규칙

`lib/api/<domain>.ts` 파일은 도메인별 service 객체를 export한다.

예:

```ts
AuthService
MemberService
StopService
ContractService
ReservationService
```

응답 봉투 처리는 공통 helper나 `lib/api/swr.ts` fetcher를 우선 사용한다. 새 코드에서 `res.data.data`를 직접 반복해서 풀지 않는다.

## 스타일 규칙

브랜드 토큰은 `app/globals.css`의 `@theme inline`에 정의되어 Tailwind utility로 노출된다.

- `bg-brand-black` / `text-brand-black`: `#111111`
- `text-brand-blue` / `border-brand-blue`: `#0056b3`
- `font-noto`: Noto Sans KR (`app/layout.tsx`의 `next/font/google`)

전체 너비 페이지 섹션에는 `components/common/Section.tsx`를 우선 사용한다. 어두운 배경은 `isDark` prop을 사용한다.

## Sentry

`instrumentation.ts`가 runtime(`nodejs` / `edge`)에 맞춰 설정을 dynamic import한다. `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`는 DSN이 없으면 `Sentry.init`을 호출하지 않는다.

## 검증 기준

코드 변경 후 가능한 범위에서 아래 순서로 검증한다.

```bash
npm run check
npm run build
```

GitHub Actions의 PR 검사 이름은 `mbus-check`이다. 기본 브랜치의 필수 상태 검사에 이 이름을 등록하면 검사 실패 시 병합이 차단된다.

`next/font/google`은 build 중 Google Fonts를 fetch한다. 네트워크가 막힌 환경에서는 코드 문제가 없어도 build가 실패할 수 있다.
