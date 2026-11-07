import { api } from './client';
import { AUTH_PATHS, siteOfToken, type AuthSite } from '@/lib/auth/site';
import { useAuthStore } from '@/store/useAuthStore';
import type { ApiResponse } from './types';

export interface RegisterRequest {
  memberName: string;
  loginId: string;
  password: string;
  email: string;
  phoneNumber: string;
  memberType: 'MEMBER' | 'BUSINESS' | 'ADMIN_USER' | 'ADMIN_MASTER' | 'ADMIN_DEVELOPER';
  businessNumber?: string;
}

export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetVerifyRequest {
  token: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const AuthService = {
  register: (data: RegisterRequest) =>
    unwrap<null>(api.post('/api/v1/auth/register', data)),

  login: (data: LoginRequest) =>
    unwrap<LoginResponse>(api.post(AUTH_PATHS.user.login, data)),

  logout: () => unwrap<null>(api.post(AUTH_PATHS.user.logout)),

  /** 관리자 사이트 로그인. 관리자 계정만 가능하며 aud=ADMIN 토큰(TTL 15분)이 발급된다. */
  adminLogin: (data: LoginRequest) =>
    unwrap<LoginResponse>(api.post(AUTH_PATHS.admin.login, data)),

  /** 사이트에 맞는 refresh 쿠키로 토큰을 갱신한다. */
  refreshFor: (site: AuthSite) =>
    unwrap<LoginResponse>(api.post(AUTH_PATHS[site].refresh)),

  /** 사이트에 맞는 세션만 로그아웃한다. 다른 사이트 세션과 쿠키는 유지된다. */
  logoutFor: (site: AuthSite) => unwrap<null>(api.post(AUTH_PATHS[site].logout)),

  /**
   * 지금 가진 토큰을 발급한 사이트의 세션을 로그아웃한다.
   * 화면 위치로 고르면, 관리자가 일반 화면에서 로그아웃할 때 일반 로그아웃 API가 불려
   * 관리자 refresh 쿠키가 남는다.
   */
  logoutCurrent: () =>
    unwrap<null>(api.post(AUTH_PATHS[siteOfToken(useAuthStore.getState().tokenSite)].logout)),

  verifyEmail: (token: string) =>
    unwrap<null>(api.get('/api/v1/auth/verify-email', { params: { token } })),

  refresh: () =>
    unwrap<LoginResponse>(api.post(AUTH_PATHS.user.refresh)),

  passwordReset: {
    request: (data: PasswordResetRequest) =>
      unwrap<null>(api.post('/api/v1/auth/password-reset/request', data)),
    verify: (data: PasswordResetVerifyRequest) =>
      unwrap<null>(api.post('/api/v1/auth/password-reset/verify', data)),
    confirm: (data: PasswordResetConfirmRequest) =>
      unwrap<null>(api.post('/api/v1/auth/password-reset/confirm', data)),
  },

  changePassword: (data: ChangePasswordRequest) =>
    unwrap<null>(api.post('/api/v1/auth/password/change', data)),
};
