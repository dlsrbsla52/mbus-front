import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage } from './types';

/**
 * 백엔드 iam `MemberResponse.memberType` enum.
 * - MEMBER: 일반 광고주
 * - BUSINESS: 기업 광고주(사업자번호 보유)
 * - ADMIN_USER: 일반 관리자
 * - ADMIN_MASTER: 마스터 관리자 (역할/권한 관리 가능)
 * - ADMIN_DEVELOPER: 개발자 관리자
 */
export type MemberType =
  | 'MEMBER'
  | 'BUSINESS'
  | 'ADMIN_USER'
  | 'ADMIN_MASTER'
  | 'ADMIN_DEVELOPER';

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';
export type Permission = 'READ' | 'WRITE' | 'MANAGE';

const ADMIN_TYPES: ReadonlySet<MemberType> = new Set([
  'ADMIN_USER',
  'ADMIN_MASTER',
  'ADMIN_DEVELOPER',
]);

/**
 * 백엔드 iam 회원 응답의 정합 타입.
 * - 백엔드 응답에는 `permissions` 가 없어 `memberType` 으로 파생한다.
 *   (정식 권한 모델 확정 시 `/api/v1/member/me/permissions` 등 별도 API 합의 후 교체)
 */
export interface Member {
  id: string;
  loginId: string;
  email: string;
  phoneNumber?: string;
  memberType: MemberType;
  status: MemberStatus;
  businessNumber?: string;
  permissions: Permission[];
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MemberResponseRaw {
  id: string;
  loginId: string;
  email: string;
  phoneNumber?: string;
  memberType: MemberType;
  status: MemberStatus;
  businessNumber?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const deriveMember = (raw: MemberResponseRaw): Member => ({
  ...raw,
  permissions: derivePermissions(raw.memberType),
  emailVerified: raw.emailVerified ?? true,
});

const derivePermissions = (memberType: MemberType): Permission[] => {
  if (ADMIN_TYPES.has(memberType)) return ['READ', 'WRITE', 'MANAGE'];
  if (memberType === 'BUSINESS') return ['READ', 'WRITE'];
  return ['READ'];
};

export interface AdminMemberRow extends Member {
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminMemberDetail extends AdminMemberRow {
  contractCount: number;
  reservationCount: number;
}

export interface MemberModifyRequest {
  name?: string;
  email?: string;
}

export interface AdminMemberListParams {
  page?: number;
  size?: number;
  keyword?: string;
  memberType?: MemberType;
  status?: MemberStatus;
}

const unwrap = <T>(p: Promise<{ data: ApiResponse<T> }>): Promise<T> =>
  p.then((res) => res.data.data);

export const MemberService = {
  /**
   * 현재 로그인 사용자 정보 조회.
   *
   * `GET /api/v1/member/me` — body 없이 호출하면 게이트웨이가 JWT 를 검증해
   * `X-User-Id` 헤더를 주입하고, 백엔드가 본인 `MemberResponse` 를 반환한다.
   * (구버전은 게이트웨이가 403 으로 차단하는 `/api/v1/member/internal/jwt` 를
   *  호출했으나, internal 경로는 외부 호출 불가 — `docs/api-contract.md` 참고.)
   */
  getMe: async (): Promise<Member> => {
    const raw = await unwrap<MemberResponseRaw>(
      api.get('/api/v1/member/me'),
    );
    return deriveMember(raw);
  },
  modify: (data: MemberModifyRequest) =>
    unwrap<MemberResponseRaw>(api.post('/api/v1/member/modify', data)).then(deriveMember),
  withdraw: () => unwrap<null>(api.delete('/api/v1/member/withdraw')),
  deactivate: () => unwrap<null>(api.post('/api/v1/member/deactivate')),
};

export const AdminMemberService = {
  list: (params: AdminMemberListParams = {}) =>
    api
      .get<ApiResponse<BackendPage<AdminMemberRow>>>('/api/v1/admin/members', { params })
      .then((res) => toPageResult(res.data.data)),
  detail: (memberId: string) =>
    unwrap<AdminMemberDetail>(api.get(`/api/v1/admin/members/${memberId}`)),
  deactivate: (memberId: string) =>
    unwrap<null>(api.post(`/api/v1/admin/members/${memberId}/deactivate`)),
  reactivate: (memberId: string) =>
    unwrap<null>(api.post(`/api/v1/admin/members/${memberId}/reactivate`)),
};

export { derivePermissions };
