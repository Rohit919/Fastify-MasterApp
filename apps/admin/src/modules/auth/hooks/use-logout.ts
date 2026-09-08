import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { logout } from "@/modules/auth/api/logout";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { notify } from "@/lib/notify";

/**
 * Logout mutation. Best-effort server-side revocation (the refresh cookie is
 * sent automatically), then clears local session + query cache and redirects
 * to /login regardless of the network result — logout must never get stuck.
 */
export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  const clearTenant = useTenantStore((s) => s.clear);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => logout().catch(() => undefined),
    onSettled: () => {
      clearSession();
      clearTenant();
      queryClient.clear();
      notify.success(t("auth:toasts.logoutSuccess"));
      navigate("/login", { replace: true });
    },
  });
}
