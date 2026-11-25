/**
 * 공개 사이트 정적 콘텐츠. 기존 mbus.co.kr(cafe24)에서 옮긴 회사 정보·비주얼·파트너 목록이다.
 * 메뉴 구성은 `constants/navigation.ts`의 `SITE_MENU`에 있다.
 */

export const COMPANY_INFO = {
  name: '미디어버스',
  tagline: '버스 내부TV 광고 | 정류장 도착 안내 광고·디지털사이니지 미디어버스',
  postalCode: '07797',
  address: '서울특별시 강남구 선릉로 511, L101',
  tel: '02-6398-1200',
  fax: '02-6951-5890',
  email: 'ym.choi@mbus.co.kr',
  businessNumber: '381-87-04003',
  ceo: '최영미',
  privacyOfficer: '김용환',
  directions: '수인분당선 선릉역 7번출구 도보 5분',
  hours: ['월 ~ 금 : 오전9시 ~ 오후6시', '토, 일, 공휴일 : 휴무'],
} as const;

/** 메뉴(1차)별 서브 비주얼. 키는 `SITE_MENU`의 href 첫 세그먼트다. */
export const SUB_VISUALS: Record<string, { title: string; image: string }> = {
  company: { title: 'COMPANY', image: '/images/site/sub-visual-1.webp' },
  media: { title: 'MEDIA', image: '/images/site/sub-visual-2.webp' },
  portfolio: { title: 'PORTFOLIO', image: '/images/site/sub-visual-3.webp' },
  inquiry: { title: 'Q&A', image: '/images/site/sub-visual-4.webp' },
  support: { title: 'CUSTOMER', image: '/images/site/sub-visual-5.webp' },
  privacy: { title: 'PRIVACY POLICY', image: '/images/site/sub-visual-5.webp' },
};

export const SUB_VISUAL_CAPTION = '믿음과 신뢰를 위하여 최선을 다하는 기업';

/** 메인 슬라이더. 문구가 이미지 안에 들어 있어 대체 텍스트로 옮겨 둔다. */
export const HOME_SLIDES = [
  {
    image: '/images/site/main-visual-1.webp',
    alt: '시선을 점유하는 단 하나의 프리미엄 광고, 서울버스TV 정류장 안내 광고',
  },
  {
    image: '/images/site/main-visual-2.webp',
    alt: '정류장 도착 전, 하차 승객의 시선이 모이는 그 순간. 당신의 브랜드가 정류장을 독점합니다',
  },
  {
    image: '/images/site/main-visual-3.webp',
    alt: '서울버스TV 정류장 안내 광고 전문 판매사, 미디어버스',
  },
] as const;

/** 홈 소개 영상(YouTube). */
export const HOME_VIDEO_ID = '5pM03VBgaKc';

export interface Partner {
  name: string;
  /** 로고가 없을 때 보여줄 이름. 줄바꿈(\n)을 유지한다. */
  label: string;
  logo: string | null;
  /** 로고 아래에 이름도 함께 보여준다. */
  stacked?: boolean;
}

