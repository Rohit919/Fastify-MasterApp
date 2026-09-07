import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { SearchInput } from '@/components/data-table/search-input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PermissionGate } from '@/modules/auth/components/permission-gate';
import { useUrlTableState } from '@/hooks/use-url-table-state';
import { useUsers } from '@/modules/users/hooks/use-users';
import { AssignRolesDialog } from '@/modules/users/components/assign-roles-dialog';
import type { UserListItem } from '@/modules/users/api/users.api';
import { formatDateShort } from '@/lib/utils';
import { PermissionKeys, type ListUsersQuery } from '@app/api-contracts';

const ROLE_OPTIONS = [
  { label: 'admin', value: 'admin' },
  { label: 'support', value: 'support' },
  { label: 'viewer', value: 'viewer' },
  { label: 'user', value: 'user' },
];

export function UsersPage() {
  const { t } = useTranslation();
  const { state, setPage, setPageSize, setSearch, setSort, setFilter, isFiltered } =
    useUrlTableState({ filterKeys: ['role'] });

  const query: Partial<ListUsersQuery> = {
    page: state.page,
    pageSize: state.pageSize,
    search: state.search || undefined,
    role: (state.filters.role as ListUsersQuery['role']) || undefined,
    sortBy: (state.sort.sortBy as ListUsersQuery['sortBy']) || undefined,
    sortOrder: state.sort.sortOrder,
  };

  const { data, isLoading, isFetching, error, refetch } = useUsers(query);

  const [assignUser, setAssignUser] = useState<UserListItem | null>(null);

  const columns: DataTableColumn<UserListItem>[] = [
    {
      id: 'name',
      header: t('users:columns.name'),
      sortKey: 'name',
      cell: (u) => <span className="font-medium">{u.name}</span>,
    },
    { id: 'email', header: t('users:columns.email'), sortKey: 'email', cell: (u) => u.email },
    {
      id: 'role',
      header: t('users:columns.role'),
      cell: (u) => <Badge variant="secondary">{u.role}</Badge>,
    },
    {
      id: 'createdAt',
      header: t('users:columns.createdAt'),
      sortKey: 'createdAt',
      cell: (u) => formatDateShort(u.createdAt),
    },
  ];

  return (
    <>
      <PageHeader title={t('users:title')} description={t('users:subtitle')} />

      <DataTable<UserListItem>
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(u) => u.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        sort={state.sort}
        onSortChange={setSort}
        meta={data?.meta}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isFiltered={isFiltered}
        emptyMessage={t('users:empty')}
        toolbar={
          <>
            <SearchInput
              value={state.search}
              onChange={setSearch}
              placeholder={t('users:searchPlaceholder')}
            />
            <Select
              className="w-40"
              value={state.filters.role ?? ''}
              placeholder={t('users:filters.allRoles')}
              onChange={(e) => setFilter('role', e.target.value)}
              options={ROLE_OPTIONS}
            />
          </>
        }
        rowActions={(u) => (
          <PermissionGate permission={PermissionKeys.UsersRolesUpdate}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('common:labels.actions')}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAssignUser(u)}>
                  <ShieldCheck className="h-4 w-4" />
                  {t('users:actions.assignRoles')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
        )}
      />

      <AssignRolesDialog
        user={assignUser}
        open={Boolean(assignUser)}
        onOpenChange={(open) => !open && setAssignUser(null)}
      />
    </>
  );
}
