'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MemberService } from '@/lib/api/member';
import { useAuthStore } from '@/store/useAuthStore';
import { messageForCode } from '@/lib/api/result-codes';

export default function DeactivatePage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onConfirm = async () => {
    if (confirm !== '비활성화') {
      setError('"비활성화" 를 정확히 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await MemberService.deactivate();
      logout();
      router.replace('/');
    } catch (e) {
      const res = (e as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '비활성화에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-6">
        <Link href="/mypage" className="text-xs text-brand-gray-500 hover:underline">
          ← 마이페이지
        </Link>
      </div>
      <h1 className="text-2xl font-black text-brand-black tracking-tight">계정 비활성화</h1>
      <p className="mt-2 text-sm text-brand-gray-600">
        비활성화 후에도 진행 중인 계약과 예약은 유지되지만, 로그인은 불가합니다.
        재로그인 시 관리자에게 재활성화를 요청해야 합니다. 완전한 탈퇴를 원하시면 고객센터로 문의해주세요.
      </p>

      <div className="mt-8 rounded-lg border border-danger/30 bg-danger-soft p-4">
        <p className="text-sm font-bold text-danger">정말로 비활성화 하시겠습니까?</p>
        <p className="mt-1 text-xs text-danger/80">
          계속하려면 아래 입력란에 <span className="font-bold">비활성화</span> 라고 입력하세요.
        </p>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-3 block w-full rounded-md border border-danger/40 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-danger"
          placeholder="비활성화"
        />
        {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="mt-4 w-full rounded-md bg-danger px-3 py-2 text-sm font-bold text-white hover:bg-danger/90 disabled:opacity-50"
        >
          {submitting ? '처리 중…' : '계정 비활성화'}
        </button>
      </div>
    </div>
  );
}
