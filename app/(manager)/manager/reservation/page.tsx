'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function ManagerReservationPage() {
  return (
    <>
      <PageHeader
        title="예약 관리"
        description="전체 예약을 회원·정류장·기간별로 검색합니다."
      />
      <EmptyState
        title="예약 데이터 연결 대기"
        description="GET /api/v1/admin/reservation 이 구현되면 표시됩니다."
      />
    </>
  );
}
