import { useTranslation } from "react-i18next";
import {
  Users,
  ShieldCheck,
  KeyRound,
  Settings,
  Activity,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/modules/dashboard/components/stat-card";
import { SignupsChart } from "@/modules/dashboard/components/signups-chart";
import { QuickActions } from "@/modules/dashboard/components/quick-actions";
import { RecentUsers } from "@/modules/dashboard/components/recent-users";
import { ErrorState } from "@/components/feedback/error-state";
import { useDashboardMetrics } from "@/modules/dashboard/hooks/use-dashboard-metrics";
import { useAuth } from "@/modules/auth/hooks/use-auth";
import { getRequestId, mapApiError } from "@/lib/errors";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboardMetrics();

  if (error) {
    return (
      <ErrorState
        message={mapApiError(error, (k, f) => t(k, f))}
        requestId={getRequestId(error)}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={t("dashboard:title")}
        description={
          user
            ? t("dashboard:welcome", { name: user.name })
            : t("dashboard:welcomeAnon")
        }
      />

      {data?.usesPlaceholders && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{t("dashboard:devDataNotice")}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("dashboard:stats.totalUsers")}
          value={data?.totalUsers ?? "—"}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          label={t("dashboard:stats.roles")}
          value={data?.totalRoles ?? "—"}
          icon={ShieldCheck}
          loading={isLoading}
        />
        <StatCard
          label={t("dashboard:stats.permissions")}
          value={data?.totalPermissions ?? "—"}
          icon={KeyRound}
          loading={isLoading}
        />
        <StatCard
          label={t("dashboard:stats.activeSessions")}
          value={t("common:labels.yes")}
          icon={Activity}
          loading={isLoading}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {data && data.signups.length > 0 ? (
            <SignupsChart
              title={t("dashboard:charts.signups")}
              data={data.signups}
            />
          ) : (
            <RecentUsers users={data?.recentUsers ?? []} />
          )}
        </div>
        <QuickActions
          title={t("dashboard:quickActions")}
          actions={[
            {
              to: "/users",
              label: t("dashboard:quick.manageUsers"),
              icon: Users,
            },
            {
              to: "/roles",
              label: t("dashboard:quick.manageRoles"),
              icon: ShieldCheck,
            },
            {
              to: "/permissions",
              label: t("dashboard:quick.viewPermissions"),
              icon: KeyRound,
            },
            {
              to: "/settings",
              label: t("dashboard:quick.settings"),
              icon: Settings,
            },
          ]}
        />
      </div>

      {data && data.signups.length > 0 && data.recentUsers.length > 0 && (
        <div className="mt-4">
          <RecentUsers users={data.recentUsers} />
        </div>
      )}
    </>
  );
}
