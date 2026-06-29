'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ContractService, type Contract } from '@/lib/api/contract';
import { extractApiError } from '@/lib/api/result-codes';

interface Params {
  id: string;
}

export default function ContractDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ContractService.detail(id)
      .then(setContract)
      .catch((e) => {
        setError(extractApiError(e, '계약을 불러오지 못했습니다.'));
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-4">
        <Link href="/contract" className="text-xs text-brand-gray-500 hover:underline">
          ← 내 계약
        </Link>
      </div>
      <h1 className="text-2xl font-black text-brand-black tracking-tight">계약 상세</h1>
      <p className="mt-1 text-sm text-brand-gray-500">#{id}</p>

      {loading && <p className="mt-6 text-sm text-brand-gray-500">불러오는 중…</p>}
      {error && (
        <div className="mt-6 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {contract && (
        <>
          <dl className="mt-6 grid grid-cols-1 gap-y-3 rounded-lg border border-brand-gray-200 bg-white p-5 text-sm">
            <Row label="정류장" value={contract.stopName ?? contract.stopId} />
            <Row label="기간" value={`${contract.startDate} ~ ${contract.endDate}`} />
            <Row label="계약 상태" value={<StatusBadge value={contract.status} />} />
            <Row label="결제 상태" value={contract.paymentStatus ?? '—'} />
            <Row
              label="금액"
              value={contract.amount ? `${contract.amount.toLocaleString()}원` : '—'}
            />
            <Row label="서명일" value={contract.signedAt ?? '미서명'} />
          </dl>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              disabled
              className="rounded-md bg-brand-black px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-gray-800 disabled:opacity-50"
            >
              결제하기 (PG 연동 대기)
            </button>
            <button
              type="button"
              disabled
              className="rounded-md border border-brand-gray-300 px-4 py-2.5 text-sm font-bold text-brand-gray-700 hover:bg-brand-gray-50 disabled:opacity-50"
            >
              전자서명 (캔버스 구현 대기)
            </button>
            <Link
              href={`/contract/${id}/renew`}
              className="rounded-md border border-brand-blue px-4 py-2.5 text-center text-sm font-bold text-brand-blue hover:bg-brand-blue-soft"
            >
              갱신 진행
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-gray-100 pb-2 last:border-b-0 last:pb-0">
      <dt className="font-semibold text-brand-gray-600">{label}</dt>
      <dd className="text-brand-black">{value}</dd>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const tone =
    value === 'ACTIVE'
      ? 'bg-success-soft text-success'
      : value === 'PENDING'
        ? 'bg-warning-soft text-warning'
        : 'bg-brand-gray-100 text-brand-gray-600';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{value}</span>;
}
