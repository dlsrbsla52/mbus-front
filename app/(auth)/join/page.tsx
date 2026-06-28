"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthService } from '@/lib/api/auth';

const joinSchema = z.object({
  memberName: z.string().min(2, '이름은 최소 2자 이상이어야 합니다.').max(10, '이름은 최대 10자까지 입력할 수 있습니다.'),
  loginId: z
    .string()
    .min(4, '아이디는 최소 4자 이상이어야 합니다.')
    .max(50, '아이디는 최대 50자까지 입력할 수 있습니다.')
    .regex(/^[a-zA-Z0-9_]+$/, '아이디는 영문, 숫자, 언더스코어만 사용할 수 있습니다.'),
  email: z.string().email('유효한 이메일을 입력해주세요.'),
  phoneNumber: z
    .string()
    .regex(/^01[016789]\d{7,8}$/, '휴대폰 번호는 하이픈 없이 올바른 번호로 입력해주세요.'),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]+$/,
      '비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.',
    ),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["passwordConfirm"],
});

type JoinFormType = z.infer<typeof joinSchema>;

export default function JoinPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinFormType>({
    resolver: zodResolver(joinSchema),
  });

  const onSubmit = async (data: JoinFormType) => {
    try {
      setServerError('');
      await AuthService.register({
        memberName: data.memberName,
        loginId: data.loginId,
        password: data.password,
        email: data.email,
        phoneNumber: data.phoneNumber,
        memberType: 'MEMBER',
      });

      router.push('/login?success=register');
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? '회원가입 처리 중 오류가 발생했습니다.';
      setServerError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-noto">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-black text-brand-black tracking-tighter">
          사용자 등록
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 font-medium">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-bold text-brand-blue hover:text-blue-600 transition-colors">
            로그인하기
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            {serverError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100">
                {serverError}
              </div>
            )}

            <div>
              <label htmlFor="memberName" className="block text-sm font-bold text-gray-700">이름</label>
              <div className="mt-2">
                <input
                  id="memberName"
                  type="text"
                  {...register('memberName')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="홍길동"
                />
                {errors.memberName && <p className="mt-1 text-sm text-red-600 font-medium">{errors.memberName.message as string}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="loginId" className="block text-sm font-bold text-gray-700">아이디</label>
              <div className="mt-2">
                <input
                  id="loginId"
                  type="text"
                  {...register('loginId')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="아이디"
                />
                {errors.loginId && <p className="mt-1 text-sm text-red-600 font-medium">{errors.loginId.message as string}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700">이메일 주소</label>
              <div className="mt-2">
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="name@company.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600 font-medium">{errors.email.message as string}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-bold text-gray-700">휴대폰 번호</label>
              <div className="mt-2">
                <input
                  id="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  {...register('phoneNumber')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="01012345678"
                />
                {errors.phoneNumber && <p className="mt-1 text-sm text-red-600 font-medium">{errors.phoneNumber.message as string}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700">비밀번호</label>
              <div className="mt-2">
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600 font-medium">{errors.password.message as string}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-bold text-gray-700">비밀번호 확인</label>
              <div className="mt-2">
                <input
                  id="passwordConfirm"
                  type="password"
                  {...register('passwordConfirm')}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  placeholder="••••••••"
                />
                {errors.passwordConfirm && <p className="mt-1 text-sm text-red-600 font-medium">{errors.passwordConfirm.message as string}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-brand-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue transition-all"
              >
                {isSubmitting ? '가입 처리 중...' : '회원가입 완료'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
