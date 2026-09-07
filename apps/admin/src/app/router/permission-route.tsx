import { Outlet } from 'react-router-dom';
import type { PermissionKey } from '@app/api-contracts';
import { usePermissions } from '@/modules/auth/hooks/use-permissions';
import { useCurrentUser } from '@/modules/users/hooks/use-current-user';
import { ForbiddenPage } from '@/modules/errors/forbidden-page';
import { Loading } from '@/components/feedback/loading';

/**
 * Authorization guard driven by route metadata. Renders the child route only
 * if the caller holds the required permission; otherwise shows a 403 page.
 *
 * Waits for the /users/me fetch to settle before deciding, so a permitted user
 * isn't briefly shown a false 403 on a hard refresh (permissions load async).
 * UX only — the API independently enforces the permission on every request.
 */
export function PermissionRoute({ permission }: { permission?: PermissionKey }) {
  const { can } = usePermissions();
  const { isLoading, isError } = useCurrentUser();

  if (!permission) return <Outlet />;

  // Permissions still loading on first paint — don't flash a 403.
  if (isLoading && !can(permission)) return <Loading />;

  // If /me failed we can't confirm permissions; fall through to 403 rather than
  // rendering a page the user may not be allowed to see.
  if (isError && !can(permission)) return <ForbiddenPage />;

  if (!can(permission)) return <ForbiddenPage />;

  return <Outlet />;
}
