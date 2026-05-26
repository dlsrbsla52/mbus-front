'use client';

import { use } from 'react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';

interface Params {
  id: string;
}

export default function ManagerStopDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);

  return (
    <>
      <PageHeader title={`정류장 #${id}`} description="정류장 정보를 수정합니다." />
      <EmptyState
        title="상세/수정 폼 구현 대기"
        description="GET /api/v1/stop/{id}, PUT /api/v1/admin/stop/{id}, DELETE /api/v1/admin/stop/{id} 가 연결되면 표시됩니다."
      />
    </>
  );
}
