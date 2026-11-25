import { Suspense } from 'react';
import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';
import NoticeDetailView from '@/components/site/NoticeDetailView';

export const metadata: Metadata = { title: '공지사항 ｜ 미디어버스' };

export default function Page() {
  return (
    <SubPageLayout section="support" current="/support/notice">
      <Suspense fallback={null}>
        <NoticeDetailView />
      </Suspense>
    </SubPageLayout>
  );
}
