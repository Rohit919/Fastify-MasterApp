import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Reusable KPI/stat card. Receives its value via props (never fetches) so it
 * stays a pure presentational component reusable across dashboards.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  loading,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: number; positive: boolean };
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
          )}
          {trend && !loading && (
            <p
              className={cn(
                'flex items-center gap-0.5 text-xs',
                trend.positive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {Icon && (
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
