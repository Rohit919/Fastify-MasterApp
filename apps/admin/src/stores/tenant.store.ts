import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TenantDto } from "@app/api-contracts";

/**
 * Client/UI tenant state — the active tenant and the tenants the user can
 * switch to. Like the auth store, this legitimately belongs in a global client
 * store (not TanStack Query) because the active tenant id drives every API
 * request header, and the api-client (non-React) reads it via getState().
 *
 * SECURITY: the active tenant here is a PREFERENCE / hint. The backend is
 * authoritative — it validates membership on every request and re-derives the
 * tenant from the token/session (MULTI-TENANT §7.2, §70). Tampering with the
 * persisted value cannot grant cross-tenant access.
 */
interface TenantState {
  /** The active tenant id sent as X-Tenant-Id and used for query-key scoping. */
  activeTenantId: string | null;
  /** The active tenant's identity (for header UI), if known. */
  activeTenant: TenantDto | null;
  /** Tenants the user belongs to (switcher source). */
  availableTenants: TenantDto[];

  setActiveTenant: (tenant: TenantDto | null) => void;
  setAvailableTenants: (tenants: TenantDto[]) => void;
  clear: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      activeTenantId: null,
      activeTenant: null,
      availableTenants: [],

      setActiveTenant: (tenant) =>
        set({ activeTenantId: tenant?.id ?? null, activeTenant: tenant }),
      setAvailableTenants: (tenants) => set({ availableTenants: tenants }),
      clear: () =>
        set({ activeTenantId: null, activeTenant: null, availableTenants: [] }),
    }),
    {
      name: "admin-tenant",
      // Only persist the active tenant id — the identity/list are refreshed from
      // the server on load, so we don't cache potentially stale tenant data.
      partialize: (s) => ({ activeTenantId: s.activeTenantId }),
    },
  ),
);
