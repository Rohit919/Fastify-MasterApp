import { HttpMethod } from "./http.js";
import type { ApiEndpoint } from "./endpoint.js";
import { ADMIN_ENDPOINTS } from "../endpoints/admin.js";
import { ErrorCode } from "../common.js";
import { PermissionKeys } from "../rbac.js";
import { AuditLogsResponse, ListAuditLogsQuery } from "../audit.js";

export const AUDIT_CONTRACTS = {
  LIST: {
    method: HttpMethod.GET,
    path: ADMIN_ENDPOINTS.AUDIT_LOGS,
    auth: "required",
    permission: PermissionKeys.AuditRead,
    query: ListAuditLogsQuery,
    response: { 200: AuditLogsResponse },
    errors: [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.FORBIDDEN,
      ErrorCode.VALIDATION_ERROR,
    ],
    operationId: "audit.list",
    summary: "List immutable audit events",
    tags: ["Audit"],
  },
} satisfies Record<string, ApiEndpoint>;
