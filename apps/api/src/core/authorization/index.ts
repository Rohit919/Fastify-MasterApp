// ── Legacy role-matrix authorization (kept for todo/user ownership demos) ─────
export { PERMISSIONS, rolesFor, type Resource, type Action } from './permissions.js';
export { requireRolePermission } from './authorize.js';
export { requireOwnership } from './ownership.js';

// ── Permission-based (DB-backed) RBAC — the primary authorization boundary ────
export { AuthorizationService } from './authorization.service.js';
export type { AuthorizationContext, PermissionKey } from './authorization.types.js';
export {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from './require-permission.js';
