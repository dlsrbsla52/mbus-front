# 미디어버스 프론트엔드

미디어버스(`mbus`)는 Next.js App Router 기반의 프론트엔드 애플리케이션입니다. 공개 홈페이지, 회원 인증, 정류장 예약/계약 흐름, 관리자 운영 콘솔을 제공하며 로컬 백엔드 게이트웨이(`localhost:8080`)를 통해 iam, stop, reservation 서비스와 통신합니다.

## 기술 스택

- Next.js 16.2.2, React 19, TypeScript
- Tailwind CSS v4
- Zustand v5: 인증 상태와 사용자 정보 관리
- axios: 공통 API 클라이언트, JWT 자동 첨부, 401 토큰 재발급 큐
- SWR v2: API 응답 봉투 언래핑용 fetcher
- react-hook-form, zod: 폼 상태와 검증
- Sentry for Next.js: DSN 미설정 시 no-op
- openapi-typescript: 백엔드 OpenAPI 스펙 기반 타입 생성

## 주요 기능

- 공개 페이지: 홈, 서비스 카드, 회사/비즈니스/포트폴리오/지원/홍보센터 내비게이션 기반
- 인증: 회원가입, 로그인, 이메일 인증, 비밀번호 재설정, 비밀번호 변경
- 회원 영역: 마이페이지, 회원 정보 수정, 예약 목록/생성/취소, 계약 조회/서명/결제/갱신
- 정류장: 목록, 검색, 상세, 주변 검색, 가용 기간, 기준일 단가 조회
- 관리자 콘솔:
  - 대시보드와 통계 리포트
  - 정류장 및 단가 관리
  - 예약 상태 변경, 담당자 배정, 예약 완료 후 계약 생성
  - 계약 목록과 통계
  - 회원 조회, 비활성화/재활성화
  - 계약 갱신 알림 발송 관리
  - 정산 수수료 관리
  - 역할/권한 관리

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 준비

```bash
cp .env.local.example .env.local
```

기본값은 로컬 게이트웨이를 바라봅니다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | 프론트엔드가 호출하는 백엔드 게이트웨이 주소 |
| `NEXT_PUBLIC_SENTRY_DSN` | 빈 값 | 브라우저 Sentry DSN. 비어 있으면 초기화하지 않음 |
| `NEXT_PUBLIC_SENTRY_ENV` | `development` | 브라우저 Sentry 환경명 |
| `SENTRY_DSN` | 빈 값 | 서버/엣지 Sentry DSN. 비어 있으면 초기화하지 않음 |
| `SENTRY_ENV` | `development` | 서버/엣지 Sentry 환경명 |

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 <http://localhost:3000>으로 접속합니다.

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 빌드 결과 실행
npm run lint     # ESLint 검사
npm run gen:api  # 백엔드 OpenAPI 스펙으로 타입 생성
```

`npm run gen:api`는 iam(`8181`), stop(`8182`), reservation(`8183`) 서비스가 로컬에서 실행 중이어야 합니다. 생성 결과는 `lib/api/generated/`에 기록됩니다.

## 백엔드 연동 규약

- 단일 진입점은 게이트웨이 `http://localhost:8080`입니다.
- 게이트웨이 뒤에는 iam(`8181`), stop(`8182`), reservation(`8183`) 서비스가 있습니다.
- 공통 응답은 `{ code, message, data }` 형태이며 `code === "00000"`을 성공으로 처리합니다.
- 페이지 응답은 백엔드의 `{ items, totalCnt, pageRows, pageNum }`을 `toPageResult()`로 프론트엔드 표준 `{ content, page, size, totalElements, totalPages }`로 변환합니다.
- Access Token은 Zustand 메모리에 보관하고, Refresh Token은 백엔드가 설정한 HttpOnly 쿠키로 관리합니다.
- 401 응답을 받으면 `POST /api/v1/auth/token/refresh`로 토큰을 갱신한 뒤 원 요청을 재시도합니다.
- `/api/v1/internal/**` 경로는 서비스 간 통신 전용이므로 프론트엔드에서 직접 호출하지 않습니다.
- 날짜/시간 요청값은 `lib/api/date-serializer.ts`의 공통 serializer를 사용합니다.

자세한 API 보완 명세는 [docs/api-contract.md](docs/api-contract.md)를 확인하세요.

## 라우팅 구조

App Router 그룹명은 URL에 포함되지 않습니다.

| 경로 | 설명 |
| --- | --- |
| `app/page.tsx` | 공개 홈 |
| `app/(auth)/login` | 로그인 |
| `app/(auth)/join` | 회원가입 |
| `app/(auth)/password-reset/*` | 비밀번호 재설정 |
| `app/(protected)/mypage` | 마이페이지 |
| `app/(protected)/reservation` | 내 예약 목록 |
| `app/(protected)/reservation/new` | 예약 생성 |
| `app/(protected)/contract` | 내 계약 목록 |
| `app/(protected)/contract/[id]` | 계약 상세 |
| `app/(manager)/manager/*` | 관리자 콘솔 |
| `app/verify-email` | 이메일 인증 안내 |
| `app/403` | 권한 없음 |

## 디렉터리 구조

```text
app/                 Next.js App Router 페이지와 레이아웃
components/          공통 UI, 레이아웃, 인증, 홈, 관리자 컴포넌트
constants/           내비게이션과 정적 화면 데이터
hooks/               인증 가드와 UI 훅
lib/api/             axios 클라이언트와 도메인별 API 서비스
store/               Zustand 전역 상태
docs/                API 계약, 구현 계획, 이슈 분석 문서
scripts/             OpenAPI 타입 생성 스크립트
public/              정적 에셋
```

## 인증 흐름

1. 루트 레이아웃에서 `AuthGate`가 앱 부팅 시 silent refresh를 시도합니다.
2. 토큰 복원에 성공하면 `MemberService.getMe()`로 현재 사용자를 조회합니다.
3. 보호 페이지는 `ProtectedShell`과 `useRequireAuth()`를 통해 부트스트랩 완료, 로그인 여부, 이메일 인증, 권한을 확인합니다.
4. API 요청에는 `Authorization: Bearer <accessToken>`이 자동으로 첨부됩니다.
5. 인증 실패 시 refresh 경로를 제외한 요청은 토큰 갱신 후 재시도됩니다.

## 참고 문서

- [docs/api-contract.md](docs/api-contract.md): 프론트엔드가 기대하는 백엔드 API 계약과 보완 요청
- [docs/implementation-plan.md](docs/implementation-plan.md): 백엔드 연동 구현 계획과 완료 체크리스트
- [CLAUDE.md](CLAUDE.md): 저장소 작업자를 위한 세부 개발 지침
