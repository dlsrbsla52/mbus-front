"use client";

import React, { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthService } from '@/lib/api/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { extractApiError } from '@/lib/api/result-codes';

/**
 * 관리자 사이트 로그인.
 *
 * `(manager)` 레이아웃은 `ManagerShell`(인증 가드)로 감싸져 있어, 로그인 페이지는 별도 route group 에 둔다.
 * 관리자 계정만 로그인할 수 있고(일반 계정은 403), 발급된 토큰만 `/api/v1/admin/**` 를 호출할 수 있다.
 */
const loginSchema = z.object({
  loginId: z.string().min(4, '아이디는 최소 4자 이상이어야 합니다.'),
  password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
});

type LoginForm = z.infer<typeof loginSchema>;

function AdminLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setTokens = useAuthStore((state) => state.setTokens);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setServerError('');
      const response = await AuthService.adminLogin(data);
      setTokens(response.accessToken, 'admin');
      const rawNext = searchParams.get('next');
      const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/manager';
      router.push(next);
    } catch (error) {
      setServerError(extractApiError(error, '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.'));
    }
  };

  return (
    <div className="min-h-screen bg-brand-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-noto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-black text-brand-black tracking-tighter">
          MEDIA<span className="text-brand-blue">BUS</span> 관리자
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 font-medium">관리자 계정으로 로그인하세요.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {serverError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100 whitespace-pre-line">
                {serverError}
              </div>
            )}

            <div>
              <label htmlFor="loginId" className="block text-sm font-bold text-gray-700">아이디</label>
              <div className="mt-2">
                <input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  {...register('loginId')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="아이디"
                />
                {errors.loginId && <p className="mt-1 text-sm text-red-600 font-medium">{errors.loginId.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700">비밀번호</label>
              <div className="mt-2">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register('password')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600 font-medium">{errors.password.message}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-black transition-all disabled:opacity-50"
            >
              {isSubmitting ? '로그인 중...' : '관리자 로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginInner />
    </Suspense>
  );
}
