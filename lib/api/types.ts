export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * 백엔드 공통 페이징 봉투 (common `PageResult` 직렬화 형태).
 * 프론트 `PageResult` 와 필드명이 다르므로 `toPageResult` 로 변환해 사용한다.
 */
export interface BackendPage<T> {
  items: T[];
  totalCnt: number;
  pageRows: number;
  pageNum: number;
}

/**
 * 백엔드 페이징 봉투(`{items,totalCnt,pageRows,pageNum}`)를
 * 프론트 `PageResult<T>`(`{content,page,size,totalElements,totalPages}`)로 변환한다.
 * 항목 형태가 다르면 `mapItem` 으로 변환하고, 같으면 생략(항등)한다.
 */
export function toPageResult<TRaw, T = TRaw>(
  page: BackendPage<TRaw> | null | undefined,
  mapItem: (raw: TRaw) => T = (raw) => raw as unknown as T,
): PageResult<T> {
  const items = page?.items ?? [];
  const pageRows = page?.pageRows ?? 0;
  const totalElements = page?.totalCnt ?? 0;
  return {
    content: items.map(mapItem),
    page: page?.pageNum ?? 0,
    size: pageRows,
    totalElements,
    totalPages: pageRows > 0 ? Math.ceil(totalElements / pageRows) : 0,
  };
}

export { RESULT_CODES, isSuccess, messageForCode } from './result-codes';
export type { ResultCode } from './result-codes';
