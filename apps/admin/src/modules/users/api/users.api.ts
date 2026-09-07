import { apiClient } from '@/lib/api-client';
import {
  API_CONTRACTS,
  API_ENDPOINTS,
  type MeResponse,
  type UsersListResponse,
  type ListUsersQuery,
  type UserRolesResponse,
} from '@app/api-contracts';

/**
 * Users API service. Only endpoints the backend actually implements:
 *   GET  /users        — paginated list (data + meta)
 *   GET  /users/me     — current user profile + effective roles/permissions
 *   GET  /admin/users/:id/roles — a user's role assignments
 *   PUT  /admin/users/:id/roles — replace a user's role assignments
 *
 * NOTE: the backend has NO create/update/delete user routes yet, so this
 * service intentionally does not expose them.
 */

export type CurrentUser = MeResponse['data'];
export type UserListItem = UsersListResponse['data'][number];
export type UsersListResult = UsersListResponse;

export const usersApi = {
  me: async (): Promise<CurrentUser> => {
    const res = await apiClient.request<MeResponse>(API_CONTRACTS.USERS.ME);
    return res.data;
  },

  list: (query: Partial<ListUsersQuery>): Promise<UsersListResult> =>
    apiClient.request<UsersListResult>(API_CONTRACTS.USERS.LIST, {
      query: query as Record<string, string | number | undefined>,
    }),

  getRoles: async (userId: string): Promise<string[]> => {
    const res = await apiClient.get<UserRolesResponse['data']>(
      API_ENDPOINTS.USER_ROLES.BY_USER(userId)
    );
    return res.roles;
  },

  setRoles: async (userId: string, roles: string[]): Promise<string[]> => {
    const res = await apiClient.put<UserRolesResponse['data']>(
      API_ENDPOINTS.USER_ROLES.BY_USER(userId),
      { roles }
    );
    return res.roles;
  },
};
