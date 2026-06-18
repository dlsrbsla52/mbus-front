# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 기술 스택

- **Next.js 16.2.2** App Router — **React 19**, TypeScript strict 모드
- **Tailwind CSS v4** — `tailwind.config.js` 없이 `app/globals.css`의 `@theme inline`으로 토큰 정의
- **Zustand v5** — 전역 상태 (auth). `persist` 사용 안 함 — accessToken은 메모리 보관, 부팅 시 silent refresh 로 복원
- **axios** — `lib/api/client.ts`에 JWT 인터셉터 + 401 자동 재발급 큐
- **SWR v2** — `lib/api/swr.ts`의 `apiFetcher` / `apiKeyFetcher` 가 `ApiResponse<T>` 를 자동 언래핑
- **react-hook-form v7 + zod v4** — 폼 유효성 검사
- **@sentry/nextjs** — DSN 비어 있으면 자동 no-op
- **openapi-typescript** — `npm run gen:api` 로 백엔드 스펙 → `lib/api/generated/*.ts`

## 명령어

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint (eslint.config.mjs — flat config)
npm run gen:api  # OpenAPI 타입 재생성 (iam:8181 / stop:8182 / reservation:8183 가동 필요)
```

테스트 러너는 설정되어 있지 않다.

## 경로 별칭

`@/*` 는 프로젝트 루트를 가리킴 (`tsconfig.json` paths). 예: `@/components/...`, `@/lib/api/...`.

## 백엔드 계약

- **MSA**: Gateway `localhost:8080` 단일 진입점 → iam(8181) / stop(8182) / reservation(8183).
  `NEXT_PUBLIC_API_BASE_URL` 로 변경 가능 (`.env.local.example` 참고).
- **Swagger**: 각 서비스 직접 접속으로 확인 (`/api-docs` 경로).
  - stop: `http://localhost:8182/swagger-ui/index.html`
  - reservation: `http://localhost:8183/swagger-ui/index.html`
  - **`/internal` 경로(`/api/v1/internal/...`)는 S2S 전용 — 프론트엔드에서 절대 호출 금지.**
- **공통 응답 봉투**: `ApiResponse<T> = { code, message, data }`. `code === "00000"` 이 성공.
  주요 코드는 `lib/api/result-codes.ts` 의 `RESULT_CODES` 카탈로그를 사용하고, 분기 메시지는
  `messageForCode(code, fallback)` 로 통일.
- **페이지 응답**: 백엔드 실제 형태는 `{ items, totalCnt, pageRows, pageNum }` (`BackendPage<T>`).
  `toPageResult()` 가 프론트 `PageResult<T> = { content, page, size, totalElements, totalPages }` 로 변환.
  `page` 는 0-base.
- **인증 토큰**:
  - Access Token → 응답 `data.accessToken` (60분, 메모리 보관)
  - Refresh Token → HttpOnly 쿠키 `refresh_token` (Path=`/api/v1/auth`, 7일)
  - 재발급 경로는 **`POST /api/v1/auth/token/refresh`** (legacy `/auth/refresh` 가 아님).
- **CORS**: axios 클라이언트는 `withCredentials: true` (쿠키 자동 전송).
- **날짜/시간 직렬화**: API 요청 시 raw 문자열 직접 사용 금지. 반드시 `lib/api/date-serializer.ts`의 공통 serializer를 거친다.
  - `LocalDate` 필드 → `toApiLocalDate(str)` → `YYYY-MM-DD`
  - `OffsetDateTime` 필드 → `toApiOffsetDateTime(str, time?)` → `YYYY-MM-DDTHH:mm:ss+09:00` (KST 고정)
  - `new Date().toISOString()` 직접 사용 금지 — UTC 변환으로 한국 시간 의미가 틀어짐.
  - 도메인별 타입: `consultationRequestedAt` → OffsetDateTime, `desiredContractStartDate` → LocalDate.

## 아키텍처

### 라우팅 그룹

App Router. 그룹명은 URL에 포함되지 않음.
- `app/(auth)/{login,join}` — 공개 페이지 (`/login`, `/join`)
- `app/(protected)/{mypage,reservation,contract,admin}` — `(protected)/layout.tsx` 가
  `ProtectedShell` 로 감싸 인증 가드 적용
- `app/verify-email`, `app/403` — 가드 리다이렉트 타깃

### 인증 흐름 (중요)

1. **부팅** (`components/auth/AuthGate.tsx`, root layout 에서 마운트):
   메모리에 `accessToken` 이 없으면 `AuthService.refresh()` 로 silent refresh 시도 →
   성공 시 `MemberService.getMe()` 로 사용자 로딩 → 실패 시 `logout()`.
   완료 후 `isBootstrapped=true`. 이 플래그가 라우트 가드 race condition 차단.
2. **요청 인터셉터** (`lib/api/client.ts`): 모든 요청에 `Authorization: Bearer <token>` 자동 부착.
3. **응답 인터셉터**: 401 수신 시 토큰 재발급 + 원요청 재시도. 갱신 중 발생한 다른 요청은
   `failedQueue` 에 대기 후 일괄 재시도. `AUTH_NO_REFRESH_PATHS` (login/register/logout/refresh)
   는 401 이라도 재발급 시도하지 않음.
4. **클라이언트 가드** (`hooks/useRequireAuth.ts`): `isBootstrapped` 대기 → 미인증이면
   `/login?next=<path>`, 이메일 미인증이면 `/verify-email`, 권한 부족이면 `/403`.
   `ProtectedShell` 이 이 훅을 래핑하여 부팅 중에는 로딩 UI 표시.

### 권한 모델

`Member.memberType` (`MEMBER | ADMIN | ADMIN_MASTER`) 와 `Member.permissions[]`
(`READ | WRITE | MANAGE`) 가 분리되어 있다. 권한 체크는 컴포넌트 내에서
`useAuthStore((s) => s.hasPermission('WRITE'))` 또는 `<ProtectedShell requirePermission="WRITE">`.

### API 모듈 구조

`lib/api/<domain>.ts` 파일은 도메인별 서비스 객체를 export 한다 (`AuthService`, `MemberService`,
`StopService`, `ContractService`, `ReservationService`). 공통 패턴:

```ts
const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);
```

응답 봉투 언래핑은 이 헬퍼나 `lib/api/swr.ts` 의 fetcher 를 사용. 직접 `res.data.data` 를 까지 말 것.

### 스타일 컨벤션

브랜드 토큰은 `app/globals.css` 의 `@theme inline` 에 정의되어 Tailwind 유틸리티로 노출:
- `bg-brand-black` / `text-brand-black` → `#111111`
- `text-brand-blue` / `border-brand-blue` → `#0056b3`
- `font-noto` → Noto Sans KR (`app/layout.tsx` 에서 `next/font/google` 로 로드)

전체 너비 페이지 섹션에는 `components/common/Section.tsx` 사용 — 어두운 배경은 `isDark` prop.

### 정적 데이터

모든 nav 링크와 서비스 카드 데이터는 `constants/navigation.ts` 에서 관리. 컴포넌트 내부에 인라인 금지.

### Sentry

`instrumentation.ts` 가 런타임(`nodejs`/`edge`)에 맞춰 설정을 동적 import.
`sentry.{client,server,edge}.config.ts` 는 모두 DSN 부재 시 `Sentry.init` 자체를 호출하지 않는다.
