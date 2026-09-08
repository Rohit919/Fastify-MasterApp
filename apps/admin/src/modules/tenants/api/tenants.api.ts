import { apiClient } from "@/lib/api-client";
import {
  API_CONTRACTS,
  type CurrentTenantResponse,
  type TenantMembershipsResponse,
  type SwitchTenantResponse,
  type TenantDto,
  type TenantMembershipDto,
} from "@app/api-contracts";

/**
 * Tenants API service. Endpoints the backend implements:
 *   GET  /tenants/current — the active tenant for the session
 *   GET  /tenants         — the tenants the user belongs to (switcher source)
 *   POST /tenants/switch  — switch active tenant (returns a new access token)
 */

export type { TenantDto, TenantMembershipDto };

export const tenantsApi = {
  current: async (): Promise<TenantDto> => {
    const res = await apiClient.request<CurrentTenantResponse>(
      API_CONTRACTS.TENANTS.CURRENT,
    );
    return res.data;
  },

  mine: async (): Promise<TenantMembershipDto[]> => {
    const res = await apiClient.request<TenantMembershipsResponse>(
      API_CONTRACTS.TENANTS.MINE,
    );
    return res.data;
  },

  switch: async (tenantId: string): Promise<SwitchTenantResponse["data"]> => {
    const res = await apiClient.request<SwitchTenantResponse>(
      API_CONTRACTS.TENANTS.SWITCH,
      {
        body: { tenantId },
      },
    );
    return res.data;
  },
};
