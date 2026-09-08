import { apiClient } from "@/lib/api-client";
import {
  API_CONTRACTS,
  API_ENDPOINTS,
  type MeResponse,
  type UsersListResponse,
  type ListUsersQuery,
  type UserRolesResponse,
  type UserProfile,
  type CreateUserBody,
  type UpdateUserBody,
  type UpdateProfileBody,
} from "@app/api-contracts";

/**
 * Users API service. Endpoints the backend implements:
 *   GET    /users                 — paginated list ({ data, meta })
 *   POST   /users                 — create (users.create)
 *   GET    /users/me              — current profile + effective roles/permissions
 *   PATCH  /users/me              — update own profile (self)
 *   GET    /users/:userId         — get by id (users.read)
 *   PATCH  /users/:userId         — update (users.update)
 *   DELETE /users/:userId         — delete (users.delete)
 *   GET/PUT /admin/users/:id/roles — role assignments
 */

export type CurrentUser = MeResponse["data"];
export type UserListItem = UsersListResponse["data"][number];
export type UsersListResult = UsersListResponse;
export type { UserProfile };

export const usersApi = {
  me: async (): Promise<CurrentUser> => {
    const res = await apiClient.request<MeResponse>(API_CONTRACTS.USERS.ME);
    return res.data;
  },

  updateProfile: (body: UpdateProfileBody): Promise<UserProfile> =>
    apiClient.patch<UserProfile>(API_ENDPOINTS.USERS.ME, body),

  list: (query: Partial<ListUsersQuery>): Promise<UsersListResult> =>
    apiClient.request<UsersListResult>(API_CONTRACTS.USERS.LIST, {
      query: query as Record<string, string | number | undefined>,
    }),

  get: (userId: string): Promise<UserProfile> =>
    apiClient.get<UserProfile>(API_ENDPOINTS.USERS.BY_ID(userId)),

  create: (body: CreateUserBody): Promise<UserProfile> =>
    apiClient.post<UserProfile>(API_ENDPOINTS.USERS.ROOT, body),

  update: (userId: string, body: UpdateUserBody): Promise<UserProfile> =>
    apiClient.patch<UserProfile>(API_ENDPOINTS.USERS.BY_ID(userId), body),

  remove: (userId: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(API_ENDPOINTS.USERS.BY_ID(userId)),

  getRoles: async (userId: string): Promise<string[]> => {
    const res = await apiClient.get<UserRolesResponse["data"]>(
      API_ENDPOINTS.USER_ROLES.BY_USER(userId),
    );
    return res.roles;
  },

  setRoles: async (userId: string, roles: string[]): Promise<string[]> => {
    const res = await apiClient.put<UserRolesResponse["data"]>(
      API_ENDPOINTS.USER_ROLES.BY_USER(userId),
      { roles },
    );
    return res.roles;
  },
};
