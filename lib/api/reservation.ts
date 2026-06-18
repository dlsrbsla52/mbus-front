import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage, PageResult } from './types';

export type ReservationStatus = 'PENDING' | 'CONSULTING' | 'COMPLETED' | 'CANCELLED';

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: '대기',
  CONSULTING: '상담중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

export interface MyReservation {
  reservationId: string;
  stopId: string;
  stopNumber?: string;
  stopName?: string;
  status: ReservationStatus;
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

export interface ReservationListParams {
  page?: number;
  size?: number;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const ReservationService = {
  create: (data: ReservationCreateRequest): Promise<string[]> =>
    unwrap<string[]>(api.post('/api/v1/reservation', data)),
  listMine: (params: ReservationListParams = {}): Promise<PageResult<MyReservation>> =>
    api
      .get<ApiResponse<BackendPage<MyReservation>>>('/api/v1/reservation/me', { params })
      .then((res) => toPageResult(res.data.data)),
  detail: (reservationId: string): Promise<ReservationDetail> =>
    unwrap<ReservationDetail>(api.get(`/api/v1/reservation/${reservationId}`)),
  cancel: (reservationId: string): Promise<null> =>
    unwrap<null>(api.delete(`/api/v1/reservation/${reservationId}`)),
};
