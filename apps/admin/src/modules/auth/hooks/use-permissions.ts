import { useAuthStore } from '@/stores/auth.store';
import type { PermissionKey } from '@app/api-contracts';

type PermInput = PermissionKey | string;

/**
 * Central permission/role helpers for components. Reads the effective sets from
 * the auth store (populated from GET /users/me). UX only — never a security
 * boundary; the API enforces every permission independently.
 *
 *   const { can } = usePermissions();
 *   {can('users.delete') && <DeleteButton />}
 */
export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);

  const can = (permission: PermInput): boolean => permissions.includes(permission);
  const canAny = (perms: PermInput[]): boolean => perms.some((p) => permissions.includes(p));
  const canAll = (perms: PermInput[]): boolean => perms.every((p) => permissions.includes(p));

  const hasRole = (role: string): boolean => roles.includes(role);
  const hasAnyRole = (candidates: string[]): boolean => candidates.some((r) => roles.includes(r));
  const hasAllRoles = (candidates: string[]): boolean => candidates.every((r) => roles.includes(r));

  return { permissions, roles, can, canAny, canAll, hasRole, hasAnyRole, hasAllRoles };
}
