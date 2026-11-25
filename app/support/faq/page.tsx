import { Suspense } from 'react';
import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';
import FaqList from '@/components/site/FaqList';

export const metadata: Metadata = { title: 'FAQ ｜ 미디어버스' };

export default function Page() {
  return (
    <SubPageLayout section="support" current="/support/faq">
      <Suspense fallback={null}>
        <FaqList />
      </Suspense>
    </SubPageLayout>
  );
}
