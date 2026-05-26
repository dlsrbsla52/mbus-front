import { create } from 'zustand';
import type { Member, MemberType, Permission } from '@/lib/api/member';

interface AuthState {
  accessToken: string | null;
  user: Member | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  userFetchError: string | null;

  setTokens: (access: string) => void;
  setUser: (user: Member) => void;
  setBootstrapped: (value: boolean) => void;
  setUserFetchError: (message: string | null) => void;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasMemberType: (types: MemberType | MemberType[]) => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isBootstrapped: false,
  userFetchError: null,

  setTokens: (accessToken) =>
    set({ accessToken, isAuthenticated: true, userFetchError: null }),
  setUser: (user) => set({ user, userFetchError: null }),
  setBootstrapped: (value) => set({ isBootstrapped: value }),
  setUserFetchError: (message) => set({ userFetchError: message }),
  logout: () =>
    set({
      accessToken: null,
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
