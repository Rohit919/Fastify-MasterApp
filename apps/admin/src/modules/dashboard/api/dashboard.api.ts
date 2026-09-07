import { usersApi } from '@/modules/users/api/users.api';
import { rolesApi, permissionsApi } from '@/modules/roles/api/roles.api';

/**
 * Dashboard metrics abstraction. The backend has no dedicated dashboard/metrics
 * endpoint yet, so this layer DERIVES headline numbers from existing, real
 * endpoints (users list total, roles count, permissions count) and supplies
 * clearly-labelled placeholder series for charts.
 *
 * The UI depends only on this shape — when a real metrics API lands, swap the
 * implementation here and the dashboard components don't change.
 */
export interface DashboardMetrics {
  totalUsers: number;
  totalRoles: number;
  totalPermissions: number;
  /** Placeholder time series until a metrics API exists. */
  signups: { day: string; count: number }[];
  /** Whether any figures are placeholders (drives a UI notice). */
  usesPlaceholders: boolean;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  // Real counts derived from endpoints that already exist. pageSize=1 keeps the
  // users request cheap — we only need `meta.total`.
  const [users, roles, permissions] = await Promise.all([
    usersApi.list({ page: 1, pageSize: 1 }),
    rolesApi.list(),
    permissionsApi.list(),
  ]);

  // Placeholder series (no time-series API yet). Deterministic, clearly fake.
  const signups = WEEKDAYS.map((day, i) => ({ day, count: 4 + ((i * 3) % 11) }));

  return {
    totalUsers: users.meta.total,
    totalRoles: roles.length,
    totalPermissions: permissions.length,
    signups,
    usesPlaceholders: true,
  };
}
