import { useAuthStore } from "@/stores/auth.store";
import type { PermissionKey } from "@app/api-contracts";

/**
 * Permission helpers for components. Reads the effective permission set from
 * the auth store (populated from GET /users/me).
 *
 * UX only — never a security boundary. The API enforces every permission.
 *
 *   const { can } = usePermissions();
 *   {can('users.delete') && <DeleteButton />}
 */
export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.roles);

  const can = (permission: PermissionKey | string): boolean =>
    permissions.includes(permission);
  const canAny = (perms: (PermissionKey | string)[]): boolean =>
    perms.some((p) => permissions.includes(p));
  const canAll = (perms: (PermissionKey | string)[]): boolean =>
    perms.every((p) => permissions.includes(p));

  return { permissions, roles, can, canAny, canAll };
}
