'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import PageSizeSelect, { DEFAULT_PAGE_SIZE } from '@/components/common/PageSizeSelect';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import {
  AdminContractService,
  CONTRACT_PAYMENT_CYCLE_LABEL,
  CONTRACT_PAYMENT_METHOD_LABEL,
  CONTRACT_PAYMENT_STATUS_LABEL,
  CONTRACT_STATUS_LABEL,
  type AdminBusinessContract,
  type AdminContractStatus,
  type ContractMemberSummary,
  type ContractPaymentStatus,
} from '@/lib/api/admin/contract';
import {
  CommissionService,
  type CommissionRateHistoryResponse,
  type ContractCommissionOverrideResponse,
} from '@/lib/api/admin/commission';
import { AdminMemberService, MEMBER_TYPE_LABEL, type MemberSearchItem } from '@/lib/api/member';
import { extractApiError } from '@/lib/api/result-codes';
import type { PageResult } from '@/lib/api/types';

const STATUS_BADGE: Record<AdminContractStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-brand-gray-100 text-brand-gray-500',
  CANCELLED: 'bg-danger-soft text-danger',
};

const PAYMENT_BADGE: Record<ContractPaymentStatus, string> = {
  UNPAID: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-danger-soft text-danger',
};

function StatusBadge({ status }: { status: AdminContractStatus }) {
  const cls = STATUS_BADGE[status] ?? 'bg-brand-gray-100 text-brand-gray-500';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {CONTRACT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function PaymentBadge({ status }: { status?: ContractPaymentStatus | null }) {
  if (!status) return <span className="text-xs text-brand-gray-400">—</span>;
  const cls = PAYMENT_BADGE[status] ?? 'bg-brand-gray-100 text-brand-gray-500';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {CONTRACT_PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

function fmtDatetime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtAmount(amount?: number | null) {
  if (amount === null || amount === undefined) return '—';
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 영업사원 검색 결과를 한 번에 보여줄 개수. */
const MEMBER_SEARCH_SIZE = 20;

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}

// ─── 목록 페이지 ──────────────────────────────────────────────────────────────

export default function ManagerContractPage() {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  /** 조회 조건에 맞는 전체 건수. 첫 페이지만 보여주므로 잘림 안내에 쓴다. */
  const [searchTotal, setSearchTotal] = useState<number | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [member, setMember] = useState<ContractMemberSummary | null>(null);
  const [result, setResult] = useState<PageResult<AdminBusinessContract> | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedContract, setSelectedContract] = useState<AdminBusinessContract | null>(null);
  const requestIdRef = useRef(0);

  const searchMembers = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = keyword.trim();
    setSearching(true);
    setError('');
    try {
      // 어드민 전용 검색 엔드포인트 — 일반/기업 회원은 애초에 결과에 포함되지 않는다.
      // keyword 를 생략하면 어드민 전체 목록의 첫 페이지가 내려온다.
      const data = await AdminMemberService.searchAdmins({
        page: 0,
        size: MEMBER_SEARCH_SIZE,
        ...(query ? { keyword: query } : {}),
      });
      setSearchResults(data.content);
      setSearchTotal(data.totalElements);
      setSearched(true);
    } catch (e) {
      setSearchResults([]);
      setSearchTotal(null);
      setError(extractApiError(e, '회원을 검색하지 못했습니다.'));
    } finally {
      setSearching(false);
    }
  };

  const load = useCallback(async (memberId: string, nextPage: number, size: number) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const data = await AdminContractService.listByMember(memberId, { page: nextPage, size });
      if (requestIdRef.current !== requestId) return;
      setMember(data.member);
      setResult(data.contracts);
    } catch (e) {
      if (requestIdRef.current !== requestId) return;
      setResult(null);
      setError(extractApiError(e, '계약 목록을 불러오지 못했습니다.'));
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedMemberId) return;
    load(selectedMemberId, page, pageSize);
  }, [selectedMemberId, page, pageSize, load]);

  const selectMember = (row: MemberSearchItem) => {
    if (!row.memberId) {
      setError('회원 ID를 확인할 수 없습니다.');
      return;
    }
    setSelectedMemberId(row.memberId);
    setSearchResults([]);
    setSearchTotal(null);
    setSearched(false);
    setKeyword(row.loginId);
    setStatusFilter('');
    setPage(0);
    setResult(null);
    setMember(null);
  };

  const rows = statusFilter
    ? (result?.content ?? []).filter((c) => c.status === statusFilter)
    : (result?.content ?? []);

  const columns: DataTableColumn<AdminBusinessContract>[] = [
    {
      key: 'contract',
      header: '계약명',
      cell: (c) => (
        <div>
          <p className="font-semibold text-brand-black">{c.contractName}</p>
          <p className="font-mono text-[11px] text-brand-gray-400">{c.id.slice(0, 8)}…</p>
        </div>
      ),
    },
    {
      key: 'stop',
      header: '정류장',
      cell: (c) => (
        <div>
          <p className="text-sm text-brand-black">{c.stopName ?? '—'}</p>
          {c.stopNumber && <p className="text-xs text-brand-gray-500">{c.stopNumber}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '92px',
      align: 'center',
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'period',
      header: '계약 기간',
      width: '190px',
      cell: (c) => (
        <span className="text-xs text-brand-gray-600">
          {fmtDate(c.contractStartDate)} ~ {fmtDate(c.contractEndDate)}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: '총 계약금액',
      width: '130px',
      align: 'right',
      cell: (c) => <span className="text-sm text-brand-black">{fmtAmount(c.totalAmount)}</span>,
    },
    {
      key: 'paymentStatus',
      header: '납부',
      width: '100px',
      align: 'center',
      cell: (c) => <PaymentBadge status={c.paymentStatus} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="계약 관리"
        description="영업사원별 계약 현황을 조회하고 계약별 정산 비율을 관리합니다."
      />

      <div className="flex flex-col gap-6">
        {/* 영업사원 검색 */}
        <form onSubmit={searchMembers} className="rounded-lg border border-brand-gray-200 bg-white p-5">
          <label htmlFor="member-keyword" className="mb-2 block text-sm font-bold text-brand-black">
            영업사원 검색
            <span className="ml-2 text-xs font-normal text-brand-gray-500">
              관리자 계정만 조회됩니다
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-400" />
              <input
                id="member-keyword"
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="로그인 아이디 · 이메일 · 이름 (비워두면 전체 조회)"
                className="w-full rounded-md border border-brand-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching ? '검색 중…' : keyword.trim() ? '검색' : '전체 조회'}
            </button>
          </div>

          {searched && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-brand-gray-500">검색 결과가 없습니다.</p>
          )}

          {searchResults.length > 0 && (
            <ul className="mt-3 divide-y divide-brand-gray-100 rounded-md border border-brand-gray-200">
              {searchResults.map((m) => (
                <li key={m.memberId || m.loginId}>
                  <button
                    type="button"
                    onClick={() => selectMember(m)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-gray-50"
                  >
                    <span className="text-sm font-semibold text-brand-black">{m.loginId}</span>
                    {m.memberName && (
                      <span className="text-xs text-brand-gray-600">{m.memberName}</span>
                    )}
                    <span className="text-xs text-brand-gray-500">{m.email}</span>
                    <span className="ml-auto rounded-full bg-brand-gray-100 px-2 py-0.5 text-[10px] font-semibold text-brand-gray-600">
                      {MEMBER_TYPE_LABEL[m.memberType] ?? m.memberType}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* 첫 페이지만 보여주므로, 잘린 경우 안내한다. */}
          {searchTotal !== null && searchTotal > searchResults.length && (
            <p className="mt-2 text-xs text-brand-gray-500">
              전체 {searchTotal.toLocaleString('ko-KR')}명 중 {searchResults.length}명 표시 —
              찾는 영업사원이 없으면 검색어를 좁혀주세요.
            </p>
          )}
        </form>

        {error && <ErrorBox message={error} />}

        {selectedMemberId ? (
          <>
            {member && (
              <section className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-brand-gray-200 bg-white px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-brand-black">{member.loginId}</h2>
                  <p className="mt-1 text-xs text-brand-gray-500">
                    {member.email} · {MEMBER_TYPE_LABEL[member.memberType] ?? member.memberType}
                  </p>
                </div>
                <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-sm font-bold text-brand-blue">
                  계약 {(result?.totalElements ?? 0).toLocaleString('ko-KR')}건
                </span>
              </section>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="status-filter" className="text-xs font-semibold text-brand-gray-600">
                  상태 (현재 페이지 내 필터)
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
                >
                  <option value="">전체</option>
                  {(Object.keys(CONTRACT_STATUS_LABEL) as AdminContractStatus[]).map((s) => (
                    <option key={s} value={s}>{CONTRACT_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
              <div className="ml-auto flex items-end">
                <PageSizeSelect
                  value={pageSize}
                  onChange={(s) => { setPage(0); setPageSize(s); }}
                />
              </div>
            </div>

            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(c) => c.id}
              loading={loading}
              onRowClick={(c) => setSelectedContract(c)}
              empty={
                <EmptyState
                  title="계약이 없습니다."
                  description={
                    statusFilter
                      ? '현재 페이지에 해당 상태의 계약이 없습니다.'
                      : '이 영업사원에게 등록된 계약이 없습니다.'
                  }
                />
              }
            />

            {result && result.totalPages > 0 && (
              <div className="flex items-center justify-between text-xs text-brand-gray-500">
                <span>
                  전체 {result.totalElements.toLocaleString('ko-KR')}건 · {result.page + 1} / {result.totalPages}페이지
                </span>
                <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="영업사원을 선택하세요"
            description="계약은 영업사원 단위로 조회합니다. 아이디·이메일·이름으로 검색하거나, 검색어 없이 조회해 전체 목록에서 선택해주세요."
          />
        )}
      </div>

      {selectedContract && (
        <ContractDetailModal
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </>
  );
}

// ─── 계약 상세 모달 ───────────────────────────────────────────────────────────

function ContractDetailModal({
  contract,
  onClose,
}: {
  contract: AdminBusinessContract;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={contract.contractName} size="lg">
      <div className="flex flex-col gap-6">
        <section>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">계약 정보</p>
          <dl className="divide-y divide-brand-gray-100 rounded-lg border border-brand-gray-200">
            <InfoRow label="계약 ID" value={<span className="font-mono text-xs">{contract.id}</span>} />
            <InfoRow label="상태" value={<StatusBadge status={contract.status} />} />
            <InfoRow
              label="정류장"
              value={
                contract.stopName
                  ? `${contract.stopName}${contract.stopNumber ? ` (${contract.stopNumber})` : ''}`
                  : '정류소 정보 없음'
              }
            />
            <InfoRow
              label="계약 기간"
              value={`${fmtDate(contract.contractStartDate)} ~ ${fmtDate(contract.contractEndDate)}`}
            />
            <InfoRow label="총 계약금액" value={fmtAmount(contract.totalAmount)} />
            <InfoRow label="분할납 1회 금액" value={fmtAmount(contract.payAmount)} />
            <InfoRow
              label="납부 주기"
              value={contract.paymentCycle ? CONTRACT_PAYMENT_CYCLE_LABEL[contract.paymentCycle] ?? contract.paymentCycle : '—'}
            />
            <InfoRow
              label="납부 방법"
              value={contract.paymentMethod ? CONTRACT_PAYMENT_METHOD_LABEL[contract.paymentMethod] ?? contract.paymentMethod : '—'}
            />
            <InfoRow label="납부 상태" value={<PaymentBadge status={contract.paymentStatus} />} />
            <InfoRow label="납부 완료 금액" value={fmtAmount(contract.paidAmount)} />
            <InfoRow label="납부 완료 일시" value={fmtDatetime(contract.paidAt)} />
            <InfoRow label="계약 생성일시" value={fmtDatetime(contract.createdAt)} />
          </dl>
        </section>

        <ContractCommissionPanel contractId={contract.id} memberId={contract.memberId} />
      </div>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5">
      <dt className="w-32 shrink-0 text-xs font-semibold text-brand-gray-600">{label}</dt>
      <dd className="text-sm text-brand-black">{value}</dd>
    </div>
  );
}

// ─── 계약별 정산 비율 오버라이드 ──────────────────────────────────────────────

function ContractCommissionPanel({ contractId, memberId }: { contractId: string; memberId: string }) {
  const [override, setOverride] = useState<ContractCommissionOverrideResponse | null>(null);
  const [history, setHistory] = useState<CommissionRateHistoryResponse[]>([]);
  const [rate, setRate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, hist] = await Promise.all([
        CommissionService.getContractOverride(contractId),
        CommissionService.getContractHistory(contractId),
      ]);
      setOverride(ov);
      setHistory(hist);
      setRate(ov ? String(ov.commissionRate) : '');
    } catch (e) {
      setError(extractApiError(e, '정산 비율 정보를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    const nextRate = parseFloat(rate);
    if (!Number.isFinite(nextRate) || nextRate < 0 || nextRate > 100) {
      setError('정산 비율은 0~100 사이의 숫자여야 합니다.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await CommissionService.upsertContractOverride(contractId, {
        memberId,
        rate: nextRate,
        reason: reason.trim() || undefined,
      });
      setReason('');
      setSuccess('계약별 정산 비율이 저장되었습니다.');
      await load();
    } catch (e) {
      setError(extractApiError(e, '정산 비율 저장에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">
        계약별 정산 비율 오버라이드
      </p>

      <div className="flex flex-col gap-4">
        {error && <ErrorBox message={error} />}
        {success && (
          <div role="status" className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-brand-gray-400">불러오는 중…</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-brand-gray-100 bg-brand-gray-50 px-4 py-3">
                {override ? (
                  <>
                    <p className="text-xs font-semibold text-brand-gray-500">현재 오버라이드</p>
                    <p className="mt-1 text-2xl font-bold text-brand-black">{override.commissionRate}%</p>
                    <p className="text-[10px] text-brand-gray-400">
                      최종 수정: {fmtDatetime(override.updatedAt)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-brand-gray-400">
                    오버라이드 없음 — 영업사원 기본율이 적용됩니다.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="override-rate" className="mb-1 block text-xs font-semibold text-brand-gray-600">
                    오버라이드 비율 (%)
                  </label>
                  <input
                    id="override-rate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="예: 15.00"
                    className="w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
                <div>
                  <label htmlFor="override-reason" className="mb-1 block text-xs font-semibold text-brand-gray-600">
                    변경 사유 (선택)
                  </label>
                  <input
                    id="override-reason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    placeholder="사유를 입력하세요"
                    className="w-full rounded-md border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-brand-gray-400">
                  적용 우선순위: 계약 오버라이드 &gt; 영업사원 기본율 &gt; 시스템 기본값(10%)
                </p>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="shrink-0 rounded-md bg-brand-black px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">변경 이력</p>
              {history.length === 0 ? (
                <p className="text-sm text-brand-gray-400">이력 없음</p>
              ) : (
                <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                  {history.map((h) => (
                    <li key={h.id} className="rounded-md border border-brand-gray-100 bg-brand-gray-50 px-3 py-2">
                      <p className="text-xs font-semibold text-brand-black">
                        {h.previousRate !== undefined && h.previousRate !== null
                          ? `${h.previousRate}% → `
                          : '최초 설정 → '}
                        {h.newRate}%
                      </p>
                      {h.reason && <p className="mt-1 text-[11px] text-brand-gray-500">{h.reason}</p>}
                      <p className="mt-1 text-[10px] text-brand-gray-400">{fmtDatetime(h.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
