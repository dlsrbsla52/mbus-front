'use client';

import useSWR from 'swr';
import { useState } from 'react';
import Link from 'next/link';
import ProtectedShell from '@/components/auth/ProtectedShell';
import FormField, { Select, TextInput } from '@/components/common/FormField';
import { CONTRACT_CREATE_NAV, CONTRACT_MANAGE_NAV } from '@/constants/navigation';
import { useAuthStore } from '@/store/useAuthStore';
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
  UUID_PATTERN,
  type AdminBusinessContract,
  type AdminContractStatus,
  type AdminContractStatusTarget,
  type AdminContractSearchParams,
  type ContractPaymentStatus,
} from '@/lib/api/admin/contract';
import { CommissionService } from '@/lib/api/admin/commission';
import { extractApiError } from '@/lib/api/result-codes';

const STATUS_BADGE: Record<AdminContractStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-brand-gray-100 text-brand-gray-500',
  CANCELLED: 'bg-danger-soft text-danger',
};

const STATUS_TRANSITIONS: Record<AdminContractStatus, readonly AdminContractStatusTarget[]> = {
  PENDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['EXPIRED', 'CANCELLED'],
  EXPIRED: [],
  CANCELLED: [],
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

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}

// ─── 목록 페이지 ──────────────────────────────────────────────────────────────

export default function ManagerContractPage() {
  const canManage = useAuthStore((state) =>
    state.hasPermission(CONTRACT_MANAGE_NAV.requirePermission) && state.hasMemberType(CONTRACT_MANAGE_NAV.requireMemberType),
  );

  return (
    <ProtectedShell requirePermission={CONTRACT_MANAGE_NAV.requirePermission} requireMemberType={CONTRACT_MANAGE_NAV.requireMemberType}>
      {canManage && <ContractList />}
    </ProtectedShell>
  );
}

const INITIAL_SEARCH = { page: 0, size: DEFAULT_PAGE_SIZE };

function ContractList() {
  const canCreate = useAuthStore((state) => state.hasPermission('WRITE'));
  const [filters, setFilters] = useState<AdminContractSearchParams>(INITIAL_SEARCH);
  const [filterError, setFilterError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: result, isLoading, error, mutate } = useSWR(
    ['admin-contract-search', filters] as const,
    ([, query]) => AdminContractService.search(query),
    { revalidateOnMount: true },
  );

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const read = (name: string) => String(fields.get(name) ?? '').trim() || undefined;
    const startFrom = read('startFrom');
    const startThrough = read('startThrough');
    if (startFrom && startThrough && startFrom > startThrough) {
      setFilterError('시작일 검색 범위의 마지막 날짜는 첫 날짜와 같거나 이후여야 합니다.');
      return;
    }
    setFilterError('');
    setFilters({
      page: 0,
      size: filters.size,
      keyword: read('keyword'),
      status: read('status') as AdminContractStatus | undefined,
      memberId: read('memberId'),
      stopId: read('stopId'),
      startFrom,
      startThrough,
    });
  };

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
        description="계약 현황을 조회하고 계약별 정산 비율을 관리합니다."
        actions={canCreate && (
          <Link href={CONTRACT_CREATE_NAV.href} className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white">
            계약 등록
          </Link>
        )}
      />

      <form onSubmit={search} className="grid gap-3 rounded-lg border border-brand-gray-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="계약명" htmlFor="contract-keyword">
          <TextInput id="contract-keyword" name="keyword" type="search" maxLength={100} />
        </FormField>
        <FormField label="계약 상태" htmlFor="contract-status">
          <Select id="contract-status" name="status">
            <option value="">전체</option>
            {Object.entries(CONTRACT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="계약 회원 ID" htmlFor="contract-member">
          <TextInput id="contract-member" name="memberId" pattern={UUID_PATTERN} />
        </FormField>
        <FormField label="정류장 ID" htmlFor="contract-stop">
          <TextInput id="contract-stop" name="stopId" pattern={UUID_PATTERN} />
        </FormField>
        <FormField label="계약 시작일 조회 시작" htmlFor="contract-from">
          <TextInput id="contract-from" name="startFrom" type="date" max="9999-12-31" />
        </FormField>
        <FormField label="계약 시작일 조회 종료" htmlFor="contract-through">
          <TextInput id="contract-through" name="startThrough" type="date" max="9999-12-31" />
        </FormField>
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white">검색</button>
          <button type="reset" onClick={() => {
            setFilters(INITIAL_SEARCH);
            setFilterError('');
          }} className="rounded-md border border-brand-gray-200 px-4 py-2 text-sm">초기화</button>
        </div>
      </form>

      {filterError && <ErrorBox message={filterError} />}
      {error ? (
        <div className="flex items-center gap-3">
          <ErrorBox message={extractApiError(error, '계약 목록을 불러오지 못했습니다.')} />
          <button type="button" className="text-sm underline" onClick={() => void mutate()}>다시 시도</button>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <PageSizeSelect value={filters.size ?? DEFAULT_PAGE_SIZE} onChange={(size) => setFilters({ ...filters, page: 0, size })} />
          </div>
          <DataTable
            columns={columns}
            rows={result?.content ?? []}
            rowKey={(contract) => contract.id}
            loading={isLoading}
            onRowClick={(contract) => setSelectedId(contract.id)}
            empty={<EmptyState title="조회된 계약이 없습니다." />}
          />
          {result && result.totalPages > 0 && (
            <div className="flex items-center justify-between text-xs text-brand-gray-500">
              <span>전체 {result.totalElements.toLocaleString('ko-KR')}건</span>
              <Pagination page={result.page} totalPages={result.totalPages} onChange={(page) => setFilters({ ...filters, page })} />
            </div>
          )}
        </>
      )}

      {selectedId && (
        <ContractDetailModal id={selectedId} onClose={() => setSelectedId(null)} refreshList={mutate} />
      )}
    </>
  );
}

