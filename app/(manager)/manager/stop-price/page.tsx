'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import PageSizeSelect, { DEFAULT_PAGE_SIZE } from '@/components/common/PageSizeSelect';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import { extractApiError } from '@/lib/api/result-codes';
import { StopPriceService } from '@/lib/api/stop-price';
import { StopService, STOP_TYPE_LABEL, type Stop } from '@/lib/api/stop';
import type { PageResult } from '@/lib/api/types';

const formatPrice = (price: number) => `${price.toLocaleString('ko-KR')}원`;

/** 입력값에서 숫자만 남긴다 (서버 전송용 raw 값). */
const digitsOnly = (value: string) => value.replace(/\D/g, '');

/** 입력 표시용 — 숫자만 추출한 뒤 천 단위 콤마를 넣는다. */
const formatPriceInput = (value: string) => {
  const digits = digitsOnly(value);
  return digits ? Number(digits).toLocaleString('ko-KR') : '';
};

/** 단가 빠른 입력 프리셋 (원). */
const PRICE_PRESETS = [150_000, 200_000, 300_000, 500_000];

export default function ManagerStopPricePage() {
  // useSearchParams 는 Suspense 경계를 요구한다.
  return (
    <Suspense fallback={null}>
      <StopPriceManager />
    </Suspense>
  );
}

