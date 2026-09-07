import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@app/api-contracts';

/**
 * Client/UI auth state — tokens + current user.
 * This is one of the few things that legitimately belongs in a global client
 * store (not TanStack Query), because tokens drive every API request.
 */
interface AuthState {
  // Access token only. The refresh token lives in an HTTP-only cookie the JS
  // can't read — sent automatically to /api/v1/auth/refresh.
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (session: { accessToken: string; user: AuthUser }) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      clearSession: () => set({ accessToken: null, user: null }),
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    { name: 'admin-auth' }
  )
);
