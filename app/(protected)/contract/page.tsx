'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ContractService, type Contract } from '@/lib/api/contract';
import type { PageResult } from '@/lib/api/types';

export default function ContractListPage() {
  const [page, setPage] = useState<PageResult<Contract> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ContractService.listMine({ page: 0, size: 20 })
      .then(setPage)
      .catch((e: unknown) => {
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? '계약 목록을 불러오지 못했습니다.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-black text-brand-black tracking-tight">내 계약</h1>

      {loading && <p className="mt-6 text-sm text-brand-gray-500">불러오는 중…</p>}
      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {page && page.content.length === 0 && (
        <p className="mt-6 text-sm text-brand-gray-500">계약 내역이 없습니다.</p>
      )}

      <ul className="mt-6 divide-y divide-brand-gray-100 rounded-lg border border-brand-gray-200 bg-white">
        {page?.content.map((c) => (
          <li key={c.id}>
            <Link
              href={`/contract/${c.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-brand-gray-50"
            >
              <div>
                <p className="text-sm font-bold text-brand-black">
                  {c.stopName ?? `정류소 ${c.stopId}`}
                </p>
                <p className="text-xs text-brand-gray-500">
                  {c.startDate} ~ {c.endDate}
                </p>
              </div>
              <span className="rounded-full bg-brand-gray-100 px-3 py-1 text-xs font-bold text-brand-gray-700">
                {c.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
