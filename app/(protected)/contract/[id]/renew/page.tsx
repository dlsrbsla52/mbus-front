'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ContractService } from '@/lib/api/contract';
import { messageForCode } from '@/lib/api/result-codes';

interface Params {
  id: string;
}

export default function ContractRenewPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onRenew = async () => {
    setSubmitting(true);
    setError('');
    try {
      const created = await ContractService.renew(id);
      router.replace(`/contract/${created.id}`);
    } catch (e) {
      const res = (e as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '갱신에 실패했습니다.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <div className="mb-4">
        <Link href={`/contract/${id}`} className="text-xs text-brand-gray-500 hover:underline">
          ← 계약 상세
        </Link>
      </div>
      <h1 className="text-2xl font-black text-brand-black tracking-tight">계약 갱신</h1>
      <p className="mt-1 text-sm text-brand-gray-500">
        기존 계약을 기준으로 1년 갱신 계약을 생성합니다. 단가는 현재 시점 정책으로 재산정됩니다.
      </p>

      <div className="mt-6 rounded-lg border border-brand-gray-200 bg-white p-5 text-sm">
        <p className="text-brand-gray-600">
          확인 후 [갱신 계약 생성] 을 누르면 신규 계약이 즉시 생성되며, 결제·서명은 새 계약 화면에서 진행합니다.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Link
          href={`/contract/${id}`}
          className="rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
        >
          취소
        </Link>
        <button
          type="button"
          onClick={onRenew}
          disabled={submitting}
          className="rounded-md bg-brand-black px-4 py-2 text-sm font-bold text-white hover:bg-brand-gray-800 disabled:opacity-50"
        >
          {submitting ? '갱신 중…' : '갱신 계약 생성'}
        </button>
      </div>
    </div>
  );
}
