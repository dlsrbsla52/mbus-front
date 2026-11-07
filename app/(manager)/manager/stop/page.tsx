'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import PageSizeSelect, { DEFAULT_PAGE_SIZE } from '@/components/common/PageSizeSelect';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import ProtectedShell from '@/components/auth/ProtectedShell';
import StopDetailFields from '@/components/manager/stop/StopDetailFields';
import StopCreatePanel from '@/components/manager/stop/StopCreatePanel';
import StopMapPanel from '@/components/manager/stop/StopMapPanel';
import { extractApiError } from '@/lib/api/result-codes';
import { STOP_TYPE_LABEL, STOP_TYPE_OPTIONS, StopService, type Stop, type StopType } from '@/lib/api/stop';
import type { StopMarker } from '@/lib/api/stop-map';
import type { PageResult } from '@/lib/api/types';

/** 목록에서 정류장을 선택했을 때 지도를 확대할 레벨. */
const FOCUS_LEVEL = 3;

/**
 * 목록 행의 공통 표현.
 *
 * 목록 모드는 `/api/v1/admin/stop`(전체 페이징), 지도 연동 모드는 `/api/v1/stop/map/bounds`
 * (영역 내 경량 DTO)에서 온다. 두 소스의 컬럼을 하나로 맞춰 테이블 정의를 나누지 않는다.
 */
interface StopRow {
  id: string;
  arsId: string;
  name: string;
  latitude: number;
  longitude: number;
  stopsType: StopType;
  /** 목록 모드에서만 존재. 있으면 상세 모달을 재조회 없이 연다. */
  full?: Stop;
}

const rowFromStop = (s: Stop): StopRow => ({
  id: s.id,
  arsId: s.arsId,
  name: s.name,
  latitude: s.latitude,
  longitude: s.longitude,
  stopsType: s.stopsType,
  full: s,
});

const rowFromMarker = (m: StopMarker): StopRow => ({
  id: m.id,
  arsId: m.arsId,
  name: m.name,
  latitude: m.lat,
  longitude: m.lng,
  stopsType: m.stopsType,
});

