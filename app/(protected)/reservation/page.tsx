'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ReservationService, type Reservation } from '@/lib/api/reservation';
import type { PageResult } from '@/lib/api/types';

export default function ReservationListPage() {
  const [page, setPage] = useState<PageResult<Reservation> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ReservationService.listMine({ page: 0, size: 20 })
      .then(setPage)
      .catch((e: unknown) => {
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? '예약 목록을 불러오지 못했습니다.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-black tracking-tight">내 예약</h1>
        <Link
          href="/reservation/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-black px-3 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800"
        >
          <Plus className="h-4 w-4" />
          예약하기
        </Link>
      </div>

      {loading && <p className="mt-6 text-sm text-brand-gray-500">불러오는 중…</p>}
      {error && <p className="mt-6 text-sm text-danger">{error}</p>}

      {page && page.content.length === 0 && (
        <p className="mt-6 text-sm text-brand-gray-500">예약 내역이 없습니다.</p>
      )}

      <ul className="mt-6 divide-y divide-brand-gray-100 rounded-lg border border-brand-gray-200 bg-white">
        {page?.content.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-bold text-brand-black">정류소 {r.stopId}</p>
              <p className="text-xs text-brand-gray-500">
                {r.startAt} ~ {r.endAt}
              </p>
            </div>
            <span className="rounded-full bg-brand-gray-100 px-3 py-1 text-xs font-bold text-brand-gray-700">
              {r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
