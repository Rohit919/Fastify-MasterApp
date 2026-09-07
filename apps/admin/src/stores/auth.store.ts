import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@app/api-contracts';

/**
 * Client/UI auth state — tokens + current user.
 * This is one of the few things that legitimately belongs in a global client
 * store (not TanStack Query), because tokens drive every API request.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (session: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      clearSession: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    { name: 'admin-auth' }
  )
);
