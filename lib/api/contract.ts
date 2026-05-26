import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage } from './types';

export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'PENDING';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface Contract {
  id: string;
  stopId: string;
  stopName?: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  amount?: number;
  paymentStatus?: PaymentStatus;
  signedAt?: string | null;
  createdAt: string;
}

export interface ContractCreateRequest {
  stopId: string;
  startDate: string;
  endDate: string;
}

export interface ContractListParams {
  page?: number;
  size?: number;
  status?: ContractStatus;
}

export interface ContractSignRequest {
  signatureImageBase64: string;
}

export interface ContractPayRequest {
  method: 'CARD' | 'TRANSFER' | 'VBANK';
  amount: number;
  transactionId: string;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const ContractService = {
  create: (data: ContractCreateRequest) =>
    unwrap<Contract>(api.post('/api/v1/contract', data)),
  listMine: (params: ContractListParams = {}) =>
    api
      .get<ApiResponse<BackendPage<Contract>>>('/api/v1/contract/me', { params })
      .then((res) => toPageResult(res.data.data)),
  detail: (contractId: string) =>
    unwrap<Contract>(api.get(`/api/v1/contract/${contractId}`)),
  sign: (contractId: string, data: ContractSignRequest) =>
    unwrap<Contract>(api.post(`/api/v1/contract/${contractId}/sign`, data)),
  pay: (contractId: string, data: ContractPayRequest) =>
    unwrap<Contract>(api.post(`/api/v1/contract/${contractId}/pay`, data)),
  renew: (contractId: string) =>
    unwrap<Contract>(api.post(`/api/v1/contract/${contractId}/renew`)),
};
