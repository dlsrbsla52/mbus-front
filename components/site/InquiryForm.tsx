'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ContentService } from '@/lib/api/content';
import { extractApiError } from '@/lib/api/result-codes';
import { INQUIRY_PRIVACY_NOTICE } from '@/constants/site';

const digits = (min: number, max: number) => z.string().regex(new RegExp(`^[0-9]{${min},${max}}$`), '숫자만 입력해주세요.');

const inquirySchema = z.object({
  name: z.string().trim().min(1, '성명을 입력해주세요.').max(50, '성명은 50자 이하로 입력해주세요.'),
  phone1: digits(2, 4),
  phone2: digits(3, 4),
  phone3: digits(4, 4),
  email: z.string().trim().email('이메일 형식이 올바르지 않습니다.').max(100),
  content: z.string().trim().min(1, '내용을 입력해주세요.').max(5000, '내용은 5000자 이하로 입력해주세요.'),
  privacyAgreed: z.boolean().refine((v) => v, '개인정보의 수집 및 이용목적에 동의해주세요.'),
});

type InquiryForm = z.infer<typeof inquirySchema>;

const DEFAULTS: InquiryForm = { name: '', phone1: '', phone2: '', phone3: '', email: '', content: '', privacyAgreed: false };

/** 온라인 문의 폼. 기존 사이트 구성(성명·전화번호·이메일·내용·개인정보 동의)을 따른다. */
export default function InquiryForm() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryForm>({ resolver: zodResolver(inquirySchema), defaultValues: DEFAULTS });

  const onSubmit = async (data: InquiryForm) => {
    setResult(null);
    try {
      await ContentService.createInquiry({
        name: data.name,
        phone: `${data.phone1}-${data.phone2}-${data.phone3}`,
        email: data.email,
        content: data.content,
        privacyAgreed: data.privacyAgreed,
      });
      reset(DEFAULTS);
      setResult({ ok: true, message: '문의가 접수되었습니다. 빠르게 연락드리겠습니다.' });
    } catch (error) {
      setResult({ ok: false, message: extractApiError(error, '문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.') });
    }
  };

  const input = 'h-11 w-full border border-[#ccc] px-3 text-[14px] text-[#222] focus:border-site-navy focus:outline-none';
  const label = 'flex items-center justify-center bg-[#fafafa] px-3 py-4 text-center text-[14px] text-[#555]';
  const errorText = (message: string | undefined, id: string) =>
    message && (
      <p id={id} role="alert" className="mt-1.5 text-[12px] text-[#d32f2f]">
        {message}
      </p>
    );
  const phoneError = errors.phone1?.message ?? errors.phone2?.message ?? errors.phone3?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-[1100px]">
      <div className="border-t border-[#666]">
        <div className="grid grid-cols-[90px_1fr] border-b border-[#ddd] md:grid-cols-[180px_1fr]">
          <label htmlFor="inquiry-name" className={label}>
            성명
          </label>
          <div className="p-3">
            <input
              id="inquiry-name"
              {...register('name')}
              className={input}
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'inquiry-name-error' : undefined}
            />
            {errorText(errors.name?.message, 'inquiry-name-error')}
          </div>
        </div>
        <div className="grid grid-cols-[90px_1fr] border-b border-[#ddd] md:grid-cols-[180px_1fr]">
          <span className={label}>전화번호</span>
          <div className="p-3">
            <div className="flex max-w-[500px] items-center gap-1.5">
              <input
                {...register('phone1')}
                inputMode="numeric"
                maxLength={4}
                className={input}
                aria-label="전화번호 앞자리"
                aria-invalid={!!errors.phone1}
                aria-describedby={phoneError ? 'inquiry-phone-error' : undefined}
              />
              <span className="text-[#999]">-</span>
              <input
                {...register('phone2')}
                inputMode="numeric"
                maxLength={4}
                className={input}
                aria-label="전화번호 가운데 자리"
                aria-invalid={!!errors.phone2}
                aria-describedby={phoneError ? 'inquiry-phone-error' : undefined}
              />
              <span className="text-[#999]">-</span>
              <input
                {...register('phone3')}
                inputMode="numeric"
                maxLength={4}
                className={input}
                aria-label="전화번호 끝자리"
                aria-invalid={!!errors.phone3}
                aria-describedby={phoneError ? 'inquiry-phone-error' : undefined}
              />
            </div>
            {errorText(phoneError, 'inquiry-phone-error')}
          </div>
        </div>
        <div className="grid grid-cols-[90px_1fr] border-b border-[#ddd] md:grid-cols-[180px_1fr]">
          <label htmlFor="inquiry-email" className={label}>
            이메일
          </label>
          <div className="p-3">
            <input
              id="inquiry-email"
              type="email"
              {...register('email')}
              className={input}
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'inquiry-email-error' : undefined}
            />
            {errorText(errors.email?.message, 'inquiry-email-error')}
          </div>
        </div>
        <div className="grid grid-cols-[90px_1fr] border-b border-[#ddd] md:grid-cols-[180px_1fr]">
          <label htmlFor="inquiry-content" className={label}>
            내용
          </label>
          <div className="p-3">
            <textarea
              id="inquiry-content"
              {...register('content')}
              rows={7}
              className={`${input} h-auto py-2`}
              aria-invalid={!!errors.content}
              aria-describedby={errors.content ? 'inquiry-content-error' : undefined}
            />
            {errorText(errors.content?.message, 'inquiry-content-error')}
          </div>
        </div>
      </div>

      <section className="border-b border-[#ddd] bg-[#f2f2f2] px-4 py-6 md:px-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <h2 className="text-[14px] font-bold text-[#333]">· 개인정보의 수집 및 이용목적</h2>
          <label className="flex items-center gap-2 text-[13px] text-[#555]">
            <input
              type="checkbox"
              {...register('privacyAgreed')}
              className="h-4 w-4"
              aria-invalid={!!errors.privacyAgreed}
              aria-describedby={errors.privacyAgreed ? 'inquiry-privacy-error' : undefined}
            />
            개인정보의 수집 및 이용목적에 동의합니다.
          </label>
        </div>
        <textarea
          readOnly
          value={INQUIRY_PRIVACY_NOTICE}
          rows={6}
          aria-label="개인정보 수집 및 이용 안내"
          className="mt-4 w-full resize-y border border-[#ddd] bg-white p-4 text-[12px] leading-6 text-[#555]"
        />
        {errorText(errors.privacyAgreed?.message, 'inquiry-privacy-error')}
      </section>

      {result && (
        <p role="status" className={`mt-6 text-center text-[14px] ${result.ok ? 'text-site-navy' : 'text-[#d32f2f]'}`}>
          {result.message}
        </p>
      )}

      <div className="mt-8 text-center">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#333] px-8 py-3 text-[14px] font-medium text-white hover:bg-[#111] disabled:opacity-50"
        >
          {isSubmitting ? '접수 중…' : '문의하기'}
        </button>
      </div>
    </form>
  );
}
