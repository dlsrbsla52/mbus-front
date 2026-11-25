import type { Metadata } from 'next';
import SubPageLayout from '@/components/site/SubPageLayout';

export const metadata: Metadata = { title: '매체안내 ｜ 미디어버스' };

interface GuideSection {
  title: string;
  subtitle: string;
  lead: string;
  details: string[];
  image: string;
  imageAlt: string;
}

const SECTIONS: GuideSection[] = [
  {
    title: '37인치 와이드형 디지털 미디어',
    subtitle: '37-inch wide digital media',
    lead: '서울버스TV는 위치 정보 기반의 정류장 안내 광고로 1개 정류장 1개 광고주 독점 미디어입니다.',
    details: [
      '매체 규격 : 0.92m X 0.28m (37인치 와이드 LCD)',
      '설치 높이 : 버스 바닥 ~ 미디어 하단부 195cm 이상',
      '서울 버스 전체 인가 차량(7,383대) 中 모든 저상/전기버스에 설치(층고가 낮은 구형 중형, 일반버스 및 순환/심야버스, 예비차 등 비효율적인 차량은 제외)',
      '특정 차종(에디슨 모터스) 차량은 차내 층고 이슈로 29인치 미디어 설치(400대)',
      '메가박스 중앙 미디어 매체로 버스정류장 안내 광고 매체이며, 정류장 안내 와 광고가 함께 병행 송출 되는 시스템',
      '하차 시 정류장 명을 확인하는 순간 바로 함께 노출되는 구조 (정류장 안내 + 10초 광고 미디어가 한 화면에 병행 노출되며 정류장 진입 3분의 1지점에 광고가 노출됩니다)',
    ],
    image: '/images/site/media-guide-1.webp',
    imageAlt: '서울버스TV 정류장 안내 광고 화면 예시',
  },
  {
    title: '2기 동시 표출로 노출 효과 극대화',
    subtitle: 'Maximize exposure effect with 2nd simultaneous display',
    lead: '승/하차 Side 동시 표출로 집중도 상승, 도달 범위 확대',
    details: [
      '강남, 서초, 송파, 홍대 주요 지역을 경유하는 서울 버스 TV는 2기 동시 표출로 노출 효과가 극대화 됩니다.',
      '타 대중교통 매체 대비 월등하게 많은 이용건수와 유동인구와 같은 불특정 다수가 아닌 명확한 실제 탑승객을 보장하는 미디어',
      '서울 교통 매체 중 동일한 금액으로 더 많은 수량을 집행하고 더 많이 노출되어 가장 낮은 집행 단가를 자랑하는 저비용 고효율의 미디어',
      '서울 방방곡곡 위치한 6,000여개의 정류장을 누비는 5,000대의 버스에 설치되어 서울 전역을 단 한 번에 커버하는 압도적인 커버리지의 미디어',
    ],
    image: '/images/site/media-guide-2.webp',
    imageAlt: '버스 내부에 2기가 동시에 표출되는 모습',
  },
  {
    title: '비전AI기술을 활용, 효과 측정 및 분석',
    subtitle: 'Use vision AI technology to measure and analyze effectiveness',
    lead: '대중교통매체 최초, 비전AI 기술 활용, 탑승객 시선 등 다양한 metrics를 분석, 다양한 지표 측정 및 분석',
    details: [
      '승차문에 위치한 서울 버스 TV 상단에 설치된 비전 센서 카메라(주요 노선 차량에 2,000기 설치)를 통해 실시간 버스 내부 영상 수집 및 데이터 비식별 처리',
      'DOOH 데이터 솔루션 전문社 ADDD의 독자적 인공지능 기술(비전AI)을 통한 타겟 객체 검출 및 바이오매트릭스*를 통한 실시간 분석',
      '분석 데이터 표본으로 노출 횟수, 연령대, 시청 시간 등 집행 결과 산출 → 광고 종료 후 리포트 제공 (정류장 안내 광고는 시스템 개발 완료 예정으로 추후 제공)',
    ],
    image: '/images/site/media-guide-3.webp',
    imageAlt: '버스 내부 영상 수집과 캠페인별 결과 리포팅 예시',
  },
  {
    title: '소재 제작 가이드',
    subtitle: 'Material production guide',
    lead: '입고 기한은 소재 송출일 최소 3 영업일 전이며, 소재 규격은 960 X 540 (px), 파일 포맷은 JPG 또는 PNG, 파일 용량은 20MB 이하 입니다.',
    details: [
      '비고 : 가독성이 떨어지는 텍스트(폰트 및 색상), 또는 해상도, 퀄리티가 낮은 이미지는 사용이 불가할 수 있습니다. 사운드도 송출되지 않으며, 무빙효과 삽입 불가하며, 고정 이미지 형태 필수 입니다.',
    ],
    image: '/images/site/media-guide-4.webp',
    imageAlt: '광고 소재 제작 예시',
  },
];

export default function MediaGuidePage() {
  return (
    <SubPageLayout section="media" current="/media/guide">
      <div className="space-y-20 md:space-y-[140px]">
        {SECTIONS.map((section, index) => (
          <section
            key={section.title}
            className={`flex flex-col items-center gap-8 md:gap-16 lg:flex-row ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
          >
            <div className="w-full lg:w-1/2">
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 export 대상 */}
              <img src={section.image} alt={section.imageAlt} className="w-full rounded-xl" />
            </div>
            <div className="w-full lg:w-1/2">
              <h2 className="text-[24px] font-bold text-[#111] md:text-[30px]">{section.title}</h2>
              <p className="mt-2 text-[13px] text-[#999]">{section.subtitle}</p>
              <p className="mt-8 text-[17px] font-bold leading-relaxed text-[#222]">{section.lead}</p>
              <ul className="mt-5 space-y-1.5 text-[14px] leading-relaxed text-[#555]">
                {section.details.map((detail) => (
                  <li key={detail}>- {detail}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </SubPageLayout>
  );
}
