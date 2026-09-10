import { apiClient } from "@/lib/api-client";
import { API_CONTRACTS, type UsersListResponse } from "@app/api-contracts";

export function getUsers(query: {
  page: number;
  pageSize: number;
  search?: string;
  role?: "admin" | "support" | "viewer" | "user";
}) {
  return apiClient.request<UsersListResponse>(API_CONTRACTS.USERS.LIST, {
    query,
  });
}
