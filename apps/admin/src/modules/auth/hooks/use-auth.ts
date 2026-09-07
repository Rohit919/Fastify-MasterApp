import { useAuthStore } from '@/stores/auth.store';

/**
 * Convenience accessor for the current session identity + auth actions.
 * Wraps the Zustand store so components don't reach into store internals.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const clearSession = useAuthStore((s) => s.clearSession);

  return { user, accessToken, isAuthenticated, clearSession };
}