// ─── 계약 상세 모달 ───────────────────────────────────────────────────────────

function ContractDetailModal({
  id,
  onClose,
  refreshList,
}: {
  id: string;
  onClose: () => void;
  refreshList: () => Promise<unknown>;
}) {
  const canUpdate = useAuthStore((state) => state.hasPermission('WRITE'));
  const userId = useAuthStore((state) => state.user?.id);
  const canManageOthers = useAuthStore((state) =>
    state.user?.memberType !== 'ADMIN_USER' && state.hasPermission('MANAGE'),
  );
  const { data: contract, error, mutate } = useSWR(
    ['admin-contract-detail', id] as const,
    ([, contractId]) => AdminContractService.detail(contractId),
  );
  const refreshContract = async () => {
    await Promise.all([mutate(), refreshList()]);
  };

  return (
    <Modal open onClose={onClose} title={contract?.contractName ?? '계약 상세'} size="lg">
      {error ? (
        <div className="flex items-center gap-3">
          <ErrorBox message={extractApiError(error, '계약 상세를 불러오지 못했습니다.')} />
          <button type="button" className="text-sm underline" onClick={() => void mutate()}>다시 시도</button>
        </div>
      ) : contract ? (
        <ContractDetail
          contract={contract}
          canChangeStatus={canUpdate && (canManageOthers || contract.managerId === userId)}
          onUpdated={refreshContract}
        />
      ) : <p role="status">불러오는 중…</p>}
    </Modal>
  );
}

function ContractDetail({
  contract,
  canChangeStatus,
  onUpdated,
}: {
  contract: AdminBusinessContract;
  canChangeStatus: boolean;
  onUpdated: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">계약 정보</p>
        <dl className="divide-y divide-brand-gray-100 rounded-lg border border-brand-gray-200">
          <InfoRow label="계약 ID" value={<span className="font-mono text-xs">{contract.id}</span>} />
          <InfoRow label="계약 회원 ID" value={contract.memberId ?? '—'} />
          <InfoRow label="영업 담당자 ID" value={contract.managerId ?? '—'} />
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
          <InfoRow label="납부 완료 금액" value={fmtAmount(contract.paidAmount)} />
          <InfoRow label="납부 완료 일시" value={fmtDatetime(contract.paidAt)} />
          <InfoRow label="계약 생성일시" value={fmtDatetime(contract.createdAt)} />
        </dl>
      </section>

      <div className="grid gap-4 rounded-lg border border-brand-gray-200 p-4 sm:grid-cols-2">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-gray-600">계약 상태</p>
            <StatusBadge status={contract.status} />
          </div>
          {canChangeStatus && <ContractStatusForm contract={contract} onUpdated={onUpdated} />}
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand-gray-600">납부 상태</p>
            <PaymentBadge status={contract.paymentStatus} />
          </div>
          {canChangeStatus && <ContractPaymentStatusForm contractId={contract.id} onUpdated={onUpdated} />}
        </div>
      </div>
      <ContractCommissionPanel key={contract.id} contractId={contract.id} managerId={contract.managerId} />
    </div>
  );
}

