import { apiClient } from "@/lib/api-client";
import { API_CONTRACTS, type AuditLogsResponse } from "@app/api-contracts";

export function getAuditLogs(page: number, action?: string) {
  return apiClient.request<AuditLogsResponse>(API_CONTRACTS.AUDIT.LIST, {
    query: { page, pageSize: 25, action: action || undefined },
  });
}
