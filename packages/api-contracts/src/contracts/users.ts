import { HttpMethod } from "./http.js";
import type { ApiEndpoint } from "./endpoint.js";
import { USER_ENDPOINTS } from "../endpoints/users.js";
import { ErrorCode } from "../common.js";
import { PermissionKeys } from "../rbac.js";
import { ListUsersQuery, UsersListResponse } from "../users.js";
import { MeResponse } from "../rbac.js";

/**
 * User endpoint contracts (Level 2 — API_CONTRACTS §79).
 *
 * `permission` metadata is descriptive; the API still enforces it at runtime
 * via requirePermission (API_CONTRACTS §19, §67).
 */
export const USER_CONTRACTS = {
  LIST: {
    method: HttpMethod.GET,
    path: USER_ENDPOINTS.ROOT,
    auth: "required",
    permission: PermissionKeys.UsersRead,
    query: ListUsersQuery,
    response: { 200: UsersListResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.VALIDATION_ERROR,
    ],
    operationId: "users.list",
    summary: "List users (paginated)",
    description:
      "Server-side pagination (default 25, max 100), search, role filter, whitelisted sort.",
    tags: ["Users"],
  },

  ME: {
    method: HttpMethod.GET,
    path: USER_ENDPOINTS.ME,
    auth: "required",
    response: { 200: MeResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.NOT_FOUND],
    operationId: "users.me",
    summary: "Get the authenticated user profile with effective permissions",
    tags: ["Users"],
  },
} satisfies Record<string, ApiEndpoint>;
