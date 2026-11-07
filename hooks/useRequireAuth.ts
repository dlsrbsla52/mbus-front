'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import type { MemberType, Permission } from '@/lib/api/member';
import { authSiteOfPath, loginPathFor } from '@/lib/auth/site';

export interface RequireAuthOptions {
  requirePermission?: Permission;
  requireMemberType?: MemberType | MemberType[];
  requireEmailVerified?: boolean;
}

export function useRequireAuth(options: RequireAuthOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);

  useEffect(() => {
    if (!isBootstrapped) return;

    if (!accessToken) {
      // 관리자 영역은 관리자 로그인으로 보낸다 — 일반 로그인은 관리자 계정을 받지 않는다.
      const loginPath = loginPathFor(authSiteOfPath(pathname));
      router.replace(`${loginPath}?next=${encodeURIComponent(pathname ?? '/')}`);
      return;
    }
    if (!user) return;

    if (options.requireEmailVerified && !user.emailVerified) {
      router.replace('/verify-email');
      return;
    }
    if (
      options.requirePermission &&
      !user.permissions.includes(options.requirePermission)
    ) {
      router.replace('/403');
      return;
    }
    if (options.requireMemberType) {
      const allowed = Array.isArray(options.requireMemberType)
        ? options.requireMemberType
        : [options.requireMemberType];
      if (!allowed.includes(user.memberType)) {
        router.replace('/403');
      }
    }
  }, [
    accessToken,
    user,
    isBootstrapped,
    options.requireEmailVerified,
    options.requirePermission,
    options.requireMemberType,
    pathname,
    router,
  ]);

  return {
    user,
    isReady: isBootstrapped && !!user,
    isBootstrapping: !isBootstrapped,
  };
}
