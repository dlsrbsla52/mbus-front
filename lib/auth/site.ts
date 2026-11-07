/**
 * 인증 사이트(발급처) 판정.
 *
 * 백엔드는 로그인한 사이트를 토큰 `aud` 로 구분한다.
 * - 일반 사이트: `/api/v1/auth/*` → aud=USER. 관리자 계정은 로그인할 수 없다.
 * - 관리자 사이트: `/api/v1/auth/admin/*` → aud=ADMIN. 관리자 계정만 로그인할 수 있고,
 *   gateway 는 `/api/v1/admin/**` 에 aud=ADMIN 토큰만 통과시킨다.
 *
 * refresh 쿠키도 사이트별로 분리되어 있으므로(`refresh_token` / `admin_refresh_token`),
 * 현재 화면이 어느 사이트인지에 따라 로그인·갱신·로그아웃 경로를 골라야 한다.
 */
export type AuthSite = 'user' | 'admin';

const ADMIN_PATH_PREFIX = '/manager';

/** `/manager` 또는 `/manager/...` 경로인지 판정한다. (`/managerX` 같은 경로는 제외) */
export const isAdminPath = (pathname: string | null | undefined): boolean =>
  !!pathname && (pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`));

/**
 * 현재 브라우저 위치의 인증 사이트.
 *
 * 관리자 호스트(`NEXT_PUBLIC_ADMIN_HOST`)에서는 `proxy.ts` 가 내부적으로 `/manager/*` 로 rewrite 하므로
 * 브라우저 주소에는 `/manager` 가 없을 수 있다. 그래서 호스트를 먼저 보고, 그다음 경로를 본다.
 */
export const currentAuthSite = (): AuthSite => {
  if (typeof window === 'undefined') return 'user';
  const adminHost = process.env.NEXT_PUBLIC_ADMIN_HOST?.toLowerCase();
  if (adminHost && window.location.host.toLowerCase() === adminHost) return 'admin';
  return isAdminPath(window.location.pathname) ? 'admin' : 'user';
};

/** 경로 기준 인증 사이트. 라우트 가드처럼 pathname 을 이미 알고 있을 때 쓴다. */
export const authSiteOfPath = (pathname: string | null | undefined): AuthSite =>
  isAdminPath(pathname) || currentAuthSite() === 'admin' ? 'admin' : 'user';

/**
 * 현재 보유한 토큰의 사이트. 토큰이 없으면 현재 위치로 판정한다.
 * 저장소(useAuthStore)를 직접 import 하지 않도록 값을 인자로 받는다(순환 참조 방지).
 */
export const siteOfToken = (tokenSite: AuthSite | null): AuthSite => tokenSite ?? currentAuthSite();

/** 사이트별 로그인 페이지 경로. */
export const loginPathFor = (site: AuthSite): string =>
  site === 'admin' ? '/manager/login' : '/login';

/** 사이트별 인증 API 경로. */
export const AUTH_PATHS = {
  user: {
    login: '/api/v1/auth/login',
    refresh: '/api/v1/auth/token/refresh',
    logout: '/api/v1/auth/logout',
  },
  admin: {
    login: '/api/v1/auth/admin/login',
    refresh: '/api/v1/auth/admin/token/refresh',
    logout: '/api/v1/auth/admin/logout',
  },
} as const satisfies Record<AuthSite, { login: string; refresh: string; logout: string }>;
