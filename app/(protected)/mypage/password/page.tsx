'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AuthService } from '@/lib/api/auth';
import { extractApiError } from '@/lib/api/result-codes';

const schema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력하세요.'),
    newPassword: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다.'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: '비밀번호가 일치하지 않습니다.',
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      setServerError('');
      await AuthService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setDone(true);
      reset();
    } catch (e) {
      setServerError(extractApiError(e, '비밀번호 변경에 실패했습니다.'));
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-6">
        <Link href="/mypage" className="text-xs text-brand-gray-500 hover:underline">
          ← 마이페이지
        </Link>
      </div>
      <h1 className="text-2xl font-black text-brand-black tracking-tight">비밀번호 변경</h1>
      <p className="mt-1 text-sm text-brand-gray-500">정기적으로 비밀번호를 변경하시면 보안이 강화됩니다.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {serverError && (
          <div className="p-3 bg-danger-soft text-danger text-sm font-bold rounded-lg border border-danger/30">
            {serverError}
          </div>
        )}
        {done && (
          <div className="p-3 bg-success-soft text-success text-sm font-bold rounded-lg border border-success/30">
            비밀번호가 변경되었습니다.
          </div>
        )}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-bold text-brand-gray-700">
            현재 비밀번호
          </label>
          <input
            id="currentPassword"
            type="password"
            {...register('currentPassword')}
            className="mt-2 block w-full rounded-lg border border-brand-gray-300 px-4 py-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-danger">{errors.currentPassword.message}</p>
          )}
        </div>
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
    </div>
  );
}
