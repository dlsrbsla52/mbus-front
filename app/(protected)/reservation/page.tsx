'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import {
  ReservationService,
  RESERVATION_STATUS_LABEL,
  type MyReservation,
} from '@/lib/api/reservation';
import type { PageResult } from '@/lib/api/types';

export default function ReservationListPage() {
  const [page, setPage] = useState<PageResult<MyReservation> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    ReservationService.listMine({ page: 0, size: 20 })
      .then((result) => { if (!cancelled) setPage(result); })
      .catch((e: unknown) => {
        if (cancelled) return;
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? '예약 목록을 불러오지 못했습니다.';
        setError(message);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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
          <li key={r.reservationId} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-bold text-brand-black">
                {r.stopName ?? `정류소 ${r.stopNumber ?? r.stopId}`}
              </p>
              <p className="text-xs text-brand-gray-500">
                상담 희망: {new Date(r.consultationRequestedAt).toLocaleString('ko-KR')}
              </p>
              {r.desiredContractStartDate && (
                <p className="text-xs text-brand-gray-500">
                  계약 시작 희망: {r.desiredContractStartDate}
                </p>
              )}
            </div>
            <span className="rounded-full bg-brand-gray-100 px-3 py-1 text-xs font-bold text-brand-gray-700">
              {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
