import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';

export const metadata: Metadata = { title: '매체소개 ｜ 미디어버스' };

const POINTS = [
  { title: 'POINT 1', text: '병행 송출되는 시스템 독점 판매', image: '/images/site/media-point-1.webp' },
  { title: 'POINT 2', text: '선택이 아닌 눈으로 인식하는 매체', image: '/images/site/media-point-2.webp' },
  { title: 'POINT 3', text: '저렴한 광고 비용으로 24시간 노출', image: '/images/site/media-point-3.webp' },
];

export default function MediaPage() {
  return (
    <SubPageLayout section="media" current="/media">
      {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상 */}
      <img
        src="/images/site/media-overview.webp"
        alt="시선을 점유하는 단 하나의 프리미엄 독점 광고, 서울버스TV 정류장 안내 광고와 광고 단가표(RATE CARD)"
        className="mx-auto w-full max-w-[1368px]"
      />

      <div className="mt-20 text-center md:mt-[130px]">
        <h2 className="text-[22px] font-bold text-[#222] md:text-[30px]">광고비를 쓰는 것이 아니라 성과를 투자 합니다.</h2>
        <p className="mt-4 text-[14px] text-site-navy md:text-[16px]">Cooperation and passion create new possibilities</p>
      </div>

      <ul className="mx-auto mt-12 grid max-w-[1140px] gap-6 md:mt-[70px] md:grid-cols-3 md:gap-[95px]">
        {POINTS.map((point) => (
          <li key={point.title} className="border border-[#d9d9d9] bg-white p-3 text-center shadow-sm">
            <div className="aspect-[2.4/1] bg-cover bg-center" style={{ backgroundImage: `url(${point.image})` }} />
            <h3 className="mt-8 text-[20px] font-bold text-[#111]">{point.title}</h3>
            <p className="mb-8 mt-5 text-[14px] text-[#333]">- {point.text}</p>
          </li>
        ))}
      </ul>
    </SubPageLayout>
  );
}
