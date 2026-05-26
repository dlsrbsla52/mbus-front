'use client';

import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

export default function ManagerNotificationPage() {
  return (
    <>
      <PageHeader
        title="갱신 알림"
        description="만료 1개월 전 자동·수동 알림 발송 이력을 관리합니다."
      />
      <EmptyState
        title="알림 발송/이력 연결 대기"
        description="POST /api/v1/admin/notification/renewal, GET /api/v1/admin/notification 이 구현되면 표시됩니다."
      />
    </>
  );
}
