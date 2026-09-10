import { apiClient } from "@/lib/api-client";
import { API_ENDPOINTS, type RoleDto } from "@app/api-contracts";

/** GET /api/v1/admin/roles — all roles with their permission keys. */
export function getRoles(): Promise<RoleDto[]> {
  return apiClient.get<RoleDto[]>(API_ENDPOINTS.ROLES.ROOT);
}
