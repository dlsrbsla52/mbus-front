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

// 계약 생성은 관리자 기능이라 여기 없다. 공개 `POST /api/v1/contract` 는 백엔드에서 제거됐고,
// 관리자 사이트가 `/api/v1/admin/**`(예약 완료 → 계약 생성 등)로 처리한다.
export const ContractService = {
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
