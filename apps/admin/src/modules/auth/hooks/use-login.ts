import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login } from '@/modules/auth/api/login';
import { useAuthStore } from '@/stores/auth.store';
import type { LoginBody } from '@app/api-contracts';

/**
 * Login mutation — on success, stores the session and navigates to /dashboard.
 * The mutation error (ApiError) is surfaced to the component for display.
 */
export function useLogin() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (body: LoginBody) => login(body),
    onSuccess: (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      navigate('/dashboard', { replace: true });
    },
  });
}
