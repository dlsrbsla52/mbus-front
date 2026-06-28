'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import PageSizeSelect, { DEFAULT_PAGE_SIZE } from '@/components/common/PageSizeSelect';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import {
  AdminReservationService,
  type AdminReservationRow,
  type AdminReservationDetail,
} from '@/lib/api/admin/reservation';
import { AdminMemberService, type AdminMemberRow } from '@/lib/api/member';
import { RESERVATION_STATUS_LABEL, type ReservationStatus } from '@/lib/api/reservation';
import { messageForCode } from '@/lib/api/result-codes';
import { toApiOffsetDateTime } from '@/lib/api/date-serializer';
import type { PageResult } from '@/lib/api/types';

type ErrRes = { response?: { data?: { code?: string; message?: string } } };

const STATUS_BADGE: Record<ReservationStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONSULTING: 'bg-blue-100 text-brand-blue',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-brand-gray-100 text-brand-gray-500',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status as ReservationStatus] ?? 'bg-brand-gray-100 text-brand-gray-500';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {RESERVATION_STATUS_LABEL[status as ReservationStatus] ?? status}
    </span>
  );
}

function fmtDatetime(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDate(str: string | undefined) {
  if (!str) return '—';
  return str.slice(0, 10);
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}

// ─── 목록 페이지 ──────────────────────────────────────────────────────────────

export default function ManagerReservationPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState<PageResult<AdminReservationRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await AdminReservationService.list({
        page,
        size: pageSize,
        ...(statusFilter ? { status: statusFilter as ReservationStatus } : {}),
        ...(createdFrom ? { createdFrom } : {}),
        ...(createdTo ? { createdTo } : {}),
      });
      setResult(data);
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '예약 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, createdFrom, createdTo]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const onReset = () => {
    setStatusFilter('');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(0);
  };

  const columns: DataTableColumn<AdminReservationRow>[] = [
    {
      key: 'stop',
      header: '정류장',
      cell: (r) => (
        <div>
          <p className="font-semibold text-brand-black">{r.stopName ?? '—'}</p>
          {r.stopNumber && <p className="text-xs text-brand-gray-500">{r.stopNumber}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '96px',
      align: 'center',
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'consultationRequestedAt',
      header: '상담 신청일',
      width: '160px',
      cell: (r) => (
        <span className="text-xs text-brand-gray-600">{fmtDatetime(r.consultationRequestedAt)}</span>
      ),
    },
    {
      key: 'desiredContractStartDate',
      header: '계약 희망일',
      width: '110px',
      cell: (r) => (
        <span className="text-xs text-brand-gray-600">{fmtDate(r.desiredContractStartDate)}</span>
      ),
    },
    {
      key: 'assignee',
      header: '담당자',
      width: '100px',
      cell: (r) =>
        r.assigneeId ? (
          <span className="font-mono text-xs text-brand-gray-500">{r.assigneeId.slice(0, 8)}…</span>
        ) : (
          <span className="text-xs text-brand-gray-400">미배정</span>
        ),
    },
  ];

  const hasFilter = !!(statusFilter || createdFrom || createdTo);

  return (
    <>
      <PageHeader
        title="예약 관리"
        description="전체 예약을 상태·기간별로 검색하고 상담을 관리합니다."
      />

      {/* 필터 바 */}
      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">상태</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          >
            <option value="">전체</option>
            {(Object.keys(RESERVATION_STATUS_LABEL) as ReservationStatus[]).map((s) => (
              <option key={s} value={s}>{RESERVATION_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">신청일 시작</label>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">신청일 종료</label>
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:opacity-80"
          >
            검색
          </button>
          {hasFilter && (
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
          <PageSizeSelect
            value={pageSize}
            onChange={(s) => { setPage(0); setPageSize(s); }}
          />
        </div>
      </form>

      {error && <ErrorBox message={error} />}

      <DataTable
        columns={columns}
        rows={result?.content ?? []}
        rowKey={(r) => r.reservationId}
        loading={loading}
        onRowClick={(r) => setSelectedId(r.reservationId)}
        empty={
          <EmptyState
            title="예약이 없습니다."
            description={hasFilter ? '검색 조건을 변경하거나 초기화해보세요.' : '아직 등록된 예약이 없습니다.'}
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

      {selectedId && (
        <ReservationDetailModal
          reservationId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
        />
      )}
    </>
  );
}

// ─── 예약 상세 모달 ───────────────────────────────────────────────────────────

type ActionPanel = 'status' | 'assign' | 'contract' | null;

function ReservationDetailModal({
  reservationId,
  onClose,
  onUpdated,
}: {
  reservationId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<AdminReservationDetail | null>(null);
  const [assigneeLoginId, setAssigneeLoginId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePanel, setActivePanel] = useState<ActionPanel>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    setAssigneeLoginId(null);
    try {
      const data = await AdminReservationService.detail(reservationId);
      setDetail(data);
      if (data.assigneeId) {
        AdminMemberService.detail(data.assigneeId)
          .then((m) => setAssigneeLoginId(m.memberName ?? m.loginId))
          .catch(() => {});
      }
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '예약 상세를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleActionDone = () => {
    setActivePanel(null);
    loadDetail();
    onUpdated();
  };

  const isDone = detail?.status === 'COMPLETED' || detail?.status === 'CANCELLED';

  return (
    <Modal open onClose={onClose} title="예약 상세" size="lg">
      {loading ? (
        <p className="py-8 text-center text-sm text-brand-gray-400">불러오는 중…</p>
      ) : error ? (
        <ErrorBox message={error} />
      ) : detail ? (
        <div className="flex flex-col gap-5">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-brand-gray-50 p-4">
            <InfoRow label="정류장" value={`${detail.stopName ?? '—'}${detail.stopNumber ? ` (${detail.stopNumber})` : ''}`} />
            <InfoRow label="상태" value={<StatusBadge status={detail.status} />} />
            <InfoRow label="상담 신청일" value={fmtDatetime(detail.consultationRequestedAt)} />
            <InfoRow label="계약 희망일" value={fmtDate(detail.desiredContractStartDate)} />
            <InfoRow label="등록일" value={fmtDatetime(detail.createdAt)} />
            <InfoRow
              label="담당자"
              value={
                detail.assigneeId ? (
                  <span className="font-semibold">
                    {assigneeLoginId ?? '불러오는 중…'}
                  </span>
                ) : (
                  <span className="text-brand-gray-400">미배정</span>
                )
              }
            />
          </div>

          {/* 상담 이력 */}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-gray-500">
              상담 이력 ({detail.consultations.length})
            </p>
            {detail.consultations.length === 0 ? (
              <p className="text-sm text-brand-gray-400">이력이 없습니다.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {detail.consultations.map((c) => (
                  <li
                    key={c.consultationId}
                    className="rounded-md border border-brand-gray-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-brand-gray-500">{fmtDatetime(c.createdAt)}</span>
                    </div>
                    {c.note && <p className="mt-1.5 text-sm text-brand-gray-700">{c.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* 액션 버튼 */}
          {!isDone && (
            <div className="flex flex-wrap gap-2 border-t border-brand-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === 'status' ? null : 'status')}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activePanel === 'status'
                    ? 'border-brand-black bg-brand-black text-white'
                    : 'border-brand-gray-300 bg-white text-brand-gray-700 hover:bg-brand-gray-50'
                }`}
              >
                상태 변경
              </button>
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === 'assign' ? null : 'assign')}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activePanel === 'assign'
                    ? 'border-brand-black bg-brand-black text-white'
                    : 'border-brand-gray-300 bg-white text-brand-gray-700 hover:bg-brand-gray-50'
                }`}
              >
                담당자 배정
              </button>
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === 'contract' ? null : 'contract')}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activePanel === 'contract'
                    ? 'border-brand-blue bg-brand-blue text-white'
                    : 'border-brand-blue bg-white text-brand-blue hover:bg-blue-50'
                }`}
              >
                계약 생성
              </button>
            </div>
          )}

          {/* 인라인 액션 패널 */}
          {activePanel === 'status' && (
            <StatusUpdatePanel
              reservationId={reservationId}
              currentStatus={detail.status}
              onDone={handleActionDone}
              onCancel={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'assign' && (
            <AssignPanel
              reservationId={reservationId}
              currentAssigneeName={assigneeLoginId ?? detail.assigneeId}
              onDone={handleActionDone}
              onCancel={() => setActivePanel(null)}
            />
          )}
          {activePanel === 'contract' && (
            <CompleteToContractPanel
              reservationId={reservationId}
              onDone={() => { handleActionDone(); onClose(); }}
              onCancel={() => setActivePanel(null)}
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-brand-gray-500">{label}</p>
      <div className="mt-0.5 text-sm text-brand-black">{value}</div>
    </div>
  );
}

// ─── 상태 변경 패널 ───────────────────────────────────────────────────────────

function StatusUpdatePanel({
  reservationId,
  currentStatus,
  onDone,
  onCancel,
}: {
  reservationId: string;
  currentStatus: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<ReservationStatus>(currentStatus as ReservationStatus);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await AdminReservationService.updateStatus(reservationId, {
        status,
        note: note.trim() || undefined,
      });
      onDone();
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '상태 변경에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">상태 변경</p>
      {error && <div className="mb-2"><ErrorBox message={error} /></div>}
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">새 상태</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ReservationStatus)}
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          >
            {(Object.entries(RESERVATION_STATUS_LABEL) as [ReservationStatus, string][]).map(
              ([s, label]) => (
                <option key={s} value={s}>{label}</option>
              ),
            )}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">메모 (선택)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="상담 내용이나 메모를 입력하세요"
            className="w-full resize-none rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-brand-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-black px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── 담당자 배정 패널 ─────────────────────────────────────────────────────────

function AssignPanel({
  reservationId,
  currentAssigneeName,
  onDone,
  onCancel,
}: {
  reservationId: string;
  currentAssigneeName?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<AdminMemberRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AdminMemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = async (kw: string) => {
    if (!kw.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      setResults(await AdminMemberService.search(kw.trim()));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onKeywordChange = (v: string) => {
    setKeyword(v);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?.id) return;
    setSaving(true);
    setError('');
    try {
      await AdminReservationService.assign(reservationId, { assigneeId: selected.id });
      onDone();
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '담당자 배정에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">담당자 배정</p>
      {currentAssigneeName && (
        <p className="mb-2 text-xs text-brand-gray-500">
          현재 담당자: <span className="font-semibold text-brand-black">{currentAssigneeName}</span>
        </p>
      )}
      {error && <div className="mb-2"><ErrorBox message={error} /></div>}

      <div className="relative mb-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="어드민 아이디 또는 이메일로 검색"
          className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
        />
        {(searching || results.length > 0) && (
          <ul className="absolute z-10 mt-1 w-full rounded-md border border-brand-gray-200 bg-white shadow-md">
            {searching ? (
              <li className="px-3 py-2 text-sm text-brand-gray-400">검색 중…</li>
            ) : (
              results.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(m);
                      setKeyword(m.loginId);
                      setResults([]);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-brand-gray-50"
                  >
                    <span className="font-semibold text-brand-black">{m.loginId}</span>
                    <span className="text-xs text-brand-gray-500">{m.email}</span>
                    <span className="ml-auto rounded-full bg-brand-gray-100 px-2 py-0.5 text-[10px] font-semibold text-brand-gray-600">
                      {m.memberType}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selected && (
        <p className="mb-3 text-xs text-green-700">
          선택됨: <span className="font-semibold">{selected.loginId}</span>
          <span className="ml-1 text-brand-gray-500">({selected.email})</span>
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-brand-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving || !selected}
          className="rounded-md bg-brand-black px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
        >
          {saving ? '배정 중…' : '배정'}
        </button>
      </div>
    </form>
  );
}

// ─── 계약 생성 패널 ───────────────────────────────────────────────────────────

const PAYMENT_CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: '월납' },
  { value: 'QUARTERLY', label: '분기납' },
  { value: 'ANNUALLY', label: '연납' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'BANK_TRANSFER', label: '계좌이체' },
  { value: 'CARD', label: '카드' },
  { value: 'CASH', label: '현금' },
];

function CompleteToContractPanel({
  reservationId,
  onDone,
  onCancel,
}: {
  reservationId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [contractName, setContractName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [paymentCycle, setPaymentCycle] = useState('MONTHLY');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractStartDate || !contractEndDate) {
      setError('계약 시작일과 종료일을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await AdminReservationService.completeToContract(reservationId, {
        contractName,
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        payAmount: payAmount ? Number(payAmount) : undefined,
        paymentCycle,
        paymentMethod,
        contractStartDate: toApiOffsetDateTime(contractStartDate, '00:00:00'),
        contractEndDate: toApiOffsetDateTime(contractEndDate, '23:59:59'),
        note: note.trim() || undefined,
      });
      onDone();
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '계약 생성에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">계약 생성</p>
      {error && <div className="mb-2"><ErrorBox message={error} /></div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">계약명 *</label>
          <input
            required
            type="text"
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
            placeholder="예: 홍대입구역 광고 계약"
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">총 계약금액 *</label>
          <input
            required
            type="number"
            min={0}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">회당 납부금액</label>
          <input
            type="number"
            min={0}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">납부 주기 *</label>
          <select
            value={paymentCycle}
            onChange={(e) => setPaymentCycle(e.target.value)}
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          >
            {PAYMENT_CYCLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">납부 방법 *</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          >
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">계약 시작일 *</label>
          <input
            required
            type="date"
            value={contractStartDate}
            onChange={(e) => setContractStartDate(e.target.value)}
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">계약 종료일 *</label>
          <input
            required
            type="date"
            value={contractEndDate}
            onChange={(e) => setContractEndDate(e.target.value)}
            className="w-full rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">메모 (선택)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="계약 관련 특이사항"
            className="w-full resize-none rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-brand-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
        >
          {saving ? '생성 중…' : '계약 생성'}
        </button>
      </div>
    </form>
  );
}
