import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { tenantsApi } from "@/modules/tenants/api/tenants.api";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { notify } from "@/lib/notify";

/**
 * Switch the active tenant.
 *
 * Tenant isolation on the client (MULTI-TENANT §34, §35, §69): switching MUST
 * fully reset tenant-scoped state so Tenant A's data can never be shown under
 * Tenant B. On success we:
 *   1. store the new access token (scoped to the target tenant),
 *   2. set the active tenant (drives the X-Tenant-Id header + branding),
 *   3. CLEAR the entire React Query cache (no stale cross-tenant data),
 *   4. navigate to the dashboard for a clean reload of tenant-scoped data.
 * The subsequent /users/me refetch re-populates roles/permissions for the new
 * tenant, and the branding provider (Phase 9) re-fetches on the tenant change.
 */
export function useSwitchTenant() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setActiveTenant = useTenantStore((s) => s.setActiveTenant);

  return useMutation({
    mutationFn: (tenantId: string) => tenantsApi.switch(tenantId),
    onSuccess: (data) => {
      // 1) new token first so the very next request is scoped to the new tenant.
      setAccessToken(data.accessToken);
      // 2) active tenant → X-Tenant-Id header + branding source.
      setActiveTenant(data.tenant);
      // 3) hard-reset the cache to prevent any cross-tenant data bleed.
      queryClient.clear();
      // 4) land on the dashboard; tenant-scoped queries reload cleanly.
      notify.success(
        t("common:toasts.tenantSwitched", { defaultValue: "Switched tenant" }),
      );
      navigate("/dashboard", { replace: true });
    },
    onError: () => {
      notify.error(
        t("common:toasts.tenantSwitchFailed", {
          defaultValue: "Could not switch tenant",
        }),
      );
    },
  });
}
