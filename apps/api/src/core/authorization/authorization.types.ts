import type { PermissionKey } from "@app/api-contracts";

/**
 * Runtime authorization context for a request.
 * Built by the AuthorizationService from the authenticated user id, resolving
 * effective permissions (the union across all assigned roles).
 */
export interface AuthorizationContext {
  userId: string;
  roles: string[];
  permissions: PermissionKey[];
}

export type { PermissionKey };
