import { create } from 'zustand';
import type { Member, MemberType, Permission } from '@/lib/api/member';
import type { AuthSite } from '@/lib/auth/site';

interface AuthState {
  accessToken: string | null;
  /**
   * accessToken 을 발급받은 사이트(백엔드 aud). 갱신·로그아웃은 현재 경로가 아니라 이 값을 따른다.
   * 관리자가 같은 탭에서 일반 화면으로 이동해도 관리자 refresh·logout 경로를 써야 하기 때문이다.
   */
  tokenSite: AuthSite | null;
  user: Member | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  userFetchError: string | null;

  setTokens: (access: string, site: AuthSite) => void;
  setUser: (user: Member) => void;
  setBootstrapped: (value: boolean) => void;
  setUserFetchError: (message: string | null) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasMemberType: (types: MemberType | MemberType[]) => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  tokenSite: null,
  user: null,
  isAuthenticated: false,
  isBootstrapped: false,
  userFetchError: null,

  setTokens: (accessToken, tokenSite) =>
    set({ accessToken, tokenSite, isAuthenticated: true, userFetchError: null }),
  setUser: (user) => set({ user, userFetchError: null }),
  setBootstrapped: (value) => set({ isBootstrapped: value }),
  setUserFetchError: (message) => set({ userFetchError: message }),
  logout: () =>
    set({
      accessToken: null,
      tokenSite: null,
      user: null,
      isAuthenticated: false,
      userFetchError: null,
    }),

  hasPermission: (permission) =>
    get().user?.permissions?.includes(permission) ?? false,

  hasMemberType: (types) => {
    const memberType = get().user?.memberType;
    if (!memberType) return false;
    const allowed = Array.isArray(types) ? types : [types];
    return allowed.includes(memberType);
  },
}));
