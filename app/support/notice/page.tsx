import { Suspense } from 'react';
import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';
import NoticeBoard from '@/components/site/NoticeBoard';

export const metadata: Metadata = { title: '공지사항 ｜ 미디어버스' };

export default function Page() {
  return (
    <SubPageLayout section="support" current="/support/notice">
      <Suspense fallback={null}>
        <NoticeBoard />
      </Suspense>
    </SubPageLayout>
  );
}
