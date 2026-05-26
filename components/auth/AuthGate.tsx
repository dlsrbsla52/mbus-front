'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { MemberService } from '@/lib/api/member';
import { AuthService } from '@/lib/api/auth';

function describeError(e: unknown): string {
  const err = e as {
    response?: { status?: number; data?: { code?: string; message?: string } };
    message?: string;
  };
  if (err?.response) {
    const status = err.response.status ?? '?';
    const code = err.response.data?.code ?? '';
    const msg = err.response.data?.message ?? '';
    return `[${status}${code ? ` ${code}` : ''}] ${msg || err.message || 'unknown'}`;
  }
  return err?.message ?? 'unknown';
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped);
  const setUserFetchError = useAuthStore((s) => s.setUserFetchError);
  const logout = useAuthStore((s) => s.logout);

  const bootStarted = useRef(false);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;

    (async () => {
      try {
        if (!useAuthStore.getState().accessToken) {
          try {
            const { accessToken: newToken } = await AuthService.refresh();
            setTokens(newToken);
          } catch (refreshError) {
            // 토큰 없고 refresh 도 실패 → 비로그인 상태로 부팅 종료
            console.debug('[AuthGate] silent refresh skipped:', describeError(refreshError));
            setBootstrapped(true);
            return;
          }
        }

        try {
          const me = await MemberService.getMe();
          setUser(me);
        } catch (meError) {
          // 토큰은 살아 있지만 사용자 정보 조회 실패 — 토큰을 버리지 않고 에러만 기록한다.
          // 백엔드 /api/v1/member/find/me 가 일시적으로 응답 안 할 때 무한 로그아웃 루프 방지.
          const detail = describeError(meError);
          console.error('[AuthGate] getMe failed during bootstrap:', detail);
          setUserFetchError(detail);
        }
      } catch (fatal) {
        console.error('[AuthGate] fatal bootstrap error:', describeError(fatal));
        logout();
      } finally {
        setBootstrapped(true);
      }
    })();
  }, [setTokens, setUser, setBootstrapped, setUserFetchError, logout]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!accessToken || user) return;
    let cancelled = false;
    MemberService.getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((meError) => {
        if (cancelled) return;
        const detail = describeError(meError);
        console.error('[AuthGate] getMe failed after login:', detail);
        setUserFetchError(detail);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, user, isBootstrapped, setUser, setUserFetchError]);

  return <>{children}</>;
}
