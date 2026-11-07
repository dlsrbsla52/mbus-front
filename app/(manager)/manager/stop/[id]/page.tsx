'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StopDetailFields from '@/components/manager/stop/StopDetailFields';
import { StopService, type Stop } from '@/lib/api/stop';
import { extractApiError } from '@/lib/api/result-codes';

interface Params {
  id: string;
}

/**
 * 정류장 상세 딥링크 페이지.
 * 목록(`/manager/stop`)에서는 모달로 처리하므로, 이 라우트는 북마크·직접 URL 접근용 대체 경로다.
 */
export default function ManagerStopDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const [stop, setStop] = useState<Stop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true);
    setError('');
    StopService.detail(id)
      .then(setStop)
      .catch((e: unknown) => setError(extractApiError(e, '정류장 정보를 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <PageHeader
        title={stop ? stop.name : `정류장 #${id}`}
        description="정류장 상세 정보입니다."
        actions={
          <Link
            href="/manager/stop"
            className="rounded-md border border-brand-gray-300 px-3 py-2 text-xs font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
          >
            ← 목록으로
          </Link>
        }
      />

      {loading && <p className="text-sm text-brand-gray-500">불러오는 중…</p>}

      {!loading && error && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!loading && !error && !stop && (
        <EmptyState title="정류장을 찾을 수 없습니다." description="삭제되었거나 존재하지 않는 정류장입니다." />
      )}

      {!loading && !error && stop && (
        <div className="max-w-2xl rounded-lg border border-brand-gray-200 bg-white p-6">
          <StopDetailFields stop={stop} />
        </div>
      )}
    </>
  );
}
