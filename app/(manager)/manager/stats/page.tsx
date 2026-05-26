'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function ManagerStatsPage() {
  return (
    <>
      <PageHeader
        title="통계 리포트"
        description="영업사원·정류장·기간별 매출과 성과를 분석합니다."
      />
      <EmptyState
        title="통계 차트 연결 대기"
        description="GET /api/v1/admin/contract/stats 가 구현되면 차트가 표시됩니다."
      />
    </>
  );
}
