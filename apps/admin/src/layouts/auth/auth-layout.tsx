import { Outlet } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Layout for unauthenticated pages (login, forgot/reset password). A branded
 * split panel on desktop; centered card on mobile. Theme-aware via tokens.
 */
export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen">
      {/* Brand panel (desktop) */}
      <div className="hidden w-1/2 flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
            <Zap className="h-5 w-5" />
          </span>
          {t('common:appName')}
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Logistics Admin</h2>
          <p className="mt-2 max-w-sm text-sidebar-foreground/70">
            Manage users, roles, and permissions from one secure control panel.
          </p>
        </div>
        <p className="text-sm text-sidebar-foreground/50">
          © {new Date().getFullYear()} {t('common:appName')}
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-background p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
