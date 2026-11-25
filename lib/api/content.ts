import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage, PageResult } from './types';
import type {
  Faq,
  InquiryCreateRequest,
  NoticeDetail,
  NoticeListParams,
  NoticeSummary,
  Portfolio,
  PortfolioListParams,
} from './content-model';

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> => p.then((res) => res.data.data);

/** 공개 사이트 콘텐츠(포트폴리오·공지·FAQ·온라인 문의). 로그인 없이 호출한다. */
export const ContentService = {
  portfolios: (params: PortfolioListParams = {}): Promise<PageResult<Portfolio>> =>
    api
      .get<ApiResponse<BackendPage<Portfolio>>>('/api/v1/content/portfolio', { params })
      .then((res) => toPageResult(res.data.data)),
  portfolio: (id: string): Promise<Portfolio> =>
    unwrap<Portfolio>(api.get('/api/v1/content/portfolio/detail', { params: { id } })),
  notices: (params: NoticeListParams = {}): Promise<PageResult<NoticeSummary>> =>
    api
      .get<ApiResponse<BackendPage<NoticeSummary>>>('/api/v1/content/notice', { params })
      .then((res) => toPageResult(res.data.data)),
  notice: (id: string): Promise<NoticeDetail> =>
    unwrap<NoticeDetail>(api.get('/api/v1/content/notice/detail', { params: { id } })),
  faqs: (): Promise<Faq[]> => unwrap<Faq[]>(api.get('/api/v1/content/faq')),
  createInquiry: (data: InquiryCreateRequest): Promise<null> =>
    unwrap<null>(api.post('/api/v1/content/inquiry', data)),
};
