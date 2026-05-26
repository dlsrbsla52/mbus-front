import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage } from '../types';

export type NotificationChannel = 'KAKAO' | 'EMAIL' | 'SMS';
export type NotificationStatus = 'SENT' | 'FAILED' | 'PENDING';

export interface NotificationRow {
  id: string;
  contractId: string;
  memberName: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: string | null;
  errorMessage: string | null;
}

export interface NotificationListParams {
  page?: number;
  size?: number;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  from?: string;
  to?: string;
}

export interface RenewalDispatchRequest {
  dryRun: boolean;
  channels: NotificationChannel[];
}

export interface RenewalDispatchResponse {
  targetCount: number;
  sent: Array<{
    memberId: string;
    channel: NotificationChannel;
    status: NotificationStatus;
  }>;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const AdminNotificationService = {
  list: (params: NotificationListParams = {}) =>
    api
      .get<ApiResponse<BackendPage<NotificationRow>>>('/api/v1/admin/notification', { params })
      .then((res) => toPageResult(res.data.data)),
  dispatchRenewal: (data: RenewalDispatchRequest) =>
    unwrap<RenewalDispatchResponse>(
      api.post('/api/v1/admin/notification/renewal', data),
    ),
};
