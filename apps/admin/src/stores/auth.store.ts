import { create } from "zustand";
import type { AuthUser } from "@app/api-contracts";

/**
 * Session state is intentionally memory-only. The durable credential is the
 * Secure, HTTP-only refresh cookie; JavaScript never persists bearer tokens.
 */
interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  initialized: boolean;
  setSession: (session: { accessToken: string; user: AuthUser }) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  setAuthorization: (authz: { roles: string[]; permissions: string[] }) => void;
  markInitialized: () => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canAll: (permissions: string[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  roles: [],
  permissions: [],
  initialized: false,
  setSession: ({ accessToken, user }) =>
    set({ accessToken, user, initialized: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setAuthorization: ({ roles, permissions }) => set({ roles, permissions }),
  markInitialized: () => set({ initialized: true }),
  clearSession: () =>
    set({ accessToken: null, user: null, roles: [], permissions: [] }),
  isAuthenticated: () => Boolean(get().accessToken),
  can: (permission) => get().permissions.includes(permission),
  canAny: (permissions) =>
    permissions.some((permission) => get().permissions.includes(permission)),
  canAll: (permissions) =>
    permissions.every((permission) => get().permissions.includes(permission)),
}));

// Remove credentials persisted by versions prior to the memory-only session model.
if (typeof window !== "undefined") window.localStorage.removeItem("admin-auth");
