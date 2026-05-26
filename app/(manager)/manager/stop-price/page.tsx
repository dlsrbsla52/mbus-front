'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function ManagerStopPricePage() {
  return (
    <>
      <PageHeader
        title="단가 관리"
        description="지역·유형별 차등 단가를 설정합니다."
      />
      <EmptyState
        title="단가 데이터 연결 대기"
        description="GET/POST/PUT/DELETE /api/v1/admin/stop-price API 가 구현되면 표시됩니다."
      />
    </>
  );
}
