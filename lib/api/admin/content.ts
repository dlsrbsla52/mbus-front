import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage, PageResult } from '../types';
import type { FaqCategory, NoticeSearchType, PortfolioCategory } from '../content-model';

/**
 * 관리자 홈페이지 콘텐츠 API(`/api/v1/admin/content/**`).
 * 포트폴리오·공지사항·FAQ·이미지 업로드는 ADMIN_MASTER·ADMIN_DEVELOPER, 온라인 문의는 관리자 전체가 쓴다.
 */

export type ImagePurpose = 'PORTFOLIO' | 'NOTICE';
export type InquiryStatus = 'RECEIVED' | 'DONE';

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  RECEIVED: '접수',
  DONE: '처리 완료',
};

export interface ImageUploadTicket {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  publicUrl: string;
  expiresAt: string;
}

export interface AdminPortfolio {
  id: string;
  title: string;
  category: PortfolioCategory;
  description: string | null;
  imageKey: string;
  thumbnailKey: string;
  imageUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
  visible: boolean;
  legacyIdx: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPortfolioRequest {
  title: string;
  category: PortfolioCategory;
  description?: string | null;
  imageKey: string;
  thumbnailKey: string;
  visible: boolean;
  legacyIdx?: number | null;
}

export interface AdminNoticeSummary {
  id: string;
  title: string;
  pinned: boolean;
  visible: boolean;
  viewCount: number;
  publishedAt: string;
}

export interface AdminNotice extends AdminNoticeSummary {
  body: string;
  images: { key: string; url: string }[];
  legacyIdx: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNoticeRequest {
  title: string;
  body: string;
  pinned: boolean;
  visible: boolean;
  /** OffsetDateTime(`YYYY-MM-DDTHH:mm:ss+09:00`). 비우면 등록 시각 */
  publishedAt?: string | null;
  imageKeys: string[];
  legacyIdx?: number | null;
  legacyViewCount?: number | null;
}

export interface AdminFaq {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  sortOrder: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFaqRequest {
  category: FaqCategory;
  question: string;
  answer: string;
  visible: boolean;
}

export interface AdminInquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  content: string;
  status: InquiryStatus;
  adminMemo: string | null;
  handledById: string | null;
  handledAt: string | null;
  clientIp: string | null;
  createdAt: string;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> => p.then((res) => res.data.data);
const unit = (p: Promise<unknown>): Promise<void> => p.then(() => undefined);
const page = <T>(url: string, params: object): Promise<PageResult<T>> =>
  api.get<ApiResponse<BackendPage<T>>>(url, { params }).then((res) => toPageResult(res.data.data));

const BASE = '/api/v1/admin/content';

export const AdminContentService = {
  issueImageUpload: (data: { purpose: ImagePurpose; contentType: string; contentLength: number; thumbnail?: boolean }) =>
    unwrap<ImageUploadTicket>(api.post(`${BASE}/images/upload-url`, data)),

  portfolios: (params: { category?: PortfolioCategory; keyword?: string; page?: number; size?: number } = {}) =>
    page<AdminPortfolio>(`${BASE}/portfolio`, params),
  createPortfolio: (data: AdminPortfolioRequest) => unwrap<AdminPortfolio>(api.post(`${BASE}/portfolio`, data)),
  updatePortfolio: (id: string, data: AdminPortfolioRequest) => unwrap<AdminPortfolio>(api.put(`${BASE}/portfolio/${id}`, data)),
  deletePortfolio: (id: string) => unit(api.delete(`${BASE}/portfolio/${id}`)),
  reorderPortfolios: (ids: string[]) => unit(api.put(`${BASE}/portfolio/order`, { ids })),

  notices: (params: { keyword?: string; searchType?: NoticeSearchType; page?: number; size?: number } = {}) =>
    page<AdminNoticeSummary>(`${BASE}/notice`, params),
  notice: (id: string) => unwrap<AdminNotice>(api.get(`${BASE}/notice/${id}`)),
  createNotice: (data: AdminNoticeRequest) => unwrap<AdminNotice>(api.post(`${BASE}/notice`, data)),
  updateNotice: (id: string, data: AdminNoticeRequest) => unwrap<AdminNotice>(api.put(`${BASE}/notice/${id}`, data)),
  deleteNotice: (id: string) => unit(api.delete(`${BASE}/notice/${id}`)),

  faqs: () => unwrap<AdminFaq[]>(api.get(`${BASE}/faq`)),
  createFaq: (data: AdminFaqRequest) => unwrap<AdminFaq>(api.post(`${BASE}/faq`, data)),
  updateFaq: (id: string, data: AdminFaqRequest) => unwrap<AdminFaq>(api.put(`${BASE}/faq/${id}`, data)),
  deleteFaq: (id: string) => unit(api.delete(`${BASE}/faq/${id}`)),
  reorderFaqs: (ids: string[]) => unit(api.put(`${BASE}/faq/order`, { ids })),

  inquiries: (params: { status?: InquiryStatus; page?: number; size?: number } = {}) =>
    page<AdminInquiry>(`${BASE}/inquiry`, params),
  /** `memo`: 생략·null이면 기존 메모를 유지하고, 빈 문자열이면 지운다. */
  changeInquiryStatus: (id: string, data: { status: InquiryStatus; memo?: string | null }) =>
    unwrap<AdminInquiry>(api.put(`${BASE}/inquiry/${id}/status`, data)),
  deleteInquiry: (id: string) => unit(api.delete(`${BASE}/inquiry/${id}`)),
};

/** 업로드 결과(등록 요청에 넣을 키와 미리보기용 공개 주소) */
export interface UploadedImage {
  key: string;
  url: string;
}

/** 긴 변을 `maxEdge` 이하로 줄여 WebP로 바꾼다. 브라우저가 WebP 인코딩을 못 하면 흰 배경 위에 그려 JPEG로 바꾼다. */
async function resizeImage(file: File, maxEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서는 이미지를 변환할 수 없습니다.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    const webp = await encode('image/webp');
    if (webp && webp.type === 'image/webp') return webp;
    // JPEG는 투명을 지원하지 않아 검게 변하므로, 그려 둔 이미지 뒤에 흰 배경을 깐다.
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const jpeg = await encode('image/jpeg');
    if (!jpeg) throw new Error('이미지를 변환하지 못했습니다.');
    return jpeg;
  } finally {
    bitmap.close();
  }
}

/**
 * 이미지를 줄여 저장소에 바로 올린다: 업로드 URL 발급 → 브라우저에서 PUT.
 * 반환한 키로 포트폴리오·공지 등록 요청을 보내야 서버가 업로드 여부를 확인하고 연결한다.
 */
export async function uploadContentImage(
  file: File,
  purpose: ImagePurpose,
  options: { maxEdge: number; thumbnail?: boolean },
): Promise<UploadedImage> {
  const blob = await resizeImage(file, options.maxEdge);
  const ticket = await AdminContentService.issueImageUpload({
    purpose,
    contentType: blob.type,
    contentLength: blob.size,
    thumbnail: options.thumbnail ?? false,
  });
  let res: Response;
  try {
    res = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: blob });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('이미지 저장소에 연결하지 못했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
    }
    throw error;
  }
  if (!res.ok) throw new Error(`이미지 업로드에 실패했습니다. (${res.status})`);
  return { key: ticket.key, url: ticket.publicUrl };
}
