'use client';

import ProtectedShell from '@/components/auth/ProtectedShell';

export default function NoticeLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedShell requireMemberType={['ADMIN_MASTER', 'ADMIN_DEVELOPER']}>{children}</ProtectedShell>;
}
