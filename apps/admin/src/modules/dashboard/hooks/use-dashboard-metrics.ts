import { useQuery } from '@tanstack/react-query';
import { getDashboardMetrics } from '@/modules/dashboard/api/dashboard.api';

/** Loads (derived) dashboard metrics. See dashboard.api for the abstraction. */
export function useDashboardMetrics() {
  return useQuery({ queryKey: ['dashboard', 'metrics'], queryFn: getDashboardMetrics });
}
