import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '@/modules/roles/api/roles.api';

/** The permission registry (requires permissions.read on the API). */
export function usePermissionsList() {
  return useQuery({ queryKey: ['permissions'], queryFn: permissionsApi.list });
}
