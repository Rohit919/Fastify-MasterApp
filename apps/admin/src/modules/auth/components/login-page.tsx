import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLogin } from '@/modules/auth/hooks/use-login';
import { loginSchema, type LoginForm } from '@/modules/auth/schemas';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/forms/form-field';
import { Spinner } from '@/components/ui/spinner';
import { mapApiError } from '@/lib/errors';

export function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const login = useLogin();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = (values: LoginForm) => login.mutate(values);
  const errorMessage = login.error ? mapApiError(login.error, (k, f) => t(k, f)) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{t('auth:login.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('auth:login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <TextField
          label={t('auth:login.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth:login.emailPlaceholder')}
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label={t('auth:login.password')}
          type="password"
          autoComplete="current-password"
          placeholder={t('auth:login.passwordPlaceholder')}
          error={errors.password?.message}
          {...register('password')}
        />

        {errorMessage && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('auth:login.forgotPassword')}
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending && <Spinner />}
          {login.isPending ? t('auth:login.submitting') : t('auth:login.submit')}
        </Button>
      </form>
    </div>
  );
}
