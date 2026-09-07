import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useForgotPassword } from '@/modules/auth/hooks/use-password-reset';
import { forgotPasswordSchema, type ForgotPasswordForm } from '@/modules/auth/schemas';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/forms/form-field';
import { Spinner } from '@/components/ui/spinner';
import { mapApiError } from '@/lib/errors';

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const errorMessage = forgot.error ? mapApiError(forgot.error, (k, f) => t(k, f)) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('auth:forgotPassword.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('auth:forgotPassword.subtitle')}</p>
      </div>

      <form
        onSubmit={handleSubmit((v) => forgot.mutate(v.email))}
        className="space-y-4"
        noValidate
      >
        <TextField
          label={t('auth:forgotPassword.email')}
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={forgot.isPending}>
          {forgot.isPending && <Spinner />}
          {forgot.isPending
            ? t('auth:forgotPassword.submitting')
            : t('auth:forgotPassword.submit')}
        </Button>
      </form>

      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('auth:forgotPassword.backToLogin')}
      </Link>
    </div>
  );
}
