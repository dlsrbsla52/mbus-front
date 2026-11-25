import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';

export const metadata: Metadata = { title: '인사말 ｜ 미디어버스' };

const GREETING = [
  '안녕하십니까. 미디어 버스 홈페이지를 찾아주셔서 진심으로 감사드립니다.',
  '미디어 버스는 서울 시내버스 TV 내부에 노출되는 정류장 안내 광고 매체를 독점 운영하는 미디어 전문 기업입니다.',
  '버스 이용객이 하차 직전 정류장을 확인하는 순간에 자연스럽게 노출되어, 높은 주목도와 강제 인지 효과를 동시에 확보하는 것이 특징입니다.',
  '또한 실제 이동 상황과 결합된 광고 환경을 통해 단순 노출을 넘어, 브랜드 인지도 향상과 행동 유도를 함께 이끌어내는 실효성 높은 매체를 제공합니다.',
  '데이터 기반의 운영 구조를 통해 광고 노출 및 반응을 분석할 수 있으며, 이를 바탕으로 보다 효율적인 캠페인 운영이 가능합니다.',
  '불필요한 유통 단계를 최소화한 직접 운영 구조로 합리적인 비용과 높은 효율을 동시에 실현하고 있습니다.',
  '감사합니다.',
];

export default function GreetingPage() {
  return (
    <SubPageLayout section="company" current="/company" bare>
      <div className="mx-auto max-w-[1430px] px-[15px] pt-12 md:pt-20">
        <div className="flex flex-col items-center gap-8 md:flex-row md:gap-0">
          <div className="w-full md:w-1/2">
            {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상 */}
            <img
              src="/images/site/greeting.webp"
              alt="서울버스 월 이용객수 2.7억명, 서울시내버스 차량 인가 대수 7,383대, 일 평균 운행시간 18시간"
              className="w-full max-w-[540px]"
            />
          </div>
          <h2 className="w-full text-center text-[24px] font-bold text-[#007bff] md:w-1/2 md:text-[32px]">
            서울버스TV정류장 독점광고
          </h2>
        </div>

        <div className="mx-auto max-w-[1000px] space-y-7 py-16 text-[15px] font-bold leading-relaxed text-[#222] md:py-24 md:text-[17px]">
          {GREETING.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </div>
      <div
        className="h-[200px] bg-cover bg-center md:h-[320px]"
        style={{ backgroundImage: 'url(/images/site/greeting-band.webp)' }}
        aria-hidden
      />
    </SubPageLayout>
  );
}
