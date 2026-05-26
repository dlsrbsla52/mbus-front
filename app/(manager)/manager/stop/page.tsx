'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import PageSizeSelect, { DEFAULT_PAGE_SIZE } from '@/components/common/PageSizeSelect';
import EmptyState from '@/components/common/EmptyState';
import { StopService, type Stop } from '@/lib/api/stop';
import type { PageResult } from '@/lib/api/types';

export default function ManagerStopListPage() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState<PageResult<Stop> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 매 조회 시작 시 로딩/에러 상태를 초기화한다. 의도된 fetch 로딩 토글이라 규칙 예외.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true);
    setError('');
    StopService.list({
      page,
      size: pageSize,
      ...(submittedKeyword ? { keyword: submittedKeyword } : {}),
    })
      .then(setResult)
      .catch((e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          '정류장 목록을 불러오지 못했습니다.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, submittedKeyword]);

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(0);
    setSubmittedKeyword(keyword.trim());
  };

  const columns: DataTableColumn<Stop>[] = [
    { key: 'arsId', header: 'ARS ID', width: '120px', cell: (s) => <span className="font-mono text-xs">{s.arsId}</span> },
    {
      key: 'name',
      header: '정류장명',
      cell: (s) => (
        <Link href={`/manager/stop/${s.id}`} className="font-semibold text-brand-blue hover:underline">
          {s.name}
        </Link>
      ),
    },
    { key: 'district', header: '자치구', width: '120px', cell: (s) => s.district ?? '—' },
    {
      key: 'location',
      header: '좌표',
      width: '180px',
      cell: (s) => (
        <span className="font-mono text-xs text-brand-gray-500">
          {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="정류장 관리"
        description="등록된 버스 정류장 전체를 검색·확인하고 신규 등록을 진행합니다."
        actions={
          <Link
            href="/manager/stop/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-black px-3 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800"
          >
            <Plus className="h-4 w-4" />
            정류장 등록
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
      <form onSubmit={onSearch} className="flex items-center gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="이름·ARS ID·자치구로 검색"
          className="w-full max-w-sm rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
        <button
          type="submit"
          className="rounded-md border border-brand-gray-300 bg-white px-3 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
        >
          검색
        </button>
        {submittedKeyword && (
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              setSubmittedKeyword('');
              setPage(0);
            }}
            className="text-xs text-brand-gray-500 hover:underline"
          >
            초기화
          </button>
        )}
      </form>

        <PageSizeSelect
          value={pageSize}
          onChange={(size) => {
            setPage(0);
            setPageSize(size);
          }}
        />
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={result?.content ?? []}
        rowKey={(s) => s.id}
        loading={loading}
        empty={
          <EmptyState
            title="등록된 정류장이 없습니다."
            description="공공 API 일괄 등록 또는 단건 등록으로 시작하세요."
            action={
              <Link
                href="/manager/stop/new"
                className="rounded-md bg-brand-black px-3 py-1.5 text-sm font-semibold text-white"
              >
                정류장 등록
              </Link>
            }
          />
        }
      />

      {result && (
        <div className="flex items-center justify-between text-xs text-brand-gray-500">
          <span>
            전체 {result.totalElements.toLocaleString()}건 · {result.page + 1} / {result.totalPages}페이지
          </span>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </div>
      )}
    </>
  );
}
