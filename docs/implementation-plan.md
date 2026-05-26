# 프론트엔드 구현 계획 (Reservation 백엔드 연동)

본 문서는 `~/IdeaProjects/reservation/docs/frontend-onboarding.md` 가이드를 기준으로
현재 `mbus` Next.js 프로젝트(`/Users/hig/WebstormProjects/mbus`)를 백엔드와 정합성 있게
연동하기 위한 단계별 작업 계획입니다.

---

## 0. 백엔드 요약

- **MSA**: Gateway(8080) 단일 진입점 → iam(8181) / stop(8182) / reservation(8183)
- **공통 응답**: `{ code, message, data }` — `code === "00000"` 가 성공
- **페이지 응답**: `data: { content, page, size, totalElements, totalPages }`, `page`는 0-base
- **인증**:
  - `Access Token` → Response Body `data.accessToken` (60분, 메모리/Store 보관)
  - `Refresh Token` → HttpOnly Cookie `refresh_token` (Path=`/api/v1/auth`, 7일)
  - 재발급: `POST /api/v1/auth/token/refresh` (쿠키 자동 전송)
- **CORS**: 인증 API는 `withCredentials: true` 필수

---

## 1. 현재 코드 ↔ 가이드 갭 분석

| # | 영역 | 현재 코드 | 가이드 명세 | 대응 |
|---|------|----------|-------------|------|
| 1 | `ApiResponse<T>` | `{ result, code, message, data }` | `{ code, message, data }` | 타입 정정, `result` 제거 |
| 2 | 회원가입 경로 | `POST /api/v1/auth/join` | `POST /api/v1/auth/register` | 경로 변경 |
| 3 | 토큰 갱신 경로 | `POST /api/v1/auth/refresh` | `POST /api/v1/auth/token/refresh` | 경로 변경 |
| 4 | 갱신 응답 파싱 | `response.data.accessToken` | `response.data.data.accessToken` | 언래핑 수정 |
| 5 | `LoginResponse` | `{ accessToken, tokenType }` | `{ accessToken }` | `tokenType` 제거 |
| 6 | Base URL | 하드코딩 `localhost:8080` | 환경별 다름 | `NEXT_PUBLIC_API_BASE_URL` |
| 7 | 에러 처리 | `errorData.result === "VALIDATION_FAIL"` | `code` 5자리 분기 | 코드 기반 분기로 정리 |
| 8 | 도메인 API | auth만 존재 | member / stop / contract / reservation | 모듈 신규 |
| 9 | 라우트 가드 | 없음 | 권한/이메일 인증 분기 필요 | `AuthGate` + `useRequireAuth` |
| 10 | 사용자 부트스트랩 | 없음 | 로그인 후 `member/find/me`로 보충 | 부트스트랩 훅 |

> ⚠️ **보안 주의**: 가이드는 `accessToken`을 `localStorage`에 저장하지 말라고 권고합니다.
> 현재 `useAuthStore`는 `persist`로 `accessToken`을 `localStorage`에 저장 중입니다.
> 본 계획에서는 **기능 정합성 우선**으로 진행하되, 추후 `sessionStorage` 또는 메모리-only 로
> 마이그레이션할 별도 작업을 후속 과제로 명시합니다.

---

## 2. 작업 단계

### Phase 1 — API 인프라 정비
1. **`lib/api/types.ts` 신규** — `ApiResponse<T>`, `PageResult<T>`, `ResultCode` 상수
2. **`lib/api/client.ts` 수정**
   - `baseURL` → `process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'`
   - refresh 경로 `/api/v1/auth/token/refresh` 로 교체
   - 갱신 응답을 `ApiResponse<{ accessToken }>` 로 언래핑
3. **`.env.local.example` 추가** — `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`

### Phase 2 — Auth API 모듈 정합화
1. **`lib/api/auth.ts` 재구성**
   - `register(data)` (구 join)
   - `login`, `logout`, `verifyEmail(token)`
   - `passwordReset.request / verify / confirm`
   - `changePassword`
