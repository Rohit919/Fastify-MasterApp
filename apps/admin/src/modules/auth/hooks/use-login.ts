import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/modules/auth/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { notify } from '@/lib/notify';
import type { LoginBody } from '@app/api-contracts';

/**
 * Login mutation — on success, stores the session and navigates to the
 * originally-requested route (or /dashboard). The effective permissions are
 * loaded by the layout via /users/me right after.
 */
export function useLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const { t } = useTranslation();

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  return useMutation({
    mutationFn: (body: LoginBody) => authApi.login(body),
    onSuccess: (data) => {
      setSession({ accessToken: data.accessToken, user: data.user });
      notify.success(t('auth:toasts.loginSuccess'));
      navigate(from, { replace: true });
    },
  });
}
