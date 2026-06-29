import { api } from './client';
import { toPageResult } from './types';
import type { ApiResponse, BackendPage, PageResult } from './types';

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

export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'WITHDRAWN';
export type Permission = 'READ' | 'WRITE' | 'MANAGE';

export const MEMBER_TYPE_LABEL: Record<MemberType, string> = {
  MEMBER: '일반 회원',
  BUSINESS: '기업 회원',
  ADMIN_USER: '관리자',
  ADMIN_MASTER: '마스터 관리자',
  ADMIN_DEVELOPER: '개발자 관리자',
};

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  SUSPENDED: '정지',
  WITHDRAWN: '탈퇴',
};

export interface RoleInfo {
  id: string;
  name: string;
  displayName: string;
}

export interface PermissionInfo {
  id: string;
  name: string;
  displayName: string;
}

/** GET /api/v1/admin/admins/search 및 /api/v1/admin/users/search 공통 응답 */
export interface MemberSearchItem {
  memberId: string;
  loginId: string;
  email: string;
  memberName: string;
  phoneNumber: string;
  businessNumber?: string;
  memberType: MemberType;
  status: MemberStatus;
  createdAt: string;
}

/** GET /api/v1/admin/members/{memberId} 응답 */
export interface AdminMemberDetailFull {
  memberId: string;
  loginId: string;
  email: string;
  phoneNumber: string;
  memberName: string;
  memberType: MemberType;
  status: MemberStatus;
  businessNumber?: string;
  role: RoleInfo;
  permissions: PermissionInfo[];
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/v1/admin/members/{memberId}/status-history 응답 */
export interface MemberStatusHistoryItem {
  id: string;
  previousStatus: MemberStatus;
  newStatus: MemberStatus;
  reason: string;
  changedBy: string;
  createdAt: string;
}

export interface SuspendMemberRequest {
  reason: string;
}

export interface UnsuspendMemberRequest {
  reason: string;
}

export interface CreateAdminMemberRequest {
  loginId: string;
  password: string;
  email: string;
  phoneNumber: string;
  memberType: 'ADMIN_USER' | 'ADMIN_MASTER' | 'ADMIN_DEVELOPER';
  memberName: string;
}

export interface AdminCreatedMember {
  memberId: string;
  loginId: string;
  email: string;
  memberType: MemberType;
}

export interface MemberSearchParams {
  keyword?: string;
  status?: MemberStatus;
  type?: MemberType;
  businessNumber?: string;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  size?: number;
}

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
  memberName?: string;
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
      .get<ApiResponse<BackendPage<AdminMemberRow & { memberId?: string }>>>(
        '/api/v1/admin/members',
        { params },
      )
      .then((res) =>
        toPageResult(res.data.data, (raw) => ({
          ...raw,
          id: raw.id ?? raw.memberId ?? '',
        })),
      ),
  search: (keyword: string): Promise<AdminMemberRow[]> =>
    api
      .get<ApiResponse<(AdminMemberRow & { memberId?: string })[]>>(
        '/api/v1/admin/members/search',
        { params: { keyword } },
      )
      .then((res) =>
        (res.data.data ?? []).map((raw) => ({
          ...raw,
          id: raw.id ?? raw.memberId ?? '',
          lastLoginAt: null,
        })),
      ),
  detail: (memberId: string) =>
    unwrap<AdminMemberDetail>(api.get(`/api/v1/admin/members/${memberId}`)),

  /** GET /api/v1/admin/admins/search — 어드민 회원 조건 검색 (페이징) */
  searchAdmins: (params: MemberSearchParams = {}): Promise<PageResult<MemberSearchItem>> =>
    api
      .get<ApiResponse<BackendPage<MemberSearchItem>>>('/api/v1/admin/admins/search', { params })
      .then((res) => toPageResult(res.data.data)),

  /** GET /api/v1/admin/users/search — 일반 회원 조건 검색 (페이징) */
  searchUsers: (params: MemberSearchParams = {}): Promise<PageResult<MemberSearchItem>> =>
    api
      .get<ApiResponse<BackendPage<MemberSearchItem>>>('/api/v1/admin/users/search', { params })
      .then((res) => toPageResult(res.data.data)),

  /** GET /api/v1/admin/members/{memberId} — 회원 상세 (역할/권한 포함) */
  fullDetail: (memberId: string): Promise<AdminMemberDetailFull> =>
    unwrap<AdminMemberDetailFull>(api.get(`/api/v1/admin/members/${memberId}`)),

  /** GET /api/v1/admin/members/{memberId}/status-history — 상태 변경 이력 */
  statusHistory: (memberId: string): Promise<MemberStatusHistoryItem[]> =>
    unwrap<MemberStatusHistoryItem[]>(api.get(`/api/v1/admin/members/${memberId}/status-history`)),

  /** PUT /api/v1/admin/members/{memberId}/suspend — 회원 정지 */
  suspend: (memberId: string, data: SuspendMemberRequest): Promise<null> =>
    unwrap<null>(api.put(`/api/v1/admin/members/${memberId}/suspend`, data)),

  /** PUT /api/v1/admin/members/{memberId}/unsuspend — 회원 정지 해제 */
  unsuspend: (memberId: string, data: UnsuspendMemberRequest): Promise<null> =>
    unwrap<null>(api.put(`/api/v1/admin/members/${memberId}/unsuspend`, data)),

  /** POST /api/v1/admin/members — 어드민 멤버 생성 */
  createAdmin: (data: CreateAdminMemberRequest): Promise<AdminCreatedMember> =>
    unwrap<AdminCreatedMember>(api.post('/api/v1/admin/members', data)),
};

export { derivePermissions };
