import type { ReactNode } from 'react';
import { usePermissions } from '@/modules/auth/hooks/use-permissions';
import type { PermissionKey } from '@app/api-contracts';

interface PermissionGateProps {
  /** Render children only if the user holds this permission. */
  permission?: PermissionKey | string;
  /** ...or holds ANY of these. */
  anyOf?: (PermissionKey | string)[];
  /** ...or holds ALL of these. */
  allOf?: (PermissionKey | string)[];
  /** Optional fallback rendered when the check fails. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally render UI based on the caller's effective permissions.
 * UX only — the API still enforces authorization on every request.
 *
 *   <PermissionGate permission="users.delete">
 *     <DeleteUserButton />
 *   </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = true;
  if (permission) allowed = allowed && can(permission);
  if (anyOf) allowed = allowed && canAny(anyOf);
  if (allOf) allowed = allowed && canAll(allOf);

  return <>{allowed ? children : fallback}</>;
}
