import { apiClient } from "@/lib/api-client";
import {
  API_CONTRACTS,
  type PlatformDashboardResponse,
  type PlatformDashboardStats,
  type PlatformTenantListResponse,
  type PlatformTenantResponse,
  type PlatformTenantDto,
  type PlatformUserListResponse,
  type PlatformUserDto,
  type CreateTenantBody,
  type TenantStatus,
} from "@app/api-contracts";

/**
 * Platform (Super Admin) API service — contract-driven calls to /platform/*.
 * Every call is gated server-side by an ACTIVE PlatformMembership + platform.*
 * permission; a non-platform user gets 403 PLATFORM_ACCESS_DENIED.
 */
export const platformApi = {
  dashboard: async (): Promise<PlatformDashboardStats> => {
    const res = await apiClient.request<PlatformDashboardResponse>(
      API_CONTRACTS.PLATFORM.DASHBOARD,
    );
    return res.data;
  },

  tenants: async (status?: TenantStatus): Promise<PlatformTenantDto[]> => {
    const res = await apiClient.request<PlatformTenantListResponse>(
      API_CONTRACTS.PLATFORM.TENANTS_LIST,
      {
        query: status ? { status } : {},
      },
    );
    return res.data;
  },

  tenant: async (id: string): Promise<PlatformTenantDto> => {
    const res = await apiClient.request<PlatformTenantResponse>(
      API_CONTRACTS.PLATFORM.TENANT_GET,
      {
        params: { id },
      },
    );
    return res.data;
  },

  createTenant: async (body: CreateTenantBody): Promise<PlatformTenantDto> => {
    const res = await apiClient.request<PlatformTenantResponse>(
      API_CONTRACTS.PLATFORM.TENANT_CREATE,
      {
        body,
      },
    );
    return res.data;
  },

  setTenantStatus: async (
    id: string,
    status: TenantStatus,
  ): Promise<PlatformTenantDto> => {
    const res = await apiClient.request<PlatformTenantResponse>(
      API_CONTRACTS.PLATFORM.TENANT_STATUS,
      {
        params: { id },
        body: { status },
      },
    );
    return res.data;
  },

  users: async (): Promise<PlatformUserDto[]> => {
    const res = await apiClient.request<PlatformUserListResponse>(
      API_CONTRACTS.PLATFORM.USERS_LIST,
    );
    return res.data;
  },
};