function ContractStatusForm({
  contract,
  onUpdated,
}: {
  contract: AdminBusinessContract;
  onUpdated: () => Promise<void>;
}) {
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const options = STATUS_TRANSITIONS[contract.status] ?? [];
  const target = options.find((option) => option === status);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target || saving) return;
    const fields = new FormData(event.currentTarget);
    const cancelReason = String(fields.get('cancelReason') ?? '').trim();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await AdminContractService.updateStatus(contract.id, {
        status: target,
        cancelReason: target === 'CANCELLED' ? cancelReason || undefined : undefined,
      });
      setStatus('');
      setSuccess('계약 상태가 변경되었습니다.');
    } catch (error) {
      setError(extractApiError(error, '계약 상태를 변경하지 못했습니다.'));
      setSaving(false);
      return;
    }
    try {
      await onUpdated();
    } catch (error) {
      setError(extractApiError(error, '변경된 계약 정보를 불러오지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  if (options.length === 0 && !success && !error) return null;

  return (
    <section>
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      {error && <ErrorBox message={error} />}
      {options.length > 0 && (
        <form onSubmit={submit} className="flex flex-col items-start gap-3">
          <FormField label="계약 상태 변경" htmlFor="contract-next-status">
            <Select
              id="contract-next-status"
              value={target ?? ''}
              onChange={(event) => setStatus(event.target.value)}
              disabled={saving}
              required
            >
              <option value="">상태 선택</option>
              {options.map((option) => <option key={option} value={option}>{CONTRACT_STATUS_LABEL[option]}</option>)}
            </Select>
          </FormField>
          {target === 'CANCELLED' && (
            <FormField label="취소 사유 (선택)" htmlFor="contract-cancel-reason">
              <TextInput id="contract-cancel-reason" name="cancelReason" maxLength={500} disabled={saving} />
            </FormField>
          )}
          <button
            type="submit"
            disabled={!target || saving}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? '변경 중…' : '상태 변경'}
          </button>
        </form>
      )}
    </section>
  );
}

function ContractPaymentStatusForm({
  contractId,
  onUpdated,
}: {
  contractId: string;
  onUpdated: () => Promise<void>;
}) {
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const options = Object.keys(CONTRACT_PAYMENT_STATUS_LABEL) as ContractPaymentStatus[];
  const target = options.find((option) => option === status);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target || saving) return;
    const fields = new FormData(event.currentTarget);
    const paidAmount = String(fields.get('paidAmount') ?? '').trim();
    const paidAt = String(fields.get('paidAt') ?? '');
    setError('');
    setSuccess('');
    if (paidAmount && (!/^\d{1,13}(?:\.\d{1,2})?$/.test(paidAmount) || Number(paidAmount) <= 0)) {
      setError('납부 금액은 0보다 커야 하며 정수 13자리, 소수 2자리까지 입력할 수 있습니다.');
      return;
    }
    setSaving(true);
    try {
      await AdminContractService.updatePaymentStatus(contractId, {
        paymentStatus: target,
        paidAmount: paidAmount || undefined,
        paidAt: paidAt || undefined,
      });
      setStatus('');
      setSuccess('납부 상태가 변경되었습니다.');
      await onUpdated();
    } catch (error) {
      setError(extractApiError(error, '납부 상태를 저장하거나 새로 불러오지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col items-start gap-3">
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      {error && <ErrorBox message={error} />}
      <FormField label="납부 상태 변경" htmlFor="contract-next-payment-status">
        <Select
          id="contract-next-payment-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          disabled={saving}
          required
        >
          <option value="">상태 선택</option>
          {options.map((option) => (
            <option key={option} value={option}>{CONTRACT_PAYMENT_STATUS_LABEL[option]}</option>
          ))}
        </Select>
      </FormField>
      {target === 'PAID' && (
        <div className="grid w-full gap-3">
          <FormField label="실납부 금액 (선택)" htmlFor="contract-paid-amount">
            <TextInput id="contract-paid-amount" name="paidAmount" inputMode="decimal" disabled={saving} />
          </FormField>
          <FormField label="납부 일시 (한국 시간, 선택)" htmlFor="contract-paid-at">
            <TextInput id="contract-paid-at" name="paidAt" type="datetime-local" disabled={saving} />
          </FormField>
        </div>
      )}
      <button
        type="submit"
        disabled={!target || saving}
        className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? '변경 중…' : '납부 상태 변경'}
      </button>
    </form>
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

function ContractCommissionPanel({ contractId, managerId }: { contractId: string; managerId?: string | null }) {
  const [draftRate, setRate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { data, isLoading: loading, error: queryError, mutate: load } = useSWR(
    ['admin-contract-commission', contractId] as const,
    ([, id]) => Promise.all([CommissionService.getContractOverride(id), CommissionService.getContractHistory(id)]),
  );
  const [override, history] = data ?? [null, []];
  const memberId = override?.memberId ?? managerId;
  const rate = draftRate ?? (override ? String(override.commissionRate) : '');
  const error = saveError || (queryError && extractApiError(queryError, '정산 비율 정보를 불러오지 못했습니다.'));

  const onSave = async () => {
    if (!memberId) return;
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
      setRate(null);
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

              {!memberId && !queryError && (
                <p className="text-xs text-brand-gray-500">정산 비율을 설정하려면 영업 담당자가 필요합니다.</p>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-brand-gray-400">
                  적용 우선순위: 계약 오버라이드 &gt; 영업사원 기본율 &gt; 시스템 기본값(10%)
                </p>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || !memberId || !!queryError}
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
