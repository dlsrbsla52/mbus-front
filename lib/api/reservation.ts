import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage } from './types';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Reservation {
  id: string;
  contractId: string;
  stopId: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  createdAt: string;
}

export interface ReservationCreateRequest {
  contractId: string;
  stopId: string;
  startAt: string;
  endAt: string;
}

export interface ReservationListParams {
  page?: number;
  size?: number;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const ReservationService = {
  create: (data: ReservationCreateRequest) =>
    unwrap<Reservation>(api.post('/api/v1/reservation', data)),
  listMine: (params: ReservationListParams = {}) =>
    api
      .get<ApiResponse<BackendPage<Reservation>>>('/api/v1/reservation/me', { params })
      .then((res) => toPageResult(res.data.data)),
  detail: (reservationId: string) =>
    unwrap<Reservation>(api.get(`/api/v1/reservation/${reservationId}`)),
  cancel: (reservationId: string) =>
    unwrap<null>(api.delete(`/api/v1/reservation/${reservationId}`)),
};
