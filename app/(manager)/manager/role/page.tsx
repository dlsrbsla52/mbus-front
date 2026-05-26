'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ProtectedShell from '@/components/auth/ProtectedShell';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import {
  AuthorizationService,
  type PermissionSummary,
  type RoleDetail,
  type RoleSummary,
} from '@/lib/api/admin/authorization';
import { messageForCode } from '@/lib/api/result-codes';

export default function ManagerRolePage() {
  return (
    <ProtectedShell requireMemberType="ADMIN_MASTER">
      <PageHeader
        title="역할·권한 관리"
        description="역할별 권한 부여·해제와 시스템 권한 카탈로그를 관리합니다. (ADMIN_MASTER 전용)"
      />
      <RoleManager />
    </ProtectedShell>
  );
}

function RoleManager() {
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
      // 선택된 역할이 없을 때만 첫 역할을 자동 선택한다.
      // selectedRoleId 를 의존성에서 제거하기 위해 함수형 업데이트 사용
      // (의존하면 setSelectedRoleId → loadRoles 재생성 → effect 재실행으로 중복 호출 발생).
      if (r.length > 0) {
        setSelectedRoleId((prev) => prev ?? r[0].id);
      }
    } catch (e) {
      const res = (e as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '역할 정보를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (roleId: string) => {
    setDetailLoading(true);
    try {
      const d = await AuthorizationService.getRole(roleId);
      setRoleDetail(d);
    } catch (e) {
      const res = (e as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '역할 상세를 불러오지 못했습니다.'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    if (!selectedRoleId) return;
    loadDetail(selectedRoleId);
  }, [selectedRoleId, loadDetail]);

  const onAssign = async (permissionName: string) => {
    if (!selectedRoleId) return;
    setError('');
    try {
      await AuthorizationService.assignPermissionToRole(selectedRoleId, { permissionName });
      await loadDetail(selectedRoleId);
    } catch (e) {
      const res = (e as { response?: { data?: { code?: string; message?: string } } }).response?.data;
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
      const res = (e as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '권한 해제에 실패했습니다.'));
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-brand-gray-200 bg-white p-6 text-center text-sm text-brand-gray-500">
        불러오는 중…
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <EmptyState
        title="등록된 역할이 없습니다."
        description="백엔드 iam 모듈에서 기본 역할을 시드하거나 새 역할을 생성해주세요."
      />
    );
  }

  const assignedNames = new Set(roleDetail?.permissions.map((p) => String(p.name)) ?? []);
  const availableToAssign = allPermissions.filter((p) => !assignedNames.has(String(p.name)));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border border-brand-gray-200 bg-white p-2">
        <p className="px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-brand-gray-500">
          역할 ({roles.length})
        </p>
        <ul className="flex flex-col gap-0.5">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={
                  role.id === selectedRoleId
                    ? 'flex w-full flex-col items-start gap-0.5 rounded-md bg-brand-black px-3 py-2 text-left text-sm text-white'
                    : 'flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-sm text-brand-gray-700 hover:bg-brand-gray-50'
                }
              >
                <span className="font-semibold">{role.name}</span>
                {role.description && (
                  <span
                    className={
                      role.id === selectedRoleId
                        ? 'text-[10px] text-brand-gray-300'
                        : 'text-[10px] text-brand-gray-500'
                    }
                  >
                    {role.description}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex flex-col gap-4">
        {error && (
          <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {detailLoading || !roleDetail ? (
          <div className="rounded-lg border border-brand-gray-200 bg-white p-6 text-center text-sm text-brand-gray-500">
            역할 상세 로딩 중…
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-brand-gray-200 bg-white p-5">
              <h2 className="text-base font-bold text-brand-black">{roleDetail.name}</h2>
              {roleDetail.description && (
                <p className="mt-1 text-sm text-brand-gray-600">{roleDetail.description}</p>
              )}

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-gray-500">
                  부여된 권한 ({roleDetail.permissions.length})
                </p>
                {roleDetail.permissions.length === 0 ? (
                  <p className="mt-2 text-sm text-brand-gray-500">부여된 권한이 없습니다.</p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {roleDetail.permissions.map((p) => (
                      <li
                        key={String(p.name)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue"
                      >
                        {String(p.name)}
                        <button
                          type="button"
                          onClick={() => onRevoke(String(p.name))}
                          className="ml-0.5 rounded-full p-0.5 text-brand-blue hover:bg-brand-blue/20"
                          aria-label={`${p.name} 해제`}
                          title="권한 해제"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-brand-gray-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-gray-500">
                부여 가능한 권한 ({availableToAssign.length})
              </p>
              {availableToAssign.length === 0 ? (
                <p className="mt-2 text-sm text-brand-gray-500">모든 권한이 이미 부여되어 있습니다.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {availableToAssign.map((p) => (
                    <li key={String(p.name)}>
                      <button
                        type="button"
                        onClick={() => onAssign(String(p.name))}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-gray-300 bg-white px-3 py-1 text-xs font-semibold text-brand-gray-700 hover:border-brand-black hover:bg-brand-gray-50"
                      >
                        <Plus className="h-3 w-3" />
                        {String(p.name)}
                        {p.description && (
                          <span className="text-[10px] font-normal text-brand-gray-500">
                            · {p.description}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
