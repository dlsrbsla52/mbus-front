import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage, PageResult } from '../types';
import { toApiOffsetDateTime } from '../date-serializer';
import type { MemberStatus, MemberType } from '../member';

/** 계약 상태 — iam `AdminBusinessContractResponse.status` */
export type AdminContractStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
export type AdminContractStatusTarget = Exclude<AdminContractStatus, 'PENDING'>;
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
  memberId?: string | null;
  managerId?: string | null;
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

export interface AdminContractSearchParams extends MemberContractListParams {
  keyword?: string;
  status?: AdminContractStatus;
  memberId?: string;
  stopId?: string;
  startFrom?: string;
  startThrough?: string;
}

export type AdminContractCreateInput = {
  stopId: string;
  contractName: string;
  startDate: string;
  totalAmount?: string;
  payAmount?: string;
  paymentCycle: ContractPaymentCycle;
  paymentMethod: ContractPaymentMethod;
  memberId?: string;
  managerId?: string;
  note?: string;
} & ({ endDate: string; durationMonths?: never } | { endDate?: never; durationMonths: number });

type CreatedContract = Pick<
  AdminBusinessContract,
  'id' | 'contractName' | 'stopId' | 'stopNumber' | 'stopName' | 'memberId' |
  'status' | 'contractStartDate' | 'contractEndDate' | 'createdAt'
>;

export const UUID_PATTERN = '[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}';

const CONTRACT_PATH = '/api/v1/admin/contract';

export const AdminContractService = {
  search: ({ startFrom, startThrough, ...params }: AdminContractSearchParams) =>
    api
      .get<ApiResponse<BackendPage<AdminBusinessContract>>>(CONTRACT_PATH, {
        params: {
          ...params,
          contractStartFrom: startFrom ? toApiOffsetDateTime(startFrom) : undefined,
          contractStartTo: startThrough ? toApiOffsetDateTime(startThrough, '23:59:59.999999') : undefined,
        },
      })
      .then((res) => toPageResult(res.data.data)),

  detail: (id: string) =>
    api.get<ApiResponse<AdminBusinessContract>>(`${CONTRACT_PATH}/${id}`).then((res) => res.data.data),

  updateStatus: (id: string, input: { status: AdminContractStatusTarget; cancelReason?: string }) =>
    api.put<ApiResponse<null>>(`${CONTRACT_PATH}/${id}/status`, input).then((res) => res.data.data),

  updatePaymentStatus: (
    id: string,
    { paymentStatus, paidAmount, paidAt }: {
      paymentStatus: ContractPaymentStatus;
      paidAmount?: string;
      paidAt?: string;
    },
  ) =>
    api.put<ApiResponse<null>>(`${CONTRACT_PATH}/${id}/payment-status`, {
      paymentStatus,
      paidAmount,
      paidAt: paidAt ? toApiOffsetDateTime(paidAt, paidAt.slice(11)) : undefined,
    }).then((res) => res.data.data),

  create: ({ startDate, endDate, ...input }: AdminContractCreateInput) =>
    api.post<ApiResponse<CreatedContract>>(CONTRACT_PATH, {
      ...input,
      contractStartDate: toApiOffsetDateTime(startDate),
      contractEndDate: endDate ? toApiOffsetDateTime(endDate) : undefined,
    }).then((res) => res.data.data),

  /**
   * 매니저 계약 목록 조회
   * GET /api/v1/admin/contract/member/{memberId}
   */
  listByMember: (
    memberId: string,
    params: MemberContractListParams = {},
  ): Promise<AdminMemberContractList> =>
    api
      .get<ApiResponse<RawMemberContractList>>(`${CONTRACT_PATH}/member/${memberId}`, {
        params,
      })
      .then((res) => ({
        member: res.data.data.member,
        contracts: toPageResult(res.data.data.contracts),
      })),
};
