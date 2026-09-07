import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/modules/users/api/users.api';
import { notify } from '@/lib/notify';
import { mapApiError } from '@/lib/errors';

/** A user's current role assignments (admin.users.:id.roles). */
export function useUserRoles(userId: string | null) {
  return useQuery({
    queryKey: ['users', userId, 'roles'],
    queryFn: () => usersApi.getRoles(userId!),
    enabled: Boolean(userId),
  });
}

/** Replace a user's role assignments. Invalidates the user list + roles query. */
export function useSetUserRoles() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ userId, roles }: { userId: string; roles: string[] }) =>
      usersApi.setRoles(userId, roles),
    onSuccess: (_data, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: ['users', userId, 'roles'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
      notify.success(t('users:assignRoles.success'));
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}