2. **`app/(auth)/join/page.tsx`**: `AuthService.register` 호출, 성공 후 메일 인증 안내
3. **`app/(auth)/login/page.tsx`**: 새 에러 포맷(`code`) 기반 분기로 정리

### Phase 3 — 도메인 API 모듈
- `lib/api/member.ts` — `getMe / modify / withdraw / deactivate`
- `lib/api/stop.ts` — `list(params) / createSimple / registerBulk`
- `lib/api/contract.ts` — `create / listMine / detail`
- `lib/api/reservation.ts` — `create / listMine / detail / cancel`
- 공통: 응답을 `ApiResponse<T>` 로 받고 `data` 추출하는 패턴 유지

### Phase 4 — 인증 부트스트랩 & 가드
1. **`components/auth/AuthGate.tsx`** (client, layout에 마운트)
   - 마운트 시 `accessToken`이 있으면 `member.getMe()` 호출 → `setUser`
   - 실패(401) → `logout()`
2. **`hooks/useRequireAuth.ts`**
   - `isAuthenticated` 없으면 `/login?next=<path>` 로 리다이렉트
   - 옵션: `requirePermission`, `requireEmailVerified`
3. **`store/useAuthStore.ts`**
   - `User` 타입에 `memberType / permissions / emailVerified` 필드 추가
   - `permissions` 헬퍼: `hasPermission(p: 'READ' | 'WRITE' | 'MANAGE')`

### Phase 5 — 검증
- `npm run lint`
- `npm run build`
- 수동 테스트 (백엔드 미가동 시점에도 빌드는 통과해야 함)

---

## 3. 후속 과제 (Phase 6 — 본 PR에서 같이 처리)

- **토큰 메모리화** — `persist` 제거, `AuthGate`가 부팅 시 silent refresh 시도, `isBootstrapped` 상태로 가드 race condition 차단
- **보호 페이지 스켈레톤** — `app/(protected)/{mypage,reservation,contract,admin}/page.tsx`, `app/{verify-email,403}/page.tsx` 추가, `ProtectedShell` 컴포넌트로 가드 표준화
- **openapi-typescript** — devDep 추가, `scripts/gen-api.sh` + `npm run gen:api` 로 8181/8182/8183 스펙 → `lib/api/generated/*.ts` 생성 (백엔드 가동 필요)
- **SWR** — dep 추가, `lib/api/swr.ts`에 `apiFetcher` 헬퍼 (`ApiResponse<T>` 언래핑 포함)
- **에러 코드 카탈로그** — `lib/api/result-codes.ts`에 `RESULT_CODES` / `RESULT_CODE_MESSAGES` / `messageForCode()` 상수화, 로그인 페이지에서 적용
- **Sentry 스캐폴드** — `@sentry/nextjs` 설치 + `sentry.{client,server,edge}.config.ts` + `instrumentation.ts`. DSN 없으면 no-op

## 4. 더 미룰 후속 과제

- 권한별 화면 분기 세분화 (계약 생성은 ADMIN+WRITE, 예약 취소는 PENDING 단계만 등) — `ProtectedShell` + `hasPermission`로 기반은 깔림
- Sentry DSN 발급 + `next.config.ts`에 `withSentryConfig` 래핑 (소스맵 업로드)
- CI에서 `npm run gen:api` 자동 실행 (백엔드 PR 머지 후 타입 동기화)

---

## 5. 진행 체크리스트

- [x] Phase 1 · API 타입 / Base URL / 인터셉터 수정
- [x] Phase 2 · Auth 엔드포인트 정합화
- [x] Phase 3 · member / stop / contract / reservation 모듈
- [x] Phase 4 · AuthGate + useRequireAuth
- [x] Phase 5 · lint / build 통과
- [x] Phase 6 · 토큰 메모리화 / 보호 페이지 / codegen+SWR / Sentry+에러 코드
