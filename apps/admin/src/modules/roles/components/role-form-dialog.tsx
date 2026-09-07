import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/forms/form-field';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { usePermissionsList } from '@/modules/permissions/hooks/use-permissions-list';
import { groupPermissionsByResource } from '@/modules/permissions/lib/group-permissions';
import { useCreateRole, useUpdateRole } from '@/modules/roles/hooks/use-roles';
import { roleFormSchema, type RoleForm } from '@/modules/roles/schemas';
import type { RoleDto } from '@app/api-contracts';

/**
 * Create/edit a role. On create it sends name + description + permissions; on
 * edit it sends description + permissions (name is immutable per the backend
 * UpdateRoleBody contract). Permissions are chosen from the live registry,
 * grouped by resource for scannability.
 */
export function RoleFormDialog({
  role,
  open,
  onOpenChange,
}: {
  role: RoleDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const isEdit = Boolean(role);
  const { data: permissions } = usePermissionsList();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleForm>({ resolver: zodResolver(roleFormSchema) });

  // Seed the form + selected permissions whenever the dialog opens.
  useEffect(() => {
    if (open) {
      reset({ name: role?.name ?? '', description: role?.description ?? '' });
      setSelected(new Set(role?.permissions ?? []));
    }
  }, [open, role, reset]);

  const groups = useMemo(
    () => groupPermissionsByResource(permissions ?? []),
    [permissions]
  );

  const togglePermission = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onSubmit = (values: RoleForm) => {
    const permissionList = [...selected];
    if (isEdit && role) {
      updateRole.mutate(
        {
          id: role.id,
          body: { description: values.description || undefined, permissions: permissionList },
        },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createRole.mutate(
        {
          name: values.name,
          description: values.description || undefined,
          permissions: permissionList,
        },
        { onSuccess: () => onOpenChange(false) }
      );
    }
  };

  const pending = createRole.isPending || updateRole.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('roles:edit.title') : t('roles:create.title')}</DialogTitle>
          <DialogDescription>{t('roles:subtitle')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role-name">{t('roles:create.name')}</Label>
              <Input
                id="role-name"
                placeholder={t('roles:create.namePlaceholder')}
                disabled={isEdit || role?.isSystem}
                {...register('name')}
              />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-description">{t('roles:create.description')}</Label>
              <Input
                id="role-description"
                placeholder={t('roles:create.descriptionPlaceholder')}
                {...register('description')}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('roles:create.permissions')}</Label>
              <Badge variant="secondary">{selected.size}</Badge>
            </div>
            <div className="max-h-64 space-y-4 overflow-y-auto rounded-md border p-3">
              {groups.map((group) => (
                <div key={group.resource}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.resource}
                  </p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {group.permissions.map((p) => (
                      <label
                        key={p.key}
                        className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-primary"
                          checked={selected.has(p.key)}
                          onChange={() => togglePermission(p.key)}
                        />
                        <span className="font-mono text-xs">{p.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {isEdit ? t('roles:edit.submit') : t('roles:create.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
