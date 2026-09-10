import { apiClient } from "@/lib/api-client";
import {
  API_CONTRACTS,
  type CreateRoleBody,
  type PermissionListResponse,
  type RoleResponse,
  type UpdateRoleBody,
  type UserRolesResponse,
} from "@app/api-contracts";

export async function createRole(body: CreateRoleBody) {
  const response = await apiClient.request<RoleResponse>(
    API_CONTRACTS.ROLES.CREATE,
    { body },
  );
  return response.data;
}

export async function updateRole(id: string, body: UpdateRoleBody) {
  const response = await apiClient.request<RoleResponse>(
    API_CONTRACTS.ROLES.UPDATE,
    {
      params: { id },
      body,
    },
  );
  return response.data;
}

export function deleteRole(id: string) {
  return apiClient.request(API_CONTRACTS.ROLES.DELETE, { params: { id } });
}

export async function getPermissions() {
  const response = await apiClient.request<PermissionListResponse>(
    API_CONTRACTS.PERMISSIONS.LIST,
  );
  return response.data;
}

export async function getUserRoles(userId: string) {
  const response = await apiClient.request<UserRolesResponse>(
    API_CONTRACTS.USER_ROLES.GET,
    {
      params: { id: userId },
    },
  );
  return response.data.roles;
}

export async function setUserRoles(userId: string, roles: string[]) {
  const response = await apiClient.request<UserRolesResponse>(
    API_CONTRACTS.USER_ROLES.SET,
    {
      params: { id: userId },
      body: { roles },
    },
  );
  return response.data.roles;
}
