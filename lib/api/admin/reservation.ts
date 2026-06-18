import { api } from '../client';
import { toPageResult } from '../types';
import type { ApiResponse, BackendPage, PageResult } from '../types';
import type { MyReservation, ConsultationHistory } from '../reservation';

/**
 * 어드민 예약 목록 조회 시 반환되는 데이터 DTO
 */
export interface AdminReservationRow extends MyReservation {
  memberId: string;
  assigneeId?: string;
  memberName?: string; // 기존 호환성을 위해 옵셔널 필드로 유지
}

/**
 * 어드민 예약 상세 조회 시 반환되는 데이터 DTO
 */
export interface AdminReservationDetail extends MyReservation {
  memberId: string;
  assigneeId?: string;
  consultations: ConsultationHistory[];
}

/**
 * 전체 예약 조건 검색 파라미터 (최신 openAPI 스펙 반영)
 */
export interface AdminReservationListParams {
  page?: number;
  size?: number;
  status?: MyReservation['status'];
  assigneeId?: string;
  stopId?: string;
  createdFrom?: string; // 기존 'from'에서 변경
  createdTo?: string;   // 기존 'to'에서 변경
}

/**
 * 회원별 예약 목록 조회 파라미터
 */
export interface MemberReservationListParams {
  page?: number;
  size?: number;
}

/**
 * 예약 상태 변경 요청 DTO
 */
export interface UpdateReservationStatusRequest {
  status: MyReservation['status'];
  note?: string;
}

/**
 * 담당자 배정 요청 DTO
 */
export interface AssignReservationRequest {
  assigneeId: string;
}

/**
 * 예약 완료 및 계약 생성 요청 DTO
 */
export interface CompleteToContractRequest {
  contractName: string;
  totalAmount?: number;
  payAmount?: number;
  paymentCycle: string;
  paymentMethod: string;
  contractStartDate: string; // ISO datetime
  contractEndDate: string;   // ISO datetime
  note?: string;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const AdminReservationService = {
  /**
   * 전체 예약 조건 검색
   * GET /api/v1/admin/reservation/reservations
   */
  list: (params: AdminReservationListParams = {}): Promise<PageResult<AdminReservationRow>> =>
    api
      .get<ApiResponse<BackendPage<AdminReservationRow>>>('/api/v1/admin/reservation/reservations', { params })
      .then((res) => toPageResult(res.data.data)),

  /**
   * 회원별 예약 목록 조회
   * GET /api/v1/admin/reservation/members/{memberId}/reservations
   */
  listByMember: (
    memberId: string,
    params: MemberReservationListParams = {}
  ): Promise<PageResult<AdminReservationRow>> =>
    api
      .get<ApiResponse<BackendPage<AdminReservationRow>>>(
        `/api/v1/admin/reservation/members/${memberId}/reservations`,
        { params }
      )
      .then((res) => toPageResult(res.data.data)),

  /**
   * 예약 상세 조회
   * GET /api/v1/admin/reservation/reservations/{reservationId}
   */
  detail: (reservationId: string): Promise<AdminReservationDetail> =>
    unwrap<AdminReservationDetail>(
      api.get(`/api/v1/admin/reservation/reservations/${reservationId}`)
    ),

  /**
   * 예약 상태 변경
   * PUT /api/v1/admin/reservation/reservations/{reservationId}/status
   */
  updateStatus: (
    reservationId: string,
    data: UpdateReservationStatusRequest
  ): Promise<null> =>
    unwrap<null>(
      api.put(`/api/v1/admin/reservation/reservations/${reservationId}/status`, data)
    ),

  /**
   * 예약 담당자 배정
   * PUT /api/v1/admin/reservation/reservations/{reservationId}/assignee
   */
  assign: (
    reservationId: string,
    data: AssignReservationRequest
  ): Promise<null> =>
    unwrap<null>(
      api.put(`/api/v1/admin/reservation/reservations/${reservationId}/assignee`, data)
    ),

  /**
   * 예약 완료 및 계약 생성
   * POST /api/v1/admin/reservation/reservations/{reservationId}/complete-to-contract
   */
  completeToContract: (
    reservationId: string,
    data: CompleteToContractRequest
  ): Promise<null> =>
    unwrap<null>(
      api.post(`/api/v1/admin/reservation/reservations/${reservationId}/complete-to-contract`, data)
    ),
};
