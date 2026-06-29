'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import {
  CommissionService,
  type CommissionRateHistoryResponse,
  type ContractCommissionOverrideResponse,
  type ManagerCommissionResponse,
} from '@/lib/api/admin/commission';
import { AdminMemberService, type AdminMemberRow } from '@/lib/api/member';
import { extractApiError } from '@/lib/api/result-codes';

export default function CommissionPage() {
  return (
    <>
      <PageHeader
        title="정산 관리"
        description="영업사원별 정산 비율을 관리하고 계약별 오버라이드를 설정합니다."
      />
      <div className="flex flex-col gap-6">
        <ManagerCommissionPanel />
        <ContractOverrideSection />
      </div>
    </>
  );
}

// ─── 매니저 정산 비율 관리 ────────────────────────────────────────────────────

function ManagerCommissionPanel() {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<AdminMemberRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminMemberRow | null>(null);
  const [commission, setCommission] = useState<ManagerCommissionResponse | null>(null);
  const [history, setHistory] = useState<CommissionRateHistoryResponse[]>([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [newRate, setNewRate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (kw: string) => {
    if (!kw.trim()) { setSearchResults([]); return; }
    setSearching(true);
    setError('');
    try {
      const result = await AdminMemberService.list({ keyword: kw.trim(), size: 20 });
      setSearchResults(result.content);
    } catch (e) {
      setError(extractApiError(e, '멤버 검색에 실패했습니다.'));
    } finally { setSearching(false); }
  }, []);

  const onKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const loadCommission = useCallback(async (memberId: string) => {
    setCommissionLoading(true);
    setError('');
    setCommission(null);
    setHistory([]);
    try {
      const [c, h] = await Promise.all([
        CommissionService.getManagerCommission(memberId),
        CommissionService.getMemberHistory(memberId),
      ]);
      setCommission(c);
      setNewRate(String(c.commissionRate));
      setHistory(h);
    } catch (e) {
      setError(extractApiError(e, '정산 비율 정보를 불러오지 못했습니다.'));
    } finally { setCommissionLoading(false); }
  }, []);

  const selectMember = async (member: AdminMemberRow) => {
    if (!member.id) { setError('멤버 ID를 확인할 수 없습니다.'); return; }
    setSelectedMember(member);
    setSearchResults([]);
    setKeyword(member.loginId);
    setSuccess('');
    setError('');
    await loadCommission(member.id);
  };

  const onSave = async () => {
    if (!selectedMember?.id) return;
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('정산 비율은 0~100 사이의 숫자여야 합니다.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await CommissionService.updateManagerCommission(selectedMember.id, {
        rate,
        reason: reason.trim() || undefined,
      });
      await loadCommission(selectedMember.id);
      setReason('');
      setSuccess('정산 비율이 저장되었습니다.');
    } catch (e) {
      setError(extractApiError(e, '정산 비율 저장에 실패했습니다.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-brand-black">영업사원 기본 정산 비율</h2>
        <span className="text-xs text-brand-gray-400">기본값 10%</span>
      </div>

      {error && <ErrorBox message={error} />}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* 멤버 검색 */}
      <div className="relative">
        <label className="mb-1 block text-xs font-semibold text-brand-gray-600">영업사원 검색</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            placeholder="아이디·이메일로 검색"
            className="w-full rounded-lg border border-brand-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-black focus:outline-none"
          />
        </div>
        {(searching || searchResults.length > 0) && (
          <ul className="absolute z-10 mt-1 w-full rounded-lg border border-brand-gray-200 bg-white shadow-md">
            {searching ? (
              <li className="px-4 py-3 text-sm text-brand-gray-500">검색 중…</li>
            ) : (
              searchResults.map((m) => (
                <li key={m.id ?? m.loginId}>
                  <button
                    type="button"
                    onClick={() => selectMember(m)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-gray-50"
                  >
                    <span className="text-sm font-semibold text-brand-black">{m.loginId}</span>
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

      {/* 선택된 멤버 — 정산 비율 편집 */}
      {selectedMember ? (
        <div className="rounded-lg border border-brand-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-brand-gray-200 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-brand-black">{selectedMember.loginId}</p>
              <p className="text-xs text-brand-gray-500">{selectedMember.email} · {selectedMember.memberType}</p>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || commissionLoading}
              className="rounded-md bg-brand-black px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-brand-gray-200 lg:grid-cols-[1fr_300px] lg:divide-x lg:divide-y-0">
            {/* 비율 편집 */}
            <div className="p-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-gray-500">정산 비율 수정</p>
              {commissionLoading ? (
                <p className="text-sm text-brand-gray-400">불러오는 중…</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-gray-600">현재 정산 비율</label>
                    <p className="text-2xl font-bold text-brand-black">
                      {commission?.commissionRate ?? '—'}%
                    </p>
                    {commission?.updatedAt && (
                      <p className="mt-1 text-[10px] text-brand-gray-400">
                        최종 수정: {new Date(commission.updatedAt).toLocaleString('ko-KR')}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-gray-600">변경할 비율 (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={newRate}
                        onChange={(e) => setNewRate(e.target.value)}
                        className="w-32 rounded-lg border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-black focus:outline-none"
                        placeholder="10.00"
                      />
                      <span className="text-sm text-brand-gray-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-gray-600">변경 사유 (선택)</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={500}
                      placeholder="사유를 입력하세요"
                      className="w-full rounded-lg border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-black focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 변경 이력 */}
            <div className="p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">변경 이력</p>
              <HistoryList items={history} loading={commissionLoading} />
            </div>
          </div>
        </div>
      ) : (
        !error && (
          <EmptyState
            title="영업사원을 검색하세요"
            description="아이디나 이메일로 영업사원을 찾아 정산 비율을 확인·변경할 수 있습니다."
          />
        )
      )}
    </div>
  );
}

// ─── 계약별 정산 오버라이드 ───────────────────────────────────────────────────

function ContractOverrideSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-brand-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-bold text-brand-black">계약별 정산 비율 오버라이드</p>
          <p className="text-xs text-brand-gray-500">특정 계약에만 별도 정산 비율을 적용합니다.</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-brand-gray-400" /> : <ChevronDown className="h-4 w-4 text-brand-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-brand-gray-200 p-5">
          <ContractOverridePanel />
        </div>
      )}
    </div>
  );
}

function ContractOverridePanel() {
  const [contractId, setContractId] = useState('');
  const [queried, setQueried] = useState(false);
  const [override, setOverride] = useState<ContractCommissionOverrideResponse | null>(null);
  const [contractHistory, setContractHistory] = useState<CommissionRateHistoryResponse[]>([]);
  const [memberId, setMemberId] = useState('');
  const [newRate, setNewRate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onSearch = async () => {
    const id = contractId.trim();
    if (!id) return;
    setLoading(true);
    setError('');
    setSuccess('');
    setOverride(null);
    setContractHistory([]);
    setQueried(false);
    try {
      const [ov, hist] = await Promise.all([
        CommissionService.getContractOverride(id),
        CommissionService.getContractHistory(id),
      ]);
      setOverride(ov);
      setContractHistory(hist);
      if (ov) {
        setMemberId(ov.memberId);
        setNewRate(String(ov.commissionRate));
      }
      setQueried(true);
    } catch (e) {
      setError(extractApiError(e, '계약 정보를 불러오지 못했습니다.'));
    } finally { setLoading(false); }
  };

  const onSave = async () => {
    const id = contractId.trim();
    if (!id || !memberId.trim()) { setError('계약 ID와 담당 영업사원 ID를 입력해주세요.'); return; }
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setError('정산 비율은 0~100 사이의 숫자여야 합니다.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await CommissionService.upsertContractOverride(id, {
        memberId: memberId.trim(),
        rate,
        reason: reason.trim() || undefined,
      });
      setSuccess('계약별 오버라이드가 저장되었습니다.');
      setReason('');
      await onSearch();
    } catch (e) {
      setError(extractApiError(e, '오버라이드 저장에 실패했습니다.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      {error && <ErrorBox message={error} />}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* 계약 ID 조회 */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-brand-gray-600">계약 ID</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="계약 UUID 입력"
            className="flex-1 rounded-lg border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-black focus:outline-none"
          />
          <button
            type="button"
            onClick={onSearch}
            disabled={loading || !contractId.trim()}
            className="rounded-md bg-brand-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
          >
            {loading ? '조회 중…' : '조회'}
          </button>
        </div>
      </div>

      {queried && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
          {/* 오버라이드 편집 폼 */}
          <div className="flex flex-col gap-4">
            {override ? (
              <div className="rounded-md border border-brand-gray-100 bg-brand-gray-50 px-4 py-3">
                <p className="text-xs font-semibold text-brand-gray-500">현재 오버라이드</p>
                <p className="mt-1 text-2xl font-bold text-brand-black">{override.commissionRate}%</p>
                <p className="text-[10px] text-brand-gray-400">
                  최종 수정: {new Date(override.updatedAt).toLocaleString('ko-KR')}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-brand-gray-100 bg-brand-gray-50 px-4 py-3">
                <p className="text-sm text-brand-gray-400">오버라이드 없음 — 영업사원 기본율이 적용됩니다.</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-gray-600">담당 영업사원 ID</label>
                <input
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="멤버 UUID"
                  className="w-full rounded-lg border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-black focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-brand-gray-600">오버라이드 비율 (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    placeholder="예: 15.00"
                    className="w-full rounded-lg border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-black focus:outline-none"
                  />
                  <span className="text-sm text-brand-gray-500">%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-brand-gray-600">변경 사유 (선택)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="사유 입력"
                className="w-full rounded-lg border border-brand-gray-300 px-3 py-2 text-sm focus:border-brand-black focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-[11px] text-brand-gray-400">
                적용 우선순위: 계약 오버라이드 &gt; 영업사원 기본율 &gt; 시스템 기본값(10%)
              </p>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-md bg-brand-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>

          {/* 계약 이력 */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">이 계약의 변경 이력</p>
            <HistoryList items={contractHistory} loading={false} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 공통 컴포넌트 ────────────────────────────────────────────────────────────

function HistoryList({ items, loading }: { items: CommissionRateHistoryResponse[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-brand-gray-400">불러오는 중…</p>;
  if (items.length === 0) return <p className="text-sm text-brand-gray-400">이력 없음</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((h) => (
        <li key={h.id} className="rounded-md border border-brand-gray-100 bg-brand-gray-50 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-black">
              {h.previousRate !== undefined && h.previousRate !== null
                ? `${h.previousRate}% → `
                : '최초 설정 → '}
              {h.newRate}%
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              h.changeType === 'CONTRACT_OVERRIDE'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-brand-blue-soft text-brand-blue'
            }`}>
              {h.changeType === 'CONTRACT_OVERRIDE' ? '계약 오버라이드' : '기본율'}
            </span>
          </div>
          {h.reason && (
            <p className="mt-1 text-[11px] text-brand-gray-500">{h.reason}</p>
          )}
          <p className="mt-1 text-[10px] text-brand-gray-400">
            {new Date(h.createdAt).toLocaleString('ko-KR')}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}
