'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/common/PageHeader';
import StopCreatePanel from '@/components/manager/stop/StopCreatePanel';

/**
 * 정류장 등록 딥링크 페이지.
 * 목록(`/manager/stop`)에서는 모달로 처리하므로, 이 라우트는 직접 URL 접근용 대체 경로다.
 */
export default function ManagerStopNewPage() {
  const router = useRouter();
  const backToList = () => router.replace('/manager/stop');

  return (
    <>
      <PageHeader
        title="정류장 등록"
        description="단건 직접 등록 또는 공공 API 일괄 등록을 선택해 진행합니다."
        actions={
          <Link
            href="/manager/stop"
            className="rounded-md border border-brand-gray-300 px-3 py-2 text-xs font-semibold text-brand-gray-700 hover:bg-brand-gray-50"
          >
            ← 목록으로
          </Link>
        }
      />

      <StopCreatePanel onCreated={backToList} onCancel={backToList} />
    </>
  );
}
