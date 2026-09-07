import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/feedback/loading';
import { useCurrentUser } from '@/modules/users/hooks/use-current-user';
import { formatDate } from '@/lib/utils';

/**
 * Read-only profile view. The backend has no profile-update endpoint, so this
 * intentionally displays rather than edits — with a clear notice.
 */
export function ProfileSettings() {
  const { t } = useTranslation();
  const { data, isLoading } = useCurrentUser();

  if (isLoading) return <Loading />;
  if (!data) return null;

  const rows = [
    { label: t('settings:profile.name'), value: data.name },
    { label: t('settings:profile.email'), value: data.email },
    { label: t('settings:profile.role'), value: <Badge variant="secondary">{data.role}</Badge> },
    { label: t('settings:profile.memberSince'), value: formatDate(data.createdAt) },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar name={data.name} className="h-14 w-14 text-lg" />
          <div>
            <CardTitle>{data.name}</CardTitle>
            <CardDescription>{data.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="divide-y">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {data.roles.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">{t('users:detail.roles')}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.roles.map((r) => (
                <Badge key={r} variant="outline">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>{t('settings:profile.readOnlyNotice')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
