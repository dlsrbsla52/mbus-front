'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import {
  AuthorizationService,
  type PermissionSummary,
  type RoleSummary,
} from '@/lib/api/admin/authorization';
import { AdminMemberService, type AdminMemberRow } from '@/lib/api/member';
import { messageForCode } from '@/lib/api/result-codes';

export default function ManagerRolePage() {
  return (
    <>
      <PageHeader
        title="회원 역할 부여"
        description="멤버를 검색해 회원별 역할을 부여합니다."
      />
      <div className="flex flex-col gap-6">
        <MemberRolePanel />
      </div>
    </>
  );
}

// ─── 주: 멤버 역할 부여 ──────────────────────────────────────────────────────

function MemberRolePanel() {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<AdminMemberRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AdminMemberRow | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [currentPermissions, setCurrentPermissions] = useState<PermissionSummary[]>([]);
  const [allRoles, setAllRoles] = useState<RoleSummary[]>([]);
  const [rolePermMap, setRolePermMap] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AuthorizationService.listRoles().then((roles) => {
      setAllRoles(roles);
      const withId = roles.filter((r) => r.id);
      if (!withId.length) return;
      Promise.allSettled(
        withId.map((r) =>
          AuthorizationService.getRole(r.id!).then((d) => ({
            name: r.name,
            perms: d.permissions.map((p) => String(p.name)),
          })),
        ),
      ).then((results) => {
        const map: Record<string, string[]> = {};
        results.forEach((r) => { if (r.status === 'fulfilled') map[r.value.name] = r.value.perms; });
        setRolePermMap(map);
      });
    }).catch(() => {});
  }, []);

  const doSearch = useCallback(async (kw: string) => {
    if (!kw.trim()) { setSearchResults([]); return; }
    setSearching(true);
    setError('');
    try {
      const result = await AdminMemberService.list({ keyword: kw.trim(), size: 20 });
      setSearchResults(result.content);
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '멤버 검색에 실패했습니다.'));
    } finally { setSearching(false); }
  }, []);

  const onKeywordChange = (value: string) => {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const selectMember = async (member: AdminMemberRow) => {
    if (!member.id) { setError('멤버 ID를 확인할 수 없습니다. 잠시 후 다시 검색해주세요.'); return; }
    setSelectedMember(member);
    setSearchResults([]);
    setKeyword(member.loginId);
    setSelectedRoleName('');
    setCurrentPermissions([]);
    setRoleLoading(true);
    setError('');
    setSuccess('');
    try {
      const summary = await AuthorizationService.getMemberRole(member.id);
      setSelectedRoleName(summary.role?.name ?? '');
      setCurrentPermissions(summary.permissions ?? []);
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '역할 정보를 불러오지 못했습니다.'));
    } finally { setRoleLoading(false); }
  };

  const onSave = async () => {
    if (!selectedMember || !selectedRoleName) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await AuthorizationService.changeMemberRole(selectedMember.id, { roleName: selectedRoleName });
      const summary = await AuthorizationService.getMemberRole(selectedMember.id);
      setCurrentPermissions(summary.permissions ?? []);
      setSuccess('역할이 저장되었습니다.');
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '역할 저장에 실패했습니다.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <PanelIntro
        eyebrow="회원별 설정"
        title="회원에게 역할 부여"
        description="검색한 회원 한 명의 역할을 변경합니다. 오른쪽 권한 목록은 선택된 회원에게 현재 적용되는 권한입니다."
      />
      {error && <ErrorBox message={error} />}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* 멤버 검색 */}
      <div className="relative">
        <label className="mb-1 block text-xs font-semibold text-brand-gray-600">멤버 검색</label>
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
            ) : searchResults.length === 0 ? (
              <li className="px-4 py-3 text-sm text-brand-gray-500">결과 없음</li>
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

      {/* 선택된 멤버 — 역할 변경 + 현재 권한 */}
      {selectedMember ? (
        <div className="rounded-lg border border-brand-gray-200 bg-white">
          {/* 멤버 헤더 */}
          <div className="flex items-center justify-between border-b border-brand-gray-200 px-5 py-4">
            <div>
              <p className="text-sm font-bold text-brand-black">{selectedMember.loginId}</p>
              <p className="text-xs text-brand-gray-500">{selectedMember.email} · {selectedMember.memberType}</p>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || roleLoading || !selectedRoleName}
              className="rounded-md bg-brand-black px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-80"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>

          <div className="grid grid-cols-1 divide-y divide-brand-gray-200 lg:grid-cols-[1fr_240px] lg:divide-x lg:divide-y-0">
            {/* 역할 선택 */}
            <div className="p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-gray-500">부여할 역할 선택</p>
              <p className="mb-3 text-xs text-brand-gray-400">아래 권한 칩은 각 역할 템플릿의 현재 권한입니다.</p>
              {roleLoading ? (
                <p className="text-sm text-brand-gray-400">불러오는 중…</p>
              ) : allRoles.length === 0 ? (
                <p className="text-sm text-brand-gray-400">등록된 역할이 없습니다.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {allRoles.map((role) => {
                    const perms = rolePermMap[role.name];
                    return (
                      <li key={role.name}>
                        <label className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-brand-gray-50 ${selectedRoleName === role.name ? 'border-brand-black bg-brand-gray-50' : 'border-brand-gray-200'}`}>
                          <input
                            type="radio"
                            name="memberRole"
                            value={role.name}
                            checked={selectedRoleName === role.name}
                            onChange={() => setSelectedRoleName(role.name)}
                            className="mt-0.5 h-4 w-4 accent-brand-black"
                          />
                          <div className="flex flex-1 flex-col gap-1.5">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-semibold text-brand-black">{role.name}</span>
                              {role.description && (
                                <span className="text-xs text-brand-gray-500">{role.description}</span>
                              )}
                            </div>
                            {perms && perms.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {perms.map((p) => (
                                  <span key={p} className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-[10px] font-semibold text-brand-blue">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* 현재 보유 권한 */}
            <div className="p-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-brand-gray-500">선택 회원의 적용 권한</p>
              <p className="mb-3 text-xs text-brand-gray-400">저장 후 이 회원에게 적용되는 권한입니다.</p>
              {currentPermissions.length === 0 ? (
                <p className="text-sm text-brand-gray-400">권한 없음</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {currentPermissions.map((p) => (
                    <li key={String(p.name)} className="rounded-md bg-brand-gray-50 px-3 py-1.5 text-xs font-semibold text-brand-gray-700">
                      {String(p.name)}
                      {p.description && (
                        <span className="ml-1.5 font-normal text-brand-gray-400">{p.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-[10px] text-brand-gray-400">역할 자체 권한은 별도 역할 권한 템플릿 화면에서 관리합니다.</p>
            </div>
          </div>
        </div>
      ) : (
        !error && (
          <EmptyState
            title="멤버를 검색하세요"
            description="아이디나 이메일로 멤버를 찾아 역할과 권한을 확인·변경할 수 있습니다."
          />
        )
      )}
    </div>
  );
}

// ─── 공통 ────────────────────────────────────────────────────────────────────

type ErrRes = { response?: { data?: { code?: string; message?: string } } };

function PanelIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-brand-gray-200 bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">{eyebrow}</p>
      <h2 className="mt-1 text-base font-bold text-brand-black">{title}</h2>
      <p className="mt-1 text-sm text-brand-gray-500">{description}</p>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}
