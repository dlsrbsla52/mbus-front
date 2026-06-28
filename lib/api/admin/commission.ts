import { api } from '../client';
import type { ApiResponse } from '../types';

export interface ManagerCommissionResponse {
  memberId: string;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractCommissionOverrideResponse {
  contractId: string;
  memberId: string;
  commissionRate: number;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRateHistoryResponse {
  id: string;
  memberId: string;
  contractId?: string;
  changeType: 'DEFAULT_RATE' | 'CONTRACT_OVERRIDE';
  previousRate?: number;
  newRate: number;
  reason?: string;
  changedBy: string;
  createdAt: string;
}

export interface UpdateCommissionRateRequest {
  rate: number;
  reason?: string;
}

export interface UpsertContractOverrideRequest {
  memberId: string;
  rate: number;
  reason?: string;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const CommissionService = {
  getManagerCommission: (memberId: string) =>
    unwrap<ManagerCommissionResponse>(
      api.get(`/api/v1/admin/commission/${memberId}`),
    ),

  updateManagerCommission: (memberId: string, data: UpdateCommissionRateRequest) =>
    unwrap<ManagerCommissionResponse>(
      api.put(`/api/v1/admin/commission/${memberId}`, data),
    ),

  getMemberHistory: (memberId: string) =>
    unwrap<CommissionRateHistoryResponse[]>(
      api.get(`/api/v1/admin/commission/${memberId}/history`),
    ),

  getContractOverride: (contractId: string) =>
    unwrap<ContractCommissionOverrideResponse | null>(
      api.get(`/api/v1/admin/commission/contract/${contractId}/override`),
    ),

  upsertContractOverride: (contractId: string, data: UpsertContractOverrideRequest) =>
    unwrap<ContractCommissionOverrideResponse>(
      api.put(`/api/v1/admin/commission/contract/${contractId}/override`, data),
    ),

  getContractHistory: (contractId: string) =>
    unwrap<CommissionRateHistoryResponse[]>(
      api.get(`/api/v1/admin/commission/contract/${contractId}/history`),
    ),
};
