'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthService } from '@/lib/api/auth';
import { extractApiError } from '@/lib/api/result-codes';

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<VerifyState>(() =>
    token ? { kind: 'pending' } : { kind: 'idle' },
  );

  useEffect(() => {
    if (!token) return;
    AuthService.verifyEmail(token)
      .then(() => setState({ kind: 'success' }))
      .catch((e) => {
        setState({
          kind: 'error',
          message: extractApiError(e, '인증에 실패했습니다.'),
        });
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <h1 className="text-2xl font-black text-brand-black tracking-tight">이메일 인증</h1>

      {state.kind === 'idle' && (
        <>
          <p className="mt-4 text-sm text-brand-gray-600">
            가입 시 보낸 메일의 인증 링크를 눌러 인증을 완료해주세요.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/login"
              className="rounded-md bg-brand-black px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-gray-800"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        </>
      )}

      {state.kind === 'pending' && (
        <p className="mt-6 text-sm text-brand-gray-500">인증 처리 중…</p>
      )}

      {state.kind === 'success' && (
        <>
          <div className="mt-6 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            이메일 인증이 완료되었습니다.
          </div>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-md bg-brand-black px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-gray-800"
          >
            로그인하기
          </Link>
        </>
      )}

      {state.kind === 'error' && (
        <>
          <div className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
            {state.message}
          </div>
          <p className="mt-4 text-xs text-brand-gray-500">
            토큰이 만료되었다면 로그인 후 마이페이지에서 인증 메일을 다시 받을 수 있습니다.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-md border border-brand-gray-300 px-4 py-2.5 text-sm font-bold text-brand-gray-700 hover:bg-brand-gray-50"
          >
            로그인으로 돌아가기
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
