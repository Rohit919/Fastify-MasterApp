import { apiClient, ApiError } from "@/lib/api-client";
import { API_CONTRACTS, type DashboardStatsResponse } from "@app/api-contracts";
import { usersApi } from "@/modules/users/api/users.api";
import { rolesApi, permissionsApi } from "@/modules/roles/api/roles.api";

/**
 * Dashboard metrics. Primary source is the real aggregated endpoint
 * (GET /admin/dashboard, permission `metrics.read`). If the caller lacks that
 * permission (403), we fall back to counts DERIVED from endpoints they can
 * already read (users list total, roles, permissions) with no chart series —
 * so the dashboard still renders something useful. `usesPlaceholders` drives a
 * UI notice only in the fallback path.
 *
 * The UI depends only on this shape.
 */
export interface DashboardRecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  /** New users per day (label + count), oldest → newest. Empty in fallback. */
  signups: { day: string; count: number }[];
  recentUsers: DashboardRecentUser[];
  /** True only when live metrics were unavailable and figures are derived. */
  usesPlaceholders: boolean;
}

/** Short weekday label (Mon, Tue, …) from an ISO date, for compact chart ticks. */
function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? isoDate
    : d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const res = await apiClient.request<DashboardStatsResponse>(
      API_CONTRACTS.DASHBOARD.STATS,
    );
    const { totals, recentUsers, signups } = res.data;
    return {
      totalUsers: totals.users,
      totalRoles: totals.roles,
      totalPermissions: totals.permissions,
      signups: signups.map((p) => ({ day: dayLabel(p.date), count: p.count })),
      recentUsers,
      usesPlaceholders: false,
    };
  } catch (error) {
    // Only fall back for a permission denial; re-throw everything else so the
    // page shows a real error state.
    if (!(error instanceof ApiError) || error.code !== "FORBIDDEN") throw error;

    const [users, roles, permissions] = await Promise.all([
      usersApi.list({ page: 1, pageSize: 1 }),
      rolesApi.list(),
      permissionsApi.list(),
    ]);
    return {
      totalUsers: users.meta.total,
      totalRoles: roles.length,
      totalPermissions: permissions.length,
      signups: [],
      recentUsers: [],
      usesPlaceholders: true,
    };
  }
}
