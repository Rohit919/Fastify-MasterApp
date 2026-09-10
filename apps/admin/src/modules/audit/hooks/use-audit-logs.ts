import { useQuery } from "@tanstack/react-query";
import { getAuditLogs } from "../api/get-audit-logs";

export function useAuditLogs(page: number, action: string) {
  return useQuery({
    queryKey: ["audit", { page, action }],
    queryFn: () => getAuditLogs(page, action.trim() || undefined),
  });
}
