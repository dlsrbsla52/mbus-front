import { api } from './client';
import type { ApiResponse } from './types';

export interface StopPrice {
  id: string;
  stopId: string;
  unitPrice: number;
  registeredById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StopPriceCreateRequest {
  stopId: string;
  unitPrice: number;
}

export interface StopPriceUpdateRequest {
  unitPrice: number;
}

/**
 * 백엔드 `StopPriceResponse` 원형. `unitPrice` 는 Kotlin `BigDecimal` 이라
 * 직렬화 설정에 따라 number(`1200000.00`) 또는 string(`"1200000.00"`) 으로 내려올 수 있다.
 */
interface StopPriceResponseRaw {
  id: string;
  stopId: string;
  unitPrice: number | string;
  registeredById?: string | null;
  createdAt: string;
  updatedAt: string;
}

const toStopPrice = (raw: StopPriceResponseRaw): StopPrice => ({
  id: raw.id,
  stopId: raw.stopId,
  unitPrice: Number(raw.unitPrice),
  registeredById: raw.registeredById ?? undefined,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

const unwrapPrice = (
  p: Promise<{ data: ApiResponse<StopPriceResponseRaw> }>,
): Promise<StopPrice> => p.then((res) => toStopPrice(res.data.data));

/** 정류장별 현재 광고 단가를 관리하는 관리자 API. */
export const StopPriceService = {
  /**
   * 단가 조회. 백엔드는 미등록 정류소에 대해 404 가 아니라
   * `{ code: "00000", message: "성공하였습니다." }` (data 키 자체가 생략된 성공 응답)을 반환하므로
   * `data` 부재를 명시적으로 `null` 로 정규화한다.
   */
  get: (stopId: string): Promise<StopPrice | null> =>
    api
      .get<ApiResponse<StopPriceResponseRaw | null>>(`/api/v1/admin/stop/${stopId}/price`)
      .then((res) => {
        const data = res.data?.data;
        return data ? toStopPrice(data) : null;
      }),
  create: (data: StopPriceCreateRequest): Promise<StopPrice> =>
    unwrapPrice(api.post('/api/v1/admin/stop/price', data)),
  update: (stopId: string, data: StopPriceUpdateRequest): Promise<StopPrice> =>
    unwrapPrice(api.put(`/api/v1/admin/stop/${stopId}/price`, data)),
  /** 삭제 응답은 `ApiResponse<Unit?>` 로 data 가 없다. */
  remove: (stopId: string): Promise<void> =>
    api.delete(`/api/v1/admin/stop/${stopId}/price`).then(() => undefined),
};
