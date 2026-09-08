import { HttpMethod } from "./http.js";
import type { ApiEndpoint } from "./endpoint.js";
import { IdParams } from "./params.js";
import { PLATFORM_ENDPOINTS } from "../endpoints/platform.js";
import { ErrorCode } from "../common.js";
import { PermissionKeys } from "../rbac.js";
import {
  PlatformDashboardResponse,
  PlatformTenantListResponse,
  PlatformTenantListQuery,
  PlatformTenantResponse,
  CreateTenantBody,
  UpdateTenantStatusBody,
  PlatformUserListResponse,
} from "../platform.js";

/**
 * Platform (Super Admin) endpoint contracts (Level 2). Every endpoint requires
 * auth + a platform.* permission (enforced at runtime by requirePlatformPermission,
 * which also checks the PlatformMembership gate). PLATFORM_ACCESS_DENIED (403)
 * is the uniform failure for missing membership OR permission.
 */
export const PLATFORM_CONTRACTS = {
  DASHBOARD: {
    method: HttpMethod.GET,
    path: PLATFORM_ENDPOINTS.DASHBOARD,
    auth: "required",
    permission: PermissionKeys.PlatformDashboardView,
    response: { 200: PlatformDashboardResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.PLATFORM_ACCESS_DENIED],
    operationId: "platform.dashboard",
    summary: "Platform dashboard statistics",
    tags: ["Platform"],
  },

  TENANTS_LIST: {
    method: HttpMethod.GET,
    path: PLATFORM_ENDPOINTS.TENANTS,
    auth: "required",
    permission: PermissionKeys.PlatformTenantView,
    query: PlatformTenantListQuery,
    response: { 200: PlatformTenantListResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.PLATFORM_ACCESS_DENIED],
    operationId: "platform.tenants.list",
    summary: "List all tenants (optionally filtered by status)",
    tags: ["Platform"],
  },

  TENANT_CREATE: {
    method: HttpMethod.POST,
    path: PLATFORM_ENDPOINTS.TENANTS,
    auth: "required",
    permission: PermissionKeys.PlatformTenantCreate,
    body: CreateTenantBody,
    response: { 201: PlatformTenantResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.PLATFORM_ACCESS_DENIED,
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.CONFLICT,
    ],
    operationId: "platform.tenants.create",
    summary: "Provision a new tenant (creates tenant + admin + default roles)",
    tags: ["Platform"],
  },

  TENANT_GET: {
    method: HttpMethod.GET,
    path: PLATFORM_ENDPOINTS.ROUTE_TENANT_BY_ID,
    auth: "required",
    permission: PermissionKeys.PlatformTenantView,
    params: IdParams,
    response: { 200: PlatformTenantResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.PLATFORM_ACCESS_DENIED,
      ErrorCode.NOT_FOUND,
    ],
    operationId: "platform.tenants.get",
    summary: "Get a tenant by id",
    tags: ["Platform"],
  },

  TENANT_STATUS: {
    method: HttpMethod.PATCH,
    path: PLATFORM_ENDPOINTS.ROUTE_TENANT_STATUS,
    auth: "required",
    // suspend/reactivate use platform.tenant.suspend; archive uses
    // platform.tenant.archive. The route requires suspend and additionally
    // checks archive when transitioning to ARCHIVED (documented in the route).
    permission: PermissionKeys.PlatformTenantSuspend,
    params: IdParams,
    body: UpdateTenantStatusBody,
    response: { 200: PlatformTenantResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.PLATFORM_ACCESS_DENIED,
      ErrorCode.NOT_FOUND,
      ErrorCode.VALIDATION_ERROR,
    ],
    operationId: "platform.tenants.setStatus",
    summary: "Change a tenant's status (suspend / reactivate / archive)",
    tags: ["Platform"],
  },

  USERS_LIST: {
    method: HttpMethod.GET,
    path: PLATFORM_ENDPOINTS.USERS,
    auth: "required",
    permission: PermissionKeys.PlatformUserView,
    response: { 200: PlatformUserListResponse },
    errors: [ErrorCode.UNAUTHORIZED, ErrorCode.PLATFORM_ACCESS_DENIED],
    operationId: "platform.users.list",
    summary: "List platform users (users with a platform membership)",
    tags: ["Platform"],
  },
} satisfies Record<string, ApiEndpoint>;
