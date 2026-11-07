import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage, PageResult } from '../types';
import type { MemberStatus, MemberType } from '../member';

/** 계약 상태 — iam `AdminBusinessContractResponse.status` */
export type AdminContractStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
/** 납부 주기 */
export type ContractPaymentCycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
/** 납부 방법 */
export type ContractPaymentMethod = 'BANK_TRANSFER' | 'CARD' | 'CASH';
/** 납부 상태 */
export type ContractPaymentStatus = 'UNPAID' | 'PAID' | 'OVERDUE';

export const CONTRACT_STATUS_LABEL: Record<AdminContractStatus, string> = {
  PENDING: '대기',
  ACTIVE: '진행중',
  EXPIRED: '만료',
  CANCELLED: '취소',
};

export const CONTRACT_PAYMENT_CYCLE_LABEL: Record<ContractPaymentCycle, string> = {
  MONTHLY: '월납',
  QUARTERLY: '분기납',
  ANNUALLY: '연납',
};

export const CONTRACT_PAYMENT_METHOD_LABEL: Record<ContractPaymentMethod, string> = {
  BANK_TRANSFER: '계좌이체',
  CARD: '카드',
  CASH: '현금',
};

export const CONTRACT_PAYMENT_STATUS_LABEL: Record<ContractPaymentStatus, string> = {
  UNPAID: '미납',
  PAID: '납부완료',
  OVERDUE: '연체',
};

/**
 * 관리자 전용 계약 결합 응답 (`AdminBusinessContractResponse`).
 * `stopNumber` / `stopName` 은 stop 서비스 장애 또는 삭제된 정류소일 때 null 이다.
 */
export interface AdminBusinessContract {
  id: string;
  stopId: string;
  stopNumber?: string | null;
  stopName?: string | null;
  memberId: string;
  contractName: string;
  status: AdminContractStatus;
  contractStartDate: string;
  contractEndDate: string;
  totalAmount?: number | null;
  payAmount?: number | null;
  paymentCycle?: ContractPaymentCycle | null;
  paymentMethod?: ContractPaymentMethod | null;
  paymentStatus?: ContractPaymentStatus | null;
  paidAmount?: number | null;
  paidAt?: string | null;
  createdAt: string;
}

/** 매니저 요약 정보 (`MemberSummary`) */
export interface ContractMemberSummary {
  id: string;
  loginId: string;
  email: string;
  memberType: MemberType;
  status: MemberStatus;
}

/** 어드민 전용 매니저별 계약 결합 응답 (`AdminMemberContractListResponse`) */
export interface AdminMemberContractList {
  member: ContractMemberSummary;
  contracts: PageResult<AdminBusinessContract>;
}

export interface MemberContractListParams {
  /** 0-base 페이지 번호 */
  page?: number;
  /** 페이지 크기 */
  size?: number;
}

interface RawMemberContractList {
  member: ContractMemberSummary;
  contracts: BackendPage<AdminBusinessContract>;
}

export const AdminContractService = {
  /**
   * 매니저 계약 목록 조회
   * GET /api/v1/admin/contract/member/{memberId}
   */
  listByMember: (
    memberId: string,
    params: MemberContractListParams = {},
  ): Promise<AdminMemberContractList> =>
    api
      .get<ApiResponse<RawMemberContractList>>(`/api/v1/admin/contract/member/${memberId}`, {
        params,
      })
      .then((res) => ({
        member: res.data.data.member,
        contracts: toPageResult(res.data.data.contracts),
      })),
};
