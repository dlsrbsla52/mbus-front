import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

// 베이스 URL 설정 (Backend API 주소)
export const api = axios.create({
  baseURL: 'http://localhost:8080', // 향후 env 처리 권장
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // 필요한 경우(Cookie 기반 CORS) 활성화
});

// Axios Request Interceptor
// 모든 요청 직전에 로컬 상태의 AccessToken을 가져와서 Authorization 헤더에 부착합니다.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Axios Response Interceptor
// 401 Unauthorized 에러 발생 시, Refresh Token을 사용해 자동으로 토큰을 갱신합니다.
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void, reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 만약 에러 상태 코드가 401(Unauthorized)이고, 재시도한 적이 없다면
    if (error.response?.status === 401 && !originalRequest._retry) {

      // 재시도 무한루프 방지
      if (originalRequest.url === '/api/v1/auth/refresh') {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true; // 플래그 설정

      // 이미 갱신 중이라면 Queue에 대기시킵니다.
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      isRefreshing = true;

      try {
        // Backend의 RefreshToken 확인 방식(HttpOnly Cookie)에 맞춘 로직
        // 쿠키는 브라우저가 알아서 전송하므로 Body에 담을 필요가 없습니다.
        const response = await axios.post('http://localhost:8080/api/v1/auth/refresh', {}, {
          withCredentials: true
        });

        const newAccessToken = response.data.accessToken;

        // Zustand Store 업데이트
        useAuthStore.getState().setTokens(newAccessToken);

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout(); // 갱신도 실패하면 완전 로그아웃 처리
        // 필요시 window.location.href = '/login' 등 강제 리다이렉트
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
