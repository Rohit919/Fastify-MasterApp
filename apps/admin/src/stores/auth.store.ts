import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@app/api-contracts';

/**
 * Client/UI auth state — tokens + current user + effective permissions.
 * This is one of the few things that legitimately belongs in a global client
 * store (not TanStack Query), because tokens drive every API request and the
 * permission set drives permission-aware UI.
 *
 * NOTE: permissions here are for UX only (hiding buttons/nav). The API is the
 * security boundary and enforces every permission independently.
 */
interface AuthState {
  // Access token only. The refresh token lives in an HTTP-only cookie the JS
  // can't read — sent automatically to /api/v1/auth/refresh.
  accessToken: string | null;
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  setSession: (session: { accessToken: string; user: AuthUser }) => void;
  /** Replace only the access token (used after a silent refresh). */
  setAccessToken: (accessToken: string) => void;
  setAuthorization: (authz: { roles: string[]; permissions: string[] }) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      roles: [],
      permissions: [],
      setSession: ({ accessToken, user }) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setAuthorization: ({ roles, permissions }) => set({ roles, permissions }),
      clearSession: () => set({ accessToken: null, user: null, roles: [], permissions: [] }),
      isAuthenticated: () => Boolean(get().accessToken),
      can: (permission) => get().permissions.includes(permission),
      canAny: (permissions) => permissions.some((p) => get().permissions.includes(p)),
      canAll: (permissions) => permissions.every((p) => get().permissions.includes(p)),
    }),
    { name: 'admin-auth' }
  )
);
