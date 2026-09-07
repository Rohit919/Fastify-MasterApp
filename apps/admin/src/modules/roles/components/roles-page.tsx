import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { DataTable } from '@/components/data-table';
import type { DataTableColumn } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PermissionGate } from '@/modules/auth/components/permission-gate';
import { useRoles, useDeleteRole } from '@/modules/roles/hooks/use-roles';
import { RoleFormDialog } from '@/modules/roles/components/role-form-dialog';
import { notify } from '@/lib/notify';
import { PermissionKeys, type RoleDto } from '@app/api-contracts';

export function RolesPage() {
  const { t } = useTranslation();
  const { data, isLoading, isFetching, error, refetch } = useRoles();
  const deleteRole = useDeleteRole();

  const [formRole, setFormRole] = useState<RoleDto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);

  const openCreate = () => {
    setFormRole(null);
    setFormOpen(true);
  };
  const openEdit = (role: RoleDto) => {
    setFormRole(role);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  const columns: DataTableColumn<RoleDto>[] = [
    {
      id: 'name',
      header: t('roles:columns.name'),
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.name}</span>
          {r.isSystem && <Badge variant="outline">{t('roles:system')}</Badge>}
        </div>
      ),
    },
    {
      id: 'description',
      header: t('roles:columns.description'),
      cell: (r) => <span className="text-muted-foreground">{r.description ?? '—'}</span>,
    },
    {
      id: 'permissions',
      header: t('roles:columns.permissions'),
      cell: (r) => (
        <Badge variant="secondary">
          {t('roles:permissionsCount', { count: r.permissions.length })}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('roles:title')}
        description={t('roles:subtitle')}
        actions={
          <PermissionGate permission={PermissionKeys.RolesCreate}>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('roles:create.trigger')}
            </Button>
          </PermissionGate>
        }
      />

      <DataTable<RoleDto>
        columns={columns}
        rows={data ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        onRetry={() => refetch()}
        emptyMessage={t('roles:empty')}
        rowActions={(role) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t('common:labels.actions')}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <PermissionGate permission={PermissionKeys.RolesUpdate}>
                <DropdownMenuItem onClick={() => openEdit(role)}>
                  <Pencil className="h-4 w-4" />
                  {t('common:actions.edit')}
                </DropdownMenuItem>
              </PermissionGate>
              <PermissionGate permission={PermissionKeys.RolesDelete}>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => {
                    if (role.isSystem) {
                      notify.warning(t('roles:delete.systemBlocked'));
                      return;
                    }
                    setDeleteTarget(role);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t('common:actions.delete')}
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <RoleFormDialog role={formRole} open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('roles:delete.title')}
        description={t('roles:delete.confirm', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('common:actions.delete')}
        loading={deleteRole.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
