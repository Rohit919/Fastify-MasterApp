import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/modules/auth/api/auth.api';
import { usePasswordResetStore } from '@/modules/auth/stores/password-reset.store';
import { notify } from '@/lib/notify';

/** Step 1 — request an OTP for the given email, then advance to verify-otp. */
export function useForgotPassword() {
  const navigate = useNavigate();
  const setEmail = usePasswordResetStore((s) => s.setEmail);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword({ email }),
    onSuccess: (_data, email) => {
      setEmail(email);
      notify.info(t('auth:forgotPassword.sent'));
      navigate('/verify-otp');
    },
  });
}

/** Step 2 — verify the OTP, capture the reset token, advance to reset-password. */
export function useVerifyResetOtp() {
  const navigate = useNavigate();
  const email = usePasswordResetStore((s) => s.email);
  const setResetToken = usePasswordResetStore((s) => s.setResetToken);

  return useMutation({
    mutationFn: (otp: string) => {
      if (!email) throw new Error('Missing email for reset flow');
      return authApi.verifyResetOtp({ email, otp });
    },
    onSuccess: (data) => {
      setResetToken(data.resetToken);
      navigate('/reset-password');
    },
  });
}

/** Step 3 — set the new password using the reset token, then return to login. */
export function useResetPassword() {
  const navigate = useNavigate();
  const resetToken = usePasswordResetStore((s) => s.resetToken);
  const reset = usePasswordResetStore((s) => s.reset);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (newPassword: string) => {
      if (!resetToken) throw new Error('Missing reset token');
      return authApi.resetPassword({ resetToken, newPassword });
    },
    onSuccess: () => {
      reset();
      notify.success(t('auth:resetPassword.success'));
      navigate('/login', { replace: true });
    },
  });
}
