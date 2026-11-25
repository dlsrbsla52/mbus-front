// 공개·관리자 화면이 함께 쓰는 콘텐츠 타입과 라벨. 요청 코드는 content.ts(공개), admin/content.ts(관리자)에 있다.

/** 백엔드 content 모듈 `PortfolioCategory` */
export type PortfolioCategory = 'HOSPITAL' | 'ACADEMY' | 'FNB' | 'ETC';

export const PORTFOLIO_CATEGORY_LABEL: Record<PortfolioCategory, string> = {
  HOSPITAL: '병원',
  ACADEMY: '학원',
  FNB: 'F&B',
  ETC: '기타',
};

export const PORTFOLIO_CATEGORIES = Object.keys(PORTFOLIO_CATEGORY_LABEL) as PortfolioCategory[];

/** 백엔드 content 모듈 `FaqCategory` */
export type FaqCategory = 'MEDIA' | 'HOSPITAL';

export const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  MEDIA: '서울버스TV 매체',
  HOSPITAL: '병원 광고',
};

export const FAQ_CATEGORIES = Object.keys(FAQ_CATEGORY_LABEL) as FaqCategory[];

export interface Portfolio {
  id: string;
  title: string;
  category: PortfolioCategory;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string;
}

export interface NoticeSummary {
  id: string;
  title: string;
  pinned: boolean;
  viewCount: number;
  publishedAt: string;
}

export interface NoticeDetail extends NoticeSummary {
  body: string;
  imageUrls: string[];
}

export interface Faq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export interface PortfolioListParams {
  category?: PortfolioCategory;
  keyword?: string;
  page?: number;
  size?: number;
}

export type NoticeSearchType = 'TITLE' | 'BODY';

export interface NoticeListParams {
  keyword?: string;
  searchType?: NoticeSearchType;
  page?: number;
  size?: number;
}

export interface InquiryCreateRequest {
  name: string;
  phone: string;
  email: string;
  content: string;
  privacyAgreed: boolean;
}
