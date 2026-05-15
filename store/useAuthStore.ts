import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  userId: string;
  name: string;
  email?: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  
  // Actions
  setTokens: (access: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setTokens: (accessToken) => 
        set({ accessToken, isAuthenticated: true }),
      
      setUser: (user) => 
        set({ user }),
      
      logout: () => 
        set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // Next.js 환경에서 localStorage 키 이름
      storage: createJSONStorage(() => localStorage),
    }
  )
);
