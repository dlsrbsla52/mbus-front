'use client';

import { useCallback, useEffect, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import DataTable, { type DataTableColumn } from '@/components/common/DataTable';
import Pagination from '@/components/common/Pagination';
import PageSizeSelect, { DEFAULT_PAGE_SIZE } from '@/components/common/PageSizeSelect';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/common/Modal';
import {
  AdminMemberService,
  MEMBER_TYPE_LABEL,
  MEMBER_STATUS_LABEL,
  type MemberType,
  type MemberStatus,
  type MemberSearchItem,
  type AdminMemberDetailFull,
  type MemberStatusHistoryItem,
  type CreateAdminMemberRequest,
} from '@/lib/api/member';
import { extractApiError } from '@/lib/api/result-codes';
import type { PageResult } from '@/lib/api/types';


type Tab = 'admin' | 'user';

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const ADMIN_TYPES: MemberType[] = ['ADMIN_USER', 'ADMIN_MASTER', 'ADMIN_DEVELOPER'];
const USER_TYPES: MemberType[] = ['MEMBER', 'BUSINESS'];
const ALL_STATUSES: MemberStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'WITHDRAWN'];

const STATUS_BADGE: Record<MemberStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-brand-gray-100 text-brand-gray-500',
  SUSPENDED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-brand-gray-100 text-brand-gray-400',
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

