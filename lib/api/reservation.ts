import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage, PageResult } from './types';

export type ReservationStatus =
  | 'PENDING'
  | 'CONSULTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

/** 정류소 광고면을 선점 중인 상태. 이 상태일 때만 `holdExpiresAt` 이 내려온다. */
export const HOLDING_STATUSES: readonly ReservationStatus[] = ['PENDING', 'CONSULTING'];

export const isHolding = (status: string): boolean =>
  (HOLDING_STATUSES as readonly string[]).includes(status);

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: '대기',
  CONSULTING: '상담중',
  COMPLETED: '완료',
  CANCELLED: '취소',
  REJECTED: '반려',
  EXPIRED: '기간 만료',
};

export interface MyReservation {
  reservationId: string;
  stopId: string;
  stopNumber?: string;
  stopName?: string;
  status: ReservationStatus;
  /** 선점 만료 일시(ISO). 진행 중(PENDING/CONSULTING)일 때만 값이 있다. */
  holdExpiresAt?: string | null;
  consultationRequestedAt: string;
  desiredContractStartDate?: string;
  createdAt: string;
}

export interface ConsultationHistory {
  consultationId: string;
  status: ReservationStatus;
  note?: string;
  createdAt: string;
}

export interface ReservationDetail extends MyReservation {
  memberId: string;
  consultations: ConsultationHistory[];
}

export interface ReservationCreateRequest {
  stopId: string[]; // 복수 정류소 UUID
  consultationRequestedAt: string; // ISO datetime
  desiredContractStartDate?: string; // YYYY-MM-DD (optional)
}

/** 정류소 1건의 예약 결과. 실패하면 `errorCode`·`message` 로 사유를 알린다. */
export interface ReservationCreateResultItem {
  stopId: string;
  success: boolean;
  reservationId?: string | null;
  holdExpiresAt?: string | null;
  errorCode?: string | null;
  message?: string | null;
}

/**
 * 예약 생성 응답. 정류소별로 따로 처리되므로 일부만 성공할 수 있다(HTTP 200).
 * 전부 실패해도 200 이므로 `failureCount` 와 `results` 를 반드시 확인한다.
 */
export interface ReservationCreateResponse {
  successCount: number;
  failureCount: number;
  results: ReservationCreateResultItem[];
}

export interface ReservationListParams {
  page?: number;
  size?: number;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const ReservationService = {
  create: (data: ReservationCreateRequest): Promise<ReservationCreateResponse> =>
    unwrap<ReservationCreateResponse>(api.post('/api/v1/reservation', data)),
  listMine: (params: ReservationListParams = {}): Promise<PageResult<MyReservation>> =>
    api
      .get<ApiResponse<BackendPage<MyReservation>>>('/api/v1/reservation/me', { params })
      .then((res) => toPageResult(res.data.data)),
  detail: (reservationId: string): Promise<ReservationDetail> =>
    unwrap<ReservationDetail>(api.get(`/api/v1/reservation/${reservationId}`)),
  cancel: (reservationId: string): Promise<null> =>
    unwrap<null>(api.delete(`/api/v1/reservation/${reservationId}`)),
};
