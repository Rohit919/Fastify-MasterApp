import { NavLink } from 'react-router-dom';
import { Zap, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/modules/auth/hooks/use-permissions';
import { NAV_ROUTES, NAV_SECTIONS } from '@/app/router/route-config';
import { Button } from '@/components/ui/button';

/**
 * Permission-aware navigation. Each route declares the permission required to
 * see it (in route-config); links the caller can't use are hidden. Sections
 * with no visible links collapse away. UX only — the API enforces access.
 */
export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const { can } = usePermissions();
  const { t } = useTranslation();

  const visible = NAV_ROUTES.filter(
    (r) => !r.hideInNav && (!r.permission || can(r.permission))
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground">
              <Zap className="h-4 w-4" />
            </span>
            {t('common:appName')}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground md:hidden"
            onClick={onClose}
            aria-label={t('common:actions.close')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const items = visible.filter((r) => r.section === section.key);
            if (items.length === 0) return null;
            return (
              <div key={section.key}>
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {t(section.labelKey)}
                </p>
                <div className="space-y-1">
                  {items.map((route) => {
                    const Icon = route.icon;
                    return (
                      <NavLink
                        key={route.path}
                        to={route.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
                          )
                        }
                      >
                        {Icon && <Icon className="h-4 w-4" />}
                        {t(route.titleKey)}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
