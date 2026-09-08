import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/modules/users/api/get-current-user";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";

/**
 * Loads the authenticated user (profile + effective roles/permissions + active
 * tenant) and syncs it into the client stores so permission-aware UI (can(),
 * nav) and the tenant switcher reflect the latest server-side state.
 *
 * The server is authoritative for the active tenant: whatever /me reports is
 * what we store as active (it already validated membership). This also
 * self-heals a stale persisted activeTenantId.
 */
export function useCurrentUser() {
  const setAuthorization = useAuthStore((s) => s.setAuthorization);
  const setActiveTenant = useTenantStore((s) => s.setActiveTenant);

  const query = useQuery({
    queryKey: ["users", "me"],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (query.data) {
      setAuthorization({
        roles: query.data.roles ?? [],
        permissions: query.data.permissions ?? [],
      });
      // Sync the server-resolved active tenant (may be undefined for
      // platform-only users / single-tenant deployments).
      setActiveTenant(query.data.tenant ?? null);
    }
  }, [query.data, setAuthorization, setActiveTenant]);

  return query;
}
