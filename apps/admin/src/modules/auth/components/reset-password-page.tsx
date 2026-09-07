import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useResetPassword } from '@/modules/auth/hooks/use-password-reset';
import { resetPasswordSchema, type ResetPasswordForm } from '@/modules/auth/schemas';
import { usePasswordResetStore } from '@/modules/auth/stores/password-reset.store';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/forms/form-field';
import { Spinner } from '@/components/ui/spinner';
import { mapApiError } from '@/lib/errors';

export function ResetPasswordPage() {
  const resetToken = usePasswordResetStore((s) => s.resetToken);
  const reset = useResetPassword();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) });

  // No token means the OTP step wasn't completed → restart.
  if (!resetToken) return <Navigate to="/forgot-password" replace />;

  const errorMessage = reset.error ? mapApiError(reset.error, (k, f) => t(k, f)) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth:resetPassword.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth:resetPassword.subtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit((v) => reset.mutate(v.newPassword))}
        className="space-y-4"
        noValidate
      >
        <TextField
          label={t('auth:resetPassword.newPassword')}
          type="password"
          autoComplete="new-password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <TextField
          label={t('auth:resetPassword.confirmPassword')}
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={reset.isPending}>
          {reset.isPending && <Spinner />}
          {reset.isPending ? t('auth:resetPassword.submitting') : t('auth:resetPassword.submit')}
        </Button>
      </form>
    </div>
  );
}
