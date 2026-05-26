'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth, type RequireAuthOptions } from '@/hooks/useRequireAuth';
import { useAuthStore } from '@/store/useAuthStore';
import { MemberService } from '@/lib/api/member';
import { AuthService } from '@/lib/api/auth';

interface ProtectedShellProps extends RequireAuthOptions {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProtectedShell({
  children,
  fallback,
  ...options
}: ProtectedShellProps) {
  const { isReady, isBootstrapping } = useRequireAuth(options);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const userFetchError = useAuthStore((s) => s.userFetchError);

  if (isReady) {
    return <>{children}</>;
  }

  // 사용자 조회 실패 — 토큰은 있는데 user가 없는 상태 → 명시적 재시도 UI
  if (!isBootstrapping && accessToken && !user && userFetchError) {
    return <UserFetchErrorView detail={userFetchError} />;
  }

  if (fallback) return <>{fallback}</>;
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-brand-gray-500">
      인증 정보를 확인하는 중입니다…
    </div>
  );
}

function UserFetchErrorView({ detail }: { detail: string }) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setUserFetchError = useAuthStore((s) => s.setUserFetchError);
  const logout = useAuthStore((s) => s.logout);
  const [retrying, setRetrying] = useState(false);

  const onRetry = async () => {
    setRetrying(true);
    setUserFetchError(null);
    try {
      const me = await MemberService.getMe();
      setUser(me);
    } catch (e) {
      const err = e as {
        response?: { status?: number; data?: { code?: string; message?: string } };
        message?: string;
      };
      const status = err?.response?.status ?? '?';
      const code = err?.response?.data?.code ?? '';
      const msg = err?.response?.data?.message ?? err?.message ?? 'unknown';
      setUserFetchError(`[${status}${code ? ` ${code}` : ''}] ${msg}`);
    } finally {
      setRetrying(false);
    }
  };

  const onLogout = async () => {
    try {
      await AuthService.logout();
    } catch {
      /* ignore */
    } finally {
      logout();
      router.replace('/login');
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
      <div className="max-w-md rounded-lg border border-danger/30 bg-danger-soft p-6 text-sm text-brand-gray-700">
        <p className="text-base font-bold text-danger">회원 정보를 불러올 수 없습니다.</p>
        <p className="mt-2">
          로그인 토큰은 있으나 <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">/api/v1/member/find/me</code> 호출이 실패했습니다.
          백엔드 iam 서비스 상태 또는 게이트웨이 라우팅을 확인해 주세요.
        </p>
        <pre className="mt-3 overflow-auto rounded bg-white p-2 text-[11px] font-mono text-brand-gray-700">
          {detail}
        </pre>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-brand-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="rounded-md bg-brand-black px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-gray-800 disabled:opacity-50"
          >
            {retrying ? '재시도 중…' : '다시 시도'}
          </button>
        </div>
      </div>
    </div>
  );
}
