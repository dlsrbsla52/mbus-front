'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, KeyRound, LogOut, UserX } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthService } from '@/lib/api/auth';

export default function MyPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } finally {
      logout();
      router.replace('/login');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-black text-brand-black tracking-tight">마이페이지</h1>

      <section className="mt-8 rounded-lg border border-brand-gray-200 bg-white p-5">
        <h2 className="text-sm font-bold text-brand-gray-600">회원 정보</h2>
        <dl className="mt-4 grid grid-cols-1 gap-y-2 text-sm">
          <InfoRow label="아이디" value={user?.loginId} />
          <InfoRow label="휴대폰" value={user?.phoneNumber ?? '—'} />
          <InfoRow
            label="이메일"
            value={
              <>
                {user?.email}
                {user?.emailVerified ? (
                  <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                    인증완료
                  </span>
                ) : (
                  <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger">
                    미인증
                  </span>
                )}
              </>
            }
          />
          <InfoRow label="회원 유형" value={user?.memberType} />
          <InfoRow label="권한" value={user?.permissions?.join(', ')} />
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-brand-gray-200 bg-white">
        <SettingsLink href="/mypage/password" label="비밀번호 변경" icon={<KeyRound className="h-4 w-4" />} />
        <SettingsLink
          href="/mypage/deactivate"
          label="계정 비활성화"
          icon={<UserX className="h-4 w-4" />}
          tone="danger"
        />
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-black px-4 py-3 text-sm font-bold text-white hover:bg-brand-gray-800"
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-gray-100 py-2 last:border-b-0 last:pb-0">
      <dt className="font-semibold text-brand-gray-600">{label}</dt>
      <dd className="text-brand-black">{value ?? '—'}</dd>
    </div>
  );
}

function SettingsLink({
  href,
  label,
  icon,
  tone = 'default',
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-brand-gray-100 px-5 py-4 text-sm last:border-b-0 hover:bg-brand-gray-50"
    >
      <span className={`flex items-center gap-2 ${tone === 'danger' ? 'text-danger' : 'text-brand-black'}`}>
        {icon}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-brand-gray-400" />
    </Link>
  );
}
