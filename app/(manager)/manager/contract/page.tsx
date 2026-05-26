'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function ManagerContractPage() {
  return (
    <>
      <PageHeader
        title="계약 관리"
        description="영업사원·정류장·기간별 계약 현황을 확인합니다."
      />
      <EmptyState
        title="계약 데이터 연결 대기"
        description="GET /api/v1/admin/contract 이 구현되면 표시됩니다."
      />
    </>
  );
}
