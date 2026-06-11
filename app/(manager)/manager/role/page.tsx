'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import {
  AuthorizationService,
  type PermissionSummary,
  type RoleDetail,
  type RoleSummary,
} from '@/lib/api/admin/authorization';
import { AdminMemberService, type AdminMemberRow } from '@/lib/api/member';
import { messageForCode } from '@/lib/api/result-codes';

export default function ManagerRolePage() {
  return (
    <>
      <PageHeader
        title="역할·권한 관리"
        description="멤버를 검색해 역할을 부여하고, 역할별 권한을 설정합니다."
      />
      <div className="flex flex-col gap-6">
        <MemberRolePanel />
        <RolePermissionSection />
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
      setSelectedRoleName((summary.roles ?? [])[0]?.name ?? '');
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
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">역할 선택</p>
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
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">현재 보유 권한</p>
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
              <p className="mt-4 text-[10px] text-brand-gray-400">저장하면 선택한 역할의 권한으로 업데이트됩니다.</p>
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

// ─── 보조: 역할별 권한 편집 (접기/펼치기) ────────────────────────────────────

function RolePermissionSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-brand-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-sm font-bold text-brand-black">역할별 권한 편집</p>
          <p className="text-xs text-brand-gray-500">각 역할에 권한을 추가하거나 해제합니다.</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-brand-gray-400" /> : <ChevronDown className="h-4 w-4 text-brand-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-brand-gray-200 p-5">
          <RolePermissionPanel />
        </div>
      )}
    </div>
  );
}

function RolePermissionPanel() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionSummary[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, p] = await Promise.all([
        AuthorizationService.listRoles(),
        AuthorizationService.listPermissions(),
      ]);
      setRoles(r);
      setAllPermissions(p);
      if (r.length > 0) setSelectedRoleId((prev) => prev ?? r[0].id);
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '역할 정보를 불러오지 못했습니다.'));
    } finally { setLoading(false); }
  }, []);

  const loadDetail = useCallback(async (roleId: string) => {
    setDetailLoading(true);
    try {
      setRoleDetail(await AuthorizationService.getRole(roleId));
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '역할 상세를 불러오지 못했습니다.'));
    } finally { setDetailLoading(false); }
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);
  useEffect(() => { if (selectedRoleId) loadDetail(selectedRoleId); }, [selectedRoleId, loadDetail]);

  const onAssign = async (permissionName: string) => {
    if (!selectedRoleId) return;
    setError('');
    try {
      await AuthorizationService.assignPermissionToRole(selectedRoleId, { permissionName });
      await loadDetail(selectedRoleId);
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '권한 부여에 실패했습니다.'));
    }
  };

  const onRevoke = async (permissionName: string) => {
    if (!selectedRoleId) return;
    if (!confirm(`"${permissionName}" 권한을 해제하시겠습니까?`)) return;
    setError('');
    try {
      await AuthorizationService.removePermissionFromRole(selectedRoleId, permissionName);
      await loadDetail(selectedRoleId);
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '권한 해제에 실패했습니다.'));
    }
  };

  if (loading) return <p className="text-sm text-brand-gray-400">불러오는 중…</p>;
  if (roles.length === 0) return <p className="text-sm text-brand-gray-400">등록된 역할이 없습니다.</p>;

  const assignedNames = new Set(roleDetail?.permissions.map((p) => String(p.name)) ?? []);
  const availableToAssign = allPermissions.filter((p) => !assignedNames.has(String(p.name)));

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[200px_1fr]">
      {error && <div className="lg:col-span-2"><ErrorBox message={error} /></div>}

      {/* 역할 목록 */}
      <ul className="flex flex-col gap-0.5">
        {roles.map((role) => (
          <li key={role.id ?? role.name}>
            <button
              type="button"
              onClick={() => setSelectedRoleId(role.id)}
              className={
                role.id === selectedRoleId
                  ? 'flex w-full flex-col items-start rounded-md bg-brand-black px-3 py-2 text-left text-sm text-white'
                  : 'flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm text-brand-gray-700 hover:bg-brand-gray-50'
              }
            >
              <span className="font-semibold">{role.name}</span>
              {role.description && (
                <span className={`text-[10px] ${role.id === selectedRoleId ? 'text-brand-gray-300' : 'text-brand-gray-500'}`}>
                  {role.description}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* 권한 편집 */}
      {detailLoading || !roleDetail ? (
        <p className="text-sm text-brand-gray-400">로딩 중…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-gray-500">
              {roleDetail.name} — 부여된 권한 ({roleDetail.permissions.length})
            </p>
            {roleDetail.permissions.length === 0 ? (
              <p className="mt-2 text-xs text-brand-gray-400">부여된 권한이 없습니다.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {roleDetail.permissions.map((p) => (
                  <li key={String(p.name)} className="inline-flex items-center gap-1 rounded-full bg-brand-blue-soft px-2.5 py-1 text-xs font-semibold text-brand-blue">
                    {String(p.name)}
                    <button
                      type="button"
                      onClick={() => onRevoke(String(p.name))}
                      className="rounded-full p-0.5 hover:bg-brand-blue/20"
                      aria-label={`${p.name} 해제`}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {availableToAssign.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-gray-500">추가 가능</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {availableToAssign.map((p) => (
                  <li key={String(p.name)}>
                    <button
                      type="button"
                      onClick={() => onAssign(String(p.name))}
                      className="inline-flex items-center gap-1 rounded-full border border-brand-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-brand-gray-700 hover:border-brand-black hover:bg-brand-gray-50"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {String(p.name)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 공통 ────────────────────────────────────────────────────────────────────

type ErrRes = { response?: { data?: { code?: string; message?: string } } };

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}
