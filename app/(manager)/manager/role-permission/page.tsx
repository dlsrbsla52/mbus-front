'use client';

import ProtectedShell from '@/components/auth/ProtectedShell';
import PageHeader from '@/components/common/PageHeader';
import RolePermissionTemplatePanel from '@/components/manager/RolePermissionTemplatePanel';

const ROLE_PERMISSION_MANAGERS = ['ADMIN_MASTER', 'ADMIN_DEVELOPER'] as const;

export default function ManagerRolePermissionPage() {
  return (
    <ProtectedShell requireMemberType={[...ROLE_PERMISSION_MANAGERS]}>
      <PageHeader
        title="역할 권한 템플릿"
        description="회원과 무관하게 역할 자체에 연결된 공통 권한을 관리합니다."
      />
      <RolePermissionTemplatePanel />
    </ProtectedShell>
  );
}
