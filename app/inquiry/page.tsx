import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';
import InquiryForm from '@/components/site/InquiryForm';

export const metadata: Metadata = { title: '온라인 문의 ｜ 미디어버스' };

export default function InquiryPage() {
  return (
    <SubPageLayout section="inquiry" current="/inquiry">
      <InquiryForm />
    </SubPageLayout>
  );
}
