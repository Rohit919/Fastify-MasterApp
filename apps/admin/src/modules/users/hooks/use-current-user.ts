import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/modules/users/api/get-current-user';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Loads the authenticated user (profile + effective roles/permissions) and
 * syncs the authorization set into the auth store so permission-aware UI
 * (can(), PermissionGate, nav) reflects the latest server-side permissions.
 */
export function useCurrentUser() {
  const setAuthorization = useAuthStore((s) => s.setAuthorization);

  const query = useQuery({
    queryKey: ['users', 'me'],
    queryFn: getCurrentUser,
  });

  useEffect(() => {
    if (query.data) {
      setAuthorization({
        roles: query.data.roles ?? [],
        permissions: query.data.permissions ?? [],
      });
    }
  }, [query.data, setAuthorization]);

  return query;
}
