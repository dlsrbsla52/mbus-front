import { api } from '../client';
import type { ApiResponse } from '../types';
import type { Permission } from '../member';

export interface RoleSummary {
  id: string;
  name: string;
  description?: string;
}

export interface PermissionSummary {
  name: Permission | string;
  description?: string;
}

export interface RoleDetail extends RoleSummary {
  permissions: PermissionSummary[];
}

export interface MemberRoleSummary {
  memberId: string;
  role: RoleSummary;
  permissions: PermissionSummary[];
}

export interface AssignPermissionRequest {
  permissionName: string;
}

export interface ChangeMemberRoleRequest {
  roleName: string;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const AuthorizationService = {
  listRoles: () =>
    unwrap<RoleSummary[]>(api.get('/api/v1/admin/authorization/roles')),
  getRole: (roleId: string) =>
    unwrap<RoleDetail>(api.get(`/api/v1/admin/authorization/roles/${roleId}`)),
  getRolePermissions: (roleId: string) =>
    unwrap<PermissionSummary[]>(
      api.get(`/api/v1/admin/authorization/roles/${roleId}/permissions`),
    ),
  assignPermissionToRole: (roleId: string, data: AssignPermissionRequest) =>
    unwrap<null>(
      api.post(`/api/v1/admin/authorization/roles/${roleId}/permissions`, data),
    ),
  removePermissionFromRole: (roleId: string, permissionName: string) =>
    unwrap<null>(
      api.delete(
        `/api/v1/admin/authorization/roles/${roleId}/permissions/${permissionName}`,
      ),
    ),

  listPermissions: () =>
    unwrap<PermissionSummary[]>(api.get('/api/v1/admin/authorization/permissions')),

  getMemberRole: (memberId: string) =>
    unwrap<MemberRoleSummary>(
      api.get(`/api/v1/admin/authorization/members/${memberId}/role`),
    ),
  changeMemberRole: (memberId: string, data: ChangeMemberRoleRequest) =>
    unwrap<null>(
      api.put(`/api/v1/admin/authorization/members/${memberId}/role`, data),
    ),
};
