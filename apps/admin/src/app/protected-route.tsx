import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loading } from "@/components/feedback/loading";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";

/** Restore the memory-only access token from the HTTP-only refresh cookie. */
export function ProtectedRoute() {
  const initialized = useAuthStore((state) => state.initialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const markInitialized = useAuthStore((state) => state.markInitialized);

  useEffect(() => {
    if (initialized) return;
    void apiClient
      .restoreSession()
      .catch(() => undefined)
      .finally(markInitialized);
  }, [initialized, markInitialized]);

  if (!initialized) return <Loading label="Restoring your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
