import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/forms/form-field';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { changePasswordSchema, type ChangePasswordForm } from '@/modules/auth/schemas';
import { useChangePassword, useLogoutAll } from '@/modules/settings/hooks/use-change-password';

export function SecuritySettings() {
  const { t } = useTranslation();
  const changePassword = useChangePassword();
  const logoutAll = useLogoutAll();
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = (values: ChangePasswordForm) =>
    changePassword.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:security.changePassword')}</CardTitle>
          <CardDescription>{t('settings:security.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-4" noValidate>
            <TextField
              label={t('settings:security.currentPassword')}
              type="password"
              autoComplete="current-password"
              error={errors.currentPassword?.message}
              {...register('currentPassword')}
            />
            <TextField
              label={t('settings:security.newPassword')}
              type="password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <TextField
              label={t('settings:security.confirmPassword')}
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending && <Spinner />}
              {t('settings:security.changePasswordSubmit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:security.signOutEverywhere')}</CardTitle>
          <CardDescription>{t('settings:security.signOutEverywhereDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setConfirmLogoutAll(true)}
            disabled={logoutAll.isPending}
          >
            {logoutAll.isPending && <Spinner />}
            {t('settings:security.signOutEverywhere')}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmLogoutAll}
        onOpenChange={setConfirmLogoutAll}
        title={t('settings:security.signOutEverywhere')}
        description={t('settings:security.signOutEverywhereDesc')}
        confirmLabel={t('settings:security.signOutEverywhere')}
        loading={logoutAll.isPending}
        onConfirm={() => logoutAll.mutate()}
      />
    </div>
  );
}
