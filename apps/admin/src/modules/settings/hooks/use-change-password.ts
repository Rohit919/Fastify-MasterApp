import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/modules/auth/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { notify } from '@/lib/notify';
import { mapApiError } from '@/lib/errors';
import type { ChangePasswordBody } from '@app/api-contracts';

/**
 * Change password. The backend revokes ALL sessions on success, so we clear the
 * local session and send the user to /login to re-authenticate.
 */
export function useChangePassword() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (body: ChangePasswordBody) => authApi.changePassword(body),
    onSuccess: () => {
      notify.success(t('settings:security.changePasswordSuccess'));
      clearSession();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}

/** Sign out of all sessions everywhere. */
export function useLogoutAll() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((s) => s.clearSession);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: () => {
      notify.success(t('settings:security.signOutEverywhereSuccess'));
      clearSession();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: (error) => notify.error(mapApiError(error, (k, f) => t(k, f))),
  });
}
