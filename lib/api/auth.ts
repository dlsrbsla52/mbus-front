import { api } from './client';

// DTO Interfaces
export interface LoginRequest {
  loginId: string;
  password?: string; // 소셜 로그인 등이 있다면 선택적일 수 있음. 기본 비밀번호 로그인 가정
}

export interface JoinRequest {
  loginId: string;
  email: string;
  password?: string;
  name?: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
}

export interface ApiResponse<T> {
  result: string;
  code: string;
  message: string;
  data: T;
}

// APIs
export const AuthService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    // 백엔드 엔드포인트에 따라 URL 수정 필요
    const response = await api.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', data);
    return response.data.data;
  },

  join: async (data: JoinRequest): Promise<void> => {
    await api.post('/api/v1/auth/join', data);
  },

  logout: async (): Promise<void> => {
    // HttpOnly 쿠키의 경우 백엔드에서 Set-Cookie로 삭제 처리를 수행해야 함
    await api.post('/api/v1/auth/logout');
  },
};
