import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage } from '../types';
import type { Contract } from '../contract';

export interface AdminContractRow extends Contract {
  memberName: string;
  stopName: string;
  salesRepName?: string;
}

export interface AdminContractListParams {
  page?: number;
  size?: number;
  salesRepId?: string;
  stopId?: string;
  from?: string;
  to?: string;
  status?: Contract['status'];
}

export type ContractStatsGroupBy = 'salesRep' | 'stop' | 'month';

export interface ContractStatsRow {
  key: string;
  label: string;
  contractCount: number;
  totalAmount: number;
}

export interface ContractStatsResponse {
  groupBy: ContractStatsGroupBy;
  rows: ContractStatsRow[];
  summary: { contractCount: number; totalAmount: number };
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const AdminContractService = {
  list: (params: AdminContractListParams = {}) =>
    api
      .get<ApiResponse<BackendPage<AdminContractRow>>>('/api/v1/admin/contract', { params })
      .then((res) => toPageResult(res.data.data)),
  stats: (params: { groupBy: ContractStatsGroupBy; from?: string; to?: string }) =>
    unwrap<ContractStatsResponse>(
      api.get('/api/v1/admin/contract/stats', { params }),
    ),
};
