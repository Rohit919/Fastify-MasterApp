import { useQuery } from "@tanstack/react-query";
import { tenantsApi } from "@/modules/tenants/api/tenants.api";
import { useTenantStore } from "@/stores/tenant.store";
import { useEffect } from "react";

/**
 * Loads the tenants the current user belongs to and syncs the list into the
 * tenant store so the switcher can render without prop-drilling. UX only — the
 * backend enforces membership on every request.
 */
export function useTenants() {
  const setAvailableTenants = useTenantStore((s) => s.setAvailableTenants);

  const query = useQuery({
    queryKey: ["tenants", "mine"],
    queryFn: tenantsApi.mine,
  });

  useEffect(() => {
    if (query.data) {
      setAvailableTenants(query.data.map((m) => m.tenant));
    }
  }, [query.data, setAvailableTenants]);

  return query;
}
