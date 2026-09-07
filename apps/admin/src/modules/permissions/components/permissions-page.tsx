import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/page-header';
import { SearchInput } from '@/components/data-table/search-input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/feedback/loading';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { usePermissionsList } from '@/modules/permissions/hooks/use-permissions-list';
import { groupPermissionsByResource } from '@/modules/permissions/lib/group-permissions';
import { getRequestId, mapApiError } from '@/lib/errors';

/**
 * Read-only permission registry, grouped by resource. Mirrors the naming
 * convention (resource.action) the whole system uses, so future logistics
 * permissions render here automatically without any page changes.
 */
export function PermissionsPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = usePermissionsList();
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const filtered = (data ?? []).filter((p) =>
      search
        ? p.key.toLowerCase().includes(search.toLowerCase()) ||
          (p.description ?? '').toLowerCase().includes(search.toLowerCase())
        : true
    );
    return groupPermissionsByResource(filtered);
  }, [data, search]);

  return (
    <>
      <PageHeader title={t('permissions:title')} description={t('permissions:subtitle')} />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('permissions:searchPlaceholder')}
        />
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorState
          message={mapApiError(error, (k, f) => t(k, f))}
          requestId={getRequestId(error)}
          onRetry={() => refetch()}
        />
      ) : groups.length === 0 ? (
        <EmptyState variant="no-results" message={t('permissions:empty')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.resource}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base capitalize">
                  {group.resource}
                  <Badge variant="secondary">{group.permissions.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.permissions.map((p) => (
                  <div key={p.key} className="rounded-md border px-3 py-2">
                    <p className="font-mono text-xs font-medium">{p.key}</p>
                    {p.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
