import { Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useVerifyResetOtp, useForgotPassword } from '@/modules/auth/hooks/use-password-reset';
import { verifyOtpSchema, type VerifyOtpForm } from '@/modules/auth/schemas';
import { usePasswordResetStore } from '@/modules/auth/stores/password-reset.store';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/forms/form-field';
import { Spinner } from '@/components/ui/spinner';
import { mapApiError } from '@/lib/errors';

export function VerifyOtpPage() {
  const email = usePasswordResetStore((s) => s.email);
  const verify = useVerifyResetOtp();
  const resend = useForgotPassword();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema) });

  // Direct navigation without going through step 1 → send them back.
  if (!email) return <Navigate to="/forgot-password" replace />;

  const errorMessage = verify.error ? mapApiError(verify.error, (k, f) => t(k, f)) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth:verifyOtp.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth:verifyOtp.subtitle')}</p>
        <p className="text-sm font-medium">{email}</p>
      </div>

      <form onSubmit={handleSubmit((v) => verify.mutate(v.otp))} className="space-y-4" noValidate>
        <TextField
          label={t('auth:verifyOtp.otp')}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          error={errors.otp?.message}
          {...register('otp')}
        />

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={verify.isPending}>
          {verify.isPending && <Spinner />}
          {verify.isPending ? t('auth:verifyOtp.submitting') : t('auth:verifyOtp.submit')}
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('auth:forgotPassword.backToLogin')}
        </Link>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
          disabled={resend.isPending}
          onClick={() => resend.mutate(email)}
        >
          {t('auth:verifyOtp.resend')}
        </button>
      </div>
    </div>
  );
}
