'use client';

import { useCallback, useEffect, useState } from 'react';
import { Info, Plus, Trash2 } from 'lucide-react';
import {
  AuthorizationService,
  type PermissionSummary,
  type RoleDetail,
  type RoleSummary,
} from '@/lib/api/admin/authorization';
import { messageForCode } from '@/lib/api/result-codes';

export default function RolePermissionTemplatePanel() {
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
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (roleId: string) => {
    setDetailLoading(true);
    try {
      setRoleDetail(await AuthorizationService.getRole(roleId));
    } catch (e) {
      const res = (e as ErrRes).response?.data;
      setError(messageForCode(res?.code ?? '', res?.message ?? '역할 상세를 불러오지 못했습니다.'));
    } finally {
      setDetailLoading(false);
    }
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

  if (loading) return <p className="text-sm text-brand-gray-400">불러오는 중...</p>;
  if (roles.length === 0) return <p className="text-sm text-brand-gray-400">등록된 역할이 없습니다.</p>;

  const assignedNames = new Set(roleDetail?.permissions.map((p) => String(p.name)) ?? []);
  const availableToAssign = allPermissions.filter((p) => !assignedNames.has(String(p.name)));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
        <Info className="mt-0.5 h-4 w-4 flex-none" />
        <div>
          <p className="text-sm font-semibold">이 화면은 회원별 권한 설정이 아닙니다.</p>
          <p className="mt-1 text-xs leading-5">
            여기서 BUSINESS, MEMBER 같은 역할 권한을 바꾸면 해당 역할을 가진 모든 회원에게 적용됩니다.
            특정 회원에게 역할만 부여하려면 역할·권한 화면에서 회원을 검색해 저장하세요.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-brand-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
          {error && <div className="lg:col-span-2"><ErrorBox message={error} /></div>}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-gray-500">역할 템플릿</p>
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
          </div>

          {detailLoading || !roleDetail ? (
            <p className="text-sm text-brand-gray-400">로딩 중...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-gray-500">
                  역할 템플릿: {roleDetail.name} - 연결된 권한 ({roleDetail.permissions.length})
                </p>
                {roleDetail.permissions.length === 0 ? (
                  <p className="mt-2 text-xs text-brand-gray-400">연결된 권한이 없습니다.</p>
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
      </div>
    </div>
  );
}

type ErrRes = { response?: { data?: { code?: string; message?: string } } };

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}