/** 홈 "이미 서울버스TV와 함께한 의료기관". 로고는 협력사 사이트에서 받아 `public/images/partners`에 둔다. */
export const PARTNERS: Partner[] = [
  { name: '365서울진심치과의원', label: '365서울진심치과의원', logo: '/images/partners/p01.webp' },
  { name: '올바른마취통증의학과', label: '올바른마취\n통증의학과', logo: null },
  { name: '만세정형외과의원', label: '만세정형외과의원', logo: '/images/partners/p03.gif' },
  { name: '새움병원', label: '새움병원', logo: '/images/partners/p04.webp' },
  { name: '노원삼성정형외과', label: '노원삼성정형외과', logo: null },
  { name: '서울식플란트치과', label: '서울식플란트치과', logo: '/images/partners/p06.webp' },
  { name: '직진비뇨의학과', label: '직진비뇨의학과', logo: '/images/partners/p07.webp' },
  { name: '썬프라자치과의원', label: '썬프라자\n치과의원', logo: null },
  { name: '글로벌마취통증의학과', label: '글로벌마취\n통증의학과', logo: null },
  { name: '광명성애병원', label: '광명성애병원', logo: '/images/partners/p10.webp' },
  { name: '중앙보훈병원', label: '중앙보훈병원', logo: '/images/partners/p11.webp' },
  { name: '서울그린정형외과', label: '서울그린정형외과', logo: '/images/partners/p12.webp' },
  { name: '연세메이트치과', label: '연세메이트치과', logo: null },
  { name: '강남베드로병원', label: '강남베드로병원', logo: '/images/partners/p14.webp' },
  { name: '정철어학원', label: '정철어학원', logo: '/images/partners/p15.webp' },
  { name: '강남하트스캔', label: '강남하트스캔', logo: null },
  { name: '새생명내과', label: '새생명내과', logo: '/images/partners/p17.webp', stacked: true },
  { name: '365백세드림정형외과', label: '365백세드림\n정형외과', logo: null },
  { name: '눈에힘안과의원', label: '눈에힘안과의원', logo: '/images/partners/p19.webp' },
  { name: '국민건강내과', label: '국민건강내과', logo: '/images/partners/p20.webp' },
  { name: '강남성심병원', label: '강남성심병원', logo: '/images/partners/p21.webp' },
  { name: '웰튼병원', label: '웰튼병원', logo: '/images/partners/p22.webp' },
  { name: '가양제일365정형외과', label: '가양제일365정형외과', logo: '/images/partners/p23.webp' },
  { name: '강서바른재활의학과', label: '강서바른재활의학과', logo: '/images/partners/p24.webp' },
  { name: '세진정형외과', label: '세진정형외과', logo: '/images/partners/p25.webp' },
  { name: '홍제우리내과', label: '홍제우리내과', logo: null },
  { name: '하나제통의원', label: '하나제통의원', logo: '/images/partners/p27.webp' },
  { name: '온안과', label: '온안과', logo: '/images/partners/p28.webp' },
  { name: '박근태내과의원', label: '박근태내과의원', logo: '/images/partners/p29.webp' },
  { name: '다온삼성정형외과', label: '다온삼성정형외과', logo: '/images/partners/p30.webp' },
  { name: '서울금플란트치과', label: '서울금플란트치과', logo: '/images/partners/p31.webp' },
  { name: '바로척마취통증의학과', label: '바로척마취통증의학과', logo: '/images/partners/p32.svg' },
  { name: '서울점프정형외과', label: '서울점프정형외과', logo: null },
];

/** 홈 회사 소개 바로가기 타일. */
export const HOME_TILES = [
  { label: '회사소개', href: '/company', image: '/images/site/home-tile-1.webp' },
  { label: '매체소개', href: '/media', image: '/images/site/home-tile-2.webp' },
  { label: '포트폴리오', href: '/portfolio', image: '/images/site/home-tile-3.webp' },
  { label: '고객센터', href: '/support/notice', image: '/images/site/home-tile-4.webp' },
] as const;

/** 푸터 SNS. 기존 사이트는 링크가 비어 있어 주소를 넣은 항목만 노출한다. */
export const SNS_LINKS: { label: string; icon: string; href: string | null }[] = [
  { label: '블로그', icon: '/images/site/sns-blog.webp', href: null },
  { label: '인스타그램', icon: '/images/site/sns-instagram.webp', href: null },
  { label: '카카오톡', icon: '/images/site/sns-kakao.webp', href: null },
];

export const FAMILY_SITES = [
  { label: '네이버', href: 'https://www.naver.com/' },
  { label: '구글', href: 'https://www.google.co.kr/' },
  { label: '중소기업진흥공단', href: 'https://home.sbc.or.kr/sbc/index.jsp' },
  { label: '중소기업중앙회', href: 'https://www.kbiz.or.kr' },
] as const;

/**
 * 온라인 문의 개인정보 수집·이용 안내. 기존 사이트 문구를 그대로 옮겼다.
 * 실제 수집 항목(이름·전화·이메일·내용·접수 IP)과 다른 부분이 있어 운영 전 검토가 필요하다.
 */
export const INQUIRY_PRIVACY_NOTICE = `▶ 개인정보의 수집 및 이용목적
- 서비스 이용에 따른 본인식별, 실명확인, 가입의사 확인, 연령제한 서비스 이용
- 고지사항 전달, 불만처리 의사소통 경로 확보, 물품배송 시 정확한 배송지 정보 확보
- 신규 서비스 등 최신정보 안내 및 개인맞춤서비스 제공을 위한 자료
- 기타 원활한 양질의 서비스 제공 등

▶ 수집하는 개인정보의 항목
- 이름, 이메일, 주소, 연락처, 핸드폰번호, 그 외 선택항목

▶ 개인정보의 보유 및 이용기간
- 원칙적으로 개인정보의 수집 또는 제공받은 목적 달성 시 지체 없이 파기합니다.
- 다만, 원활한 서비스의 상담을 위해 상담 완료 후 내용을 3개월간 보유할 수 있으며 전자상거래에서의 소비자보호에 관한 법률 등 타법률에 의해 보존할 필요가 있는 경우에는 일정기간 보존합니다.`;