function StopPriceManager() {
  const searchParams = useSearchParams();
  const initialStopId = searchParams.get('stopId');

  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState<PageResult<Stop> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await StopService.adminList({
        page,
        size: pageSize,
        ...(appliedKeyword ? { keyword: appliedKeyword } : {}),
      });
      setResult(data);
    } catch (e) {
      setError(extractApiError(e, '정류장 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedKeyword]);

  useEffect(() => { load(); }, [load]);

  /**
   * `?stopId=<pk>` 로 진입하면(정류장 관리 상세 모달의 링크) 해당 정류장의 단가 모달을
   * 바로 연다. 목록에는 단가가 이미 포함돼 있으므로 단건 상세만 가져오면 된다. 최초 1회만.
   */
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (!initialStopId || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      try {
        const stop = await StopService.detail(initialStopId);
        if (stop) setSelectedStop(stop);
        else setError('해당 정류장을 찾을 수 없습니다.');
      } catch (e) {
        setError(extractApiError(e, '정류장 정보를 불러오지 못했습니다.'));
      }
    })();
  }, [initialStopId]);

  const onSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedKeyword(keyword.trim());
    setPage(0);
  };

  const onReset = () => {
    setKeyword('');
    setAppliedKeyword('');
    setPage(0);
  };

  /** 단가 등록/수정/삭제 후 목록의 해당 행과 열려 있는 모달 상태를 동기화. */
  const applyStopUpdate = (updated: Stop) => {
    setSelectedStop((prev) => (prev && prev.id === updated.id ? updated : prev));
    setResult((prev) =>
      prev
        ? { ...prev, content: prev.content.map((s) => (s.id === updated.id ? updated : s)) }
        : prev,
    );
  };

  const columns: DataTableColumn<Stop>[] = [
    {
      key: 'name',
      header: '정류장 / ARS ID',
      cell: (s) => (
        <div>
          <p className="font-semibold text-brand-black">{s.name}</p>
          <p className="text-xs text-brand-gray-500">ARS ID {s.arsId}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: '유형',
      width: '120px',
      cell: (s) => (
        <span className="text-xs font-semibold text-brand-gray-600">
          {STOP_TYPE_LABEL[s.stopsType] ?? s.stopsType}
        </span>
      ),
    },
    {
      key: 'price',
      header: '현재 단가',
      width: '150px',
      align: 'right',
      cell: (s) =>
        s.unitPrice != null ? (
          <span className="text-sm font-bold text-brand-blue">{formatPrice(s.unitPrice)}</span>
        ) : (
          <span className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs font-semibold text-brand-gray-500">
            미등록
          </span>
        ),
    },
    {
      key: 'action',
      header: '',
      width: '90px',
      align: 'right',
      cell: () => <span className="text-xs font-semibold text-brand-blue">단가 관리</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="단가 관리"
        description="정류장별 현재 광고 단가를 조회하고 등록·수정·삭제합니다."
      />

      {/* 필터 바 — 검색어 없이도 전체 목록이 로드된다. */}
      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="stop-keyword" className="text-xs font-semibold text-brand-gray-600">
            정류장 검색
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-400" />
            <input
              id="stop-keyword"
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="정류장명 또는 ARS ID"
              className="w-64 rounded-md border border-brand-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:opacity-80"
          >
            검색
          </button>
          {(keyword || appliedKeyword) && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs text-brand-gray-500 hover:underline"
            >
              초기화
            </button>
          )}
        </div>

        <div className="ml-auto flex items-end">
          <PageSizeSelect value={pageSize} onChange={(s) => { setPage(0); setPageSize(s); }} />
        </div>
      </form>

      {error && (
        <div role="alert" className="whitespace-pre-line rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={result?.content ?? []}
        rowKey={(s) => s.id}
        loading={loading}
        onRowClick={(s) => setSelectedStop(s)}
        empty={
          <EmptyState
            title={appliedKeyword ? '검색 결과가 없습니다' : '등록된 정류장이 없습니다'}
            description={
              appliedKeyword
                ? '다른 정류장명 또는 ARS ID로 다시 검색해주세요.'
                : '정류장이 등록되면 이곳에서 단가를 관리할 수 있습니다.'
            }
          />
        }
      />

      {result && (
        <div className="flex items-center justify-between text-xs text-brand-gray-500">
          <span>
            전체 {result.totalElements.toLocaleString()}개 · {result.page + 1} / {result.totalPages}페이지
          </span>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </div>
      )}

      {selectedStop && (
        <StopPriceModal
          stop={selectedStop}
          onClose={() => setSelectedStop(null)}
          onSaved={applyStopUpdate}
        />
      )}
    </>
  );
}

// ─── 단가 등록/수정/삭제 모달 ──────────────────────────────────────────────────

function StopPriceModal({
  stop,
  onClose,
  onSaved,
}: {
  stop: Stop;
  onClose: () => void;
  onSaved: (updated: Stop) => void;
}) {
  // 화면에는 콤마가 포함된 문자열을 보관하고, 전송 직전에 숫자만 뽑아 쓴다.
  const [unitPrice, setUnitPrice] = useState(
    stop.unitPrice != null ? stop.unitPrice.toLocaleString('ko-KR') : '',
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasPrice = stop.unitPrice != null;
  const busy = saving || deleting;

  const savePrice = async () => {
    if (busy) return;
    const digits = digitsOnly(unitPrice);
    const nextUnitPrice = Number(digits);
    if (!digits || !Number.isFinite(nextUnitPrice) || nextUnitPrice <= 0) {
      setError('단가는 0보다 큰 숫자로 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = hasPrice
        ? await StopPriceService.update(stop.id, { unitPrice: nextUnitPrice })
        : await StopPriceService.create({ stopId: stop.id, unitPrice: nextUnitPrice });
      onSaved({ ...stop, unitPrice: saved.unitPrice, updatedAt: saved.updatedAt });
      setUnitPrice(saved.unitPrice.toLocaleString('ko-KR'));
      setSuccess(hasPrice ? '단가를 수정했습니다.' : '단가를 등록했습니다.');
    } catch (e) {
      setError(extractApiError(e, hasPrice ? '단가를 수정하지 못했습니다.' : '단가를 등록하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const deletePrice = async () => {
    if (busy || !hasPrice) return;
    if (!window.confirm(`${stop.name} 정류장의 단가를 삭제할까요?`)) return;
    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      await StopPriceService.remove(stop.id);
      onSaved({ ...stop, unitPrice: null });
      setUnitPrice('');
      setSuccess('단가를 삭제했습니다.');
    } catch (e) {
      setError(extractApiError(e, '단가를 삭제하지 못했습니다.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      size="md"
      title={
        <span className="block">
          {stop.name}
          <span className="ml-2 text-xs font-normal text-brand-gray-500">ARS ID {stop.arsId}</span>
        </span>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-600 hover:bg-brand-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            닫기
          </button>
          {hasPrice && (
            <button
              type="button"
              onClick={deletePrice}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? '삭제 중…' : '단가 삭제'}
            </button>
          )}
          <button
            type="button"
            onClick={savePrice}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            {saving ? '저장 중…' : hasPrice ? '단가 수정' : '단가 등록'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          {hasPrice ? (
            <span className="inline-block rounded-full bg-brand-blue/10 px-3 py-1 text-sm font-bold text-brand-blue">
              현재 {formatPrice(stop.unitPrice as number)}
            </span>
          ) : (
            <span className="inline-block rounded-full bg-brand-gray-100 px-3 py-1 text-sm font-bold text-brand-gray-500">
              단가 미등록
            </span>
          )}
        </div>

        {error && (
          <div role="alert" className="whitespace-pre-line rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div>
          <label htmlFor="unit-price" className="mb-1 block text-xs font-semibold text-brand-gray-600">
            {hasPrice ? '변경할 단가' : '등록할 단가'} (원)
          </label>
          <input
            id="unit-price"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={unitPrice}
            onChange={(event) => setUnitPrice(formatPriceInput(event.target.value))}
            placeholder="예: 1,200,000"
            className="w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />

          {/* 자주 쓰는 단가 — 클릭 시 입력값을 즉시 대체한다. */}
          <div className="mt-2 flex flex-wrap gap-2">
            {PRICE_PRESETS.map((preset) => {
              const label = preset.toLocaleString('ko-KR');
              const active = digitsOnly(unitPrice) === String(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setUnitPrice(label)}
                  disabled={busy}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    active
                      ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                      : 'border-brand-gray-300 text-brand-gray-600 hover:border-brand-blue hover:text-brand-blue'
                  }`}
                >
                  {label}원
                </button>
              );
            })}
          </div>

          {stop.updatedAt && (
            <p className="mt-1 text-xs text-brand-gray-400">
              최종 수정: {new Date(stop.updatedAt).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
