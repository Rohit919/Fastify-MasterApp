import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatDateShort } from "@/lib/utils";
import type { DashboardRecentUser } from "@/modules/dashboard/api/dashboard.api";

/**
 * Recent-activity card: the most recently created users. Pure presentational —
 * receives rows via props (no fetching), so it stays reusable.
 */
export function RecentUsers({ users }: { users: DashboardRecentUser[] }) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t("dashboard:recentActivity")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {users.length === 0 ? (
          <EmptyState message={t("dashboard:noRecentUsers")} />
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
            >
              <Avatar name={u.name} className="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email}
                </p>
              </div>
              <Badge variant="secondary">{u.role}</Badge>
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {formatDateShort(u.createdAt)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
