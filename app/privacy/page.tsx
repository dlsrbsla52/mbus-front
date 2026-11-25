import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';
import { PRIVACY_POLICY } from '@/constants/privacy';

export const metadata: Metadata = { title: '개인정보처리방침 ｜ 미디어버스' };

export default function PrivacyPage() {
  return (
    <SubPageLayout section="privacy" current="/privacy" tabs={[{ label: '개인정보처리방침', href: '/privacy' }]}>
      <article className="mx-auto max-w-[1100px] border-t-2 border-[#333] pt-10 text-[14px] leading-7 text-[#444]">
        <h2 className="mb-8 text-center text-[20px] font-bold text-[#111]">개인정보처리방침</h2>
        {PRIVACY_POLICY.map((block, index) =>
          block.kind === 'heading' ? (
            <h3 key={index} className="mb-2 mt-8 text-[16px] font-bold text-[#111]">
              {block.text}
            </h3>
          ) : (
            <p key={index} className="mb-1">
              {block.text}
            </p>
          ),
        )}
      </article>
    </SubPageLayout>
  );
}
