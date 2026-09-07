import { useEffect, useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import { Loading } from '@/components/feedback/loading';
import { useRoles } from '@/modules/roles/hooks/use-roles';
import { useUserRoles, useSetUserRoles } from '@/modules/users/hooks/use-user-roles';
import type { UserListItem } from '@/modules/users/api/users.api';

/**
 * Replace a user's role assignments. Shows all available roles as checkboxes,
 * pre-checked with the user's current roles (loaded from the API). Saving calls
 * PUT /admin/users/:id/roles which replaces the whole set.
 */
export function AssignRolesDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { data: allRoles, isLoading: rolesLoading } = useRoles();
  const { data: currentRoles, isLoading: currentLoading } = useUserRoles(open ? user?.id ?? null : null);
  const setRoles = useSetUserRoles();

  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (currentRoles) setSelected(new Set(currentRoles));
  }, [currentRoles]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSave = () => {
    if (!user) return;
    setRoles.mutate(
      { userId: user.id, roles: [...selected] },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const loading = rolesLoading || currentLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('users:assignRoles.title')}</DialogTitle>
          <DialogDescription>
            {t('users:assignRoles.description', { name: user?.name ?? '' })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <Loading />
        ) : (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {(allRoles ?? []).map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={selected.has(role.name)}
                  onChange={() => toggle(role.name)}
                />
                <span className="flex-1">
                  <span className="text-sm font-medium">{role.name}</span>
                  {role.description && (
                    <span className="block text-xs text-muted-foreground">{role.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={setRoles.isPending}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading || setRoles.isPending}>
            {setRoles.isPending && <Spinner />}
            {t('users:assignRoles.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
