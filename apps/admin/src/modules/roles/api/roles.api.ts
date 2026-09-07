import { apiClient } from '@/lib/api-client';
import {
  API_ENDPOINTS,
  type RoleDto,
  type PermissionDto,
  type CreateRoleBody,
  type UpdateRoleBody,
} from '@app/api-contracts';

/**
 * Roles + permissions API service (backend routes under /api/v1/admin).
 * Roles support full CRUD + permission-set replacement; permissions are a
 * read-only registry.
 */
export const rolesApi = {
  list: (): Promise<RoleDto[]> => apiClient.get<RoleDto[]>(API_ENDPOINTS.ROLES.ROOT),

  get: (id: string): Promise<RoleDto> => apiClient.get<RoleDto>(API_ENDPOINTS.ROLES.BY_ID(id)),

  create: (body: CreateRoleBody): Promise<RoleDto> =>
    apiClient.post<RoleDto>(API_ENDPOINTS.ROLES.ROOT, body),

  update: (id: string, body: UpdateRoleBody): Promise<RoleDto> =>
    apiClient.patch<RoleDto>(API_ENDPOINTS.ROLES.BY_ID(id), body),

  setPermissions: (id: string, permissions: string[]): Promise<RoleDto> =>
    apiClient.put<RoleDto>(API_ENDPOINTS.ROLES.PERMISSIONS(id), { permissions }),

  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(API_ENDPOINTS.ROLES.BY_ID(id)),
};

export const permissionsApi = {
  list: (): Promise<PermissionDto[]> =>
    apiClient.get<PermissionDto[]>(API_ENDPOINTS.PERMISSIONS.ROOT),
};