export default function ManagerStopListPage() {
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<StopType | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState<PageResult<Stop> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [detailStop, setDetailStop] = useState<Stop | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // 지도 ↔ 목록 연동 상태.
  const [mapLinked, setMapLinked] = useState(false);
  const [mapStops, setMapStops] = useState<StopMarker[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; level?: number } | null>(null);

  // 지도 연동 모드에서는 서버 목록을 조회하지 않는다 — 지도 영역 조회 결과를 그대로 쓴다.
  useEffect(() => {
    if (mapLinked) return;
    // 매 조회 시작 시 로딩/에러 상태를 초기화한다. 의도된 fetch 로딩 토글이라 규칙 예외.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setLoading(true);
    setError('');
    StopService.adminList({
      page,
      size: pageSize,
      ...(submittedKeyword ? { keyword: submittedKeyword } : {}),
      ...(typeFilter ? { stopsType: typeFilter } : {}),
    })
      .then(setResult)
      .catch((e: unknown) => setError(extractApiError(e, '정류장 목록을 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
  }, [mapLinked, page, pageSize, submittedKeyword, typeFilter, reloadKey]);

  /**
   * 지도 연동 모드의 행.
   *
   * 유형은 서버(bbox 조회)에서 이미 걸러져 오므로 여기서 다시 거르지 않는다 — 마커와 목록이 어긋나지 않는다.
   * 반면 검색어는 지도 조회 파라미터가 아니라서 영역 내에서 클라이언트로 거른다.
   */
  const mapRows = useMemo(() => {
    const kw = submittedKeyword.toLowerCase();
    return mapStops
      .filter((s) => !kw || s.name.toLowerCase().includes(kw) || s.arsId.includes(kw))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      .map(rowFromMarker);
  }, [mapStops, submittedKeyword]);

  const rows: StopRow[] = mapLinked
    ? mapRows.slice(page * pageSize, page * pageSize + pageSize)
    : (result?.content ?? []).map(rowFromStop);

  const totalElements = mapLinked ? mapRows.length : (result?.totalElements ?? 0);
  const totalPages = mapLinked ? Math.max(1, Math.ceil(mapRows.length / pageSize)) : (result?.totalPages ?? 0);

  const reload = () => setReloadKey((k) => k + 1);

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(0);
    setSubmittedKeyword(keyword.trim());
  };

  /** 목록 행 클릭 — 지도를 해당 정류장으로 이동시킨다. 매번 새 객체라 같은 행을 다시 눌러도 이동한다. */
  const focusOnMap = (row: StopRow) => {
    setSelectedStopId(row.id);
    setFocus({ lat: row.latitude, lng: row.longitude, level: FOCUS_LEVEL });
  };

  /** 상세 모달. 목록 모드는 이미 전체 정보를 갖고 있고, 지도 모드는 경량 DTO라 pk 로 재조회한다. */
  const openDetail = async (row: StopRow) => {
    if (row.full) {
      setDetailStop(row.full);
      return;
    }
    try {
      const stop = await StopService.detail(row.id);
      if (stop) setDetailStop(stop);
      else setError('해당 정류장을 찾을 수 없습니다.');
    } catch (e) {
      setError(extractApiError(e, '정류장 정보를 불러오지 못했습니다.'));
    }
  };

  const columns: DataTableColumn<StopRow>[] = [
    { key: 'arsId', header: 'ARS ID', width: '110px', cell: (s) => <span className="font-mono text-xs">{s.arsId}</span> },
    {
      key: 'name',
      header: '정류장명',
      cell: (s) => (
        <button
          type="button"
          onClick={(e) => {
            // 행 클릭(지도 이동)과 구분해 상세 모달을 연다.
            e.stopPropagation();
            void openDetail(s);
          }}
          className="text-left font-semibold text-brand-blue hover:underline"
        >
          {s.name}
        </button>
      ),
    },
    { key: 'stopsType', header: '유형', width: '100px', cell: (s) => STOP_TYPE_LABEL[s.stopsType] },
    {
      key: 'location',
      header: '좌표',
      width: '150px',
      cell: (s) => (
        <span className="font-mono text-xs text-brand-gray-500">
          {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
        </span>
      ),
    },
  ];

  return (
    <ProtectedShell requireMemberType={["ADMIN_MASTER", "ADMIN_DEVELOPER"]}>
      <PageHeader
        title="정류장 관리"
        description="등록된 버스 정류장 전체를 검색·확인하고 신규 등록을 진행합니다."
        actions={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-black px-3 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800"
          >
            <Plus className="h-4 w-4" />
            정류장 등록
          </button>
        }
      />

      {/* 좌: 지도 / 우: 검색 + 목록. 지도는 스크롤에도 붙어 있게 sticky 처리한다. */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <StopMapPanel
            className="h-[360px] lg:h-[calc(100vh-11rem)]"
            selectedStopId={selectedStopId}
            focus={focus}
            stopsType={typeFilter || null}
            onSelectStop={(marker) => {
              setSelectedStopId(marker.id);
              void openDetail(rowFromMarker(marker));
            }}
            onStopsChange={setMapStops}
          />
          <p className="mt-2 flex items-center gap-1 text-xs text-brand-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            지도를 움직이면 해당 영역의 정류장이 표시됩니다. 목록의 행을 누르면 지도가 이동합니다.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <form onSubmit={onSearch} className="flex min-w-0 items-center gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={mapLinked ? '지도 영역 내에서 검색' : '정류장명 또는 ARS ID로 검색'}
              className="min-w-0 flex-1 rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
            <button
              type="submit"
              className="shrink-0 whitespace-nowrap rounded-md border border-brand-gray-300 bg-white px-3 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
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
                className="shrink-0 whitespace-nowrap text-xs text-brand-gray-500 hover:underline"
              >
                초기화
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* 유형 필터는 지도와 목록에 동시에 적용된다(둘 다 서버에서 걸러진다). */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setPage(0);
                setTypeFilter(e.target.value as StopType | '');
              }}
              aria-label="정류장 유형 필터"
              className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            >
              <option value="">전체 유형</option>
              {STOP_TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-brand-gray-600">
              <input
                type="checkbox"
                checked={mapLinked}
                onChange={(e) => {
                  setPage(0);
                  setMapLinked(e.target.checked);
                }}
                className="h-4 w-4 accent-brand-blue"
              />
              지도 영역만 보기
            </label>

            <PageSizeSelect
              value={pageSize}
              onChange={(size) => {
                setPage(0);
                setPageSize(size);
              }}
            />
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(s) => s.id}
            loading={!mapLinked && loading}
            onRowClick={focusOnMap}
            empty={
              mapLinked ? (
                <EmptyState
                  title="이 영역에 정류장이 없습니다."
                  description="지도를 옮기거나 확대·축소해 다른 영역을 확인하세요."
                />
              ) : (
                <EmptyState
                  title="등록된 정류장이 없습니다."
                  description="공공 API 일괄 등록 또는 단건 등록으로 시작하세요."
                  action={
                    <button
                      type="button"
                      onClick={() => setCreateOpen(true)}
                      className="rounded-md bg-brand-black px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      정류장 등록
                    </button>
                  }
                />
              )
            }
          />

          {(mapLinked || result) && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-gray-500">
              <span>
                {mapLinked ? '지도 영역' : '전체'} {totalElements.toLocaleString()}건 ·{' '}
                {page + 1} / {totalPages}페이지
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </div>

      {detailStop && (
        <Modal
          open
          onClose={() => setDetailStop(null)}
          size="lg"
          title={
            <span className="block">
              {detailStop.name}
              <span className="ml-2 text-xs font-normal text-brand-gray-500">ARS ID {detailStop.arsId}</span>
            </span>
          }
          footer={
            <button
              type="button"
              onClick={() => setDetailStop(null)}
              className="rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
            >
              닫기
            </button>
          }
        >
          <StopDetailFields stop={detailStop} />
        </Modal>
      )}

      {createOpen && (
        <Modal open onClose={() => setCreateOpen(false)} size="lg" title="정류장 등록">
          <StopCreatePanel
            bare
            onCreated={() => {
              setCreateOpen(false);
              reload();
            }}
            onCancel={() => setCreateOpen(false)}
            onBulkCompleted={reload}
          />
        </Modal>
      )}
    </ProtectedShell>
  );
}
