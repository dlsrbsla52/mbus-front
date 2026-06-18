import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage } from '../types';
import type { MyReservation } from '../reservation';

export interface AdminReservationRow extends MyReservation {
  memberName: string;
}

export interface AdminReservationListParams {
  page?: number;
  size?: number;
  memberId?: string;
  stopId?: string;
  from?: string;
  to?: string;
  status?: MyReservation['status'];
}

export const AdminReservationService = {
  list: (params: AdminReservationListParams = {}) =>
    api
      .get<ApiResponse<BackendPage<AdminReservationRow>>>('/api/v1/admin/reservation', { params })
      .then((res) => toPageResult(res.data.data)),
};
