'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function ManagerMemberPage() {
  return (
    <>
      <PageHeader
        title="회원 관리"
        description="광고주·영업사원·관리자 회원을 관리합니다."
      />
      <EmptyState
        title="회원 데이터 연결 대기"
        description="GET /api/v1/admin/members 가 구현되면 표시됩니다."
      />
    </>
  );
}
