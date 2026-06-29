'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthService } from '@/lib/api/auth';
import { extractApiError } from '@/lib/api/result-codes';

const schema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
});

type FormValues = z.infer<typeof schema>;

export default function PasswordResetRequestPage() {
  const [serverError, setServerError] = useState('');
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError('');
      await AuthService.passwordReset.request(data);
      setSent(true);
    } catch (e) {
      setServerError(extractApiError(e, '메일 발송에 실패했습니다.'));
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-noto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-black text-brand-black tracking-tighter">
          비밀번호 재설정
        </h2>
        <p className="mt-2 text-center text-sm text-brand-gray-600 font-medium">
          가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-brand-gray-100">
          {sent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm font-semibold text-success">
                메일이 전송되었습니다. 메일함을 확인하세요.
              </div>
              <Link
                href="/login"
                className="block w-full text-center rounded-lg bg-brand-black px-4 py-3 text-sm font-bold text-white hover:bg-brand-gray-800"
              >
                로그인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {serverError && (
                <div className="p-3 bg-danger-soft text-danger text-sm font-bold rounded-lg border border-danger/30">
                  {serverError}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-brand-gray-700">
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="mt-2 block w-full rounded-lg border border-brand-gray-300 px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-danger font-medium">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-brand-black px-4 py-3 text-sm font-bold text-white hover:bg-brand-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? '전송 중…' : '재설정 메일 전송'}
              </button>
              <p className="text-center text-sm text-brand-gray-600">
                <Link href="/login" className="font-bold text-brand-blue hover:underline">
                  로그인으로 돌아가기
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
