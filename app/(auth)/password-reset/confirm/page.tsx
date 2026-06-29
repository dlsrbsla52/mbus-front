'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthService } from '@/lib/api/auth';
import { extractApiError } from '@/lib/api/result-codes';

const schema = z
  .object({
    newPassword: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: '비밀번호가 일치하지 않습니다.',
  });

type FormValues = z.infer<typeof schema>;

function PasswordResetConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [tokenState, setTokenState] = useState<'checking' | 'valid' | 'invalid'>(() =>
    token ? 'checking' : 'invalid',
  );
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) return;
    AuthService.passwordReset
      .verify({ token })
      .then(() => setTokenState('valid'))
      .catch(() => setTokenState('invalid'));
  }, [token]);

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError('');
      await AuthService.passwordReset.confirm({ token, newPassword: data.newPassword });
      setDone(true);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (e) {
      setServerError(extractApiError(e, '재설정에 실패했습니다.'));
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-noto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-black text-brand-black tracking-tighter">
          새 비밀번호 설정
        </h2>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-brand-gray-100">
          {tokenState === 'checking' && (
            <p className="text-center text-sm text-brand-gray-500">토큰 확인 중…</p>
          )}
          {tokenState === 'invalid' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
                유효하지 않거나 만료된 링크입니다.
              </div>
              <Link
                href="/password-reset/request"
                className="block w-full text-center rounded-lg bg-brand-black px-4 py-3 text-sm font-bold text-white hover:bg-brand-gray-800"
              >
                재설정 메일 다시 받기
              </Link>
            </div>
          )}
          {tokenState === 'valid' && !done && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {serverError && (
                <div className="p-3 bg-danger-soft text-danger text-sm font-bold rounded-lg border border-danger/30">
                  {serverError}
                </div>
              )}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-bold text-brand-gray-700">
                  새 비밀번호
                </label>
                <input
                  id="newPassword"
                  type="password"
                  {...register('newPassword')}
                  className="mt-2 block w-full rounded-lg border border-brand-gray-300 px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-danger">{errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-brand-gray-700">
                  비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className="mt-2 block w-full rounded-lg border border-brand-gray-300 px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-brand-black px-4 py-3 text-sm font-bold text-white hover:bg-brand-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? '변경 중…' : '비밀번호 변경'}
              </button>
            </form>
          )}
          {done && (
            <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-center text-sm font-semibold text-success">
              비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PasswordResetConfirmPage() {
  return (
    <Suspense fallback={null}>
      <PasswordResetConfirmInner />
    </Suspense>
  );
}
