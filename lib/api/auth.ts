import { api } from './client';
import type { ApiResponse } from './types';

export interface RegisterRequest {
  loginId: string;
  email: string;
  password: string;
  name: string;
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
    unwrap<LoginResponse>(api.post('/api/v1/auth/login', data)),

  logout: () => unwrap<null>(api.post('/api/v1/auth/logout')),

  verifyEmail: (token: string) =>
    unwrap<null>(api.get('/api/v1/auth/verify-email', { params: { token } })),

  refresh: () =>
    unwrap<LoginResponse>(api.post('/api/v1/auth/token/refresh')),

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