function fmtDatetime(iso: string | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status as MemberStatus] ?? 'bg-brand-gray-100 text-brand-gray-500';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {MEMBER_STATUS_LABEL[status as MemberStatus] ?? status}
    </span>
  );
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function ManagerMemberPage() {
  const [tab, setTab] = useState<Tab>('admin');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [result, setResult] = useState<PageResult<MemberSearchItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        size: pageSize,
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
        ...(statusFilter ? { status: statusFilter as MemberStatus } : {}),
        ...(typeFilter ? { type: typeFilter as MemberType } : {}),
        ...(tab === 'user' && businessNumber.trim() ? { businessNumber: businessNumber.trim() } : {}),
        ...(createdFrom ? { createdFrom } : {}),
        ...(createdTo ? { createdTo } : {}),
      };
      const data =
        tab === 'admin'
          ? await AdminMemberService.searchAdmins(params)
          : await AdminMemberService.searchUsers(params);
      setResult(data);
    } catch (e) {
      setError(extractApiError(e, '회원 목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [tab, page, pageSize, keyword, statusFilter, typeFilter, businessNumber, createdFrom, createdTo]);

  useEffect(() => { load(); }, [load]);

  const onTabChange = (next: Tab) => {
    setTab(next);
    setPage(0);
    setKeyword('');
    setStatusFilter('');
    setTypeFilter('');
    setBusinessNumber('');
    setCreatedFrom('');
    setCreatedTo('');
    setResult(null);
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const onReset = () => {
    setKeyword('');
    setStatusFilter('');
    setTypeFilter('');
    setBusinessNumber('');
    setCreatedFrom('');
    setCreatedTo('');
    setPage(0);
  };

  const typeOptions = tab === 'admin' ? ADMIN_TYPES : USER_TYPES;
  const hasFilter = !!(keyword || statusFilter || typeFilter || businessNumber || createdFrom || createdTo);

  const columns: DataTableColumn<MemberSearchItem>[] = [
    {
      key: 'name',
      header: '이름 / 아이디',
      cell: (r) => (
        <div>
          <p className="font-semibold text-brand-black">{r.memberName}</p>
          <p className="text-xs text-brand-gray-500">{r.loginId}</p>
        </div>
      ),
    },
    {
      key: 'email',
      header: '이메일',
      cell: (r) => <span className="text-sm text-brand-gray-700">{r.email}</span>,
    },
    {
      key: 'type',
      header: '유형',
      width: '130px',
      cell: (r) => (
        <span className="text-xs font-semibold text-brand-gray-600">
          {MEMBER_TYPE_LABEL[r.memberType] ?? r.memberType}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      align: 'center',
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'createdAt',
      header: '가입일',
      width: '140px',
      cell: (r) => (
        <span className="text-xs text-brand-gray-500">{fmtDatetime(r.createdAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="회원 관리"
        description="어드민·일반 회원을 검색하고 상태를 관리합니다."
      />

      {/* 탭 */}
      <div className="flex gap-0 rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-1 w-fit">
        {([['admin', '어드민 회원'], ['user', '일반 회원']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t
                ? 'bg-white text-brand-black shadow-sm'
                : 'text-brand-gray-500 hover:text-brand-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 필터 바 */}
      <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">검색어</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="이름·아이디·이메일"
            className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none w-48"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">상태</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          >
            <option value="">전체</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{MEMBER_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">유형</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          >
            <option value="">전체</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{MEMBER_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>

        {tab === 'user' && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-brand-gray-600">사업자번호</label>
            <input
              type="text"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              placeholder="000-00-00000"
              className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none w-36"
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">가입일 시작</label>
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-brand-gray-600">가입일 종료</label>
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

        <div className="ml-auto flex items-end gap-3">
          {tab === 'admin' && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-80"
            >
              + 어드민 계정 생성
            </button>
          )}
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
        rowKey={(r) => r.memberId}
        loading={loading}
        onRowClick={(r) => setSelectedId(r.memberId)}
        empty={
          <EmptyState
            title="회원이 없습니다."
            description={hasFilter ? '검색 조건을 변경하거나 초기화해보세요.' : '아직 등록된 회원이 없습니다.'}
          />
        }
      />

      {result && (
        <div className="flex items-center justify-between text-xs text-brand-gray-500">
          <span>
            전체 {result.totalElements.toLocaleString()}명 · {result.page + 1} / {result.totalPages}페이지
          </span>
          <Pagination page={result.page} totalPages={result.totalPages} onChange={setPage} />
        </div>
      )}

      {selectedId && (
        <MemberDetailModal
          memberId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
        />
      )}

      {showCreate && (
        <CreateAdminModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </>
  );
}

// ─── 회원 상세 모달 ───────────────────────────────────────────────────────────

function MemberDetailModal({
  memberId,
  onClose,
  onUpdated,
}: {
  memberId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<AdminMemberDetailFull | null>(null);
  const [history, setHistory] = useState<MemberStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeAction, setActiveAction] = useState<'suspend' | 'unsuspend' | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, h] = await Promise.all([
        AdminMemberService.fullDetail(memberId),
        AdminMemberService.statusHistory(memberId),
      ]);
      setDetail(d);
      setHistory(h);
    } catch (e) {
      setError(extractApiError(e, '회원 정보를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleActionDone = () => {
    setActiveAction(null);
    loadDetail();
    onUpdated();
  };

  return (
    <Modal open onClose={onClose} title="회원 상세" size="lg">
      {loading ? (
        <p className="py-8 text-center text-sm text-brand-gray-400">불러오는 중…</p>
      ) : error ? (
        <ErrorBox message={error} />
      ) : detail ? (
        <div className="flex flex-col gap-5">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-brand-gray-50 p-4">
            <InfoRow label="이름" value={detail.memberName} />
            <InfoRow label="로그인 아이디" value={detail.loginId} />
            <InfoRow label="이메일" value={detail.email} />
            <InfoRow label="전화번호" value={detail.phoneNumber} />
            <InfoRow label="유형" value={MEMBER_TYPE_LABEL[detail.memberType] ?? detail.memberType} />
            <InfoRow label="상태" value={<StatusBadge status={detail.status} />} />
            {detail.businessNumber && (
              <InfoRow label="사업자번호" value={detail.businessNumber} />
            )}
            <InfoRow label="이메일 인증" value={detail.emailVerified ? '완료' : '미완료'} />
            <InfoRow label="가입일" value={fmtDatetime(detail.createdAt)} />
            <InfoRow label="수정일" value={fmtDatetime(detail.updatedAt)} />
          </div>

          {/* 역할/권한 */}
          <div className="rounded-lg border border-brand-gray-200 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">역할 / 권한</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="rounded-md bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                {detail.role.displayName}
              </span>
              {detail.permissions.map((p) => (
                <span
                  key={p.id}
                  className="rounded-md bg-brand-gray-100 px-2.5 py-1 text-xs font-semibold text-brand-gray-600"
                >
                  {p.displayName}
                </span>
              ))}
              {detail.permissions.length === 0 && (
                <span className="text-sm text-brand-gray-400">권한 없음</span>
              )}
            </div>
          </div>

          {/* 상태 이력 (토글) */}
          <div>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-gray-500 hover:text-brand-gray-700"
            >
              <span>상태 변경 이력 ({history.length})</span>
              <span>{showHistory ? '▲' : '▼'}</span>
            </button>
            {showHistory && (
              <div className="mt-2">
                {history.length === 0 ? (
                  <p className="text-sm text-brand-gray-400">이력이 없습니다.</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {history.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-md border border-brand-gray-200 bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-2 text-xs text-brand-gray-500">
                          <StatusBadge status={h.previousStatus} />
                          <span>→</span>
                          <StatusBadge status={h.newStatus} />
                          <span className="ml-auto">{fmtDatetime(h.createdAt)}</span>
                        </div>
                        {h.reason && (
                          <p className="mt-1.5 text-sm text-brand-gray-700">{h.reason}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>

          {/* 액션 */}
          {detail.status !== 'WITHDRAWN' && (
            <div className="flex flex-wrap gap-2 border-t border-brand-gray-200 pt-4">
              {detail.status !== 'SUSPENDED' ? (
                <button
                  type="button"
                  onClick={() => setActiveAction(activeAction === 'suspend' ? null : 'suspend')}
                  className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    activeAction === 'suspend'
                      ? 'border-red-500 bg-red-500 text-white'
                      : 'border-red-300 bg-white text-red-600 hover:bg-red-50'
                  }`}
                >
                  계정 정지
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveAction(activeAction === 'unsuspend' ? null : 'unsuspend')}
                  className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    activeAction === 'unsuspend'
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-green-500 bg-white text-green-600 hover:bg-green-50'
                  }`}
                >
                  정지 해제
                </button>
              )}
            </div>
          )}

          {activeAction === 'suspend' && (
            <SuspendPanel
              memberId={memberId}
              onDone={handleActionDone}
              onCancel={() => setActiveAction(null)}
            />
          )}
          {activeAction === 'unsuspend' && (
            <UnsuspendPanel
              memberId={memberId}
              onDone={handleActionDone}
              onCancel={() => setActiveAction(null)}
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

// ─── 정지 패널 ───────────────────────────────────────────────────────────────

function SuspendPanel({
  memberId,
  onDone,
  onCancel,
}: {
  memberId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await AdminMemberService.suspend(memberId, { reason });
      onDone();
    } catch (e) {
      setError(extractApiError(e, '계정 정지에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-red-600">계정 정지</p>
      {error && <div className="mb-2"><ErrorBox message={error} /></div>}
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
            정지 사유 <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="이용약관 위반 등 정지 사유를 입력하세요"
            className="w-full resize-none rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-md border border-brand-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
            취소
          </button>
          <button type="submit" disabled={saving || !reason.trim()}
            className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80">
            {saving ? '처리 중…' : '정지'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── 정지 해제 패널 ───────────────────────────────────────────────────────────

function UnsuspendPanel({
  memberId,
  onDone,
  onCancel,
}: {
  memberId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await AdminMemberService.unsuspend(memberId, { reason });
      onDone();
    } catch (e) {
      setError(extractApiError(e, '정지 해제에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-green-700">정지 해제</p>
      {error && <div className="mb-2"><ErrorBox message={error} /></div>}
      <div className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
            해제 사유 <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="경고 조치 완료 후 해제 등 사유를 입력하세요"
            className="w-full resize-none rounded-md border border-brand-gray-200 bg-white px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-md border border-brand-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100">
            취소
          </button>
          <button type="submit" disabled={saving || !reason.trim()}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80">
            {saving ? '처리 중…' : '해제'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── 어드민 계정 생성 모달 ────────────────────────────────────────────────────

function CreateAdminModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateAdminMemberRequest>({
    loginId: '',
    password: '',
    email: '',
    phoneNumber: '',
    memberType: 'ADMIN_USER',
    memberName: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof CreateAdminMemberRequest, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await AdminMemberService.createAdmin(form);
      onCreated();
    } catch (e) {
      setError(extractApiError(e, '계정 생성에 실패했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="어드민 계정 생성" size="md">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <ErrorBox message={error} />}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={form.memberName}
              onChange={(e) => set('memberName', e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
              로그인 아이디 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={form.loginId}
              onChange={(e) => set('loginId', e.target.value)}
              placeholder="admin_user01"
              minLength={4}
              maxLength={50}
              pattern="^[a-zA-Z0-9_]+$"
              className="w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="8자 이상, 영문+숫자+특수문자"
              minLength={8}
              className="w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={form.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              placeholder="01012345678"
              pattern="^01[016789]\d{7,8}$"
              className="w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            />
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-xs font-semibold text-brand-gray-600">
              유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.memberType}
              onChange={(e) => set('memberType', e.target.value)}
              className="w-full rounded-md border border-brand-gray-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
            >
              <option value="ADMIN_USER">관리자 (ADMIN_USER)</option>
              <option value="ADMIN_MASTER">마스터 관리자 (ADMIN_MASTER)</option>
              <option value="ADMIN_DEVELOPER">개발자 관리자 (ADMIN_DEVELOPER)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-brand-gray-200 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-brand-gray-300 px-4 py-2 text-sm font-semibold text-brand-gray-700 hover:bg-brand-gray-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
          >
            {saving ? '생성 중…' : '계정 생성'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
