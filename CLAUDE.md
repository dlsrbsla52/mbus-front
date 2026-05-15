# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 기술 스택

- **Next.js 16.2.2** App Router — **React 19**, TypeScript strict 모드
- **Tailwind CSS v4** — `tailwind.config.js` 없이 `globals.css`의 `@theme inline`으로 토큰 정의
- **Zustand v5** — 전역 상태 관리; auth 스토어는 `localStorage` 키 `auth-storage`에 영속
- **axios** — `lib/api/client.ts`에 JWT 인터셉터 포함한 HTTP 클라이언트
- **react-hook-form v7 + zod v4** — 폼 유효성 검사
- **lucide-react** — 아이콘

## 명령어

```bash
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint
```

테스트 러너는 설정되어 있지 않음.

## 경로 별칭

`@/*` 는 프로젝트 루트를 가리킴 (예: `@/components/...`, `@/lib/...`).

## 아키텍처

### 라우팅

App Router 사용. `(auth)` 라우트 그룹으로 로그인·회원가입 페이지를 묶음 — 그룹명은 URL에 포함되지 않으므로 실제 경로는 `/login`, `/join`.

### 인증 흐름

1. `useAuthStore` (`store/useAuthStore.ts`) — `accessToken`과 `user`를 메모리에 보관하고 `localStorage`에 영속.
2. `lib/api/client.ts`의 axios 인스턴스 — 모든 요청에 자동으로 `Bearer` 토큰을 부착.
3. 401 응답 시 인터셉터가 `POST /api/v1/auth/refresh`(HttpOnly 쿠키로 리프레시 토큰 자동 전송)를 호출해 토큰을 갱신하고 원래 요청을 재시도. 갱신 중 발생한 다른 요청들은 큐에 대기.
4. 백엔드는 `localhost:8080` Spring Boot. API 응답 형식: `{ result, code, message, data }`.

### 스타일 컨벤션

브랜드 토큰은 `app/globals.css`의 `@theme inline`에 정의되어 Tailwind 유틸리티로 사용:
- `bg-brand-black` / `text-brand-black` → `#111111`
- `text-brand-blue` / `border-brand-blue` → `#0056b3`
- `font-noto` → Noto Sans KR (`layout.tsx`에서 `next/font/google`로 로드)

전체 너비 페이지 섹션에는 `Section` 컴포넌트(`components/common/Section.tsx`) 사용 — 어두운 배경은 `isDark` prop 전달.

### 내비게이션 데이터

모든 nav 링크와 서비스 카드 데이터는 `constants/navigation.ts`에서 관리. 컴포넌트 내부에 직접 작성하지 않음.