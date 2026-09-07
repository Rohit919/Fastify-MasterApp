import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rolesApi } from '@/modules/roles/api/roles.api';
import { notify } from '@/lib/notify';
import { mapApiError } from '@/lib/errors';
import type { CreateRoleBody, UpdateRoleBody } from '@app/api-contracts';

/** All roles with their permission keys (requires roles.read on the API). */
export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (body: CreateRoleBody) => rolesApi.create(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      notify.success(t('roles:create.success'));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleBody }) => rolesApi.update(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      notify.success(t('roles:edit.success'));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      notify.success(t('roles:delete.success'));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}
