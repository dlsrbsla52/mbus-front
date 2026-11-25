import { Suspense } from 'react';
import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';
import PortfolioBoard from '@/components/site/PortfolioBoard';

export const metadata: Metadata = { title: '포트폴리오 ｜ 미디어버스' };

export default function PortfolioPage() {
  return (
    <SubPageLayout section="portfolio" current="/portfolio">
      <Suspense fallback={null}>
        <PortfolioBoard />
      </Suspense>
    </SubPageLayout>
  );
}
