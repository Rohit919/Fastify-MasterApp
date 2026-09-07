import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAV_ROUTES } from '@/app/router/route-config';

/**
 * Breadcrumbs derived from the route config + current path. Matches the active
 * top-level admin route and shows any trailing segment (e.g. a detail id) as a
 * leaf crumb. Keeps breadcrumb logic centralized rather than per-page.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const segments = pathname.split('/').filter(Boolean);
  const base = `/${segments[0] ?? ''}`;
  const matched = NAV_ROUTES.find((r) => r.path === base);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/dashboard" className="flex items-center hover:text-foreground" aria-label="Home">
        <Home className="h-4 w-4" />
      </Link>
      {matched && (
        <>
          <ChevronRight className="h-4 w-4" />
          <Link
            to={matched.path}
            className="hover:text-foreground aria-[current=page]:text-foreground aria-[current=page]:font-medium"
            aria-current={segments.length === 1 ? 'page' : undefined}
          >
            {t(matched.titleKey)}
          </Link>
        </>
      )}
      {segments.slice(1).map((seg, i) => (
        <Fragment key={`${seg}-${i}`}>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">{decodeURIComponent(seg)}</span>
        </Fragment>
      ))}
    </nav>
  );
}
